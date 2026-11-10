import { describe, expect, it } from "vitest";
import {
  applyReplacements,
  canonicalJson,
  codeReviewGate,
  designRequired,
  digest,
  GateError,
  issueHints,
  matchingLines,
  planFingerprint,
  planNeedsApproval,
  requirementsDecision,
  requirementsDigest,
  safePath,
} from "./policy.mjs";

const issue = { number: 10, title: "Aviso", body: "Pedido de aprovação do plano.\nNão há tela nova." };
const plan = {
  files: ["apps/web/modules/bookings/components/OutsideBusinessHoursAlert.tsx"],
  acceptance: ["texto"],
};
const evaluation = { aligned: true, score: 3, missing_acceptance_criteria: [] };

function passingEval(headSha) {
  return {
    head_sha: headSha,
    complexity: { level: "low" },
    plan_adherence: { passed: true, score: 3, findings: [] },
    style: { passed: true, findings: [] },
    human_review: { required: false, reasons: [] },
  };
}

describe("plan fingerprint", () => {
  it("ignores key order and changes when the plan changes", () => {
    const first = planFingerprint(issue, "abc", plan, evaluation);
    const reordered = digest({
      evaluation,
      plan,
      base_sha: "abc",
      issue: { body: issue.body, title: issue.title, number: issue.number },
    });
    expect(first).toBe(reordered);
    expect(planFingerprint(issue, "abc", { ...plan, acceptance: ["outro"] }, evaluation)).not.toBe(first);
    expect(canonicalJson({ b: 1, a: { d: 1, c: 2 } })).toBe('{"a":{"c":2,"d":1},"b":1}');
  });
});

describe("approval routing", () => {
  it("requires plan approval when the issue asks for it and skips design when there is no new screen", () => {
    expect(planNeedsApproval(plan.files, issue.body, { complexity: "simple", scope_type: "change" })).toBe(
      true
    );
    expect(designRequired(issue.body, { scope_type: "screen" }, { needed: true, confidence: 0.2 })).toBe(
      false
    );
  });

  it("holds a human-risk path even without the issue phrase", () => {
    expect(
      planNeedsApproval(["packages/features/auth/lib/next-auth-options.ts"], "Mudança pequena.", {})
    ).toBe(true);
  });
});

describe("code review gate", () => {
  it("accepts a low-complexity change outside core paths", () => {
    const gate = codeReviewGate([plan.files[0]], passingEval("sha"), "sha");
    expect(gate.requires_human).toBe(false);
  });

  it("requires a person for a core file and for medium complexity", () => {
    expect(codeReviewGate(["packages/lib/businessHours.ts"], passingEval("sha"), "sha").requires_human).toBe(
      true
    );
    const medium = passingEval("sha");
    medium.complexity.level = "medium";
    expect(codeReviewGate([plan.files[0]], medium, "sha").requires_human).toBe(true);
  });

  it("stops when the eval names another commit", () => {
    expect(() => codeReviewGate([plan.files[0]], passingEval("other"), "sha")).toThrow(GateError);
  });
});

describe("replacements", () => {
  it("replaces one exact snippet and rejects a missing or repeated snippet", () => {
    expect(
      applyReplacements("fora do horário.", [
        { old: "fora do horário.", new: "fora do horário, mas não é bloqueada." },
      ])
    ).toBe("fora do horário, mas não é bloqueada.");
    expect(() => applyReplacements("abc", [])).toThrow(GateError);
    expect(() => applyReplacements("abc abc", [{ old: "abc", new: "x" }])).toThrow(GateError);
    expect(() => applyReplacements("abc", [{ old: "z", new: "x" }])).toThrow(GateError);
  });
});

describe("implementation excerpts", () => {
  it("keeps the locale line that contains a key named in the issue", () => {
    const body = 'A chave outside_business_hours_message muda para "não é bloqueada".';
    const content = [
      "{",
      '  "outside_business_hours_title": "Fora do horário comercial",',
      '  "outside_business_hours_message": "Esta reserva está fora do horário comercial.",',
      '  "other": "x"',
      "}",
    ].join("\n");
    const hints = issueHints(body);
    expect(hints).toContain("outside_business_hours_message");
    expect(matchingLines(content, hints)).toBe(
      '"outside_business_hours_message": "Esta reserva está fora do horário comercial.",'
    );
  });
});

describe("requirements gate", () => {
  const requirementsIssue = { number: 4, title: "Aviso", body: "Texto estável." };

  it("releases the plan only when the comment is exactly the pending digest", () => {
    const pending = requirementsDigest(requirementsIssue);
    expect(requirementsDecision(pending, pending, requirementsIssue)).toEqual({
      release: true,
      reason: "approved",
      digest: pending,
    });
    expect(requirementsDecision(pending, `${pending} obrigado`, requirementsIssue).release).toBe(false);
  });

  it("keeps the pause when the issue changes and rejects the old digest", () => {
    const pending = requirementsDigest(requirementsIssue);
    const changed = { ...requirementsIssue, body: "Texto novo." };
    const decision = requirementsDecision(pending, pending, changed);
    expect(decision.release).toBe(false);
    expect(decision.reason).toBe("issue_changed");
    expect(decision.digest).not.toBe(pending);
    expect(requirementsDecision(pending, decision.digest, changed).release).toBe(false);
    expect(requirementsDecision(decision.digest, decision.digest, changed).release).toBe(true);
  });
});

describe("safe path", () => {
  it("allows the alert component and rejects the workflow directory", () => {
    expect(() => safePath(plan.files[0])).not.toThrow();
    expect(() => safePath(".github/workflows/harness.yml")).toThrow(GateError);
    expect(() => safePath("packages/prisma/schema.prisma")).toThrow(GateError);
  });
});
