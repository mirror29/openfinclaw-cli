#!/usr/bin/env node
/**
 * Copies the monorepo `version` from the root `package.json` into each
 * publishable workspace package so `@openfinclaw/core` and `@openfinclaw/cli`
 * stay aligned.
 *
 * Usage: after bumping the root `version`, run `pnpm sync-versions`.
 * @module scripts/align-package-versions
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const rootPath = join(rootDir, "package.json");
const root = JSON.parse(readFileSync(rootPath, "utf-8"));
const v = root.version;
if (typeof v !== "string" || !/^\d+\.\d+\.\d+/.test(v)) {
  throw new Error(`Root package.json must have a semver "version" field (got ${JSON.stringify(v)})`);
}

for (const rel of ["packages/core/package.json", "packages/cli/package.json"]) {
  const p = join(rootDir, rel);
  const pkg = JSON.parse(readFileSync(p, "utf-8"));
  pkg.version = v;
  writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");
}

console.log(`Aligned @openfinclaw/core and @openfinclaw/cli to ${v}`);
