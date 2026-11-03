import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { repoRoot, runAgent } from "./agent.mjs";
import { createGitHub } from "./github.mjs";
import {
  GateError,
  codeReviewGate,
  designRequired,
  digest,
  issueSnapshot,
  planFingerprint,
  planNeedsApproval,
  safePath,
} from "./policy.mjs";

const MAX_PLAN_REVISIONS = 1;
const MAX_IMPLEMENT_ATTEMPTS = 2;

function readEvent() {
  return {
    name: process.env.GITHUB_EVENT_NAME,
    payload: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")),
  };
}

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `git ${args[0]} failed`).trim());
  }
  return (result.stdout || "").trim();
}

function completePlanFiles(plan) {
  const files = [...(plan.files ?? [])];
  for (const test of plan.tests ?? []) {
    const testPath = typeof test === "string" ? test : test.path;
    if (testPath && !files.includes(testPath)) {
      files.push(testPath);
    }
  }
  return { ...plan, files };
}

function prBody(issueNumber, plan, fingerprint) {
  return [
    `Issue: #${issueNumber}`,
    "",
    plan.summary ?? "",
    "",
    `Fingerprint: ${fingerprint}`,
    "",
    "<!-- harness-plan",
    JSON.stringify({ tests: plan.tests ?? [] }),
    "-->",
    "",
  ].join("\n");
}

