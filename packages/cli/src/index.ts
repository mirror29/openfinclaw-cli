#!/usr/bin/env node
/**
 * OpenFinClaw CLI — MCP Server + CLI dual mode.
 * @module @openfinclaw/cli
 */

const command = process.argv[2];

if (!command || command === "serve") {
  const { startMcpServer } = await import("./mcp.js");
  await startMcpServer();
} else if (command === "init") {
  const { runInit } = await import("./init.js");
  await runInit();
} else if (command === "--help" || command === "-h") {
  printHelp();
} else if (command === "--version" || command === "-v") {
  console.log("0.1.0");
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

    系统:
      init                      交互式配置向导 (多平台 MCP 配置)
      serve [--tools=<groups>]  启动 MCP Server (Agent 平台连接用)
      doctor                    诊断配置和连接状态

  选项:
    --api-key <key>             API Key (或设置 OPENFINCLAW_API_KEY 环境变量)
    --output <format>           输出格式: table (默认), json
    -h, --help                  显示帮助
    -v, --version               显示版本

  MCP Server 模式:
    openfinclaw serve                    启动全部工具
    openfinclaw serve --tools=datahub    只启动行情数据工具

  示例:
    $ openfinclaw price AAPL
    $ openfinclaw kline BTC/USDT --limit 30
    $ openfinclaw compare AAPL,GOOGL,MSFT
    $ openfinclaw search "tesla"
    $ openfinclaw init

  文档: https://github.com/mirror29/openfinclaw-cli
`);
}
