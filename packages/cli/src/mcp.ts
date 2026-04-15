/**
 * MCP Server mode — registers tools via Model Context Protocol.
 * @module @openfinclaw/cli/mcp
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  resolveOpenFinClawConfig,
  executeFinPrice,
  executeFinKline,
  executeFinCrypto,
  executeFinCompare,
  executeFinSlimSearch,
  executeSkillLeaderboard,
  executeSkillGetInfo,
  executeSkillFork,
  executeSkillListLocal,
  executeSkillValidate,
  executeSkillPublish,
  executeSkillPublishVerify,
  executeStrategyDailyScan,
  executeStrategyPriceMonitor,
  executeStrategyScanHistory,
  executeStrategyPeriodicReport,
  executeTournamentPick,
  executeTournamentLeaderboard,
  executeTournamentResult,
  OPENFINCLAW_AGENT_GUIDANCE,
  type OpenFinClawConfig,
} from "@openfinclaw/core";

/** Parse --tools=datahub,strategy from argv */
function parseToolGroups(argv: string[]): string[] {
  const ALL_GROUPS = ["datahub", "strategy", "scheduler", "tournament"];
  for (const arg of argv) {
    if (arg.startsWith("--tools=")) {
      const groups = arg
        .slice("--tools=".length)
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);
      return groups.filter((g) => ALL_GROUPS.includes(g));
    }
  }
  return ALL_GROUPS;
}

/** Wrap tool handler with error handling */
function wrapHandler<P>(
  config: OpenFinClawConfig,
  fn: (params: P, config: OpenFinClawConfig) => Promise<unknown>,
) {
  return async (params: P) => {
    try {
      const result = await fn(params, config);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(err) }) }],
      };
    }
  };
}

