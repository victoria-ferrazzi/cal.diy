import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GateError } from "./policy.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function extractJsonObject(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  const source = fenced ? fenced[1] : text;
  const start = source.indexOf("{");
  if (start < 0) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function parseAgentStdout(stdout) {
  const trimmed = stdout.trim();
  let envelope;
  try {
    envelope = JSON.parse(trimmed);
  } catch {
    const start = trimmed.lastIndexOf("\n{");
    if (start < 0) {
      throw new GateError("cursor-agent did not return a JSON envelope");
    }
    envelope = JSON.parse(trimmed.slice(start + 1));
  }
  if (envelope.is_error) {
    throw new GateError(envelope.result || "cursor-agent reported an error");
  }
  const text = typeof envelope.result === "string" ? envelope.result : JSON.stringify(envelope.result ?? "");
  const value = extractJsonObject(text);
  if (!value) {
    throw new GateError("Agent response is not JSON");
  }
  return value;
}

export function runAgent(prompt, { timeoutMs = 180000, binary = process.env.CURSOR_AGENT || "cursor-agent" } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ["-p", "--trust", "--output-format", "json", prompt], {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new GateError("cursor-agent timed out"));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const output = Buffer.concat(stdout).toString("utf8");
      if (code !== 0) {
        const errorText = Buffer.concat(stderr).toString("utf8").trim();
        reject(new GateError(errorText || `cursor-agent exited with code ${code}`));
        return;
      }
      try {
        resolve(parseAgentStdout(output));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export { repoRoot };
