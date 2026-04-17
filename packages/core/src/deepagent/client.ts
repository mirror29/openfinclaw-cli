/**
 * DeepAgent REST + SSE client for `@openfinclaw/core`.
 *
 * Authentication uses `X-API-Key` header (not Bearer — DeepAgent treats
 * Bearer tokens as JWT). The key is distinct from the Hub `fch_` key.
 *
 * @module @openfinclaw/core/deepagent/client
 */
import type { OpenFinClawConfig } from "../config.js";
import type { DeepAgentSSEEvent, DeepAgentTaskState } from "./types.js";

/**
 * HTTP request helper for the DeepAgent API (non-streaming endpoints).
 * Wraps fetch with `X-API-Key` auth + structured error handling.
 * Network errors surface as `{ status: 0, data: { error: { message } } }`.
 * @param config - Core config (uses `deepagentApiUrl`, `deepagentApiKey`, `requestTimeoutMs`)
 * @param method - HTTP method
 * @param pathSegments - Path under `/api` (e.g. `/threads`)
 * @param options - Optional `body`, `searchParams`, and `requireAuth` flag
 */
export async function deepagentApiRequest(
  config: OpenFinClawConfig,
  method: "GET" | "POST" | "DELETE",
  pathSegments: string,
  options?: {
    body?: Record<string, unknown>;
    searchParams?: Record<string, string>;
    /** When true (default), require `deepagentApiKey` to be set. */
    requireAuth?: boolean;
  },
): Promise<{ status: number; data: unknown }> {
  const baseUrl = (config.deepagentApiUrl ?? "https://api.openfinclaw.ai/agent").replace(
    /\/+$/,
    "",
  );
  const url = new URL(`${baseUrl}/api${pathSegments}`);
  if (options?.searchParams) {
    for (const [k, v] of Object.entries(options.searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const requireAuth = options?.requireAuth ?? true;
  if (requireAuth && !config.deepagentApiKey) {
    return {
      status: 0,
      data: {
        error: {
          message:
            "DeepAgent API key not configured. Set OPENFINCLAW_DEEPAGENT_API_KEY, " +
            "run `openfinclaw init` to save it to ~/.openfinclaw/config.json, " +
            "or pass --deepagent-api-key.",
        },
      },
    };
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (config.deepagentApiKey) {
    headers["X-API-Key"] = config.deepagentApiKey;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 0, data: { error: { message: `Network error: ${msg}` } } };
  }

  const rawText = await response.text();
  let data: unknown = rawText;
  if (rawText && (rawText.trim().startsWith("{") || rawText.trim().startsWith("["))) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }
  }

  return { status: response.status, data };
}

/**
 * Parse a DeepAgent SSE stream into an async iterable of typed events.
 *
 * Each SSE frame is `event: <TYPE>\ndata: <JSON>\n\n`. Incomplete frames
 * are buffered across chunk boundaries.
 *
 * @param body - Readable byte stream (response body of `POST /runs`)
 */
export async function* parseDeepAgentSSE(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<DeepAgentSSEEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split on blank-line frame separator.
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        let eventType = "";
        let dataLine = "";
        for (const rawLine of frame.split("\n")) {
          const line = rawLine.trimEnd();
          if (line.startsWith("event:")) eventType = line.slice(6).trim();
          else if (line.startsWith("data:"))
            dataLine += (dataLine ? "\n" : "") + line.slice(5).trim();
        }

        if (!eventType) continue;
        let parsed: Record<string, unknown> = {};
        if (dataLine) {
          try {
            parsed = JSON.parse(dataLine) as Record<string, unknown>;
          } catch {
            parsed = { raw: dataLine };
          }
        }
        yield { type: eventType as DeepAgentSSEEvent["type"], data: parsed } as DeepAgentSSEEvent;
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}

/**
 * In-memory task store for DeepAgent research runs tracked by this MCP server
 * process. Keyed by `runId`. Cleared on process restart — MCP is stateless by
 * design; DeepAgent itself persists thread/message state server-side.
 */
const taskStore = new Map<string, DeepAgentTaskState>();

/** Retrieve a task by runId (undefined when not found or already purged). */
export function getDeepAgentTask(taskId: string): DeepAgentTaskState | undefined {
  return taskStore.get(taskId);
}

/** List all tracked tasks (most recent first). */
export function listDeepAgentTasks(): DeepAgentTaskState[] {
  return [...taskStore.values()].sort((a, b) =>
    (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""),
  );
}

/** Remove a task from the store (called after finalize). */
export function clearDeepAgentTask(taskId: string): void {
  taskStore.delete(taskId);
}

/**
 * Submit a research run and start consuming its SSE stream in the background.
 * Blocks only until the `RUN_STARTED` event is received (which carries the `runId`),
 * then returns immediately. The remaining SSE stream is consumed asynchronously;
 * intermediate `TEXT_DELTA` / `TOOL_*` events update the task store so pollers
 * can observe progress.
 *
 * @param config - Core config (reads `deepagentApiKey`, `deepagentApiUrl`, `deepagentSseTimeoutMs`)
 * @param threadId - Existing thread ID
 * @param query - User query text
 * @param label - Optional short label for bookkeeping (defaults to first 60 chars of query)
 * @returns `{ taskId, threadId }` on success; throws on POST failure or missing RUN_STARTED.
 */
export async function startDeepAgentRun(
  config: OpenFinClawConfig,
  threadId: string,
  query: string,
  label?: string,
): Promise<{ taskId: string; threadId: string }> {
  if (!config.deepagentApiKey) {
    throw new Error("DeepAgent API key not configured");
  }

  const baseUrl = (config.deepagentApiUrl ?? "https://api.openfinclaw.ai/agent").replace(
    /\/+$/,
    "",
  );
  const url = `${baseUrl}/api/threads/${threadId}/runs`;
  const sseTimeout = config.deepagentSseTimeoutMs ?? 900_000;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-Key": config.deepagentApiKey,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ message: query }),
    signal: AbortSignal.timeout(sseTimeout),
  });

  if (!response.ok || !response.body) {
    const text = response.body ? await response.text() : "";
    throw new Error(
      `DeepAgent run failed to start: HTTP ${response.status} ${text.slice(0, 300)}`,
    );
  }

  const iterator = parseDeepAgentSSE(response.body)[Symbol.asyncIterator]();
  let runId: string | undefined;

  // Wait for the first RUN_STARTED event so we can return a taskId.
  while (true) {
    const { value: event, done } = await iterator.next();
    if (done) break;
    if (!event) continue;
    if (event.type === "RUN_STARTED") {
      runId = event.data.runId;
      break;
    }
    if (event.type === "ERROR") {
      throw new Error(`DeepAgent ERROR before RUN_STARTED: ${event.data.error}`);
    }
  }

  if (!runId) {
    throw new Error("DeepAgent stream ended before RUN_STARTED event");
  }

  // Seed the task store.
  const state: DeepAgentTaskState = {
    taskId: runId,
    threadId,
    status: "running",
    submittedAt: new Date().toISOString(),
    text: "",
    toolsUsed: [],
    handoffs: [],
    label: label ?? query.slice(0, 60),
  };
  taskStore.set(runId, state);

  // Consume the rest of the stream in the background.
  void consumeRestOfStream(iterator, runId);

  return { taskId: runId, threadId };
}

