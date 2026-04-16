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
  await runInit();
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
    `  ${dim("跨平台金融工具 · MCP Server + CLI")}`,
    "",
    `  ${h("用法")}`,
    `    ${cmd("openfinclaw")} ${dim("<command>")} ${dim("[options]")}`,
    "",
    `  ${h("行情数据")}`,
    `    ${cmd("price")}        ${dim("<symbol>")}              实时价格 (股票/加密/指数)`,
    `    ${cmd("kline")}        ${dim("<symbol>")} ${dim("[--limit N]")}   K线/OHLCV 数据`,
    `    ${cmd("crypto")}       ${dim("<action>")}              加密市场数据 (ticker/ohlcv/trending/...)`,
    `    ${cmd("compare")}      ${dim("<s1,s2,...>")}           多资产价格对比`,
    `    ${cmd("search")}       ${dim("<query>")}               搜索代码/名称`,
    "",
    `  ${h("策略管理")}`,
    `    ${cmd("leaderboard")} ${dim("[--board T] [--limit]")}  查看排行榜`,
    `    ${cmd("strategy-info")} ${dim("<id>")}                 从 Hub 获取策略详情`,
    `    ${cmd("fork")}         ${dim("<id>")}                   Fork 策略到本地`,
    `    ${cmd("list-strategies")}                       列出本地策略`,
    `    ${cmd("validate")}     ${dim("<dir>")}                 校验策略包 (FEP v2.0)`,
    `    ${cmd("publish")}      ${dim("<zip>")}                 发布策略 ZIP`,
    `    ${cmd("publish-verify")} ${dim("--submission-id …")}  查询发布/回测状态`,
    "",
    `  ${h("系统")}`,
    `    ${cmd("init")}                                     交互式配置向导`,
    `    ${cmd("update")}                                   升级到最新版本`,
    `    ${cmd("serve")} ${dim("[--tools=<groups>]")}            启动 MCP Server`,
    `    ${cmd("doctor")}                                  诊断配置与连接`,
    "",
    `  ${h("选项")}`,
    `    ${dim("--api-key <key>")}          覆盖 API Key`,
    `    ${dim("--output json")}            以 JSON 输出（便于管道处理）`,
    `    ${dim("-h, --help")}               显示帮助`,
    `    ${dim("-v, --version")}            显示版本`,
    "",
    `  ${h("API Key 解析顺序")}`,
    `    ${dim("1.")} --api-key   ${dim("2.")} OPENFINCLAW_API_KEY   ${dim("3.")} ~/.openfinclaw/config.json`,
    "",
    `  ${h("示例")}`,
    `    ${green("$")} openfinclaw ${cmd("price")} AAPL`,
    `    ${green("$")} openfinclaw ${cmd("kline")} BTC/USDT --limit 30`,
    `    ${green("$")} openfinclaw ${cmd("leaderboard")} --limit 10`,
    `    ${green("$")} openfinclaw ${cmd("fork")} <uuid>`,
    `    ${green("$")} openfinclaw ${cmd("doctor")}`,
    "",
    `  ${dim(`${sym.bullet} 文档:`)} ${color.cyan("https://github.com/mirror29/openfinclaw-cli")}`,
    "",
  ];
  console.log(lines.join("\n"));
}
