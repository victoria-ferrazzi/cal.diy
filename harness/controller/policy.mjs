import { createHash } from "node:crypto";
import path from "node:path";

export const REVIEW_MIN_SCORE = 3;
export const HUMAN_REVIEW_COMPLEXITY = ["medium", "high"];

export const APPLICATION_PREFIXES = [
  "apps/web/",
  "packages/features/",
  "packages/lib/",
  "packages/ui/",
  "packages/i18n/locales/",
];

export const APPLICATION_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css"];

export const HUMAN_RISK_PREFIXES = [
  "packages/prisma/",
  "packages/features/auth/",
  "apps/web/pages/api/auth/",
  "apps/api/v2/src/modules/auth/",
  "packages/features/credentials/",
  "packages/app-store/_utils/oauth/",
  "packages/features/bookings/lib/payment/",
  "packages/app-store/_utils/payments/",
  "packages/features/bookings/lib/handlePayment.ts",
  "packages/features/bookings/lib/service/RegularBookingService.ts",
];

export const CORE_REVIEW_PREFIXES = [
  "packages/trpc/server/routers/viewer/slots/",
  "packages/features/schedules/",
  "packages/features/bookings/lib/conflictChecker/",
  "packages/features/bookings/lib/handleCancelBooking",
  "packages/features/bookings/lib/handleNewBooking/",
  "packages/features/webhooks/",
  "apps/web/app/api/cron/",
  ".github/workflows/cron-",
];

export const CORE_REVIEW_FILES = [
  "packages/lib/businessHours.ts",
  "packages/lib/shortBreak.ts",
  "apps/web/proxy.ts",
  "apps/web/next.config.ts",
  "Dockerfile",
  "docker-compose.yml",
];

const PROTECTED_PARTS = new Set([".git", ".github", ".agents", ".codex", ".claude", "node_modules", ".next"]);

export class GateError extends Error {}

export function canonicalJson(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])])
    );
  }
  return value;
}

export function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function issueSnapshot(issue) {
  return {
    number: issue.number,
    title: issue.title,
    body: issue.body || "",
  };
}

export function planFingerprint(issue, baseSha, plan, evaluation) {
  return digest({
    issue: issueSnapshot(issue),
    base_sha: baseSha,
    plan,
    evaluation,
  });
}

export function safePath(filePath) {
  const parsed = path.posix.normalize(filePath);
  if (path.posix.isAbsolute(filePath) || parsed !== filePath || filePath.split("/").includes("..")) {
    throw new GateError(`Invalid changed path: ${filePath}`);
  }
  const parts = filePath.split("/");
  if (parts.some((part) => PROTECTED_PARTS.has(part) || part.startsWith(".env"))) {
    throw new GateError(`Protected path: ${filePath}`);
  }
  const name = parts.at(-1);
  const protectedName =
    ["AGENTS.md", "CLAUDE.md", "package.json", "yarn.lock", ".yarnrc.yml"].includes(name) ||
    name.startsWith("tsconfig") ||
    name.startsWith("vitest.config");
  if (protectedName) {
    throw new GateError(`Protected path: ${filePath}. Change the harness through a separate reviewed PR.`);
  }
  const extension = path.posix.extname(name);
  if (!APPLICATION_EXTENSIONS.includes(extension)) {
    throw new GateError(`Unsupported changed file type: ${filePath}`);
  }
  if (!APPLICATION_PREFIXES.some((prefix) => filePath.startsWith(prefix))) {
    throw new GateError(`Outside the application change scope: ${filePath}`);
  }
}

export function deterministicReview(filePaths) {
  const migrations = [];
  const core = [];
  for (const filePath of [...new Set(filePaths)].sort()) {
    const parts = filePath.split("/");
    const name = parts.at(-1).toLowerCase();
    if (
      parts.some((part) => ["migrations", "migration"].includes(part.toLowerCase())) ||
      name === "schema.prisma"
    ) {
      migrations.push(filePath);
    }
    const coreMatch =
      CORE_REVIEW_FILES.includes(filePath) ||
      [...CORE_REVIEW_PREFIXES, ...HUMAN_RISK_PREFIXES].some((prefix) => filePath.startsWith(prefix));
    if (coreMatch) {
      core.push(filePath);
    }
  }
  return {
    migration_files: migrations,
    core_files: core,
    requires_human: migrations.length > 0 || core.length > 0,
  };
}

export function planNeedsApproval(planFiles, issueBody, pm) {
  if (/aprovação do plano/i.test(issueBody || "")) {
    return true;
  }
  if (pm?.requires_plan_approval || pm?.complexity === "complex" || pm?.scope_type === "screen") {
    return true;
  }
  return planFiles.some((filePath) => HUMAN_RISK_PREFIXES.some((prefix) => filePath.startsWith(prefix)));
}

export function designRequired(issueBody, pm, designNeed) {
  if (/não há tela nova/i.test(issueBody || "")) {
    return false;
  }
  return Boolean(designNeed?.needed) || Number(designNeed?.confidence) < 0.85 || pm?.scope_type === "screen";
}

export function codeReviewGate(filePaths, result, headSha) {
  const fixed = deterministicReview(filePaths);
  const reasons = [];
  if (fixed.migration_files.length > 0) {
    reasons.push("Migrações alteradas exigem review humano.");
  }
  if (fixed.core_files.length > 0) {
    reasons.push("Arquivos core alterados exigem review humano.");
  }
  if (!result || result.head_sha !== headSha) {
    throw new GateError("Code evals must identify the evaluated commit");
  }
  if (!["low", "medium", "high"].includes(result.complexity?.level)) {
    throw new GateError("Code eval complexity is invalid");
  }
  if (HUMAN_REVIEW_COMPLEXITY.includes(result.complexity.level)) {
    reasons.push("A complexidade da mudança exige review humano.");
  }
  const adherence = result.plan_adherence;
  if (
    !adherence ||
    typeof adherence.passed !== "boolean" ||
    !Number.isInteger(adherence.score) ||
    !Array.isArray(adherence.findings)
  ) {
    throw new GateError("Code eval plan adherence is invalid");
  }
  if (!adherence.passed || adherence.score < REVIEW_MIN_SCORE || adherence.findings.length > 0) {
    reasons.push("O eval encontrou divergências em relação ao plano.");
  }
  if (!result.style || typeof result.style.passed !== "boolean" || !Array.isArray(result.style.findings)) {
    throw new GateError("Code eval style is invalid");
  }
  if (!result.style.passed || result.style.findings.length > 0) {
    reasons.push("O eval encontrou divergências nas regras de estilo.");
  }
  if (!result.human_review || typeof result.human_review.required !== "boolean") {
    throw new GateError("Code eval human review is invalid");
  }
  if (result.human_review.required) {
    const extra = result.human_review.reasons?.length
      ? result.human_review.reasons
      : ["O eval recomenda review humano."];
    reasons.push(...extra);
  }
  return {
    head_sha: headSha,
    requires_human: reasons.length > 0,
    reasons: [...new Set(reasons)],
    deterministic_checks: fixed,
  };
}
