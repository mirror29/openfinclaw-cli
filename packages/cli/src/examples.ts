/**
 * Ready-to-run prompt examples for DeepAgent research.
 *
 * Acts as an in-CLI cookbook / discovery surface — the CLI counterpart to
 * the "Example Prompts" section in README. Invoked via `openfinclaw examples`;
 * also supports `--output json` so upstream AI agents can self-discover
 * canonical prompt shapes.
 *
 * @module @openfinclaw/cli/examples
 */
import { color, sym, header } from "./styles.js";

/**
 * One scenario group of example prompts.
 */
type ExampleCategory = {
  /** Short stable identifier for filtering (`openfinclaw examples <id>`). */
  id: string;
  /** Leading emoji — used in the styled output only. */
  icon: string;
  /** Human-readable category title. */
  title: string;
  /** Copy-paste-safe prompts. Each line triggers one full research loop. */
  prompts: string[];
};

/**
 * Canonical prompt cookbook. Kept in sync with the README "Example Prompts"
 * section — any edits here should be mirrored there (and vice versa).
 */
const EXAMPLES: ExampleCategory[] = [
  {
    id: "technical",
    icon: "📈",
    title: "Technical analysis",
    prompts: [
      "Find RSI divergence signals on NVDA in the last 6 months, then backtest them.",
      "Compare a Bollinger Bands strategy on TSLA vs AAPL over 1 year — which wins?",
      "Screen the S&P 500 for golden-cross signals this month.",
    ],
  },
  {
    id: "fundamental",
    icon: "📊",
    title: "Fundamentals & macro",
    prompts: [
      "Pull Apple's last 8 quarters of revenue, margins, and guidance. Summarize the trend.",
      "What's driving the NVDA move this quarter — earnings, guidance, or narrative?",
      "Compare AMD / INTC / NVDA on growth, margin, and valuation.",
    ],
  },
  {
    id: "strategy",
    icon: "🎯",
    title: "Strategy generation",
    prompts: [
      "Design a momentum strategy on US mega-cap tech. Backtest 2y. Tell me where it breaks.",
      "Write a mean-reversion strategy on BTC and show drawdown behavior through 2022.",
      "A 股沪深 300 日内轮动策略，年化目标 15%，最大回撤 < 10%。",
    ],
  },
  {
    id: "backtest",
    icon: "🧪",
    title: "Backtest & stress-test",
    prompts: [
      "Backtest a 50/200 SMA crossover on SPY from 2015. Include costs and slippage.",
      "Stress-test my forked strategy against the 2020 and 2022 crashes.",
    ],
  },
  {
    id: "community",
    icon: "🏆",
    title: "Community strategies",
    prompts: [
      "Browse the leaderboard, fork the top momentum strategy, tweak it for lower drawdown.",
      "Validate my FEP v2.0 package before publishing it.",
    ],
  },
];

/**
 * Print the categorized prompt cookbook. When `categoryId` is provided,
 * show only that group.
 * @param categoryId - Optional category id to filter by
 */
function renderText(categoryId?: string): void {
  const groups = categoryId
    ? EXAMPLES.filter((g) => g.id === categoryId)
    : EXAMPLES;

  if (groups.length === 0) {
    console.error(color.red(`Unknown category: "${categoryId}"`));
    console.error(
      color.gray(
        `Valid: ${EXAMPLES.map((g) => g.id).join(", ")}`,
      ),
    );
    process.exit(2);
  }

  console.log();
  console.log(header("OpenFinClaw — Ready-to-run prompts"));
  console.log(
    color.gray(
      "  Paste any of these into `openfinclaw deepagent research \"…\"`",
    ),
  );
  console.log(color.gray("  or drop them straight into your AI agent."));
  console.log();

  for (const group of groups) {
    console.log(`  ${group.icon}  ${color.bold(group.title)} ${color.gray(`— ${group.id}`)}`);
    for (const prompt of group.prompts) {
      console.log(`     ${color.cyan(sym.bullet)} ${prompt}`);
    }
    console.log();
  }

  if (!categoryId) {
    console.log(
      color.gray(
        `  Tip ${sym.arrow} filter by category: ${color.cyan("openfinclaw examples <id>")}  ${color.gray(`(${EXAMPLES.map((g) => g.id).join(" | ")})`)}`,
      ),
    );
    console.log(
      color.gray(
        `  Tip ${sym.arrow} JSON output for scripts/agents: ${color.cyan("openfinclaw examples --output json")}`,
      ),
    );
    console.log();
  }
}

/**
 * Emit the cookbook as JSON — pipe-friendly and ready for AI agent
 * self-discovery (e.g. `openfinclaw examples --output json | jq`).
 * @param categoryId - Optional category id to filter by
 */
function renderJson(categoryId?: string): void {
  const groups = categoryId
    ? EXAMPLES.filter((g) => g.id === categoryId)
    : EXAMPLES;
  if (groups.length === 0) {
    console.error(
      JSON.stringify({
        error: "unknown_category",
        valid: EXAMPLES.map((g) => g.id),
      }),
    );
    process.exit(2);
  }
  console.log(JSON.stringify({ categories: groups }, null, 2));
}

/**
 * Entry point for the `examples` command.
 * @param argv - Raw args after the `examples` subcommand (process.argv.slice(3))
 */
export function runExamples(argv: string[] = []): void {
  const flagJson = argv.some(
    (a) => a === "--output=json" || a === "--output json",
  ) || (() => {
    const idx = argv.indexOf("--output");
    return idx !== -1 && argv[idx + 1] === "json";
  })();

  const categoryId = argv.find((a) => !a.startsWith("-") && a !== "json");

  if (flagJson) {
    renderJson(categoryId);
  } else {
    renderText(categoryId);
  }
}