function issueFromBody(body) {
  const match = body?.match(/Issue:\s*#(\d+)/);
  return match ? Number(match[1]) : null;
}

async function comment(github, number, body) {
  await github.comment(number, body.slice(0, 6000));
}

async function save(github, bundle, status, fields = {}) {
  if (status) {
    bundle.state.status = status;
  }
  Object.assign(bundle.state, fields);
  bundle.state.updated_at = new Date().toISOString();
  bundle.sha = await github.saveState(bundle.state.issue.number, bundle.state, bundle.sha);
}

function assertCurrent(bundle, issue, baseSha) {
  if (digest(issueSnapshot(issue)) !== bundle.state.issue_digest || baseSha !== bundle.state.base_sha) {
    throw new GateError("Issue or base commit changed. Run the planning workflow again.");
  }
}

async function planAndEvaluate(github, bundle) {
  const issue = bundle.state.issue;
  let planResult = await runAgent(
    [
      "Você é o Planner. Não edite arquivos. Responda somente com um objeto JSON.",
      "Campos: summary (string), files (array de caminhos), tests (array de {path, kind}), acceptance (array de strings), open_questions (array de strings), risk (low ou high).",
      "O plano cobre o objetivo e o aceite da issue. Inclua um teste executável por vitest para o comportamento pedido.",
      `Issue: ${JSON.stringify(issue)}`,
      `Pesquisa e PM: ${JSON.stringify({ pm: bundle.state.pm, research: bundle.state.research })}`,
    ].join("\n\n")
  );
  let plan = completePlanFiles(planResult);
  for (const filePath of plan.files) {
    safePath(filePath);
  }
  await save(github, bundle, "evaluate", { plan });

  let evaluation = await evaluatePlan(issue, plan);
  let revisions = 0;
  while (
    revisions < MAX_PLAN_REVISIONS &&
    (!evaluation.aligned || evaluation.score < 3 || evaluation.missing_acceptance_criteria.length > 0) &&
    plan.open_questions.length === 0
  ) {
    revisions += 1;
    planResult = await runAgent(
      [
        "Você é o Planner. Não edite arquivos. Corrija o plano anterior com o feedback. Responda somente com o mesmo objeto JSON.",
        `Issue: ${JSON.stringify(issue)}`,
        `Plano anterior: ${JSON.stringify(plan)}`,
        `Feedback: ${JSON.stringify(evaluation)}`,
      ].join("\n\n")
    );
    plan = completePlanFiles(planResult);
    for (const filePath of plan.files) {
      safePath(filePath);
    }
    evaluation = await evaluatePlan(issue, plan);
  }
  await save(github, bundle, null, { plan, evaluation });
  return { plan, evaluation };
}

async function evaluatePlan(issue, plan) {
  const evaluation = await runAgent(
    [
      "Você avalia o plano. Não edite arquivos. Responda somente com um objeto JSON.",
      "Campos: aligned (boolean), score (inteiro de 0 a 3, maior é mais aderente), missing_acceptance_criteria (array), risk (low ou high), requires_human (boolean), summary (string).",
      "Nota 3 só quando cada aceite da issue está coberto e o plano não acrescenta outro comportamento.",
      `Issue: ${JSON.stringify(issue)}`,
      `Plano: ${JSON.stringify(plan)}`,
    ].join("\n\n")
  );
  if (!Number.isInteger(evaluation.score) || evaluation.score < 0 || evaluation.score > 3) {
    throw new GateError("Plan evaluation score is invalid");
  }
  evaluation.missing_acceptance_criteria ??= [];
  return evaluation;
}

async function publishPlan(github, bundle, baseSha) {
  const { plan, evaluation } = bundle.state;
  const fingerprint = planFingerprint(bundle.state.issue, baseSha, plan, evaluation);
  const needsInformation =
    plan.open_questions.length > 0 ||
    !evaluation.aligned ||
    evaluation.score < 3 ||
    evaluation.missing_acceptance_criteria.length > 0;
  if (needsInformation) {
    await save(github, bundle, "needs_information", { plan_fingerprint: fingerprint });
    await comment(
      github,
      bundle.state.issue.number,
      `O plano ainda não cobre o pedido.\n\n${plan.open_questions.concat(evaluation.missing_acceptance_criteria).join("\n")}`
    );
    return;
  }
  if (planNeedsApproval(plan.files, bundle.state.issue.body, bundle.state.pm) || evaluation.requires_human || evaluation.risk !== "low" || plan.risk !== "low") {
    await save(github, bundle, "awaiting_approval", { plan_fingerprint: fingerprint });
    await comment(
      github,
      bundle.state.issue.number,
      [
        "O plano está pronto. A implementação espera a sua aprovação.",
        "",
        "Para aprovar, envie um comentário cujo corpo seja somente o fingerprint:",
        "",
        fingerprint,
      ].join("\n")
    );
    return;
  }
  await save(github, bundle, "implement", { plan_fingerprint: fingerprint });
  await implement(github, bundle);
}

async function implement(github, bundle, failedChecks) {
  const issueNumber = bundle.state.issue.number;
  const branch = `harness/issue-${issueNumber}`;
  const result = await runAgent(
    [
      "Você é o Implementer. Não grave arquivos no disco. Responda somente com um objeto JSON.",
      "Campos: summary (string), files (array de {path, content}). content é o arquivo completo.",
      "Altere apenas os caminhos do plano. Siga agents/CONVENTIONS.md: não invente arquivo nem pasta, e aponte para um exemplo existente.",
      `Issue: ${JSON.stringify(bundle.state.issue)}`,
      `Plano: ${JSON.stringify(bundle.state.plan)}`,
      failedChecks ? `Falhas de CI: ${JSON.stringify(failedChecks)}` : "",
    ].join("\n\n"),
    { timeoutMs: 360000 }
  );
  if (!Array.isArray(result.files) || result.files.length === 0 || result.files.length > 10) {
    throw new GateError("Implementer returned an invalid file list");
  }
  const allowed = new Set(bundle.state.plan.files);
  if (process.env.GITHUB_ACTIONS) {
    git(["reset", "--hard"]);
  }
  if ((bundle.state.attempts ?? 0) > 0 && bundle.state.branch) {
    git(["fetch", "origin", branch]);
    git(["checkout", "-B", branch, `origin/${branch}`]);
  } else {
    git(["fetch", "--depth", "1", "origin", bundle.state.base_sha]);
    git(["checkout", "-B", branch, bundle.state.base_sha]);
  }
  for (const file of result.files) {
    if (!allowed.has(file.path) || typeof file.content !== "string" || file.content.length > 100000) {
      throw new GateError(`Implementer changed a path outside the plan: ${file.path}`);
    }
    safePath(file.path);
    const destination = path.join(repoRoot, file.path);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, file.content.endsWith("\n") ? file.content : `${file.content}\n`);
  }
  const evidencePath = path.join(repoRoot, "evidence", "issues", String(issueNumber), "approvals.jsonl");
  mkdirSync(path.dirname(evidencePath), { recursive: true });
  const approval = bundle.state.approval;
  writeFileSync(
    evidencePath,
    `${JSON.stringify({
      actor: approval?.actor ?? null,
      fingerprint: bundle.state.plan_fingerprint,
      comment_id: approval?.comment_id ?? null,
    })}\n`
  );
  git(["add", "--", ...result.files.map((file) => file.path), path.relative(repoRoot, evidencePath)]);
  git([
    "-c",
    "user.name=github-actions[bot]",
    "-c",
    "user.email=41898282+github-actions[bot]@users.noreply.github.com",
    "commit",
    "-m",
    `feat: implement issue #${issueNumber}`,
  ]);
  git(["push", "origin", `HEAD:${branch}`]);
  const headSha = git(["rev-parse", "HEAD"]);
  let prNumber = bundle.state.pr_number;
  if (!prNumber) {
    const pull = await github.openPull({
      title: bundle.state.issue.title,
      head: branch,
      body: prBody(issueNumber, bundle.state.plan, bundle.state.plan_fingerprint),
    });
    prNumber = pull.number;
  }
  await save(github, bundle, "awaiting_ci", {
    head_sha: headSha,
    branch,
    pr_number: prNumber,
    attempts: (bundle.state.attempts ?? 0) + 1,
  });
  await comment(github, issueNumber, `A PR #${prNumber} está no commit ${headSha}. O Harness CI vai conferir esse SHA.`);
  if (process.env.GITHUB_ACTIONS) {
    git(["reset", "--hard"]);
    git(["checkout", "main"]);
  }
}

