/**
 * CLI mode — human-friendly command-line interface.
 * @module @openfinclaw/cli/cli
 */
import {
  resolveConfigFromEnv,
  executeFinPrice,
  executeFinKline,
  executeFinCrypto,
  executeFinCompare,
  executeFinSlimSearch,
  executeSkillLeaderboard,
} from "@openfinclaw/core";

function parseArgs(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, ...val] = arg.slice(2).split("=");
      flags[key!] = val.join("=");
    } else if (arg.startsWith("--") && i + 1 < args.length) {
      flags[arg.slice(2)] = args[++i]!;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

export async function runCli(command: string, args: string[]) {
  const { positional, flags } = parseArgs(args);
  const outputJson = flags.output === "json";

  let config;
  try {
    config = resolveConfigFromEnv();
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  try {
    switch (command) {
      case "price": {
        if (!positional[0]) {
          console.error("Usage: openfinclaw price <symbol>");
          process.exit(1);
        }
        const result = await executeFinPrice(
          { symbol: positional[0], market: flags.market },
          config,
        );
        if (outputJson) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`\n  ${result.symbol} (${result.market})`);
          console.log(`  Price:    ${result.price}`);
          if (result.volume24h) console.log(`  Volume:   ${result.volume24h}`);
          console.log(`  Time:     ${result.timestamp}\n`);
        }
        break;
      }

      case "kline": {
        if (!positional[0]) {
          console.error("Usage: openfinclaw kline <symbol>");
          process.exit(1);
        }
        const limit = flags.limit ? Number(flags.limit) : 30;
        const result = await executeFinKline(
          { symbol: positional[0], market: flags.market, limit },
          config,
        );
        if (outputJson) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`\n  ${result.symbol} (${result.market}) — ${result.count} bars\n`);
          console.log("  Date        Open       High       Low        Close      Volume");
          console.log("  " + "-".repeat(72));
          for (const bar of result.bars.slice(-10)) {
            console.log(
              `  ${bar.date}  ${String(bar.open).padStart(10)}  ${String(bar.high).padStart(10)}  ${String(bar.low).padStart(10)}  ${String(bar.close).padStart(10)}  ${String(bar.volume).padStart(10)}`,
            );
          }
          if (result.count > 10) console.log(`  ... and ${result.count - 10} more bars`);
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
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case "compare": {
        if (!positional[0]) {
          console.error("Usage: openfinclaw compare <sym1,sym2,...>");
          process.exit(1);
        }
        const result = await executeFinCompare({ symbols: positional[0] }, config);
        if (outputJson) {
          console.log(JSON.stringify(result, null, 2));
        } else if ("comparison" in result && result.comparison) {
          console.log(`\n  Asset Comparison\n`);
          for (const item of result.comparison as Array<Record<string, unknown>>) {
            if ("error" in item) {
              console.log(`  ${item.symbol}: Error - ${item.error}`);
            } else {
              const wc = Number(item.weekChange ?? 0);
              const arrow = wc >= 0 ? "▲" : "▼";
              console.log(
                `  ${String(item.symbol).padEnd(12)} ${String(item.price).padStart(12)}  ${arrow} ${wc}% (7d)`,
              );
            }
          }
          console.log();
        }
        break;
      }

      case "search": {
        if (!positional[0]) {
          console.error("Usage: openfinclaw search <query>");
          process.exit(1);
        }
        const result = await executeFinSlimSearch(
          { query: positional[0], market: flags.market },
          config,
        );
        if (outputJson) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`\n  Search: "${result.query}" — ${result.count} results\n`);
          for (const r of result.results as Array<Record<string, unknown>>) {
            console.log(
              `  ${String(r.symbol ?? r.id ?? "").padEnd(15)} ${String(r.name ?? "")} (${r.market})`,
            );
          }
          console.log();
        }
        break;
      }

      case "leaderboard": {
        const boardType = flags.board ?? "composite";
        const limit = flags.limit ? Number(flags.limit) : 10;
        const result = await executeSkillLeaderboard(
          { boardType, limit },
          config,
        );
        if (outputJson) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`\n  ${result.board} 排行榜 — Top ${result.strategies.length} (共 ${result.total} 个策略)\n`);
          for (const s of result.strategies) {
            const ret = s.performance?.returnSincePublish;
            const arrow = ret != null && ret >= 0 ? "▲" : "▼";
            const retStr = ret != null ? ` ${arrow} ${ret.toFixed(1)}%` : "";
            console.log(
              `  #${String(s.rank).padStart(2)}  ${s.name.padEnd(30)} ${String(s.market ?? "").padEnd(4)}${retStr}`,
            );
          }
          console.log();
        }
        break;
      }

      case "doctor": {
        console.log("\n  OpenFinClaw Doctor\n");
        console.log(
          `  API Key:      ${config.apiKey ? "configured (" + config.apiKey.slice(0, 8) + "...)" : "NOT SET"}`,
        );
        console.log(`  Hub URL:      ${config.hubApiUrl}`);
        console.log(`  DataHub URL:  ${config.datahubGatewayUrl}`);
        console.log(`  Timeout:      ${config.requestTimeoutMs}ms`);
        try {
          await executeFinPrice({ symbol: "BTC/USDT" }, config);
          console.log(`  Connectivity: OK (BTC/USDT price fetched)`);
        } catch (err) {
          console.log(
            `  Connectivity: FAILED - ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        console.log();
        break;
      }

      default:
        console.error(`Unknown command: ${command}\nRun 'openfinclaw --help' for usage.`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
