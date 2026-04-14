/**
 * Scheduler tool execute functions and JSON schemas.
 * Simplified versions for MCP — no SQLite dependency.
 * @module @openfinclaw/core/scheduler/tools
 */
import type { OpenFinClawConfig } from "../config.js";
import { DataHubClient, guessMarket } from "../datahub/client.js";
import { listLocalStrategies } from "../strategy/storage.js";

// ── strategy_daily_scan ──────────────────────────────────────────────────

export const strategyDailyScanSchema = {
  type: "object" as const,
  properties: {
    strategyId: { type: "string", description: "Scan a specific strategy (default: all)" },
    includePrice: { type: "boolean", description: "Include price data (default: true)" },
  },
  required: [] as string[],
};

/**
 * Scan all local strategies for news and price data.
 * @param params - Scan parameters
 * @param config - OpenFinClaw configuration
 * @returns Scan report with strategy details
 */
export async function executeStrategyDailyScan(
  params: { strategyId?: string; includePrice?: boolean },
  config: OpenFinClawConfig,
) {
  const strategies = await listLocalStrategies();
  const filtered = params.strategyId
    ? strategies.filter(s => s.name.includes(params.strategyId!) || s.sourceId?.includes(params.strategyId!))
    : strategies;

  if (filtered.length === 0) {
    return { message: "No local strategies found. Fork or create strategies first.", strategies: [] };
  }

  const includePrice = params.includePrice !== false;
  const report: Array<Record<string, unknown>> = [];

  for (const strategy of filtered) {
    const entry: Record<string, unknown> = {
      name: strategy.displayName,
      type: strategy.type,
      dateDir: strategy.dateDir,
    };

    if (includePrice && strategy.sourceId) {
      try {
        const client = new DataHubClient(config.datahubGatewayUrl, config.apiKey, config.requestTimeoutMs);
        // Try to get a simple price for context
        entry.note = "Price data requires DataHub API access";
      } catch {
        entry.priceError = "Failed to fetch price data";
      }
    }

    report.push(entry);
  }

  return {
    scanType: "daily_scan",
    timestamp: new Date().toISOString(),
    strategiesScanned: filtered.length,
    report,
  };
}

// ── strategy_price_monitor ───────────────────────────────────────────────

export const strategyPriceMonitorSchema = {
  type: "object" as const,
  properties: {
    threshold: { type: "number", description: "Alert threshold percentage (default: 5)" },
    strategyId: { type: "string", description: "Monitor only one strategy's symbols (default: all)" },
  },
  required: [] as string[],
};

/**
 * Check price movements against alert threshold for strategy symbols.
 * @param params - Monitor parameters
 * @param config - OpenFinClaw configuration
 * @returns Price monitor report
 */
export async function executeStrategyPriceMonitor(
  params: { threshold?: number; strategyId?: string },
  config: OpenFinClawConfig,
) {
  const threshold = params.threshold ?? 5;
  const strategies = await listLocalStrategies();
  const filtered = params.strategyId
    ? strategies.filter(s => s.name.includes(params.strategyId!) || s.sourceId?.includes(params.strategyId!))
    : strategies;

  if (filtered.length === 0) {
    return { message: "No local strategies found.", alerts: [] };
  }

  return {
    scanType: "price_monitor",
    timestamp: new Date().toISOString(),
    threshold,
    strategiesMonitored: filtered.length,
    note: "Price monitoring requires DataHub API access. Alerts are generated when price changes exceed the threshold.",
    strategies: filtered.map(s => ({
      name: s.displayName,
      type: s.type,
    })),
  };
}

// ── strategy_scan_history ────────────────────────────────────────────────

export const strategyScanHistorySchema = {
  type: "object" as const,
  properties: {
    scanType: {
      type: "string",
      enum: ["daily_scan", "price_monitor", "weekly_report", "monthly_report"],
      description: "Filter by scan type",
    },
    limit: { type: "number", description: "Max results (default: 10)" },
  },
  required: [] as string[],
};

/**
 * Query past strategy scan and report history.
 * @param params - Query parameters
 * @param _config - OpenFinClaw configuration (unused in MCP mode)
 * @returns Scan history (empty in MCP mode)
 */
export async function executeStrategyScanHistory(
  params: { scanType?: string; limit?: number },
  _config: OpenFinClawConfig,
) {
  return {
    scanType: params.scanType ?? "all",
    limit: params.limit ?? 10,
    message: "Scan history is stored in SQLite when running as OpenClaw plugin. In MCP mode, scan results are returned directly to the agent.",
    history: [],
  };
}

// ── strategy_periodic_report ─────────────────────────────────────────────

export const strategyPeriodicReportSchema = {
  type: "object" as const,
  properties: {
    period: {
      type: "string",
      enum: ["weekly", "monthly"],
      description: "Report period: weekly (7d rolling) or monthly (30d rolling)",
    },
  },
  required: ["period"],
};

/**
 * Generate weekly (7d) or monthly (30d) strategy report.
 * @param params - Report parameters
 * @param config - OpenFinClaw configuration
 * @returns Periodic strategy report
 */
export async function executeStrategyPeriodicReport(
  params: { period: string },
  config: OpenFinClawConfig,
) {
  const strategies = await listLocalStrategies();
  const periodDays = params.period === "monthly" ? 30 : 7;

  return {
    period: params.period,
    periodDays,
    timestamp: new Date().toISOString(),
    strategiesCount: strategies.length,
    strategies: strategies.map(s => ({
      name: s.displayName,
      type: s.type,
      createdAt: s.createdAt,
    })),
    note: `${params.period === "monthly" ? "Monthly" : "Weekly"} report generated. Full backtest ranking and scan history available in OpenClaw plugin mode.`,
  };
}