async function reviewCandidate(github, bundle) {
  const headSha = bundle.state.head_sha;
  const check = await github.harnessCheck(headSha);
  if (!check) {
    await comment(github, bundle.state.issue.number, `O check Harness CI ainda não está visível para ${headSha}.`);
    return;
  }
  if (check.conclusion !== "success") {
    if ((bundle.state.attempts ?? 1) < MAX_IMPLEMENT_ATTEMPTS) {
      await comment(github, bundle.state.issue.number, "O Harness CI falhou. Vou tentar uma correção no mesmo plano.");
      await implement(github, bundle, check);
      return;
    }
    await save(github, bundle, "failed", { check });
    await comment(
      github,
      bundle.state.issue.number,
      `O Harness CI não passou para ${headSha}. ${check?.url ?? "O check não foi encontrado."}`
    );
    return;
  }
  git(["fetch", "--depth", "1", "origin", bundle.state.base_sha]);
  git(["fetch", "--depth", "1", "origin", headSha]);
  const diff = git(["diff", bundle.state.base_sha, headSha, "--", ...bundle.state.plan.files]);
  const testReview = await runAgent(
    [
      "Você é o Tester. Não edite arquivos. Responda somente com um objeto JSON.",
      "Campos: head_sha (string), passed (boolean), findings (array de strings), summary (string).",
      "Use as evidências do Harness CI. Aprovação humana não libera teste reprovado.",
      `head_sha: ${headSha}`,
      `Issue: ${JSON.stringify(bundle.state.issue)}`,
      `Plano: ${JSON.stringify(bundle.state.plan)}`,
      `Check: ${JSON.stringify(check)}`,
      `Diff: ${diff.slice(0, 20000)}`,
    ].join("\n\n")
  );
  if (testReview.head_sha !== headSha || testReview.passed !== true || (testReview.findings ?? []).length > 0) {
    throw new GateError("Human review cannot bypass the independent test-agent gate");
  }
  const codeEvals = await runAgent(
    [
      "Você faz as evals de código. Não edite arquivos. Responda somente com um objeto JSON.",
      "Campos: head_sha, complexity.level (low, medium ou high), plan_adherence.passed, plan_adherence.score (0 a 3), plan_adherence.findings, style.passed, style.findings, human_review.required, human_review.reasons.",
      "low: um aceite, só arquivos do plano, sem schema, migração, permissão, credencial ou pagamento.",
      "medium: mais de um módulo, ou mudança em disponibilidade, notificação, webhook ou campo persistido de reserva.",
      "high: schema, migração, backfill, autenticação, credencial, pagamento, ou efeito sem teste nomeado no plano.",
      "Adesão 3 exige cada aceite no diff e nenhum comportamento fora do plano. passed só com nota 3 e findings vazio.",
      "Estilo segue agents/CONVENTIONS.md. Formatação fica no Biome. Não repita o Biome.",
      `head_sha: ${headSha}`,
      `Issue: ${JSON.stringify(bundle.state.issue)}`,
      `Plano: ${JSON.stringify(bundle.state.plan)}`,
      `Diff: ${diff.slice(0, 20000)}`,
    ].join("\n\n")
  );
  const gate = codeReviewGate(bundle.state.plan.files, codeEvals, headSha);
  const review = await runAgent(
    [
      "Você é o Reviewer. Não edite arquivos. Responda somente com um objeto JSON.",
      "Campos: head_sha, score (inteiro 0 a 3), aligned (boolean), findings (array), risk (low ou high), summary.",
      "Nota 3, aligned verdadeiro, findings vazio e risk low só quando o diff atende o plano.",
      `head_sha: ${headSha}`,
      `Gate: ${JSON.stringify(gate)}`,
      `Evals: ${JSON.stringify(codeEvals)}`,
      `Diff: ${diff.slice(0, 20000)}`,
    ].join("\n\n")
  );
  if (review.head_sha !== headSha || review.score < 3 || review.aligned !== true || (review.findings ?? []).length > 0 || review.risk !== "low") {
    gate.requires_human = true;
    gate.reasons = [...new Set([...gate.reasons, "O Reviewer não confirmou alinhamento suficiente com o pedido."])];
  }
  await save(github, bundle, gate.requires_human ? "awaiting_code_review" : "ready_to_merge", {
    code_evals: codeEvals,
    review,
    code_gate: gate,
  });
  if (gate.requires_human) {
    await comment(
      github,
      bundle.state.issue.number,
      [
        "A revisão pede uma pessoa antes do merge.",
        ...gate.reasons.map((reason) => `- ${reason}`),
        "",
        "Para autorizar, comente somente o SHA do commit:",
        "",
        headSha,
      ].join("\n")
    );
    return;
  }
  await comment(
    github,
    bundle.state.issue.number,
    `Os gates passaram para ${headSha}. Pode fazer o merge da PR #${bundle.state.pr_number}.`
  );
}

