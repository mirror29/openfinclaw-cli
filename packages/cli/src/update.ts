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

  console.log(`\n  OpenFinClaw CLI 自更新\n`);
  console.log(`  当前版本: v${current}`);

  let latest: string;
  try {
    latest = getLatestVersion();
  } catch {
    console.error("  ✗ 无法获取最新版本，请检查网络连接");
    process.exit(1);
  }

  console.log(`  最新版本: v${latest}`);

  if (current === latest) {
    console.log(`\n  已经是最新版本，无需更新。\n`);
    return;
  }

  console.log(`\n  正在更新 v${current} → v${latest}...\n`);

  try {
    const pm = detectPackageManager();
    if (pm.cmd === "npx") {
      execSync(`npm install -g @openfinclaw/cli@latest`, { stdio: "inherit" });
    } else if (pm.cmd === "pnpm") {
      execSync(`pnpm add -g @openfinclaw/cli@latest`, { stdio: "inherit" });
    } else {
      execSync(`npm install -g @openfinclaw/cli@latest`, { stdio: "inherit" });
    }
    console.log(`\n  ✓ 更新完成! v${current} → v${latest}\n`);
  } catch {
    console.error(`\n  ✗ 更新失败，请手动执行:\n`);
    console.error(`    npm install -g @openfinclaw/cli@latest\n`);
    console.error(`  或\n`);
    console.error(`    pnpm add -g @openfinclaw/cli@latest\n`);
    process.exit(1);
  }
}
