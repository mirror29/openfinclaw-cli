#!/usr/bin/env node
/**
 * OpenFinClaw CLI — MCP Server + CLI dual mode.
 * @module @openfinclaw/cli
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

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

function printHelp() {
  console.log(`
  OpenFinClaw — 跨平台金融工具 (MCP Server + CLI)

  用法:
    openfinclaw <command> [options]

  命令:
    行情数据:
      price <symbol>            查询实时价格 (股票/加密/指数)
      kline <symbol>            获取 K线/OHLCV 数据
      crypto <action>           加密市场数据 (ticker/ohlcv/trending/...)
      compare <symbols>         多资产价格对比 (逗号分隔)
      search <query>            搜索代码/名称

    策略管理:
      leaderboard               查看排行榜
      strategy-info <id>        从 Hub 获取策略详情
      fork <strategyId>         Fork 策略到本地 [--name] [--target-dir]
      list-strategies           列出本地策略
      validate <dir>              校验策略目录 (FEP v2.0)
      publish <zip>             发布策略 ZIP [--visibility]
      publish-verify              查询发布/回测状态 [--submission-id] [--backtest-task-id]

    定时与竞赛:
      daily-scan                  [--strategy-id] [--include-price false]
      price-monitor               [--threshold] [--strategy-id]
      scan-history                [--scan-type] [--limit]
      periodic-report <weekly|monthly>  (或 --period)
      tournament-pick <agent>     bull | bear | contrarian [--user-id]
      tournament-leaderboard
      tournament-result           使用 --round-id --agent --thesis --confidence 等 flags

    系统:
      init                      交互式配置向导 (MCP + ~/.openfinclaw/config.json)
      update                    更新到最新版本
      serve [--tools=<groups>]  启动 MCP Server (Agent 平台连接用)
      doctor                    诊断配置和连接状态

  API Key 解析优先级 (CLI / serve):
    1) --api-key   2) 环境变量 OPENFINCLAW_API_KEY   3) ~/.openfinclaw/config.json (init 写入)
    MCP 客户端子进程通常使用各平台 mcp.json 里的 env，不修改当前 shell；终端未 export 时可用配置文件。

  选项:
    --api-key <key>             本次命令使用的 API Key
    --output <format>           输出格式: table (默认), json
    -h, --help                  显示帮助
    -v, --version               显示版本

  MCP Server 模式:
    openfinclaw serve                    启动全部工具
    openfinclaw serve --tools=datahub    只启动行情数据工具

  示例:
    $ openfinclaw price AAPL
    $ openfinclaw kline BTC/USDT --limit 30
    $ openfinclaw strategy-info <uuid>
    $ openfinclaw init
    $ openfinclaw doctor

  文档: https://github.com/mirror29/openfinclaw-cli
`);
}