async function start(github, issueNumber, actor) {
  if (!(await github.canWrite(actor))) {
    throw new GateError("Only a writer can prioritize or clarify this issue");
  }
  const issue = await github.issue(issueNumber);
  if (!issue.labels.includes("priorizado")) {
    return;
  }
  const baseSha = await github.mainSha();
  await github.ensureStateBranch(baseSha);
  const loaded = await github.loadState(issueNumber);
  const bundle = { state: loaded.state, sha: loaded.sha };
  if (bundle.state && !["needs_information", "failed", "stale"].includes(bundle.state.status)) {
    return;
  }
  const same =
    bundle.state &&
    bundle.state.base_sha === baseSha &&
    bundle.state.issue_digest === digest(issueSnapshot(issue)) &&
    bundle.state.status === "done";
  if (same) {
    return;
  }
  bundle.state = {
    status: "pm",
    issue: issueSnapshot(issue),
    issue_digest: digest(issueSnapshot(issue)),
    base_sha: baseSha,
    started_by: actor,
    attempts: 0,
    clarification_comment_ids: bundle.state?.clarification_comment_ids ?? [],
  };
  await save(github, bundle, "pm");
  const pm = await runAgent(
    [
      "Você é o PM. Não edite arquivos. Responda somente com um objeto JSON.",
      "Campos: summary, questions (array), scope_type (screen ou change), complexity (simple ou complex), requires_plan_approval (boolean).",
      "Se a issue diz que não há tela nova, scope_type é change.",
      `Issue: ${JSON.stringify(bundle.state.issue)}`,
    ].join("\n\n")
  );
  await save(github, bundle, null, { pm });
  if ((pm.questions ?? []).length > 0) {
    await save(github, bundle, "needs_information");
    await comment(github, issueNumber, pm.questions.join("\n\n"));
    return;
  }
  const ambiguity = await runAgent(
    [
      "Avalie a ambiguidade da issue. Não edite arquivos. Responda somente com um objeto JSON.",
      "Campos: score (inteiro 0 a 3, maior é mais ambígua), summary.",
      "0: objetivo, escopo e aceite bastam para planejar. 2: falta uma decisão. 3: objetivo ou aceite indefinidos.",
      `Issue: ${JSON.stringify(bundle.state.issue)}`,
    ].join("\n\n")
  );
  if (!Number.isInteger(ambiguity.score)) {
    throw new GateError("Ambiguity score is invalid");
  }
  await save(github, bundle, null, { ambiguity });
  if (ambiguity.score >= 2) {
    await save(github, bundle, "needs_information");
    await comment(github, issueNumber, ambiguity.summary || "A issue precisa de esclarecimento antes do plano.");
    return;
  }
  if (designRequired(issue.body, pm, null)) {
    await save(github, bundle, "needs_information", { design_required: true });
    await comment(github, issueNumber, "A mudança pede design. Esta execução não publica opções de tela.");
    return;
  }
  const baseNow = await github.mainSha();
  assertCurrent(bundle, issue, baseNow);
  await planAndEvaluate(github, bundle);
  await publishPlan(github, bundle, baseNow);
}

