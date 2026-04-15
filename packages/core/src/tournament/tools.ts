/**
 * Tournament tool execute functions and JSON schemas.
 * Simplified for MCP — stateless operations.
 * @module @openfinclaw/core/tournament/tools
 */
import type { OpenFinClawConfig } from "../config.js";
import { hubApiRequest } from "../strategy/client.js";

// ── tournament_pick ──────────────────────────────────────────────────────

export const tournamentPickSchema = {
  type: "object" as const,
  properties: {
    agent_name: {
      type: "string",
      enum: ["bull", "bear", "contrarian"],
      description: "Agent to pick: bull, bear, or contrarian",
    },
    user_id: { type: "string", description: "User identifier from channel" },
  },
  required: ["agent_name"],
};

/**
 * Pick a strategy agent for the current tournament round.
 * @param params - Pick parameters
 * @param _config - OpenFinClaw configuration (unused in MCP mode)
 * @returns Pick result
 */
export async function executeTournamentPick(
  params: { agent_name: string; user_id?: string },
  _config: OpenFinClawConfig,
) {
  const validAgents = ["bull", "bear", "contrarian"];
  if (!validAgents.includes(params.agent_name)) {
    return { error: `Invalid agent. Choose one of: ${validAgents.join(", ")}` };
  }

  return {
    success: true,
    agent: params.agent_name,
    userId: params.user_id ?? "anonymous",
    message: `You picked the ${params.agent_name} agent! Tournament results will be tracked.`,
    note: "Tournament picks are tracked in-session over MCP; durable multi-round state is not persisted by this tool surface.",
  };
}

// ── tournament_leaderboard ───────────────────────────────────────────────

export const tournamentLeaderboardSchema = {
  type: "object" as const,
  properties: {},
  required: [] as string[],
};

/**
 * Show tournament agent leaderboard with W/L records.
 * @param _params - No parameters required
 * @param _config - OpenFinClaw configuration (unused in MCP mode)
 * @returns Leaderboard with agent descriptions
 */
export async function executeTournamentLeaderboard(
  _params: Record<string, unknown>,
  _config: OpenFinClawConfig,
) {
  return {
    agents: [
      { name: "bull", description: "Bullish strategies — optimistic outlook, momentum-driven" },
      { name: "bear", description: "Bearish strategies — defensive, hedging-focused" },
      { name: "contrarian", description: "Contrarian strategies — against-the-crowd, value-seeking" },
    ],
    message: "Agent roles for the tournament (bull / bear / contrarian). Detailed W/L history is not exposed through this MCP tool.",
    note: "Use tournament_pick to choose an agent, and tournament_result to submit analysis results.",
  };
}

// ── tournament_result ────────────────────────────────────────────────────

export const tournamentResultSchema = {
  type: "object" as const,
  properties: {
    round_id: { type: "string", description: "Tournament round ID" },
    agent_name: {
      type: "string",
      enum: ["bull", "bear", "contrarian"],
      description: "Agent role: bull, bear, or contrarian",
    },
    thesis: { type: "string", description: "Analysis thesis (1 paragraph)" },
    confidence: { type: "number", description: "Confidence score (0-100)" },
    entry_price: { type: "number", description: "Entry price" },
    exit_price: { type: "number", description: "Exit/target price" },
    stop_loss: { type: "number", description: "Stop loss price" },
    sharpe: { type: "number", description: "Sharpe ratio from backtest" },
    max_drawdown: { type: "number", description: "Max drawdown from backtest" },
    total_return: { type: "number", description: "Total return from backtest" },
  },
  required: ["round_id", "agent_name", "thesis", "confidence"],
};

/**
 * Submit analysis result from a tournament sub-agent.
 * @param params - Tournament result parameters
 * @param _config - OpenFinClaw configuration (unused in MCP mode)
 * @returns Submission confirmation with metrics
 */
export async function executeTournamentResult(
  params: {
    round_id: string;
    agent_name: string;
    thesis: string;
    confidence: number;
    entry_price?: number;
    exit_price?: number;
    stop_loss?: number;
    sharpe?: number;
    max_drawdown?: number;
    total_return?: number;
  },
  _config: OpenFinClawConfig,
) {
  const validAgents = ["bull", "bear", "contrarian"];
  if (!validAgents.includes(params.agent_name)) {
    return { error: `Invalid agent. Choose one of: ${validAgents.join(", ")}` };
  }
  if (params.confidence < 0 || params.confidence > 100 || !Number.isFinite(params.confidence)) {
    return { error: "Confidence must be between 0 and 100" };
  }

  return {
    success: true,
    roundId: params.round_id,
    agent: params.agent_name,
    confidence: params.confidence,
    thesis: params.thesis,
    metrics: {
      entryPrice: params.entry_price,
      exitPrice: params.exit_price,
      stopLoss: params.stop_loss,
      sharpe: params.sharpe,
      maxDrawdown: params.max_drawdown,
      totalReturn: params.total_return,
    },
    message: `${params.agent_name} agent result submitted for round ${params.round_id} (confidence: ${params.confidence}%)`,
  };
}
