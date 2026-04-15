/**
 * Platform-independent configuration for OpenFinClaw.
 * No dependency on any agent framework.
 * @module @openfinclaw/core/config
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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
  /** Optional local workspace database path (`OPENFINCLAW_DB_PATH`) */
  dbPath?: string;
}

/** Options for {@link resolveOpenFinClawConfig} */
export interface ResolveOpenFinClawConfigOptions {
  /**
   * Explicit API key (e.g. CLI `--api-key`). Highest priority.
   */
  apiKey?: string;
}

/**
 * Absolute path to the user JSON config file (`~/.openfinclaw/config.json`).
 * Override with `OPENFINCLAW_CONFIG_PATH` (e.g. tests or custom layout).
 * @returns Resolved filesystem path
 */
export function getUserConfigFilePath(): string {
  const override = process.env.OPENFINCLAW_CONFIG_PATH?.trim();
  if (override) {
    return override;
  }
  return join(homedir(), ".openfinclaw", "config.json");
}

/**
 * Read `apiKey` from a JSON file `{ "apiKey": "..." }`. Returns undefined if missing or invalid.
 * @param filePath - Path to JSON file
 */
export function readApiKeyFromConfigFile(filePath: string): string | undefined {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as { apiKey?: unknown };
    const k = typeof data.apiKey === "string" ? data.apiKey.trim() : "";
    return k || undefined;
  } catch {
    return undefined;
  }
}

function buildConfigFromApiKey(apiKey: string): OpenFinClawConfig {
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

/**
 * Resolve configuration with priority:
 * 1. `options.apiKey` (CLI `--api-key`)
 * 2. `OPENFINCLAW_API_KEY`
 * 3. User config file (`~/.openfinclaw/config.json` or `OPENFINCLAW_CONFIG_PATH`)
 * @param options - Optional explicit API key
 * @returns Resolved config
 */
export function resolveOpenFinClawConfig(options: ResolveOpenFinClawConfigOptions = {}): OpenFinClawConfig {
  const fromOpt = options.apiKey?.trim();
  if (fromOpt) {
    return buildConfigFromApiKey(fromOpt);
  }

  const fromEnv = process.env.OPENFINCLAW_API_KEY?.trim();
  if (fromEnv) {
    return buildConfigFromApiKey(fromEnv);
  }

  const fromFile = readApiKeyFromConfigFile(getUserConfigFilePath());
  if (fromFile) {
    return buildConfigFromApiKey(fromFile);
  }

  throw new Error(
    "No API key found. Set OPENFINCLAW_API_KEY, run `openfinclaw init` to save ~/.openfinclaw/config.json, " +
      "or pass --api-key. Get your API key at https://hub.openfinclaw.ai",
  );
}

/**
 * Resolve config from environment variables and optional user config file.
 * Same as {@link resolveOpenFinClawConfig} with no explicit key.
 * @returns Resolved config
 */
export function resolveConfigFromEnv(): OpenFinClawConfig {
  return resolveOpenFinClawConfig();
}
