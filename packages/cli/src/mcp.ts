/**
 * MCP Server mode — registers tools via Model Context Protocol.
 * @module @openfinclaw/cli/mcp
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  resolveConfigFromEnv,
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
  const config = resolveConfigFromEnv();
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
