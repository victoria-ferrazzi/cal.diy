import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreIssue } from "./score.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "../../..");

async function loadCases(directory) {
  const names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  const cases = [];
  for (const name of names) {
    cases.push(JSON.parse(await readFile(path.join(directory, name), "utf8")));
  }
  return cases;
}

function formatScore(result) {
  return result.inconclusive ? "inconclusivo" : String(result.score);
}

function comparison(runs) {
  const lines = [
    "# Comparação",
    "",
    "Nota zero é uma issue clara. Inconclusivo é falha da avaliação e não é nota zero.",
    "",
    "## Casos de calibração",
    "",
    "| Caso | Humana | Execução 1 | Execução 2 |",
    "| --- | --- | --- | --- |",
  ];
  const grouped = new Map();
  for (const run of runs.filter((item) => item.set === "calibration")) {
    const bucket = grouped.get(run.id) ?? [];
    bucket.push(run);
    grouped.set(run.id, bucket);
  }
  for (const [id, bucket] of grouped) {
    const [first, second] = bucket;
    lines.push(`| ${id} | ${first.humanScore} | ${formatScore(first.result)} | ${formatScore(second.result)} |`);
  }
  lines.push("", "## Divergências", "");
  let divergences = 0;
  for (const [id, bucket] of grouped) {
    for (const run of bucket) {
      if (run.result.inconclusive || run.result.score !== run.humanScore) {
        divergences += 1;
        lines.push(`### ${id}, execução ${run.attempt}`);
        lines.push("");
        lines.push(`Referência humana (${run.humanScore}): ${run.humanJustification}`);
        lines.push("");
        if (run.result.inconclusive) {
          lines.push(`Avaliação inconclusiva: ${run.result.error}`);
        } else {
          lines.push(`Juiz (${run.result.score}), modelo ${run.result.model}.`);
          lines.push(`Evidências: ${run.result.evidence.join(" | ") || "nenhuma"}`);
          lines.push(`Ausências: ${run.result.missing.join(" | ") || "nenhuma"}`);
          lines.push(`Perguntas: ${run.result.questions.join(" | ") || "nenhuma"}`);
        }
        lines.push("");
      }
    }
  }
  if (divergences === 0) {
    lines.push("Nenhuma execução divergiu da referência humana.");
    lines.push("");
  }

  lines.push("## Issues reservadas", "");
  lines.push("Estas issues não orientam ajuste da rubrica.", "");
  lines.push("| Caso | Humana | Execução |");
  lines.push("| --- | --- | --- |");
  for (const run of runs.filter((item) => item.set === "holdout")) {
    lines.push(`| ${run.id} | ${run.humanScore} | ${formatScore(run.result)} |`);
  }
  lines.push("");
  return lines.join("\n");
}

export async function runEvaluation() {
  const rubric = await readFile(path.join(root, "rubric-v1.md"), "utf8");
  const context = await readFile(path.join(root, "context.md"), "utf8");
  const calibration = await loadCases(path.join(root, "cases"));
  const holdout = await loadCases(path.join(root, "holdout"));
  const runs = [];

  for (const issue of calibration) {
    for (const attempt of [1, 2]) {
      process.stderr.write(`calibration ${issue.id} ${attempt}\n`);
      const result = scoreIssue({ rubric, context, issue });
      runs.push({
        set: "calibration",
        id: issue.id,
        attempt,
        humanScore: issue.humanScore,
        humanJustification: issue.humanJustification,
        result,
      });
    }
  }
  for (const issue of holdout) {
    process.stderr.write(`holdout ${issue.id} 1\n`);
    const result = scoreIssue({ rubric, context, issue });
    runs.push({
      set: "holdout",
      id: issue.id,
      attempt: 1,
      humanScore: issue.humanScore,
      humanJustification: issue.humanJustification,
      result,
    });
  }

  const id = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(root, "reports", id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "results.json"), `${JSON.stringify({ rubricVersion: "v1", runs }, null, 2)}\n`);
  await writeFile(path.join(dir, "comparison.md"), comparison(runs));
  return dir;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const dir = await runEvaluation();
  process.stdout.write(`${path.relative(repoRoot, dir)}\n`);
}
