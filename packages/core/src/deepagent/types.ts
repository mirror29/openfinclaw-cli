/**
 * DeepAgent REST + SSE type definitions.
 * Base URL: https://api.openfinclaw.ai/agent
 * @module @openfinclaw/core/deepagent/types
 */

// ── REST responses ──────────────────────────────────────────────────

/** Response of `GET /api/health` (public, no auth). */
export interface DeepAgentHealth {
  status: string;
  sdk?: string;
  skills_count?: number;
  agents?: string[];
  active_sessions?: number;
  threads_supported?: boolean;
}

/** Single skill entry from `GET /api/skills`. */
export interface DeepAgentSkill {
  name: string;
  display_name?: string;
  description?: string;
}

/** Response of `GET /api/skills` (public, no auth). */
export interface DeepAgentSkillsResponse {
  count: number;
  skills: DeepAgentSkill[];
}

/** Thread record from `GET /api/threads`. */
export interface DeepAgentThread {
  id: string;
  user_id?: string;
  title?: string;
  status?: string;
  total_cost_usd?: number;
  total_turns?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/** Message record from `GET /api/threads/{id}/messages`. */
export interface DeepAgentMessage {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content?: string;
  created_at?: string;
  [key: string]: unknown;
}

/** Backtest summary entry from `GET /api/backtests`. */
export interface DeepAgentBacktestSummary {
  task_id: string;
  status?: string;
  total_return?: number;
  sharpe?: number;
  max_drawdown?: number;
  win_rate?: number;
  total_trades?: number;
  created_at?: number;
}

/** Response of `GET /api/backtests`. */
export interface DeepAgentBacktestsResponse {
  count: number;
  results: DeepAgentBacktestSummary[];
}

/** Package summary entry from `GET /api/packages`. */
export interface DeepAgentPackage {
  package_id: string;
  name?: string;
  symbol?: string;
  style?: string;
  template?: string;
  has_zip?: boolean;
  zip_size_kb?: number;
  created_at?: number;
  download_url?: string;
}

/** Response of `GET /api/packages`. */
export interface DeepAgentPackagesResponse {
  count: number;
  packages: DeepAgentPackage[];
}

// ── SSE events ──────────────────────────────────────────────────────

/** Event types emitted by DeepAgent run streams. */
export type DeepAgentSSEEventType =
  | "RUN_STARTED"
  | "TEXT_DELTA"
  | "TOOL_START"
  | "TOOL_DONE"
  | "AGENT_HANDOFF"
  | "ERROR"
  | "RUN_FINISHED";

/** Payload envelopes for each SSE event type. */
export type DeepAgentSSEEvent =
  | { type: "RUN_STARTED"; data: { runId: string } }
  | { type: "TEXT_DELTA"; data: { delta: string; runId: string } }
  | {
      type: "TOOL_START";
      data: { toolName: string; toolCallId: string; runId: string };
    }
  | { type: "TOOL_DONE"; data: { toolCallId: string; runId: string } }
  | { type: "AGENT_HANDOFF"; data: { agentName: string; runId: string } }
  | { type: "ERROR"; data: { error: string; runId?: string } }
  | {
      type: "RUN_FINISHED";
      data: { runId: string; text: string; isError: boolean };
    };

// ── In-memory research task state ───────────────────────────────────

/** State of a DeepAgent research run tracked by the MCP server process. */
export interface DeepAgentTaskState {
  taskId: string;
  threadId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  submittedAt: string;
  completedAt?: string;
  /** Accumulated assistant text so far (for poll). */
  text: string;
  /** Tools invoked so far during the run. */
  toolsUsed: Array<{ toolName: string; toolCallId: string; done: boolean }>;
  /** Agent handoffs observed (multi-agent workflow). */
  handoffs: string[];
  /** Error message when status === "failed". */
  error?: string;
  /** Optional label for bookkeeping (often the first 60 chars of query). */
  label?: string;
}
