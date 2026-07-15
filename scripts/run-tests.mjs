#!/usr/bin/env node
/**
 * Thin compatibility shim around `vitest run`.
 *
 * The CI/agent pipeline (see the harness repo's `scripts/ai_workflow.sh`,
 * "build" stage) always invokes:
 *
 *   npm run test -- --watchAll=false --passWithNoTests
 *
 * Those are Jest CLI flags. Vitest's CLI parser rejects unknown options
 * outright (CACError: Unknown option `--watchAll`), which crashes the
 * process and fails the pipeline's build stage even though the actual
 * test suite passes. `--passWithNoTests` happens to also be a valid
 * Vitest flag, so it's forwarded as-is; `--watchAll`/`--watchAll=<value>`
 * has no Vitest equivalent (Vitest is already non-watching here because
 * of the `run` subcommand) and is simply dropped.
 */
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((arg) => !/^--watchAll(=.*)?$/.test(arg));

const result = spawnSync("npx", ["vitest", "run", ...args], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
