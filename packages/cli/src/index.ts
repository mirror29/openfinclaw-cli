#!/usr/bin/env node
/**
 * OpenFinClaw CLI — MCP Server + CLI dual mode.
 * @module @openfinclaw/cli
 */
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

  const lines = [
    "",
    `  ${color.boldGreen("OpenFinClaw")}  ${dim(`v${getVersion()}`)}`,
    `  ${dim("Cross-platform financial tools · MCP Server + CLI")}`,
    "",
    `  ${h("Usage")}`,
    `    ${cmd("openfinclaw")} ${dim("<command>")} ${dim("[options]")}`,
    "",
    `  ${h("Market data")}`,
    `    ${cmd("price")}        ${dim("<symbol>")}              Real-time quote (stocks / crypto / indices)`,
    `    ${cmd("kline")}        ${dim("<symbol>")} ${dim("[--limit N]")}   K-line / OHLCV data`,
    `    ${cmd("crypto")}       ${dim("<action>")}              Crypto data (ticker / ohlcv / trending / ...)`,
    `    ${cmd("compare")}      ${dim("<s1,s2,...>")}           Multi-asset price comparison`,
    `    ${cmd("search")}       ${dim("<query>")}               Search by ticker / name`,
    "",
    `  ${h("Strategy")}`,
    `    ${cmd("leaderboard")} ${dim("[--board T] [--limit]")}  View leaderboard`,
    `    ${cmd("strategy-info")} ${dim("<id>")}                 Fetch strategy details from Hub`,
    `    ${cmd("fork")}         ${dim("<id>")}                   Fork a strategy locally`,
    `    ${cmd("list-strategies")}                       List local strategies`,
    `    ${cmd("validate")}     ${dim("<dir>")}                 Validate a strategy package (FEP v2.0)`,
    `    ${cmd("publish")}      ${dim("<zip>")}                 Publish strategy ZIP`,
    `    ${cmd("publish-verify")} ${dim("--submission-id …")}  Query publish / backtest status`,
    "",
    `  ${h("DeepAgent (AI research / strategy gen)")}`,
    `    ${cmd("deepagent health")}                        Service health check`,
    `    ${cmd("deepagent skills")} ${dim("[--limit]")}             List 60+ analysis skills`,
    `    ${cmd("deepagent research")} ${dim("\"<query>\"")}        ${green("Streaming")} research (token-by-token)`,
    `    ${cmd("deepagent threads")} ${dim("[list|create|get|delete]")}  Thread CRUD`,
    `    ${cmd("deepagent messages")} ${dim("<threadId>")}        View message history`,
    `    ${cmd("deepagent backtests")}                     Backtest results list`,
    `    ${cmd("deepagent packages")}                      Strategy package list`,
    `    ${cmd("deepagent download")} ${dim("<pkgId>")}            Download strategy ZIP locally`,
    "",
    `  ${h("System")}`,
    `    ${cmd("init")}                                     Interactive setup wizard`,
    `    ${cmd("update")}                                   Upgrade to the latest version`,
    `    ${cmd("serve")} ${dim("[--tools=datahub,strategy,deepagent]")}  Start the MCP Server`,
    `    ${cmd("doctor")}                                  Diagnose config & connectivity`,
    "",
    `  ${h("Options")}`,
    `    ${dim("--api-key <key>")}          Override the API key`,
    `    ${dim("--output json")}            JSON output (pipe-friendly)`,
    `    ${dim("-h, --help")}               Show help`,
    `    ${dim("-v, --version")}            Show version`,
    "",
    `  ${h("API key resolution order")}`,
    `    ${dim("Hub:")}        --api-key  ${dim("→")}  OPENFINCLAW_API_KEY  ${dim("→")}  ~/.openfinclaw/config.json`,
    `    ${dim("DeepAgent:")}  OPENFINCLAW_DEEPAGENT_API_KEY  ${dim("→")}  ~/.openfinclaw/config.json (deepagentApiKey)`,
    "",
    `  ${h("Examples")}`,
    `    ${green("$")} openfinclaw ${cmd("price")} AAPL`,
    `    ${green("$")} openfinclaw ${cmd("kline")} BTC/USDT --limit 30`,
    `    ${green("$")} openfinclaw ${cmd("leaderboard")} --limit 10`,
    `    ${green("$")} openfinclaw ${cmd("fork")} <uuid>`,
    `    ${green("$")} openfinclaw ${cmd("deepagent research")} "Analyse BTC trend over the last 30 days"`,
    `    ${green("$")} openfinclaw ${cmd("doctor")}`,
    "",
    `  ${dim(`${sym.bullet} Docs:`)} ${color.cyan("https://github.com/mirror29/openfinclaw-cli")}`,
    "",
  ];
  console.log(lines.join("\n"));
}