export async function startMcpServer() {
  const config = resolveOpenFinClawConfig();
  const groups = parseToolGroups(process.argv);
  const server = new McpServer({ name: "openfinclaw", version: "0.1.0" });

  if (groups.includes("datahub")) {
    server.tool(
      "fin_price",
      "Get current/latest price for stocks (A/HK/US), crypto, or index",
      {
        symbol: z.string().describe(
          "Asset symbol. Crypto: BTC/USDT, ETH/USDT; A-share: 600519.SH; HK: 00700.HK; US: AAPL",
        ),
        market: z.enum(["crypto", "equity"]).optional().describe("Market type. Auto-detected if omitted."),
      },
      wrapHandler(config, executeFinPrice),
    );

    server.tool(
      "fin_kline",
      "Fetch historical OHLCV (candlestick) data for any asset",
      {
        symbol: z.string().describe("Asset symbol (BTC/USDT, 600519.SH, AAPL, etc.)"),
        market: z.enum(["crypto", "equity"]).optional().describe("Market type (auto-detected if omitted)"),
        limit: z.number().optional().describe("Number of bars to return (default: 30)"),
      },
      wrapHandler(config, executeFinKline),
    );

    server.tool(
      "fin_crypto",
      "Crypto market data (ticker/orderbook/trades/DeFi/CoinGecko metrics)",
      {
        endpoint: z.enum([
          "market/ticker", "market/tickers", "market/orderbook", "market/trades",
          "market/funding_rate", "coin/market", "coin/historical", "coin/info",
          "coin/categories", "coin/trending", "coin/global_stats",
          "defi/protocols", "defi/tvl_historical", "defi/protocol_tvl", "defi/chains",
          "defi/yields", "defi/stablecoins", "defi/fees", "defi/dex_volumes",
          "defi/bridges", "defi/coin_prices", "price/historical", "search",
        ]).describe("DataHub crypto endpoint path"),
        symbol: z.string().optional().describe("Coin ID, trading pair, or protocol slug"),
        start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
        limit: z.number().optional().describe("Max results (default: 20)"),
      },
      wrapHandler(config, executeFinCrypto),
    );

    server.tool(
      "fin_compare",
      "Compare prices of 2-5 assets side by side with weekly change",
      {
        symbols: z.string().describe("Comma-separated symbols (2-5). Example: BTC/USDT,ETH/USDT,600519.SH"),
      },
      wrapHandler(config, executeFinCompare),
    );

    server.tool(
      "fin_slim_search",
      "Search for stock/crypto symbols by name or keyword",
      {
        query: z.string().describe("Search keyword (e.g. '茅台', 'bitcoin', 'Tesla')"),
        market: z.enum(["crypto", "equity"]).optional().describe("Limit search to market type"),
      },
      wrapHandler(config, executeFinSlimSearch),
    );
  }

  // ── Strategy tools ──
  if (groups.includes("strategy")) {
    server.tool(
      "skill_leaderboard",
      "Query strategy leaderboard from Hub",
      {
        boardType: z.enum(["composite", "returns", "risk", "popular", "rising"]).optional().describe("Leaderboard type (default: composite)"),
        limit: z.number().optional().describe("Max results (max 100, default: 20)"),
        offset: z.number().optional().describe("Pagination offset"),
      },
      wrapHandler(config, executeSkillLeaderboard),
    );

    server.tool(
      "skill_get_info",
      "Get strategy details from Hub",
      {
        strategyId: z.string().describe("Strategy ID (UUID or Hub URL)"),
      },
      wrapHandler(config, executeSkillGetInfo),
    );

    server.tool(
      "skill_fork",
      "Fork a public strategy from Hub to local directory",
      {
        strategyId: z.string().describe("Strategy ID (UUID or Hub URL)"),
        name: z.string().optional().describe("Custom name for forked strategy"),
        targetDir: z.string().optional().describe("Custom target directory"),
      },
      wrapHandler(config, executeSkillFork),
    );

    server.tool(
      "skill_list_local",
      "List all local strategies (forked or created)",
      {},
      wrapHandler(config, executeSkillListLocal),
    );

    server.tool(
      "skill_validate",
      "Validate a strategy package directory (FEP v2.0)",
      {
        dirPath: z.string().describe("Strategy package directory (must contain fep.yaml)"),
      },
      wrapHandler(config, executeSkillValidate),
    );

    server.tool(
      "skill_publish",
      "Publish a strategy ZIP to Hub server (auto-runs backtest)",
      {
        filePath: z.string().describe("Path to strategy ZIP file"),
        visibility: z.enum(["public", "private", "unlisted"]).optional().describe("Override visibility"),
      },
      wrapHandler(config, executeSkillPublish),
    );

    server.tool(
      "skill_publish_verify",
      "Check publish and backtest status by submission or task ID",
      {
        submissionId: z.string().optional().describe("Submission ID from skill_publish"),
        backtestTaskId: z.string().optional().describe("Backtest task ID from skill_publish"),
      },
      wrapHandler(config, executeSkillPublishVerify),
    );
  }

  // ── Scheduler tools ──
  if (groups.includes("scheduler")) {
    server.tool(
      "strategy_daily_scan",
      "Scan all local strategies for news and price data",
      {
        strategyId: z.string().optional().describe("Scan a specific strategy (default: all)"),
        includePrice: z.boolean().optional().describe("Include price data (default: true)"),
      },
      wrapHandler(config, executeStrategyDailyScan),
    );

    server.tool(
      "strategy_price_monitor",
      "Check price movements against alert threshold for strategy symbols",
      {
        threshold: z.number().optional().describe("Alert threshold percentage (default: 5)"),
        strategyId: z.string().optional().describe("Monitor only one strategy (default: all)"),
      },
      wrapHandler(config, executeStrategyPriceMonitor),
    );

    server.tool(
      "strategy_scan_history",
      "Query past strategy scan and report history",
      {
        scanType: z.enum(["daily_scan", "price_monitor", "weekly_report", "monthly_report"]).optional().describe("Filter by scan type"),
        limit: z.number().optional().describe("Max results (default: 10)"),
      },
      wrapHandler(config, executeStrategyScanHistory),
    );

    server.tool(
      "strategy_periodic_report",
      "Generate weekly (7d) or monthly (30d) strategy report",
      {
        period: z.enum(["weekly", "monthly"]).describe("Report period"),
      },
      wrapHandler(config, executeStrategyPeriodicReport),
    );
  }

  // ── Tournament tools ──
  if (groups.includes("tournament")) {
    server.tool(
      "tournament_pick",
      "Pick a strategy agent for the current tournament round",
      {
        agent_name: z.enum(["bull", "bear", "contrarian"]).describe("Agent to pick"),
        user_id: z.string().optional().describe("User identifier"),
      },
      wrapHandler(config, executeTournamentPick),
    );

    server.tool(
      "tournament_leaderboard",
      "Show tournament agent leaderboard with W/L records",
      {},
      wrapHandler(config, executeTournamentLeaderboard),
    );

    server.tool(
      "tournament_result",
      "Submit analysis result from a tournament sub-agent",
      {
        round_id: z.string().describe("Tournament round ID"),
        agent_name: z.enum(["bull", "bear", "contrarian"]).describe("Agent role"),
        thesis: z.string().describe("Analysis thesis (1 paragraph)"),
        confidence: z.number().describe("Confidence score (0-100)"),
        entry_price: z.number().optional().describe("Entry price"),
        exit_price: z.number().optional().describe("Exit/target price"),
        stop_loss: z.number().optional().describe("Stop loss price"),
        sharpe: z.number().optional().describe("Sharpe ratio"),
        max_drawdown: z.number().optional().describe("Max drawdown"),
        total_return: z.number().optional().describe("Total return"),
      },
      wrapHandler(config, executeTournamentResult),
    );
  }

  // Agent guidance prompt
  server.prompt("openfinclaw-guidance", "OpenFinClaw financial tools usage guide", () => ({
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text: OPENFINCLAW_AGENT_GUIDANCE },
      },
    ],
  }));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
