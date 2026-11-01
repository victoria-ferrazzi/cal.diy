import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function parseRunArgs(argv) {
  const extraArgs = [];
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--agent-arg") {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new Error("Missing value for --agent-arg");
      }
      extraArgs.push(value);
      index += 1;
      continue;
    }
    positionals.push(argv[index]);
  }
  return { task: positionals.join(" ").trim(), extraArgs };
}

export async function runTask(task, { extraArgs = [] } = {}) {
  const id = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(repoRoot, "harness", "runs", id);
  await mkdir(dir, { recursive: true });

  if (!task) {
    const error = "Missing task. Usage: node harness/run.mjs \"<task>\"";
    await writeRun(dir, { state: "failed", exitCode: 1, error, stdout: "", stderr: error });
    return { dir, state: "failed", exitCode: 1, error, result: "" };
  }

  const args = ["-p", "--trust", "--output-format", "json", ...extraArgs, task];
  const child = spawn("cursor-agent", args, {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));

  const exitCode = await new Promise((resolve) => {
    child.on("error", (error) => {
      stderr.push(Buffer.from(error.message));
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 1));
  });

  const result = Buffer.concat(stdout).toString("utf8");
  const errorText = Buffer.concat(stderr).toString("utf8").trim();
  const state = exitCode === 0 ? "completed" : "failed";
  const error = state === "failed" ? errorText || `cursor-agent exited with code ${exitCode}` : null;
  await writeRun(dir, { state, exitCode, error, stdout: result, stderr: errorText });
  return { dir, state, exitCode, error, result };
}

async function writeRun(dir, { state, exitCode, error, stdout, stderr }) {
  await writeFile(path.join(dir, "result.txt"), stdout);
  await writeFile(path.join(dir, "error.txt"), stderr);
  await writeFile(
    path.join(dir, "status.json"),
    `${JSON.stringify({ state, exitCode, error }, null, 2)}\n`
  );
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  try {
    const { task, extraArgs } = parseRunArgs(process.argv.slice(2));
    const run = await runTask(task, { extraArgs });
    process.stdout.write(`${run.dir}\n`);
    process.exit(run.state === "completed" ? 0 : 1);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
