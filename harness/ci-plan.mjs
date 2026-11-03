import process from "node:process";

const body = process.env.PR_BODY ?? "";
const match = body.match(/<!-- harness-plan\s*([\s\S]*?)\s*-->/);

if (!match) {
  process.stderr.write("PR body is missing the harness plan.\n");
  process.exit(1);
}

const plan = JSON.parse(match[1]);
const tests = (plan.tests ?? [])
  .map((test) => (typeof test === "string" ? test : test.path))
  .filter((testPath) => typeof testPath === "string" && testPath.length > 0);

if (tests.length === 0) {
  process.stderr.write("The plan cites no test.\n");
  process.exit(1);
}

process.stdout.write(`${tests.join("\n")}\n`);
