/**
 * Self-update command — upgrades @openfinclaw/cli to the latest npm version.
 * @module @openfinclaw/cli/update
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getCurrentVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function getLatestVersion(): string {
  const output = execSync("npm view @openfinclaw/cli version", { encoding: "utf-8" }).trim();
  return output;
}

function detectPackageManager(): { cmd: string; name: string } {
  const execPath = process.execPath;
  if (execPath.includes(".nvm/") || execPath.includes("nvm/versions")) {
    return { cmd: "npm", name: "npm" };
  }
  if (execPath.includes("volta") || process.env.VOLTA_HOME) {
    return { cmd: "npm", name: "npm (volta)" };
  }
  if (execPath.includes("pnpm") || process.env.PNPM_HOME) {
    return { cmd: "pnpm", name: "pnpm" };
  }
  return { cmd: "npx", name: "npx" };
}

export async function runUpdate() {
  const current = getCurrentVersion();

  console.log(`\n  OpenFinClaw CLI self-update\n`);
  console.log(`  Current: v${current}`);

  let latest: string;
  try {
    latest = getLatestVersion();
  } catch {
    console.error("  ✗ Failed to fetch the latest version — check your network connection.");
    process.exit(1);
  }

  console.log(`  Latest : v${latest}`);

  if (current === latest) {
    console.log(`\n  Already on the latest version — nothing to do.\n`);
    return;
  }

  console.log(`\n  Updating v${current} → v${latest}...\n`);

  try {
    const pm = detectPackageManager();
    if (pm.cmd === "npx") {
      execSync(`npm install -g @openfinclaw/cli@latest`, { stdio: "inherit" });
    } else if (pm.cmd === "pnpm") {
      execSync(`pnpm add -g @openfinclaw/cli@latest`, { stdio: "inherit" });
    } else {
      execSync(`npm install -g @openfinclaw/cli@latest`, { stdio: "inherit" });
    }
    console.log(`\n  ✓ Update complete! v${current} → v${latest}\n`);
  } catch {
    console.error(`\n  ✗ Update failed — run one of these manually:\n`);
    console.error(`    npm install -g @openfinclaw/cli@latest\n`);
    console.error(`  or\n`);
    console.error(`    pnpm add -g @openfinclaw/cli@latest\n`);
    process.exit(1);
  }
}
