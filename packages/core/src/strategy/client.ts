/**
 * Hub API client for strategy operations.
 * @module @openfinclaw/core/strategy/client
 */
import type { OpenFinClawConfig } from "../config.js";

/**
 * HTTP request helper for Hub API.
 */
export async function hubApiRequest(
  config: OpenFinClawConfig,
  method: "GET" | "POST",
  pathSegments: string,
  options?: { body?: Record<string, unknown>; searchParams?: Record<string, string> },
): Promise<{ status: number; data: unknown }> {
  const url = new URL(`${config.hubApiUrl}/api/v1${pathSegments}`);
  if (options?.searchParams) {
    for (const [k, v] of Object.entries(options.searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(config.requestTimeoutMs),
  });

  const rawText = await response.text();
  let data: unknown = rawText;
  if (rawText && rawText.trim().startsWith("{")) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }
  }

  return { status: response.status, data };
}
