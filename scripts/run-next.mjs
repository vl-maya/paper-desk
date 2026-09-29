/**
 * Load .env* before the Next CLI so PORT applies to dev/start.
 * Avoids `node --env-file`, which Next 16 forwards into NODE_OPTIONS (blocked on Node 22).
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!command || !["dev", "start"].includes(command)) {
  console.error("Usage: node scripts/run-next.mjs <dev|start> [next args...]");
  process.exit(1);
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const envFiles =
  command === "dev"
    ? [".env", ".env.local", ".env.development", ".env.development.local"]
    : [".env", ".env.local", ".env.production", ".env.production.local"];

const fileEnv = {};
for (const f of envFiles) {
  Object.assign(fileEnv, parseEnvFile(join(root, f)));
}

const env = {
  ...process.env,
  ...fileEnv,
  NODE_ENV:
    process.env.NODE_ENV ||
    (command === "dev" ? "development" : "production"),
};

const hasPortFlag = extraArgs.some(
  (a, i) =>
    a === "-p" ||
    a === "--port" ||
    a.startsWith("--port=") ||
    (i > 0 && (extraArgs[i - 1] === "-p" || extraArgs[i - 1] === "--port")),
);

const nextBin = join(root, "node_modules/next/dist/bin/next");
const args = [nextBin, command, ...extraArgs];
if (!hasPortFlag && env.PORT) {
  args.push("-p", String(env.PORT));
}

const child = spawn(process.execPath, args, {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