async function approve(github, issueNumber, actor, body, commentId) {
  if (!(await github.canWrite(actor))) {
    throw new GateError("Only a collaborator with write permission can approve");
  }
  const loaded = await github.loadState(issueNumber);
  if (!loaded.state) {
    return;
  }
  const bundle = loaded;
  const issue = await github.issue(issueNumber);
  const baseSha = await github.mainSha();
  const token = body.trim().toLowerCase();
  if (bundle.state.status === "needs_information") {
    const ids = bundle.state.clarification_comment_ids ?? [];
    ids.push(commentId);
    await save(github, bundle, "failed", { clarification_comment_ids: ids });
    await start(github, issueNumber, actor);
    return;
  }
  if (bundle.state.status === "awaiting_approval") {
    if (token !== bundle.state.plan_fingerprint) {
      await comment(github, issueNumber, "O comentário não é o fingerprint do plano pendente.");
      return;
    }
    assertCurrent(bundle, issue, baseSha);
    await save(github, bundle, "implement", {
      approval: { actor, fingerprint: bundle.state.plan_fingerprint, comment_id: commentId },
    });
    await implement(github, bundle);
    return;
  }
  if (bundle.state.status === "awaiting_code_review") {
    if (token !== bundle.state.head_sha.toLowerCase()) {
      await comment(github, issueNumber, "O comentário não é o SHA do commit pendente.");
      return;
    }
    assertCurrent(bundle, issue, baseSha);
    await save(github, bundle, "ready_to_merge", {
      code_approval: { actor, head_sha: bundle.state.head_sha, comment_id: commentId },
    });
    await comment(github, issueNumber, `Aprovação registrada para ${bundle.state.head_sha}. Pode fazer o merge da PR #${bundle.state.pr_number}.`);
  }
}

