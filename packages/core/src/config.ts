/**
 * Platform-independent configuration for OpenFinClaw.
 * No dependency on any agent framework.
 * @module @openfinclaw/core/config
 */

/** Default URLs */
export const DEFAULT_HUB_API_URL = "https://hub.openfinclaw.ai";
export const DEFAULT_DATAHUB_GATEWAY_URL = "https://datahub.openfinclaw.ai";
export const DEFAULT_TIMEOUT_MS = 60_000;

/** Core configuration interface */
export interface OpenFinClawConfig {
  /** API Key for Hub and DataHub (fch_ prefix) */
  apiKey: string;
  /** Hub API URL */
  hubApiUrl: string;
  /** DataHub Gateway URL */
  datahubGatewayUrl: string;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** Database file path (default: ~/.openfinclaw/workspace/openfinclaw-plugin.db) */
  dbPath?: string;
}

/** Resolve config from environment variables */
export function resolveConfigFromEnv(): OpenFinClawConfig {
  const apiKey = process.env.OPENFINCLAW_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENFINCLAW_API_KEY environment variable is required. " +
        "Get your API key at https://hub.openfinclaw.ai",
    );
  }
  return {
    apiKey,
    hubApiUrl: (process.env.HUB_API_URL?.trim() || DEFAULT_HUB_API_URL).replace(/\/+$/, ""),
    datahubGatewayUrl: (
      process.env.DATAHUB_GATEWAY_URL?.trim() || DEFAULT_DATAHUB_GATEWAY_URL
    ).replace(/\/+$/, ""),
    requestTimeoutMs: Math.max(
      5000,
      Math.min(300_000, Number(process.env.REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS),
    ),
    dbPath: process.env.OPENFINCLAW_DB_PATH?.trim() || undefined,
  };
}
