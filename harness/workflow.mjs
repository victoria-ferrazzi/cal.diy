import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTask } from "./run.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const taskA =
  "Localize o fluxo de disponibilidade e liste os arquivos envolvidos. Não edite arquivos. Não rode comandos que alterem o repositório.";

export function citedPaths(text) {
  const matches = text.match(/[A-Za-z0-9_@.-]+(?:\/[A-Za-z0-9_@.-]+)+/g) ?? [];
  return [...new Set(matches)];
}

export function validateResult(result, exitCode) {
  if (exitCode !== 0) {
    return { ok: false, reason: `call A exited with code ${exitCode}` };
  }
  if (!result.trim()) {
    return { ok: false, reason: "call A produced an empty result" };
  }
  const existing = citedPaths(result).filter((candidate) => existsSync(path.join(repoRoot, candidate)));
  if (existing.length === 0) {
    return { ok: false, reason: "call A cited no path that exists in the repository" };
  }
  return { ok: true, paths: existing };
}

export async function runWorkflow({ failA = false } = {}) {
  const id = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(repoRoot, "harness", "runs", `workflow-${id}`);
  await mkdir(dir, { recursive: true });

  const extraArgs = failA ? ["--output-format", "nao-existe"] : [];
  const first = await runTask(taskA, { extraArgs });
  const validation = validateResult(first.result, first.exitCode);

  const record = {
    continued: false,
    reason: validation.ok ? null : validation.reason,
    runA: first.dir,
    runB: null,
  };

  if (!validation.ok) {
    await writeFile(path.join(dir, "controller.json"), `${JSON.stringify(record, null, 2)}\n`);
    return { dir, ...record };
  }

  const taskB = [
    "Resuma o que estes arquivos fazem no fluxo de disponibilidade.",
    "Não edite arquivos.",
    "Use somente o resultado abaixo.",
    "",
    await readFile(path.join(first.dir, "result.txt"), "utf8"),
  ].join("\n");
  const second = await runTask(taskB);
  record.continued = true;
  record.reason = null;
  record.runB = second.dir;
  await writeFile(path.join(dir, "controller.json"), `${JSON.stringify(record, null, 2)}\n`);
  return { dir, ...record };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const failA = process.argv.includes("--fail-a");
  const workflow = await runWorkflow({ failA });
  process.stdout.write(`${workflow.dir}\n`);
  process.exit(workflow.continued || failA ? 0 : 1);
}
