#!/usr/bin/env node
/**
 * OpenFinClaw CLI — MCP Server + CLI dual mode.
 * @module @openfinclaw/cli
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { color, sym } from "./styles.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Whether the bare `openfinclaw` command resolves on the *user's* PATH.
 *
 * When npx invokes this binary, it first prepends its ephemeral cache dir
 * to PATH, so a naive `command -v openfinclaw` always returns true inside
 * the child process — even though the user's shell won't find it after
 * the invocation returns. We detect that by looking at `process.argv[1]`:
 * under npx it points into `…/_npx/…`. In that case we report "not on
 * PATH" so examples fall back to `npx -y @openfinclaw/cli <cmd>`.
 */
function isOpenfinclawOnPath(): boolean {
  const self = process.argv[1] ?? "";
  if (/[\\/]_npx[\\/]|[\\/]\.npm[\\/]_npx[\\/]/.test(self)) {
    return false;
  }
  try {
    if (process.platform === "win32") {
      execFileSync("where", ["openfinclaw"], { stdio: "ignore", windowsHide: true });
    } else {
      execFileSync("sh", ["-c", "command -v openfinclaw"], { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

const command = process.argv[2];

if (!command || command === "serve") {
  const { startMcpServer } = await import("./mcp.js");
  await startMcpServer();
} else if (command === "init") {
  const { runInit } = await import("./init.js");
  await runInit(process.argv.slice(3));
} else if (command === "update") {
  const { runUpdate } = await import("./update.js");
  await runUpdate();
} else if (command === "examples") {
  const { runExamples } = await import("./examples.js");
  runExamples(process.argv.slice(3));
} else if (command === "--help" || command === "-h") {
  printHelp();
} else if (command === "--version" || command === "-v") {
  console.log(getVersion());
} else {
  const { runCli } = await import("./cli.js");
  await runCli(command, process.argv.slice(3));
}

/**
 * Print a styled help message with grouped commands and examples.
 */
function printHelp() {
  const h = (s: string) => color.boldCyan(s);
  const cmd = (s: string) => color.bold(s);
  const dim = color.gray;
  const green = color.green;

  const installed = isOpenfinclawOnPath();
  // When not globally installed, copy-paste-safe examples need the `npx` prefix.
  const runPrefix = installed ? "openfinclaw" : "npx -y @openfinclaw/cli";

  const installBanner = installed
    ? null
    : [
        "",
        `  ${color.yellow("⚠")}  ${color.bold("`openfinclaw` is not on your PATH.")} ${dim("Examples below use")} ${color.cyan("npx -y @openfinclaw/cli")} ${dim("to stay copy-paste-safe.")}`,
        `     ${dim("For a shorter")} ${cmd("openfinclaw <cmd>")} ${dim("command, install globally:")}`,
        `       ${green("$")} ${color.cyan("npm install -g @openfinclaw/cli")}    ${dim("# or: pnpm add -g @openfinclaw/cli")}`,
      ];

  const lines = [
    "",
    `  ${color.boldGreen("OpenFinClaw")}  ${dim(`v${getVersion()}`)}`,
    `  ${dim("Your quant research team, in one prompt.")}`,
    `  ${dim("Research · strategy · backtest · paper trade — inside Claude Code, Cursor, and 20+ AI agents.")}`,
    ...(installBanner ?? []),
    "",
    `  ${h("Usage")}`,
    `    ${cmd(runPrefix)} ${dim("<command>")} ${dim("[options]")}`,
    "",
    `  ${h("DeepAgent (one-stop quant agent — needs DeepAgent key)")}`,
    `    ${cmd("deepagent research")} ${dim("\"<query>\"")}        ${green("Streaming")} research / analysis / report / strategy (token-by-token)`,
    `    ${cmd("deepagent health")}                        Service health check (public, no key needed)`,
    `    ${cmd("deepagent skills")} ${dim("[--limit]")}             List 60+ analysis skills`,
    `    ${cmd("deepagent threads")} ${dim("[list|create|get|delete]")}  Thread CRUD`,
    `    ${cmd("deepagent messages")} ${dim("<threadId>")}        View message history`,
    `    ${cmd("deepagent backtests")}                     Backtest results list`,
    `    ${cmd("deepagent packages")}                      Strategy package list`,
    `    ${cmd("deepagent download")} ${dim("<pkgId>")}            Download strategy ZIP locally`,
    "",
    `  ${h("Strategy (advanced local FEP v2.0 workflow — needs Hub key)")}`,
    `    ${cmd("leaderboard")} ${dim("[--board T] [--limit]")}  View Hub leaderboard`,
    `    ${cmd("strategy-info")} ${dim("<id>")}                 Fetch strategy details from Hub`,
    `    ${cmd("fork")}         ${dim("<id>")}                   Fork a strategy locally`,
    `    ${cmd("list-strategies")}                       List local strategies`,
    `    ${cmd("validate")}     ${dim("<dir>")}                 Validate a strategy package (FEP v2.0)`,
    `    ${cmd("publish")}      ${dim("<zip>")}                 Publish strategy ZIP`,
    `    ${cmd("publish-verify")} ${dim("--submission-id …")}  Query publish / backtest status`,
    "",
    `  ${h("System")}`,
    `    ${cmd("init")}                                     Interactive setup wizard`,
    `    ${cmd("update")}                                   Upgrade to the latest version`,
    `    ${cmd("examples")} ${dim("[category]")}                     Show 10+ ready-to-run prompts`,
    `    ${cmd("serve")} ${dim("[--tools=strategy,deepagent]")}       Start the MCP Server`,
    `    ${cmd("doctor")}                                  Diagnose config & connectivity`,
    "",
    `  ${h("Options")}`,
    `    ${dim("--api-key <key>")}          Override the API key`,
    `    ${dim("--output json")}            JSON output (pipe-friendly)`,
    `    ${dim("-h, --help")}               Show help`,
    `    ${dim("-v, --version")}            Show version`,
    "",
    `  ${h("API key resolution order")}`,
    `    ${dim("Hub (strategy):")} --api-key  ${dim("→")}  OPENFINCLAW_API_KEY  ${dim("→")}  ~/.openfinclaw/config.json`,
    `    ${dim("DeepAgent:")}      OPENFINCLAW_DEEPAGENT_API_KEY  ${dim("→")}  ~/.openfinclaw/config.json (deepagentApiKey)`,
    `    ${dim("Note:")} ${cmd("deepagent *")} ${dim("and")} ${cmd("doctor")} ${dim("do NOT require the Hub key.")}`,
    "",
    `  ${h("Examples")}`,
    `    ${green("$")} ${runPrefix} ${cmd("deepagent research")} "Research NVDA last 90 days, propose a momentum strategy and backtest 1y"`,
    `    ${green("$")} ${runPrefix} ${cmd("deepagent health")}`,
    `    ${green("$")} ${runPrefix} ${cmd("leaderboard")} --limit 10`,
    `    ${green("$")} ${runPrefix} ${cmd("fork")} <uuid>`,
    `    ${green("$")} ${runPrefix} ${cmd("doctor")}`,
    "",
    `  ${h("Links")}`,
    `    ${dim(`${sym.bullet} Try online:`)} ${color.cyan("https://hub.openfinclaw.ai/en/chat")}  ${dim("← no install required")}`,
    `    ${dim(`${sym.bullet} Docs:`)}       ${color.cyan("https://github.com/mirror29/openfinclaw-cli")}`,
    "",
  ];
  console.log(lines.join("\n"));
}
