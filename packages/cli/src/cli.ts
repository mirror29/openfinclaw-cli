/**
 * CLI mode — human-friendly command-line interface.
 * @module @openfinclaw/cli/cli
 */
import {
  resolveOpenFinClawConfig,
  getUserConfigFilePath,
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
  executeDeepagentBacktests,
  executeDeepagentBacktestResult,
  executeDeepagentPackages,
  executeDeepagentPackageMeta,
  executeDeepagentDownloadPackage,
  parseDeepAgentSSE,
  deepagentApiRequest,
  type DeepAgentThread,
} from "@openfinclaw/core";
import {
  color,
  sym,
  header,
  kv,
  success,
  error as errorLine,
  warn,
  info,
  hint,
  formatPercent,
  trendArrow,
  padRight,
  padLeft,
  truncate,
} from "./styles.js";

/**
 * Parse argv after the subcommand into positional args and `--key` / `--key=value` flags.
 * @param args - Raw args (e.g. `process.argv.slice(3)`)
 */
function parseArgs(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, ...val] = arg.slice(2).split("=");
      flags[key!] = val.join("=");
    } else if (arg.startsWith("--") && i + 1 < args.length) {
      const next = args[i + 1]!;
      if (!next.startsWith("--")) {
        flags[arg.slice(2)] = next;
        i++;
      } else {
        flags[arg.slice(2)] = "true";
      }
    } else if (arg.startsWith("--")) {
      flags[arg.slice(2)] = "true";
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

/**
 * Print structured tool output (JSON).
 * @param data - Serializable result
 */
function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Print a usage error line and exit(1).
 * @param msg - Usage message
 */
function usageExit(msg: string): never {
  console.error(errorLine(`Usage: ${msg}`));
  process.exit(1);
}

/**
 * Safely parse a date-ish value into a formatted local time string.
 * @param v - Raw timestamp (number, ISO string, etc.)
 */
function fmtTime(v: unknown): string {
  if (v == null) return "—";
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

/** Board-type display labels */
const BOARD_NAMES: Record<string, string> = {
  composite: "Composite",
  returns: "Returns",
  risk: "Risk",
  popular: "Popular",
  rising: "Rising",
};

/**
 * Run a CLI subcommand.
 * @param command - First positional after `openfinclaw`
 * @param args - Remaining argv
 */
export async function runCli(command: string, args: string[]) {
  const { positional, flags } = parseArgs(args);
  const outputJson = flags.output === "json";
  const apiKeyOpt = flags["api-key"];

  /**
   * DeepAgent is a separately-authenticated service (its own X-API-Key).
   * `doctor` needs to inspect both keys. Both must work without a Hub key.
   */
  const allowMissingApiKey = command === "deepagent" || command === "doctor";

  let config;
  try {
    config = resolveOpenFinClawConfig({ apiKey: apiKeyOpt, allowMissingApiKey });
  } catch (err) {
    console.error(errorLine(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }

  try {
    switch (command) {
      case "price": {
        if (!positional[0]) usageExit("openfinclaw price <symbol>");
        const result = await executeFinPrice(
          { symbol: positional[0]!, market: flags.market },
          config,
        );
        if (outputJson) {
          printJson(result);
        } else {
          console.log(header(`${result.symbol}  ${color.gray(`(${result.market})`)}`));
          console.log(kv("Price", color.boldGreen(String(result.price))));
          if (result.volume24h) console.log(kv("Volume 24h", String(result.volume24h)));
          console.log(kv("Time", color.gray(fmtTime(result.timestamp))));
          console.log();
        }
        break;
      }

      case "kline": {
        if (!positional[0]) usageExit("openfinclaw kline <symbol> [--limit N]");
        const limit = flags.limit ? Number(flags.limit) : 30;
        const result = await executeFinKline(
          { symbol: positional[0]!, market: flags.market, limit },
          config,
        );
        if (outputJson) {
          printJson(result);
        } else {
          console.log(
            header(`${result.symbol}  ${color.gray(`(${result.market}) · ${result.count} bars`)}`),
          );
          const head =
            "  " +
            color.gray(
              padRight("Date", 12) +
                padLeft("Open", 11) +
                padLeft("High", 11) +
                padLeft("Low", 11) +
                padLeft("Close", 11) +
                padLeft("Volume", 14),
            );
          console.log(head);
          const bars = result.bars.slice(-10);
          let prevClose: number | null = null;
          for (const bar of bars) {
            const close = Number(bar.close);
            const up = prevClose == null ? 0 : close - prevClose;
            const closeColored =
              up > 0 ? color.green(String(bar.close)) : up < 0 ? color.red(String(bar.close)) : String(bar.close);
            console.log(
              "  " +
                padRight(bar.date, 12) +
                padLeft(String(bar.open), 11) +
                padLeft(String(bar.high), 11) +
                padLeft(String(bar.low), 11) +
                padLeft(closeColored, 11) +
                padLeft(String(bar.volume), 14),
            );
            prevClose = close;
          }
          if (result.count > 10)
            console.log(color.gray(`  … ${result.count - 10} more row(s) hidden`));
          console.log();
        }
        break;
      }

      case "crypto": {
        const endpoint = positional[0] || "coin/market";
        const result = await executeFinCrypto(
          {
            endpoint,
            symbol: positional[1] || flags.symbol,
            limit: flags.limit ? Number(flags.limit) : undefined,
          },
          config,
        );
        printJson(result);
        break;
      }

      case "compare": {
        if (!positional[0]) usageExit("openfinclaw compare <sym1,sym2,...>");
        const result = await executeFinCompare({ symbols: positional[0]! }, config);
        if (outputJson) {
          printJson(result);
        } else if ("comparison" in result && result.comparison) {
          console.log(header("Asset comparison"));
          for (const item of result.comparison as Array<Record<string, unknown>>) {
            if ("error" in item) {
              console.log(errorLine(`${item.symbol}: ${item.error}`));
            } else {
              const wc = Number(item.weekChange ?? 0);
              console.log(
                "  " +
                  padRight(String(item.symbol), 14) +
                  padLeft(color.bold(String(item.price)), 14) +
                  "  " +
                  trendArrow(wc) +
                  " " +
                  formatPercent(wc, 2) +
                  color.gray(" (7d)"),
              );
            }
          }
          console.log();
        }
        break;
      }

      case "search": {
        if (!positional[0]) usageExit("openfinclaw search <query>");
        const result = await executeFinSlimSearch(
          { query: positional[0]!, market: flags.market },
          config,
        );
        if (outputJson) {
          printJson(result);
        } else {
          console.log(
            header(`Search "${result.query}"  ${color.gray(`· ${result.count} result(s)`)}`),
          );
          for (const r of result.results as Array<Record<string, unknown>>) {
            const symStr = String(r.symbol ?? r.id ?? "");
            console.log(
              "  " +
                color.cyan(padRight(symStr, 16)) +
                padRight(String(r.name ?? ""), 30) +
                color.gray(`(${r.market ?? ""})`),
            );
          }
          console.log();
        }
        break;
      }

      case "leaderboard": {
        const boardType = flags.board ?? "composite";
        const limit = flags.limit ? Number(flags.limit) : 10;
        const offset = flags.offset ? Number(flags.offset) : 0;
        const result = await executeSkillLeaderboard(
          { boardType, limit, offset },
          config,
        );
        if (outputJson) {
          printJson(result);
        } else {
          const boardLabel = BOARD_NAMES[boardType] ?? result.board;
          console.log(
            header(
              `${boardLabel}  ${color.gray(`Top ${result.strategies.length} · ${result.total} strategies total`)}`,
            ),
          );
          console.log(
            "  " +
              color.gray(
                padRight("Rank", 6) +
                  padRight("Name", 32) +
                  padRight("Mkt", 6) +
                  padLeft("Return (since pub)", 20) +
                  padLeft("Sharpe", 10),
              ),
          );
          for (const s of result.strategies) {
            const ret = s.performance?.returnSincePublish;
            const sharpe = s.performance?.sharpeRatio;
            const retPct = ret != null ? ret * 100 : null;
            const rankStr = `#${s.rank}`;
            console.log(
              "  " +
                color.boldYellow(padRight(rankStr, 6)) +
                padRight(truncate(s.name, 30), 32) +
                padRight(String(s.market ?? "—"), 6) +
                padLeft(`${trendArrow(retPct)} ${formatPercent(retPct, 2)}`, 20) +
                padLeft(
                  sharpe != null ? color.bold(sharpe.toFixed(2)) : color.gray("—"),
                  10,
                ),
            );
          }
          console.log();
          console.log(hint(`openfinclaw strategy-info <id>   View details`));
          console.log(hint(`openfinclaw fork <id>            Fork locally`));
          console.log();
        }
        break;
      }

      case "strategy-info": {
        const id = positional[0];
        if (!id) usageExit("openfinclaw strategy-info <strategyId>");
        const result = await executeSkillGetInfo({ strategyId: id! }, config);
        if (outputJson) {
          printJson(result);
        } else if ("error" in result) {
          console.log(errorLine(String(result.error)));
        } else {
          console.log(header(result.name));
          console.log(kv("ID", color.gray(result.id ?? "—")));
          if (result.slug) console.log(kv("Slug", String(result.slug)));
          if (result.version) console.log(kv("Version", String(result.version)));
          if (result.visibility) console.log(kv("Visibility", String(result.visibility)));
          if (result.author?.displayName)
            console.log(kv("Author", String(result.author.displayName)));
          if (result.summary) console.log(kv("Summary", String(result.summary)));
          if (result.backtestResult) {
            console.log();
            console.log(color.gray("  Backtest metrics"));
            const br = result.backtestResult;
            if (typeof br.totalReturn === "number")
              console.log(kv("Total return", formatPercent(br.totalReturn * 100)));
            if (typeof br.sharpe === "number")
              console.log(kv("Sharpe ratio", color.bold(br.sharpe.toFixed(3))));
            if (typeof br.maxDrawdown === "number")
              console.log(kv("Max drawdown", formatPercent(br.maxDrawdown * 100)));
            if (typeof br.winRate === "number")
              console.log(kv("Win rate", formatPercent(br.winRate * 100, 1)));
          }
          console.log();
          console.log(hint(`Hub URL: ${color.cyan(String(result.hubUrl))}`));
          console.log();
        }
        break;
      }

      case "fork": {
        const strategyId = positional[0];
        if (!strategyId)
          usageExit("openfinclaw fork <strategyId> [--name <n>] [--target-dir <path>]");
        const result = await executeSkillFork(
          { strategyId: strategyId!, name: flags.name, targetDir: flags["target-dir"] },
          config,
        );
        if (outputJson) {
          printJson(result);
        } else if (result.success && result.data) {
          const { localPath, forkMeta } = result.data;
          console.log();
          console.log(success(color.bold("Strategy forked")));
          console.log();
          console.log(kv("Source", `${forkMeta.sourceName}  ${color.gray(`v${forkMeta.sourceVersion}`)}`));
          if (forkMeta.sourceAuthor) console.log(kv("Author", forkMeta.sourceAuthor));
          console.log(kv("Local path", color.cyan(localPath)));
          console.log(kv("Forked at", color.gray(fmtTime(forkMeta.forkedAt))));
          console.log();
          console.log(hint(`cd ${localPath}`));
          console.log(hint(`openfinclaw validate ${localPath}`));
          console.log();
          if (result.error) console.log(warn(result.error));
        } else {
          console.log(errorLine(result.error ?? "Fork failed"));
        }
        break;
      }

      case "list-strategies": {
        const result = await executeSkillListLocal({}, config);
        if (outputJson) {
          printJson(result);
        } else if (result.count === 0) {
          console.log();
          console.log(info("No local strategies yet"));
          console.log(hint("openfinclaw fork <id>  Fork a strategy from Hub"));
          console.log();
        } else {
          console.log(header(`Local strategies  ${color.gray(`· ${result.count} total`)}`));
          let currentDate = "";
          for (const s of result.strategies) {
            if (s.dateDir !== currentDate) {
              currentDate = s.dateDir;
              console.log("  " + color.gray(s.dateDir + "/"));
            }
            const typeLabel =
              s.type === "forked" ? color.blue("[fork]") : color.magenta("[created]");
            console.log(
              "    " +
                typeLabel +
                " " +
                color.bold(padRight(s.displayName ?? s.name, 30)) +
                " " +
                color.gray(s.name),
            );
          }
          console.log();
        }
        break;
      }

      case "validate": {
        const dirPath = positional[0];
        if (!dirPath) usageExit("openfinclaw validate <dirPath>");
        const result = await executeSkillValidate({ dirPath: dirPath! }, config);
        if (outputJson) {
          printJson(result);
        } else {
          console.log();
          if (result.valid) {
            console.log(success(color.bold("Strategy validation passed")));
          } else {
            console.log(errorLine(color.bold("Strategy validation failed")));
          }
          if (result.errors?.length) {
            console.log();
            console.log(color.red("  Errors:"));
            for (const e of result.errors) console.log(`    ${color.red(sym.cross)} ${e}`);
          }
          if (result.warnings?.length) {
            console.log();
            console.log(color.yellow("  Warnings:"));
            for (const w of result.warnings) console.log(`    ${color.yellow(sym.warn)} ${w}`);
          }
          console.log();
        }
        break;
      }

      case "publish": {
        const filePath = positional[0];
        if (!filePath)
          usageExit("openfinclaw publish <zipPath> [--visibility public|private|unlisted]");
        const result = (await executeSkillPublish(
          { filePath: filePath!, visibility: flags.visibility },
          config,
        )) as Record<string, unknown>;
        if (outputJson) {
          printJson(result);
        } else if (result.error) {
          console.log(errorLine(String(result.error)));
          if (result.details) console.log(color.gray("  " + JSON.stringify(result.details)));
        } else {
          console.log();
          console.log(success(color.bold("Publish submitted")));
          console.log();
          if (result.slug) console.log(kv("Slug", String(result.slug)));
          if (result.entryId) console.log(kv("Entry ID", color.gray(String(result.entryId))));
          if (result.version) console.log(kv("Version", String(result.version)));
          if (result.submissionId)
            console.log(kv("Submission ID", color.gray(String(result.submissionId))));
          if (result.backtestTaskId)
            console.log(kv("Backtest Task", color.gray(String(result.backtestTaskId))));
          console.log();
          console.log(hint(`openfinclaw publish-verify --submission-id <id>   Query publish / backtest status`));
          console.log();
        }
        break;
      }

      case "publish-verify": {
        const result = (await executeSkillPublishVerify(
          {
            submissionId: flags["submission-id"],
            backtestTaskId: flags["backtest-task-id"],
          },
          config,
        )) as Record<string, unknown>;
        if (outputJson) {
          printJson(result);
        } else if (result.error) {
          console.log(errorLine(String(result.error)));
        } else {
          console.log(header("Publish verification"));
          if (result.slug) console.log(kv("Slug", String(result.slug)));
          if (result.version) console.log(kv("Version", String(result.version)));
          const status = String(result.backtestStatus ?? "—");
          const statusColor =
            status === "completed"
              ? color.green(status)
              : status === "failed"
                ? color.red(status)
                : status === "pending" || status === "running"
                  ? color.yellow(status)
                  : color.gray(status);
          console.log(kv("Backtest status", statusColor));
          const report = result.backtestReport as Record<string, unknown> | undefined;
          const perf = report?.performance as Record<string, unknown> | undefined;
          if (perf) {
            console.log();
            console.log(color.gray("  Backtest summary"));
            if (typeof perf.totalReturn === "number")
              console.log(kv("Total return", formatPercent(perf.totalReturn * 100)));
            if (typeof perf.sharpe === "number")
              console.log(kv("Sharpe ratio", color.bold(perf.sharpe.toFixed(3))));
            if (typeof perf.maxDrawdown === "number")
              console.log(kv("Max drawdown", formatPercent(perf.maxDrawdown * 100)));
            if (typeof perf.winRate === "number")
              console.log(kv("Win rate", formatPercent(perf.winRate * 100, 1)));
          }
          console.log();
        }
        break;
      }

      case "deepagent": {
        await runDeepagentSubcommand(positional, flags, outputJson, config);
        break;
      }

      case "doctor": {
        console.log(header("OpenFinClaw Doctor"));
        const apiMark = config.apiKey
          ? color.green(sym.check) + " " + color.gray(`${config.apiKey.slice(0, 8)}…`)
          : color.red(sym.cross) + " " + color.red("not configured");
        console.log(kv("Hub Key", apiMark));
        const dpMark = config.deepagentApiKey
          ? color.green(sym.check) + " " + color.gray(`${config.deepagentApiKey.slice(0, 8)}…`)
          : color.gray(sym.dot + " not configured (auth-gated deepagent tools will be disabled)");
        console.log(kv("DeepAgent Key", dpMark));
        console.log(kv("Config", color.gray(getUserConfigFilePath())));
        console.log(kv("Hub URL", color.cyan(config.hubApiUrl)));
        console.log(kv("DataHub", color.cyan(config.datahubGatewayUrl)));
        if (config.deepagentApiUrl)
          console.log(kv("DeepAgent URL", color.cyan(config.deepagentApiUrl)));
        console.log(kv("Timeout", `${config.requestTimeoutMs}ms`));
        console.log();
        console.log(color.gray("  Connectivity"));
        if (!config.apiKey) {
          console.log(
            kv("DataHub", color.gray(sym.dot + " skipped (Hub key not configured)")),
          );
        } else {
          try {
            await executeFinPrice({ symbol: "BTC/USDT" }, config);
            console.log(kv("DataHub", color.green(sym.check + " OK (BTC/USDT)")));
          } catch (err) {
            console.log(
              kv(
                "DataHub",
                color.red(
                  `${sym.cross} FAIL · ${err instanceof Error ? err.message : String(err)}`,
                ),
              ),
            );
          }
        }
        try {
          const h = await executeDeepagentHealth({}, config);
          if (h.success) {
            const parts: string[] = [`OK`];
            if (h.sdk) parts.push(`sdk=${h.sdk}`);
            if (h.skills_count != null) parts.push(`${h.skills_count} skills`);
            console.log(kv("DeepAgent", color.green(sym.check + " " + parts.join(", "))));
          } else {
            console.log(kv("DeepAgent", color.red(sym.cross + " " + (h.error ?? "fail"))));
          }
        } catch (err) {
          console.log(
            kv(
              "DeepAgent",
              color.red(
                `${sym.cross} FAIL · ${err instanceof Error ? err.message : String(err)}`,
              ),
            ),
          );
        }
        console.log();
        break;
      }

      default:
        console.error(
          errorLine(`Unknown command: ${color.bold(command)}`) +
            "\n" +
            hint(`openfinclaw --help  See available commands`),
        );
        process.exit(1);
    }
  } catch (err) {
    console.error(errorLine(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

/**
 * Handle `openfinclaw deepagent <subcommand> ...`.
 * CLI `research` uses direct SSE streaming (real token-by-token in the terminal),
 * while the MCP server uses submit/poll/finalize for cross-platform agent support.
 * @param positional - Positional args after `deepagent`
 * @param flags - Parsed flags
 * @param outputJson - `--output json` flag
 * @param config - Resolved OpenFinClaw config
 */
async function runDeepagentSubcommand(
  positional: string[],
  flags: Record<string, string>,
  outputJson: boolean,
  config: Parameters<typeof executeDeepagentHealth>[1],
): Promise<void> {
  const sub = positional[0];
  if (!sub) {
    console.error(
      errorLine("Usage: openfinclaw deepagent <health|skills|research|status|threads|messages|backtests|backtest|packages|package-meta|download>"),
    );
    process.exit(1);
  }

  switch (sub) {
    case "health": {
      const result = await executeDeepagentHealth({}, config);
      if (outputJson) {
        printJson(result);
      } else if (!result.success) {
        console.log(errorLine(result.error ?? "health check failed"));
      } else {
        console.log(header("DeepAgent Health"));
        console.log(kv("Status", color.green(result.status ?? "—")));
        if (result.sdk) console.log(kv("SDK", result.sdk));
        if (result.skills_count != null) console.log(kv("Skills", String(result.skills_count)));
        if (result.agents) console.log(kv("Agents", color.cyan(result.agents.join(", "))));
        if (result.active_sessions != null)
          console.log(kv("Active sessions", String(result.active_sessions)));
        if (result.threads_supported != null)
          console.log(kv("Threads", result.threads_supported ? color.green("supported") : color.gray("no")));
        console.log();
      }
      break;
    }

    case "skills": {
      const limit = flags.limit ? Number(flags.limit) : 20;
      const result = await executeDeepagentSkills({}, config);
      if (outputJson) {
        printJson(result);
        break;
      }
      if (!("count" in result)) {
        console.log(errorLine((result as { error?: string }).error ?? "skills failed"));
        break;
      }
      console.log(header(`DeepAgent Skills  ${color.gray(`· ${result.count} total`)}`));
      for (const s of result.skills.slice(0, limit)) {
        console.log(
          "  " +
            color.cyan(padRight(s.name, 28)) +
            color.bold(padRight(s.display_name ?? "", 26)) +
            color.gray(truncate(s.description ?? "", 60)),
        );
      }
      if (result.count > limit)
        console.log(color.gray(`  … ${result.count - limit} more hidden (use --limit=N to see more)`));
      console.log();
      break;
    }

    case "research": {
      const query = positional.slice(1).join(" ").trim();
      if (!query) {
        console.error(errorLine("Usage: openfinclaw deepagent research \"<query>\" [--thread-id <id>]"));
        process.exit(1);
      }
      if (!config.deepagentApiKey) {
        console.error(
          errorLine(
            "DeepAgent API key not configured. Run `openfinclaw init` or set OPENFINCLAW_DEEPAGENT_API_KEY.",
          ),
        );
        process.exit(1);
      }
      await streamResearch(query, flags["thread-id"], config);
      break;
    }

    case "threads": {
      const action = (positional[1] as "list" | "create" | "get" | "delete") ?? "list";
      const threadId = positional[2] ?? flags["thread-id"];
      const title = flags.title;
      const result = await executeDeepagentThreads({ action, threadId, title }, config);
      if (outputJson) {
        printJson(result);
        break;
      }
      if (!result.success) {
        console.log(errorLine(result.error ?? "threads failed"));
        break;
      }
      if (action === "list" && "threads" in result) {
        console.log(header(`DeepAgent Threads  ${color.gray(`· ${result.count} total`)}`));
        for (const t of result.threads as DeepAgentThread[]) {
          console.log(
            "  " +
              color.gray(padRight((t.id ?? "").slice(0, 8), 10)) +
              color.bold(padRight(truncate(t.title || "(untitled)", 38), 40)) +
              color.gray(t.updated_at ?? ""),
          );
        }
        console.log();
      } else if (action === "create" && "thread" in result && result.thread) {
        const t = result.thread;
        console.log(success(`Thread created`));
        console.log(kv("ID", color.cyan(t.id)));
        if (t.title) console.log(kv("Title", t.title));
        console.log();
      } else if (action === "get" && "thread" in result && result.thread) {
        console.log(header("Thread"));
        const t = result.thread;
        console.log(kv("ID", color.cyan(t.id)));
        console.log(kv("Title", t.title ?? "—"));
        console.log(kv("Status", t.status ?? "—"));
        console.log(kv("Turns", String(t.total_turns ?? 0)));
        console.log(kv("Cost (USD)", String(t.total_cost_usd ?? 0)));
        console.log();
      } else if (action === "delete") {
        console.log(success(`Deleted: ${threadId}`));
      }
      break;
    }

    case "messages": {
      const threadId = positional[1] ?? flags["thread-id"];
      if (!threadId) {
        console.error(errorLine("Usage: openfinclaw deepagent messages <threadId> [--limit N]"));
        process.exit(1);
      }
      const limit = flags.limit ? Number(flags.limit) : 5;
      const result = await executeDeepagentMessages({ threadId, limit }, config);
      if (outputJson) {
        printJson(result);
        break;
      }
      if (!result.success) {
        console.log(errorLine(result.error ?? "messages failed"));
        break;
      }
      console.log(header(`Thread Messages  ${color.gray(`· ${result.count} total`)}`));
      for (const m of result.messages) {
        const roleColor =
          m.role === "assistant" ? color.green : m.role === "user" ? color.cyan : color.gray;
        console.log("  " + roleColor(`[${m.role}]`) + " " + color.gray(m.created_at ?? ""));
        const txt = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
        console.log("  " + truncate(txt, 200));
        console.log();
      }
      break;
    }

    case "backtests": {
      const result = await executeDeepagentBacktests({}, config);
      if (outputJson) {
        printJson(result);
        break;
      }
      if (!("count" in result)) {
        printJson(result);
        break;
      }
      console.log(header(`Backtests  ${color.gray(`· ${result.count} total`)}`));
      console.log(
        "  " +
          color.gray(
            padRight("Task ID", 12) +
              padRight("Status", 12) +
              padLeft("Return", 12) +
              padLeft("Sharpe", 10) +
              padLeft("MaxDD", 10) +
              padLeft("WinRate", 10),
          ),
      );
      for (const r of result.results.slice(0, 20)) {
        const ret = r.total_return != null ? r.total_return * 100 : null;
        const dd = r.max_drawdown != null ? r.max_drawdown * 100 : null;
        const wr = r.win_rate != null ? r.win_rate * 100 : null;
        console.log(
          "  " +
            color.gray(padRight(r.task_id.slice(0, 10), 12)) +
            padRight(r.status ?? "—", 12) +
            padLeft(formatPercent(ret), 12) +
            padLeft(r.sharpe != null ? color.bold(r.sharpe.toFixed(2)) : color.gray("—"), 10) +
            padLeft(formatPercent(dd), 10) +
            padLeft(formatPercent(wr, 1), 10),
        );
      }
      console.log();
      break;
    }

    case "backtest": {
      const taskId = positional[1];
      if (!taskId) {
        console.error(errorLine("Usage: openfinclaw deepagent backtest <taskId>"));
        process.exit(1);
      }
      const result = await executeDeepagentBacktestResult({ taskId }, config);
      printJson(result);
      break;
    }

    case "packages": {
      const result = await executeDeepagentPackages({}, config);
      if (outputJson) {
        printJson(result);
        break;
      }
      if (!("count" in result)) {
        printJson(result);
        break;
      }
      console.log(header(`Strategy packages  ${color.gray(`· ${result.count} total`)}`));
      for (const p of result.packages.slice(0, 20)) {
        console.log(
          "  " +
            color.cyan(padRight(p.package_id, 22)) +
            color.bold(padRight(truncate(p.name ?? "—", 30), 32)) +
            color.gray(padRight(p.symbol ?? "—", 12)) +
            color.gray(padRight(p.style ?? "—", 18)) +
            color.gray(p.has_zip ? `${p.zip_size_kb ?? "?"} KB` : "no zip"),
        );
      }
      console.log();
      console.log(
        hint(`openfinclaw deepagent download <package_id>   Download strategy ZIP`),
      );
      console.log();
      break;
    }

    case "package-meta": {
      const packageId = positional[1];
      if (!packageId) {
        console.error(errorLine("Usage: openfinclaw deepagent package-meta <packageId>"));
        process.exit(1);
      }
      const result = await executeDeepagentPackageMeta({ packageId }, config);
      printJson(result);
      break;
    }

    case "download": {
      const packageId = positional[1];
      if (!packageId) {
        console.error(errorLine("Usage: openfinclaw deepagent download <packageId> [--target-dir <path>]"));
        process.exit(1);
      }
      const result = await executeDeepagentDownloadPackage(
        { packageId, targetDir: flags["target-dir"] },
        config,
      );
      if (outputJson) {
        printJson(result);
        break;
      }
      if (!result.success) {
        console.log(errorLine(result.error ?? "download failed"));
      } else {
        console.log();
        console.log(success("Download complete"));
        console.log(kv("Package", color.cyan(result.packageId)));
        console.log(kv("Path", color.cyan(result.localPath)));
        console.log(kv("Size", `${result.sizeKb} KB`));
        console.log();
      }
      break;
    }

    case "status": {
      // CLI 场景下 status/submit/poll/finalize 几乎无意义（短进程），
      // 但暴露 status 以便调试。
      const result = (await import("@openfinclaw/core")).executeDeepagentStatus(
        { taskId: positional[1] },
        config,
      );
      printJson(await result);
      break;
    }

    default:
      console.error(
        errorLine(`Unknown deepagent subcommand: ${sub}`) +
          "\n" +
          hint("Available: health / skills / research / threads / messages / backtests / backtest / packages / package-meta / download / status"),
      );
      process.exit(1);
  }
}

/**
 * CLI-only: stream a DeepAgent research run to stdout token-by-token.
 * This is a real terminal streaming experience (not available via MCP due to
 * protocol constraints). Blocks until `RUN_FINISHED` or stream end.
 * @param query - Research query
 * @param existingThreadId - Optional thread UUID to continue
 * @param config - Resolved config
 */
async function streamResearch(
  query: string,
  existingThreadId: string | undefined,
  config: Parameters<typeof executeDeepagentHealth>[1],
): Promise<void> {
  // Resolve thread.
  let threadId = existingThreadId;
  if (!threadId) {
    const { status, data } = await deepagentApiRequest(config, "POST", "/threads", { body: {} });
    if (status !== 200 && status !== 201) {
      console.error(errorLine(`Failed to create thread: HTTP ${status}`));
      process.exit(1);
    }
    threadId = (data as { id?: string }).id;
    if (!threadId) {
      console.error(errorLine("Failed to create thread: response missing id"));
      process.exit(1);
    }
  }

  const baseUrl = (config.deepagentApiUrl ?? "https://api.openfinclaw.ai/agent").replace(
    /\/+$/,
    "",
  );
  const url = `${baseUrl}/api/threads/${threadId}/runs`;

  console.log(header(`DeepAgent Research`));
  console.log(kv("Thread", color.gray(threadId)));
  console.log(kv("Query", color.bold(query)));
  console.log();
  console.log(color.gray("───────── Generating ─────────"));

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-Key": config.deepagentApiKey ?? "",
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ message: query }),
    signal: AbortSignal.timeout(config.deepagentSseTimeoutMs ?? 900_000),
  });

  if (!resp.ok || !resp.body) {
    const txt = resp.body ? await resp.text() : "";
    console.error(errorLine(`Run failed: HTTP ${resp.status} ${txt.slice(0, 200)}`));
    process.exit(1);
  }

  let runId: string | undefined;
  let isError = false;
  for await (const event of parseDeepAgentSSE(resp.body)) {
    switch (event.type) {
      case "RUN_STARTED":
        runId = event.data.runId;
        break;
      case "TEXT_DELTA":
        process.stdout.write(event.data.delta);
        break;
      case "TOOL_START":
        process.stdout.write(color.gray(`\n\n${sym.bullet} [tool: ${event.data.toolName}]\n`));
        break;
      case "TOOL_DONE":
        process.stdout.write(color.gray(` ${color.green(sym.check)}\n`));
        break;
      case "AGENT_HANDOFF":
        process.stdout.write(color.gray(`\n\n${sym.arrow} [handoff → ${event.data.agentName}]\n`));
        break;
      case "ERROR":
        isError = true;
        process.stdout.write("\n" + errorLine(event.data.error) + "\n");
        break;
      case "RUN_FINISHED":
        if (event.data.isError) isError = true;
        break;
    }
  }
  process.stdout.write("\n");
  console.log(color.gray("───────── Done ─────────"));
  if (runId) console.log(hint(`runId: ${color.gray(runId)}`));
  if (isError) process.exit(1);
}
