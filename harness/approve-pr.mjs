import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policyPath = path.join(repoRoot, "harness", "policies", "pr-auto-approval.json");

export function fileAllowed(file, patterns) {
  const normalized = file.replaceAll("\\", "/");
  return patterns.some((pattern) => {
    if (pattern === "*.md") {
      return normalized.endsWith(".md");
    }
    if (pattern === "packages/i18n/locales/**/*.json") {
      return normalized.startsWith("packages/i18n/locales/") && normalized.endsWith(".json");
    }
    return false;
  });
}

export function parseNumstat(text) {
  const files = [];
  let changedLines = 0;
  let unmeasurable = false;
  for (const line of text.split("\n")) {
    if (!line.trim()) {
      continue;
    }
    const [added, deleted, file] = line.split("\t");
    if (added === "-" || deleted === "-") {
      unmeasurable = true;
    } else {
      changedLines += Number(added) + Number(deleted);
    }
    if (file) {
      files.push(file);
    }
  }
  return { files, changedLines, unmeasurable };
}

export function judge({ policy, evidence, diff, head }) {
  const reasons = [];
  const sha = evidence.sha;
  if (diff.unmeasurable) {
    reasons.push("o diff tem arquivo sem contagem de linhas");
  }
  if (diff.files.length === 0) {
    reasons.push("o diff não tem arquivos");
  }
  for (const file of diff.files) {
    if (!fileAllowed(file, policy.allowed)) {
      reasons.push(`arquivo fora da allowlist: ${file}`);
    }
  }
  if (!diff.unmeasurable && diff.changedLines > policy.maxChangedLines) {
    reasons.push(`diff com ${diff.changedLines} linhas, acima de ${policy.maxChangedLines}`);
  }
  const checks = Array.isArray(evidence.checks) ? evidence.checks : [];
  if (!Array.isArray(evidence.checks)) {
    reasons.push("evidência de checks ausente");
  }
  for (const name of policy.requiredChecks) {
    const found = checks.find((check) => check.name === name);
    if (!found) {
      reasons.push(`check ausente: ${name}`);
      continue;
    }
    if (found.sha !== sha) {
      reasons.push(`check ${name} refere-se a outro commit`);
      continue;
    }
    if (found.passed !== true) {
      reasons.push(`check ${name} não passou`);
    }
  }
  if (head !== sha) {
    reasons.push(`a cabeça da PR é ${head}, e as evidências são do commit ${sha}`);
  }
  if (reasons.length > 0) {
    return { pr: evidence.pr, sha, decision: "human-review", reasons };
  }
  return {
    pr: evidence.pr,
    sha,
    decision: "auto-approve",
    reasons: [
      "os arquivos do diff estão na allowlist",
      `o diff tem ${diff.changedLines} linhas, dentro do limite de ${policy.maxChangedLines}`,
      "os checks exigidos passaram para este commit",
      "a cabeça da PR é o commit das evidências",
    ],
  };
}

function run(command, args) {
  return spawnSync(command, args, { cwd: repoRoot, encoding: "utf8" });
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function approve(evidenceDir) {
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  const evidence = JSON.parse(await readFile(path.join(evidenceDir, "evidence.json"), "utf8"));
  if (!Number.isInteger(evidence.pr) || typeof evidence.sha !== "string" || evidence.sha === "") {
    throw new Error("evidence.json precisa de pr numérico e sha");
  }

  const commit = run("git", ["cat-file", "-e", `${evidence.sha}^{commit}`]);
  if (commit.status !== 0) {
    throw new Error(`git não tem o commit ${evidence.sha}`);
  }

  const viewed = run("gh", [
    "pr",
    "view",
    String(evidence.pr),
    "--json",
    "number,headRefOid,baseRefOid",
  ]);
  if (viewed.status !== 0) {
    throw new Error(viewed.stderr.trim() || `não foi possível ler a PR ${evidence.pr}`);
  }
  const pull = JSON.parse(viewed.stdout);
  if (!pull.baseRefOid || !pull.headRefOid) {
    throw new Error(`a PR ${evidence.pr} não informou a base ou a cabeça`);
  }

  const diff = run("git", ["diff", "--numstat", `${pull.baseRefOid}...${evidence.sha}`]);
  if (diff.status !== 0) {
    throw new Error(diff.stderr.trim() || "git diff falhou");
  }

  const decision = judge({
    policy,
    evidence,
    diff: parseNumstat(diff.stdout),
    head: pull.headRefOid,
  });
  await writeFile(path.join(evidenceDir, "decision.json"), `${JSON.stringify(decision, null, 2)}\n`);
  return decision;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const evidenceDir = process.argv[2];
  if (!evidenceDir) {
    fail("Uso: node harness/approve-pr.mjs <diretório-de-evidências>");
  }
  try {
    const decision = await approve(path.resolve(evidenceDir));
    process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
  } catch (error) {
    fail(error.message);
  }
}
