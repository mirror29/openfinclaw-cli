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

/** Chinese labels for board types */
const BOARD_NAMES: Record<string, string> = {
  composite: "综合榜",
  returns: "收益榜",
  risk: "风控榜",
  popular: "人气榜",
  rising: "新星榜",
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

  let config;
  try {
    config = resolveOpenFinClawConfig({ apiKey: apiKeyOpt });
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
            console.log(color.gray(`  … 另外 ${result.count - 10} 条已省略`));
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
          console.log(header("资产对比"));
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
            header(`搜索 "${result.query}"  ${color.gray(`· ${result.count} 条结果`)}`),
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
              `${boardLabel}  ${color.gray(`Top ${result.strategies.length} · 共 ${result.total} 个策略`)}`,
            ),
          );
          console.log(
            "  " +
              color.gray(
                padRight("排名", 6) +
                  padRight("名称", 32) +
                  padRight("市场", 6) +
                  padLeft("收益(自发布)", 16) +
                  padLeft("夏普", 10),
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
                padLeft(`${trendArrow(retPct)} ${formatPercent(retPct, 2)}`, 16) +
                padLeft(
                  sharpe != null ? color.bold(sharpe.toFixed(2)) : color.gray("—"),
                  10,
                ),
            );
          }
          console.log();
          console.log(hint(`openfinclaw strategy-info <id>   查看详情`));
          console.log(hint(`openfinclaw fork <id>            下载到本地`));
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
            console.log(color.gray("  回测指标"));
            const br = result.backtestResult;
            if (typeof br.totalReturn === "number")
              console.log(kv("总收益", formatPercent(br.totalReturn * 100)));
            if (typeof br.sharpe === "number")
              console.log(kv("夏普比率", color.bold(br.sharpe.toFixed(3))));
            if (typeof br.maxDrawdown === "number")
              console.log(kv("最大回撤", formatPercent(br.maxDrawdown * 100)));
            if (typeof br.winRate === "number")
              console.log(kv("胜率", formatPercent(br.winRate * 100, 1)));
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
          console.log(success(color.bold("策略 Fork 成功")));
          console.log();
          console.log(kv("源策略", `${forkMeta.sourceName}  ${color.gray(`v${forkMeta.sourceVersion}`)}`));
          if (forkMeta.sourceAuthor) console.log(kv("作者", forkMeta.sourceAuthor));
          console.log(kv("本地路径", color.cyan(localPath)));
          console.log(kv("Fork 时间", color.gray(fmtTime(forkMeta.forkedAt))));
          console.log();
          console.log(hint(`cd ${localPath}`));
          console.log(hint(`openfinclaw validate ${localPath}`));
          console.log();
          if (result.error) console.log(warn(result.error));
        } else {
          console.log(errorLine(result.error ?? "Fork 失败"));
        }
        break;
      }

      case "list-strategies": {
        const result = await executeSkillListLocal({}, config);
        if (outputJson) {
          printJson(result);
        } else if (result.count === 0) {
          console.log();
          console.log(info("本地暂无策略"));
          console.log(hint("openfinclaw fork <id>  从 Hub 下载策略"));
          console.log();
        } else {
          console.log(header(`本地策略  ${color.gray(`· 共 ${result.count} 个`)}`));
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
            console.log(success(color.bold("策略校验通过")));
          } else {
            console.log(errorLine(color.bold("策略校验未通过")));
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
          console.log(success(color.bold("发布已提交")));
          console.log();
          if (result.slug) console.log(kv("Slug", String(result.slug)));
          if (result.entryId) console.log(kv("Entry ID", color.gray(String(result.entryId))));
          if (result.version) console.log(kv("Version", String(result.version)));
          if (result.submissionId)
            console.log(kv("Submission ID", color.gray(String(result.submissionId))));
          if (result.backtestTaskId)
            console.log(kv("Backtest Task", color.gray(String(result.backtestTaskId))));
          console.log();
          console.log(hint(`openfinclaw publish-verify --submission-id <id>   查询发布/回测状态`));
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
          console.log(header("发布验证"));
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
          console.log(kv("回测状态", statusColor));
          const report = result.backtestReport as Record<string, unknown> | undefined;
          const perf = report?.performance as Record<string, unknown> | undefined;
          if (perf) {
            console.log();
            console.log(color.gray("  回测报告摘要"));
            if (typeof perf.totalReturn === "number")
              console.log(kv("总收益", formatPercent(perf.totalReturn * 100)));
            if (typeof perf.sharpe === "number")
              console.log(kv("夏普比率", color.bold(perf.sharpe.toFixed(3))));
            if (typeof perf.maxDrawdown === "number")
              console.log(kv("最大回撤", formatPercent(perf.maxDrawdown * 100)));
            if (typeof perf.winRate === "number")
              console.log(kv("胜率", formatPercent(perf.winRate * 100, 1)));
          }
          console.log();
        }
        break;
      }

      case "doctor": {
        console.log(header("OpenFinClaw Doctor"));
        const apiMark = config.apiKey
          ? color.green(sym.check) + " " + color.gray(`${config.apiKey.slice(0, 8)}…`)
          : color.red(sym.cross) + " " + color.red("未配置");
        console.log(kv("API Key", apiMark));
        console.log(kv("Config", color.gray(getUserConfigFilePath())));
        console.log(kv("Hub URL", color.cyan(config.hubApiUrl)));
        console.log(kv("DataHub", color.cyan(config.datahubGatewayUrl)));
        console.log(kv("Timeout", `${config.requestTimeoutMs}ms`));
        try {
          await executeFinPrice({ symbol: "BTC/USDT" }, config);
          console.log(kv("连通性", color.green(sym.check + " OK (BTC/USDT)")));
        } catch (err) {
          console.log(
            kv(
              "连通性",
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
          errorLine(`未知命令: ${color.bold(command)}`) +
            "\n" +
            hint(`openfinclaw --help  查看可用命令`),
        );
        process.exit(1);
    }
  } catch (err) {
    console.error(errorLine(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