async function onCi(github, headSha) {
  const pulls = await github.pullsForCommit(headSha);
  const pull = pulls.find((item) => issueFromBody(item.body));
  if (!pull) {
    return;
  }
  const issueNumber = issueFromBody(pull.body);
  const loaded = await github.loadState(issueNumber);
  if (!loaded.state || loaded.state.status !== "awaiting_ci" || loaded.state.head_sha !== headSha) {
    return;
  }
  const issue = await github.issue(issueNumber);
  const baseSha = await github.mainSha();
  assertCurrent(loaded, issue, baseSha);
  await reviewCandidate(github, loaded);
}

async function verifyPublished(github, pull) {
  const issueNumber = issueFromBody(pull.body);
  if (!issueNumber) {
    return;
  }
  const mergeSha = process.env.PUBLISHED_SHA || pull.merge_commit_sha;
  const loaded = await github.loadState(issueNumber);
  if (!loaded.state) {
    await comment(github, issueNumber, "Não há estado desta issue para conferir a versão publicada.");
    return;
  }
  if (loaded.state.status !== "ready_to_merge") {
    await comment(
      github,
      issueNumber,
      "O merge aconteceu antes dos gates liberarem a PR. A tarefa não foi concluída. Reverta o commit do merge se ele não devia entrar."
    );
    return;
  }
  const tests = (loaded.state.plan.tests ?? [])
    .map((test) => (typeof test === "string" ? test : test.path))
    .filter(Boolean);
  let passed = false;
  let findings = [];
  if (tests.length === 0) {
    findings = ["O plano não cita um teste para repetir no merge."];
  } else {
    const result = spawnSync("yarn", ["vitest", "run", ...tests], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 600000,
    });
    passed = result.status === 0;
    if (!passed) {
      findings = [(result.stdout || result.stderr || "vitest failed").slice(-2000)];
    }
  }
  const publish = { head_sha: mergeSha, passed, findings };
  if (passed && mergeSha === pull.merge_commit_sha) {
    await save(github, loaded, "done", { merge_sha: mergeSha, publish });
    await comment(github, issueNumber, `A versão publicada ${mergeSha} passou no aceite. A tarefa está concluída.`);
    return;
  }
  await save(github, loaded, "failed", { merge_sha: mergeSha, publish });
  await comment(
    github,
    issueNumber,
    `A verificação da versão publicada falhou para ${mergeSha}. Reverta o commit do merge.\n\n${findings.join("\n")}`
  );
}

function resolveStart(payload) {
  if (process.env.GITHUB_EVENT_NAME === "issues" && payload.label?.name === "priorizado") {
    return { issue: payload.issue.number, actor: payload.sender.login };
  }
  if (process.env.GITHUB_EVENT_NAME === "workflow_dispatch" && payload.inputs?.action === "start") {
    return { issue: Number(payload.inputs.issue_number), actor: payload.sender.login };
  }
  return null;
}

async function main() {
  const github = createGitHub();
  const { name, payload } = readEvent();
  try {
    if (name === "pull_request" && payload.pull_request?.merged) {
      await verifyPublished(github, payload.pull_request);
      return;
    }
    const started = resolveStart(payload);
    if (started) {
      await start(github, started.issue, started.actor);
      return;
    }
    if (name === "issue_comment" && payload.action === "created" && payload.sender?.type === "User") {
      await approve(github, payload.issue.number, payload.sender.login, payload.comment.body, payload.comment.id);
      return;
    }
    if (name === "workflow_run" && payload.workflow_run?.conclusion === "success") {
      await onCi(github, payload.workflow_run.head_sha);
      return;
    }
    if (name === "workflow_dispatch" && payload.inputs?.action === "complete") {
      const loaded = await github.loadState(Number(payload.inputs.issue_number));
      if (loaded.state?.head_sha) {
        await onCi(github, loaded.state.head_sha);
      }
    }
  } catch (error) {
    const message = String(error.message || error).replaceAll(github.token, "[token]");
    const issueNumber =
      payload.issue?.number ||
      Number(payload.inputs?.issue_number) ||
      issueFromBody(payload.pull_request?.body || "");
    if (issueNumber) {
      await github.comment(issueNumber, `A etapa foi interrompida.\n\n${message}`).catch(() => {});
    }
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main();
}