/**
 * Consume the remaining SSE events after `RUN_STARTED` and update the task store
 * until `RUN_FINISHED` / `ERROR` or stream end. Never throws — failures are
 * recorded on the task state.
 * @param iterator - Active SSE async iterator (already past RUN_STARTED)
 * @param taskId - The run's taskId (== runId)
 */
async function consumeRestOfStream(
  iterator: AsyncIterator<DeepAgentSSEEvent>,
  taskId: string,
): Promise<void> {
  try {
    while (true) {
      const { value: event, done } = await iterator.next();
      if (done) break;
      const state = taskStore.get(taskId);
      if (!state) break; // cleared/cancelled
      switch (event.type) {
        case "TEXT_DELTA":
          state.text += event.data.delta ?? "";
          break;
        case "TOOL_START":
          state.toolsUsed.push({
            toolName: event.data.toolName,
            toolCallId: event.data.toolCallId,
            done: false,
          });
          break;
        case "TOOL_DONE": {
          const tool = state.toolsUsed.find((t) => t.toolCallId === event.data.toolCallId);
          if (tool) tool.done = true;
          break;
        }
        case "AGENT_HANDOFF":
          state.handoffs.push(event.data.agentName);
          break;
        case "ERROR":
          state.status = "failed";
          state.error = event.data.error;
          state.completedAt = new Date().toISOString();
          break;
        case "RUN_FINISHED":
          if (event.data.isError) {
            state.status = "failed";
            state.error = state.error ?? "Run finished with isError=true";
          } else {
            state.status = "completed";
            if (event.data.text) state.text = event.data.text;
          }
          state.completedAt = new Date().toISOString();
          return; // done
        default:
          break;
      }
    }
  } catch (err) {
    const state = taskStore.get(taskId);
    if (state && state.status === "running") {
      state.status = "failed";
      state.error = err instanceof Error ? err.message : String(err);
      state.completedAt = new Date().toISOString();
    }
  }
}
