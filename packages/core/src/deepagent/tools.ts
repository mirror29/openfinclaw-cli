/**
 * DeepAgent tool execute functions and JSON schemas.
 *
 * Tools follow a **submit + poll + finalize** pattern for long-running research
 * (3-10 min LLM calls) so that every MCP client — including those that don't
 * render progress notifications — still feels responsive.
 *
 * @module @openfinclaw/core/deepagent/tools
 */
import { writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { OpenFinClawConfig } from "../config.js";
import {
  clearDeepAgentTask,
  deepagentApiRequest,
  getDeepAgentTask,
  listDeepAgentTasks,
  startDeepAgentRun,
} from "./client.js";
import type {
  DeepAgentBacktestsResponse,
  DeepAgentHealth,
  DeepAgentMessage,
  DeepAgentPackage,
  DeepAgentPackagesResponse,
  DeepAgentSkillsResponse,
  DeepAgentThread,
} from "./types.js";

// ── Shared helpers ──────────────────────────────────────────────────

/**
 * Extract a human-readable error message from a DeepAgent error response.
 * DeepAgent returns `{ detail: "..." }` for auth errors and `{ error: ... }` for others.
 * @param data - Response body (JSON-parsed or raw)
 */
function extractError(data: unknown): string {
  if (typeof data === "string") return data.slice(0, 300);
  if (typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    if (typeof d.message === "string") return d.message;
    const inner = d.error;
    if (typeof inner === "string") return inner;
    if (typeof inner === "object" && inner !== null) {
      const e = inner as Record<string, unknown>;
      if (typeof e.message === "string") return e.message;
      if (typeof e.code === "string") return e.code;
    }
  }
  return "Unknown error";
}

/** Short hint for known HTTP status codes. */
function hintForStatus(status: number): string {
  switch (status) {
    case 401:
    case 403:
      return "DeepAgent API Key 无效或未配置。请 `openfinclaw init` 或设置 OPENFINCLAW_DEEPAGENT_API_KEY。";
    case 404:
      return "资源不存在。";
    case 0:
      return "网络异常或请求超时。";
    default:
      return "";
  }
}

/**
 * Cap a JSON payload to protect LLM context budget.
 * If stringified size exceeds `maxChars`, returns a truncated marker object.
 * @param payload - Original payload
 * @param maxChars - Maximum character length (default 2000)
 */
function capPayload<T>(payload: T, maxChars = 2000): T | { _truncated: true; preview: string; originalLength: number } {
  const raw = JSON.stringify(payload);
  if (raw.length <= maxChars) return payload;
  return {
    _truncated: true,
    preview: raw.slice(0, maxChars) + "…",
    originalLength: raw.length,
  };
}

// ── fin_deepagent_health (no auth) ──────────────────────────────────

/** JSON Schema for `fin_deepagent_health`. */
export const deepagentHealthSchema = {
  type: "object" as const,
  properties: {},
  required: [] as string[],
};

/**
 * Execute `fin_deepagent_health` — ping DeepAgent `/api/health`.
 * Public endpoint; does not require `deepagentApiKey`.
 * @param _params - Unused
 * @param config - Core configuration
 */
export async function executeDeepagentHealth(
  _params: Record<string, unknown>,
  config: OpenFinClawConfig,
) {
  const { status, data } = await deepagentApiRequest(config, "GET", "/health", {
    requireAuth: false,
  });
  if (status !== 200) {
    return { success: false as const, error: `Health check failed: HTTP ${status} — ${extractError(data)}` };
  }
  return { success: true as const, ...(data as DeepAgentHealth) };
}

// ── fin_deepagent_skills (no auth) ──────────────────────────────────

/** JSON Schema for `fin_deepagent_skills`. */
export const deepagentSkillsSchema = {
  type: "object" as const,
  properties: {},
  required: [] as string[],
};

/**
 * Execute `fin_deepagent_skills` — list DeepAgent analysis skills (~60 entries).
 * Public endpoint.
 * @param _params - Unused
 * @param config - Core configuration
 */
export async function executeDeepagentSkills(
  _params: Record<string, unknown>,
  config: OpenFinClawConfig,
) {
  const { status, data } = await deepagentApiRequest(config, "GET", "/skills", {
    requireAuth: false,
  });
  if (status !== 200) {
    return { success: false as const, error: `Skills list failed: HTTP ${status} — ${extractError(data)}` };
  }
  return data as DeepAgentSkillsResponse;
}

// ── fin_deepagent_threads (auth) ────────────────────────────────────

/** JSON Schema for `fin_deepagent_threads`. */
export const deepagentThreadsSchema = {
  type: "object" as const,
  properties: {
    action: {
      type: "string",
      enum: ["list", "create", "get", "delete"],
      description: "Operation: list / create / get / delete",
    },
    threadId: { type: "string", description: "Thread UUID (required for get/delete)" },
    title: { type: "string", description: "Title for the new thread (optional, create only)" },
  },
  required: ["action"],
};

/**
 * Execute `fin_deepagent_threads` — CRUD over DeepAgent threads.
 * @param params - Action + optional threadId/title
 * @param config - Core configuration
 */
export async function executeDeepagentThreads(
  params: { action: "list" | "create" | "get" | "delete"; threadId?: string; title?: string },
  config: OpenFinClawConfig,
) {
  const { action, threadId, title } = params;

  if (action === "list") {
    const { status, data } = await deepagentApiRequest(config, "GET", "/threads");
    if (status !== 200) {
      return { success: false as const, error: `List threads failed: HTTP ${status} — ${extractError(data)}` };
    }
    const threads = (Array.isArray(data) ? data : []) as DeepAgentThread[];
    return { success: true as const, count: threads.length, threads };
  }

  if (action === "create") {
    const body: Record<string, unknown> = {};
    if (title) body.title = title;
    const { status, data } = await deepagentApiRequest(config, "POST", "/threads", { body });
    if (status !== 200 && status !== 201) {
      return { success: false as const, error: `Create thread failed: HTTP ${status} — ${extractError(data)}` };
    }
    return { success: true as const, thread: data as DeepAgentThread };
  }

  if (action === "get") {
    if (!threadId) return { success: false as const, error: "threadId required for action=get" };
    const { status, data } = await deepagentApiRequest(config, "GET", `/threads/${threadId}`);
    if (status !== 200) {
      return { success: false as const, error: `Get thread failed: HTTP ${status} — ${extractError(data)}` };
    }
    return { success: true as const, thread: data as DeepAgentThread };
  }

  if (action === "delete") {
    if (!threadId) return { success: false as const, error: "threadId required for action=delete" };
    const { status } = await deepagentApiRequest(config, "DELETE", `/threads/${threadId}`);
    if (status !== 200 && status !== 204) {
      return { success: false as const, error: `Delete thread failed: HTTP ${status}` };
    }
    return { success: true as const, threadId };
  }

  return { success: false as const, error: `Unknown action: ${action}` };
}

// ── fin_deepagent_messages (auth) ───────────────────────────────────

/** JSON Schema for `fin_deepagent_messages`. */
export const deepagentMessagesSchema = {
  type: "object" as const,
  properties: {
    threadId: { type: "string", description: "Thread UUID" },
    limit: { type: "number", description: "Max messages (1-20, default 5)" },
  },
  required: ["threadId"],
};

/**
 * Execute `fin_deepagent_messages` — list messages in a thread.
 * @param params - `threadId` + optional `limit`
 * @param config - Core configuration
 */
export async function executeDeepagentMessages(
  params: { threadId: string; limit?: number },
  config: OpenFinClawConfig,
) {
  const limit = Math.max(1, Math.min(20, params.limit ?? 5));
  const { status, data } = await deepagentApiRequest(
    config,
    "GET",
    `/threads/${params.threadId}/messages`,
    { searchParams: { limit: String(limit) } },
  );
  if (status !== 200) {
    return { success: false as const, error: `Get messages failed: HTTP ${status} — ${extractError(data)}` };
  }
  const messages = (Array.isArray(data) ? data : []) as DeepAgentMessage[];
  return { success: true as const, count: messages.length, messages };
}

// ── fin_deepagent_research_submit (auth) ────────────────────────────

/** JSON Schema for `fin_deepagent_research_submit`. */
export const deepagentResearchSubmitSchema = {
  type: "object" as const,
  properties: {
    query: { type: "string", description: "Research question or analysis request" },
    threadId: {
      type: "string",
      description:
        "Optional existing thread UUID to continue a conversation. If omitted, a new thread is created.",
    },
  },
  required: ["query"],
};

/**
 * Execute `fin_deepagent_research_submit` — start an async research run.
 * Returns a `taskId` after ~1-2s (when `RUN_STARTED` is received). Intermediate
 * text deltas are collected in the background; poll with
 * `fin_deepagent_research_poll` every 30-60s until `done: true`, then call
 * `fin_deepagent_research_finalize` to retrieve the full report.
 * @param params - `query` + optional `threadId`
 * @param config - Core configuration
 */
export async function executeDeepagentResearchSubmit(
  params: { query: string; threadId?: string },
  config: OpenFinClawConfig,
) {
  if (!config.deepagentApiKey) {
    return { success: false as const, error: hintForStatus(401) };
  }

  let threadId = params.threadId;
  // Create thread if not supplied.
  if (!threadId) {
    const { status, data } = await deepagentApiRequest(config, "POST", "/threads", { body: {} });
    if (status !== 200 && status !== 201) {
      return {
        success: false as const,
        error: `Failed to create thread: HTTP ${status} — ${extractError(data)}`,
      };
    }
    threadId = (data as DeepAgentThread).id;
    if (!threadId) {
      return { success: false as const, error: "Create thread response missing id" };
    }
  }

  try {
    const { taskId } = await startDeepAgentRun(config, threadId, params.query);
    return {
      success: true as const,
      taskId,
      threadId,
      status: "running",
      hint:
        "Call fin_deepagent_research_poll every 30-60 seconds with this taskId. " +
        "When poll returns done=true, call fin_deepagent_research_finalize to get the full report.",
    };
  } catch (err) {
    return {
      success: false as const,
      threadId,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── fin_deepagent_research_poll (auth) ──────────────────────────────

/** JSON Schema for `fin_deepagent_research_poll`. */
export const deepagentResearchPollSchema = {
  type: "object" as const,
  properties: {
    taskId: { type: "string", description: "Task ID from fin_deepagent_research_submit" },
  },
  required: ["taskId"],
};

/**
 * Execute `fin_deepagent_research_poll` — fetch current progress of a research run.
 *
 * Returns `{ done, status, partialText, toolsUsed, handoffs, error? }`. When
 * `done: true`, call `fin_deepagent_research_finalize` to receive the full text
 * and clear the task from the store.
 *
 * @param params - `taskId`
 * @param _config - Core configuration (unused; state is in-process)
 */
export async function executeDeepagentResearchPoll(
  params: { taskId: string },
  _config: OpenFinClawConfig,
) {
  const state = getDeepAgentTask(params.taskId);
  if (!state) {
    return {
      success: false as const,
      error:
        `Unknown taskId: ${params.taskId}. The task may have expired (MCP server restart) ` +
        `or was never submitted in this process. Check thread messages via fin_deepagent_messages.`,
    };
  }
  const done = state.status !== "running";
  const preview = state.text.length > 1500 ? state.text.slice(-1500) : state.text;
  return {
    success: true as const,
    taskId: state.taskId,
    threadId: state.threadId,
    status: state.status,
    done,
    submittedAt: state.submittedAt,
    completedAt: state.completedAt,
    /** Last ~1500 chars of accumulated text so far (for LLM to read). */
    partialText: preview,
    partialTextLength: state.text.length,
    toolsUsed: state.toolsUsed.map((t) => ({ name: t.toolName, done: t.done })),
    handoffs: state.handoffs,
    error: state.error,
  };
}

// ── fin_deepagent_research_finalize (auth) ──────────────────────────

/** JSON Schema for `fin_deepagent_research_finalize`. */
export const deepagentResearchFinalizeSchema = {
  type: "object" as const,
  properties: {
    taskId: { type: "string", description: "Task ID from fin_deepagent_research_submit" },
  },
  required: ["taskId"],
};

/**
 * Execute `fin_deepagent_research_finalize` — retrieve the full final text of
 * a research run and clear it from the task store. Fails if the run is still
 * running — caller should `poll` until `done: true` first.
 * @param params - `taskId`
 * @param _config - Core configuration (unused)
 */
export async function executeDeepagentResearchFinalize(
  params: { taskId: string },
  _config: OpenFinClawConfig,
) {
  const state = getDeepAgentTask(params.taskId);
  if (!state) {
    return { success: false as const, error: `Unknown taskId: ${params.taskId}` };
  }
  if (state.status === "running") {
    return {
      success: false as const,
      error: "Task still running. Poll until done=true before finalizing.",
      status: state.status,
    };
  }
  const payload = {
    success: state.status === "completed",
    taskId: state.taskId,
    threadId: state.threadId,
    status: state.status,
    submittedAt: state.submittedAt,
    completedAt: state.completedAt,
    finalText: state.text,
    toolsUsed: state.toolsUsed.map((t) => ({ name: t.toolName, done: t.done })),
    handoffs: state.handoffs,
    error: state.error,
  };
  clearDeepAgentTask(params.taskId);
  return payload;
}

// ── fin_deepagent_status (auth) ─────────────────────────────────────

/** JSON Schema for `fin_deepagent_status`. */
export const deepagentStatusSchema = {
  type: "object" as const,
  properties: {
    taskId: { type: "string", description: "Optional taskId. Omit to list all tasks." },
  },
  required: [] as string[],
};

/**
 * Execute `fin_deepagent_status` — list active research tasks or fetch one task's status.
 * @param params - Optional `taskId`
 * @param _config - Core configuration (unused)
 */
export async function executeDeepagentStatus(
  params: { taskId?: string },
  _config: OpenFinClawConfig,
) {
  if (params.taskId) {
    const state = getDeepAgentTask(params.taskId);
    if (!state) return { success: false as const, error: `Unknown taskId: ${params.taskId}` };
    return {
      success: true as const,
      taskId: state.taskId,
      threadId: state.threadId,
      status: state.status,
      submittedAt: state.submittedAt,
      completedAt: state.completedAt,
      textLength: state.text.length,
      toolsCount: state.toolsUsed.length,
      label: state.label,
    };
  }
  const tasks = listDeepAgentTasks().map((s) => ({
    taskId: s.taskId,
    threadId: s.threadId,
    status: s.status,
    submittedAt: s.submittedAt,
    completedAt: s.completedAt,
    textLength: s.text.length,
    label: s.label,
  }));
  return { success: true as const, count: tasks.length, tasks };
}

// ── fin_deepagent_cancel (auth) ─────────────────────────────────────

/** JSON Schema for `fin_deepagent_cancel`. */
export const deepagentCancelSchema = {
  type: "object" as const,
  properties: {
    threadId: { type: "string", description: "Thread UUID" },
    runId: { type: "string", description: "Run UUID (== taskId)" },
  },
  required: ["threadId", "runId"],
};

/**
 * Execute `fin_deepagent_cancel` — cancel a running DeepAgent run on the server.
 * Also marks the local task as cancelled.
 * @param params - `threadId` + `runId`
 * @param config - Core configuration
 */
export async function executeDeepagentCancel(
  params: { threadId: string; runId: string },
  config: OpenFinClawConfig,
) {
  const { status, data } = await deepagentApiRequest(
    config,
    "POST",
    `/threads/${params.threadId}/runs/${params.runId}/cancel`,
  );
  if (status !== 200) {
    return { success: false as const, error: `Cancel failed: HTTP ${status} — ${extractError(data)}` };
  }
  const state = getDeepAgentTask(params.runId);
  if (state && state.status === "running") {
    state.status = "cancelled";
    state.completedAt = new Date().toISOString();
  }
  return { success: true as const, runId: params.runId, threadId: params.threadId };
}

// ── fin_deepagent_backtests (auth) ──────────────────────────────────

/** JSON Schema for `fin_deepagent_backtests`. */
export const deepagentBacktestsSchema = {
  type: "object" as const,
  properties: {},
  required: [] as string[],
};

/**
 * Execute `fin_deepagent_backtests` — list backtest summaries.
 * @param _params - Unused
 * @param config - Core configuration
 */
export async function executeDeepagentBacktests(
  _params: Record<string, unknown>,
  config: OpenFinClawConfig,
) {
  const { status, data } = await deepagentApiRequest(config, "GET", "/backtests");
  if (status !== 200) {
    return { success: false as const, error: `List backtests failed: HTTP ${status} — ${extractError(data)}` };
  }
  return data as DeepAgentBacktestsResponse;
}

// ── fin_deepagent_backtest_result (auth) ────────────────────────────

/** JSON Schema for `fin_deepagent_backtest_result`. */
export const deepagentBacktestResultSchema = {
  type: "object" as const,
  properties: {
    taskId: { type: "string", description: "Backtest task UUID" },
  },
  required: ["taskId"],
};

/**
 * Execute `fin_deepagent_backtest_result` — fetch a full backtest report.
 * @param params - `taskId`
 * @param config - Core configuration
 */
export async function executeDeepagentBacktestResult(
  params: { taskId: string },
  config: OpenFinClawConfig,
) {
  const { status, data } = await deepagentApiRequest(
    config,
    "GET",
    `/backtests/${params.taskId}/result`,
  );
  if (status !== 200) {
    return {
      success: false as const,
      error: `Get backtest result failed: HTTP ${status} — ${extractError(data)}`,
    };
  }
  return capPayload({ success: true as const, ...(data as Record<string, unknown>) });
}

// ── fin_deepagent_packages (auth) ───────────────────────────────────

/** JSON Schema for `fin_deepagent_packages`. */
export const deepagentPackagesSchema = {
  type: "object" as const,
  properties: {},
  required: [] as string[],
};

/**
 * Execute `fin_deepagent_packages` — list strategy packages generated by DeepAgent.
 * @param _params - Unused
 * @param config - Core configuration
 */
export async function executeDeepagentPackages(
  _params: Record<string, unknown>,
  config: OpenFinClawConfig,
) {
  const { status, data } = await deepagentApiRequest(config, "GET", "/packages");
  if (status !== 200) {
    return { success: false as const, error: `List packages failed: HTTP ${status} — ${extractError(data)}` };
  }
  return data as DeepAgentPackagesResponse;
}

// ── fin_deepagent_package_meta (auth) ───────────────────────────────

/** JSON Schema for `fin_deepagent_package_meta`. */
export const deepagentPackageMetaSchema = {
  type: "object" as const,
  properties: {
    packageId: { type: "string", description: "Package ID (e.g. pkg_xxxxx)" },
  },
  required: ["packageId"],
};

/**
 * Execute `fin_deepagent_package_meta` — fetch package metadata (parameters, template, validation).
 * @param params - `packageId`
 * @param config - Core configuration
 */
export async function executeDeepagentPackageMeta(
  params: { packageId: string },
  config: OpenFinClawConfig,
) {
  const { status, data } = await deepagentApiRequest(
    config,
    "GET",
    `/packages/${params.packageId}/meta`,
  );
  if (status !== 200) {
    return {
      success: false as const,
      error: `Get package meta failed: HTTP ${status} — ${extractError(data)}`,
    };
  }
  return capPayload({ success: true as const, ...(data as Record<string, unknown>) });
}

// ── fin_deepagent_download_package (auth) ───────────────────────────

/** JSON Schema for `fin_deepagent_download_package`. */
export const deepagentDownloadPackageSchema = {
  type: "object" as const,
  properties: {
    packageId: { type: "string", description: "Package ID (e.g. pkg_xxxxx)" },
    targetDir: {
      type: "string",
      description:
        "Optional target directory. Defaults to ~/.openfinclaw/deepagent-packages/",
    },
  },
  required: ["packageId"],
};

/**
 * Execute `fin_deepagent_download_package` — download a package ZIP to local disk.
 * @param params - `packageId` + optional `targetDir`
 * @param config - Core configuration
 */
export async function executeDeepagentDownloadPackage(
  params: { packageId: string; targetDir?: string },
  config: OpenFinClawConfig,
) {
  if (!config.deepagentApiKey) {
    return { success: false as const, error: hintForStatus(401) };
  }

  const baseUrl = (config.deepagentApiUrl ?? "https://api.openfinclaw.ai/agent").replace(
    /\/+$/,
    "",
  );
  const url = `${baseUrl}/api/packages/${params.packageId}/download`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      headers: { "X-API-Key": config.deepagentApiKey },
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    });
  } catch (err) {
    return {
      success: false as const,
      error: `Download failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!resp.ok) {
    const txt = await resp.text();
    return {
      success: false as const,
      error: `Download failed: HTTP ${resp.status} ${txt.slice(0, 200)}`,
    };
  }

  const buf = Buffer.from(await resp.arrayBuffer());
  const dir = params.targetDir ?? join(homedir(), ".openfinclaw", "deepagent-packages");
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${params.packageId}.zip`);
  await writeFile(path, buf);

  return {
    success: true as const,
    packageId: params.packageId,
    localPath: path,
    sizeKb: Math.round((buf.length / 1024) * 10) / 10,
  };
}
