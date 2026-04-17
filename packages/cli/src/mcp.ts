/**
 * MCP Server mode — registers tools via Model Context Protocol.
 * Uses `registerTool` / `registerPrompt` (non-deprecated) APIs from `@modelcontextprotocol/sdk`.
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
  executeDeepagentHealth,
  executeDeepagentSkills,
  executeDeepagentThreads,
  executeDeepagentMessages,
  executeDeepagentResearchSubmit,
  executeDeepagentResearchPoll,
  executeDeepagentResearchFinalize,
  executeDeepagentStatus,
  executeDeepagentCancel,
  executeDeepagentBacktests,
  executeDeepagentBacktestResult,
  executeDeepagentPackages,
  executeDeepagentPackageMeta,
  executeDeepagentDownloadPackage,
  OPENFINCLAW_AGENT_GUIDANCE,
  type OpenFinClawConfig,
} from "@openfinclaw/core";

/** Parse --tools=datahub,strategy,deepagent from argv */
function parseToolGroups(argv: string[]): string[] {
  const ALL_GROUPS = ["datahub", "strategy", "deepagent"];
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

/** Wrap tool handler with error handling (`registerTool` passes request `extra` as second arg). */
function wrapHandler<P>(
  config: OpenFinClawConfig,
  fn: (params: P, config: OpenFinClawConfig) => Promise<unknown>,
) {
  return async (params: P, _extra: unknown) => {
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
    server.registerTool(
      "fin_price",
      {
        description: "Get current/latest price for stocks (A/HK/US), crypto, or index",
        inputSchema: {
          symbol: z.string().describe(
            "Asset symbol. Crypto: BTC/USDT, ETH/USDT; A-share: 600519.SH; HK: 00700.HK; US: AAPL",
          ),
          market: z.enum(["crypto", "equity"]).optional().describe("Market type. Auto-detected if omitted."),
        },
      },
      wrapHandler(config, executeFinPrice),
    );

    server.registerTool(
      "fin_kline",
      {
        description: "Fetch historical OHLCV (candlestick) data for any asset",
        inputSchema: {
          symbol: z.string().describe("Asset symbol (BTC/USDT, 600519.SH, AAPL, etc.)"),
          market: z.enum(["crypto", "equity"]).optional().describe("Market type (auto-detected if omitted)"),
          limit: z.number().optional().describe("Number of bars to return (default: 30)"),
        },
      },
      wrapHandler(config, executeFinKline),
    );

    server.registerTool(
      "fin_crypto",
      {
        description: "Crypto market data (ticker/orderbook/trades/DeFi/CoinGecko metrics)",
        inputSchema: {
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
      },
      wrapHandler(config, executeFinCrypto),
    );

    server.registerTool(
      "fin_compare",
      {
        description: "Compare prices of 2-5 assets side by side with weekly change",
        inputSchema: {
          symbols: z.string().describe("Comma-separated symbols (2-5). Example: BTC/USDT,ETH/USDT,600519.SH"),
        },
      },
      wrapHandler(config, executeFinCompare),
    );

    server.registerTool(
      "fin_slim_search",
      {
        description: "Search for stock/crypto symbols by name or keyword",
        inputSchema: {
          query: z.string().describe("Search keyword (e.g. '茅台', 'bitcoin', 'Tesla')"),
          market: z.enum(["crypto", "equity"]).optional().describe("Limit search to market type"),
        },
      },
      wrapHandler(config, executeFinSlimSearch),
    );
  }

  // ── Strategy tools ──
  if (groups.includes("strategy")) {
    server.registerTool(
      "skill_leaderboard",
      {
        description: "Query strategy leaderboard from Hub",
        inputSchema: {
          boardType: z.enum(["composite", "returns", "risk", "popular", "rising"]).optional().describe("Leaderboard type (default: composite)"),
          limit: z.number().optional().describe("Max results (max 100, default: 20)"),
          offset: z.number().optional().describe("Pagination offset"),
        },
      },
      wrapHandler(config, executeSkillLeaderboard),
    );

    server.registerTool(
      "skill_get_info",
      {
        description: "Get strategy details from Hub",
        inputSchema: {
          strategyId: z.string().describe("Strategy ID (UUID or Hub URL)"),
        },
      },
      wrapHandler(config, executeSkillGetInfo),
    );

    server.registerTool(
      "skill_fork",
      {
        description: "Fork a public strategy from Hub to local directory",
        inputSchema: {
          strategyId: z.string().describe("Strategy ID (UUID or Hub URL)"),
          name: z.string().optional().describe("Custom name for forked strategy"),
          targetDir: z.string().optional().describe("Custom target directory"),
        },
      },
      wrapHandler(config, executeSkillFork),
    );

    server.registerTool(
      "skill_list_local",
      {
        description: "List all local strategies (forked or created)",
        inputSchema: {},
      },
      wrapHandler(config, executeSkillListLocal),
    );

    server.registerTool(
      "skill_validate",
      {
        description: "Validate a strategy package directory (FEP v2.0)",
        inputSchema: {
          dirPath: z.string().describe("Strategy package directory (must contain fep.yaml)"),
        },
      },
      wrapHandler(config, executeSkillValidate),
    );

    server.registerTool(
      "skill_publish",
      {
        description: "Publish a strategy ZIP to Hub server (auto-runs backtest)",
        inputSchema: {
          filePath: z.string().describe("Path to strategy ZIP file"),
          visibility: z.enum(["public", "private", "unlisted"]).optional().describe("Override visibility"),
        },
      },
      wrapHandler(config, executeSkillPublish),
    );

    server.registerTool(
      "skill_publish_verify",
      {
        description: "Check publish and backtest status by submission or task ID",
        inputSchema: {
          submissionId: z.string().optional().describe("Submission ID from skill_publish"),
          backtestTaskId: z.string().optional().describe("Backtest task ID from skill_publish"),
        },
      },
      wrapHandler(config, executeSkillPublishVerify),
    );
  }

  // ── DeepAgent tools ──
  // health + skills are public (no auth); others require `deepagentApiKey`.
  // When the key is absent the handlers return a structured friendly error
  // rather than refusing to register — this preserves the tool list for clients
  // that inspect it before prompting the user to configure the key.
  if (groups.includes("deepagent")) {
    server.registerTool(
      "fin_deepagent_health",
      {
        description: "Check DeepAgent service health (public, no API key required)",
        inputSchema: {},
      },
      wrapHandler(config, executeDeepagentHealth),
    );

    server.registerTool(
      "fin_deepagent_skills",
      {
        description: "List DeepAgent analysis skills (~60 entries; public, no API key required)",
        inputSchema: {},
      },
      wrapHandler(config, executeDeepagentSkills),
    );

    server.registerTool(
      "fin_deepagent_threads",
      {
        description: "Manage DeepAgent threads — list, create, get, or delete",
        inputSchema: {
          action: z.enum(["list", "create", "get", "delete"]).describe("Operation"),
          threadId: z.string().optional().describe("Thread UUID (required for get/delete)"),
          title: z.string().optional().describe("Title for new thread (create only)"),
        },
      },
      wrapHandler(config, executeDeepagentThreads),
    );

    server.registerTool(
      "fin_deepagent_messages",
      {
        description: "Read messages in a DeepAgent thread",
        inputSchema: {
          threadId: z.string().describe("Thread UUID"),
          limit: z.number().optional().describe("Max messages (1-20, default 5)"),
        },
      },
      wrapHandler(config, executeDeepagentMessages),
    );

    server.registerTool(
      "fin_deepagent_research_submit",
      {
        description:
          "Start a long-running DeepAgent research task (takes 3-10 min). Returns a taskId IMMEDIATELY.\n\n" +
          "REQUIRED BEHAVIOR AFTER CALLING:\n" +
          "1. Tell the user in one sentence: 'Task submitted (taskId=...), takes ~5 min. Ask me to check progress anytime.'\n" +
          "2. STOP your turn. Return control to the user. DO NOT try to wait.\n" +
          "3. DO NOT call `sleep`, `Bash sleep 60`, `Monitor`, or any waiting mechanism — Claude Code's sandbox blocks these.\n" +
          "4. When the user asks 'is it done?' / 'check progress' / 'what's the status' (or any similar intent), call fin_deepagent_research_poll once and report.\n" +
          "5. When poll returns done=true, call fin_deepagent_research_finalize once to fetch the full report and show it to the user.\n\n" +
          "Never poll on your own turn. Never loop. One user message → one poll call maximum.",
        inputSchema: {
          query: z.string().describe("Research question or analysis request"),
          threadId: z
            .string()
            .optional()
            .describe("Optional existing thread UUID to continue a conversation"),
        },
      },
      wrapHandler(config, executeDeepagentResearchSubmit),
    );

    server.registerTool(
      "fin_deepagent_research_poll",
      {
        description:
          "Poll an in-progress research run ONCE — returns current status + last ~1500 chars of accumulated text.\n\n" +
          "BEHAVIOR RULES:\n" +
          "- Call this ONCE per user message, then STOP your turn and report the status to the user in one sentence.\n" +
          "- DO NOT loop, DO NOT chain multiple polls, DO NOT use sleep/wait mechanisms between polls.\n" +
          "- If done=false: tell user 'still running, ask me again in a minute', return control.\n" +
          "- If done=true: call fin_deepagent_research_finalize immediately on the SAME turn to fetch the full report.",
        inputSchema: {
          taskId: z.string().describe("Task ID from fin_deepagent_research_submit"),
        },
      },
      wrapHandler(config, executeDeepagentResearchPoll),
    );

    server.registerTool(
      "fin_deepagent_research_finalize",
      {
        description:
          "Retrieve the full final text of a completed research run and clear local state. " +
          "Only call after poll returned done=true.",
        inputSchema: {
          taskId: z.string().describe("Task ID from fin_deepagent_research_submit"),
        },
      },
      wrapHandler(config, executeDeepagentResearchFinalize),
    );

    server.registerTool(
      "fin_deepagent_status",
      {
        description:
          "List all active DeepAgent tasks in this MCP server, or get status of one task",
        inputSchema: {
          taskId: z.string().optional().describe("Optional taskId; omit to list all"),
        },
      },
      wrapHandler(config, executeDeepagentStatus),
    );

    server.registerTool(
      "fin_deepagent_cancel",
      {
        description: "Cancel a running DeepAgent run",
        inputSchema: {
          threadId: z.string().describe("Thread UUID"),
          runId: z.string().describe("Run UUID (== taskId)"),
        },
      },
      wrapHandler(config, executeDeepagentCancel),
    );

    server.registerTool(
      "fin_deepagent_backtests",
      {
        description: "List DeepAgent-generated backtest summaries (returns, sharpe, drawdown, etc.)",
        inputSchema: {},
      },
      wrapHandler(config, executeDeepagentBacktests),
    );

    server.registerTool(
      "fin_deepagent_backtest_result",
      {
        description: "Get the full backtest report for a given task (metrics / trades / equity curve)",
        inputSchema: {
          taskId: z.string().describe("Backtest task UUID"),
        },
      },
      wrapHandler(config, executeDeepagentBacktestResult),
    );

    server.registerTool(
      "fin_deepagent_packages",
      {
        description: "List strategy packages generated by DeepAgent",
        inputSchema: {},
      },
      wrapHandler(config, executeDeepagentPackages),
    );

    server.registerTool(
      "fin_deepagent_package_meta",
      {
        description: "Get strategy package metadata (parameters / template / validation)",
        inputSchema: {
          packageId: z.string().describe("Package ID (pkg_xxxxx)"),
        },
      },
      wrapHandler(config, executeDeepagentPackageMeta),
    );

    server.registerTool(
      "fin_deepagent_download_package",
      {
        description:
          "Download a strategy package ZIP to local disk (default: ~/.openfinclaw/deepagent-packages/)",
        inputSchema: {
          packageId: z.string().describe("Package ID (pkg_xxxxx)"),
          targetDir: z.string().optional().describe("Custom target directory"),
        },
      },
      wrapHandler(config, executeDeepagentDownloadPackage),
    );
  }

  server.registerPrompt(
    "openfinclaw-guidance",
    {
      description: "OpenFinClaw financial tools usage guide",
    },
    () => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: OPENFINCLAW_AGENT_GUIDANCE },
        },
      ],
    }),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
