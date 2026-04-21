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

/** Parse --tools=strategy,deepagent from argv */
function parseToolGroups(argv: string[]): string[] {
  const ALL_GROUPS = ["strategy", "deepagent"];
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
  const config = resolveOpenFinClawConfig({ allowMissingApiKey: true });
  const groups = parseToolGroups(process.argv);
  const server = new McpServer({ name: "openfinclaw", version: "0.5.0" });

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
          "Start a long-running DeepAgent research task (takes 3-10 min). Returns a taskId IMMEDIATELY. " +
          "Covers price lookup / market analysis / deep report / strategy generation / backtest / paper-trade — " +
          "DeepAgent is a one-stop quant-trading agent, use it for anything finance-related.\n\n" +
          "REQUIRED BEHAVIOR AFTER CALLING:\n" +
          "1. Tell the user in one short line: 'Research started (~3-10 min), streaming progress below.'\n" +
          "2. IMMEDIATELY start calling fin_deepagent_research_poll with the returned taskId. The poll tool " +
          "   blocks ~20s SERVER-SIDE each call and then returns with current progress — you do NOT need to " +
          "   sleep, use Bash sleep, Monitor, or any client-side waiting mechanism.\n" +
          "3. Between polls, emit one short line summarizing the phase (e.g. 'still running · tools used: X').\n" +
          "4. Keep calling poll until done=true, then call fin_deepagent_research_finalize on the same turn " +
          "   to fetch the full report and present it to the user.\n\n" +
          "Never add your own sleep/wait — the poll tool does the waiting for you.",
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
          "Poll an in-progress research run. Blocks inside the MCP server for waitSeconds (default 20s, " +
          "max 30s) when the task is still running, then returns current status + short tail of accumulated text.\n\n" +
          "BEHAVIOR RULES:\n" +
          "- This tool does the waiting for you — do NOT add your own sleep/Bash sleep/Monitor/setTimeout.\n" +
          "- Call consecutively (poll → brief status to user → poll → ...) until done=true.\n" +
          "- Each call is ~20s; a 5-minute task takes ~15 sequential calls.\n" +
          "- When done=true, immediately call fin_deepagent_research_finalize on the same turn.",
        inputSchema: {
          taskId: z.string().describe("Task ID from fin_deepagent_research_submit"),
          waitSeconds: z
            .number()
            .optional()
            .describe("Server-side wait when still running (default 20, max 30). Usually leave default."),
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
      description:
        "How to use OpenFinClaw: DeepAgent (one-stop quant agent — market data / analysis / reports / strategy gen / backtest / paper trade) and local strategy tools",
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
