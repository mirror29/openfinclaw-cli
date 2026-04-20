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
export const DEFAULT_DEEPAGENT_API_URL = "https://api.openfinclaw.ai/agent";
export const DEFAULT_TIMEOUT_MS = 60_000;
/** Default SSE timeout for long-running DeepAgent research (15 min) */
export const DEFAULT_SSE_TIMEOUT_MS = 900_000;

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
  /**
   * DeepAgent API base URL. Optional — when `deepagentApiKey` is set, defaults to
   * {@link DEFAULT_DEEPAGENT_API_URL}. Override via `DEEPAGENT_API_URL`.
   */
  deepagentApiUrl?: string;
  /**
   * DeepAgent API Key (independent from Hub `fch_` key). When undefined,
   * DeepAgent tools that require authentication will return a friendly error.
   * Resolved from: `--deepagent-api-key` > `OPENFINCLAW_DEEPAGENT_API_KEY` >
   * `FINDOO_DEEPAGENT_API_KEY` > `deepagentApiKey` in user config file.
   */
  deepagentApiKey?: string;
  /** SSE timeout for long-running DeepAgent streams (default 15 min) */
  deepagentSseTimeoutMs?: number;
}

/** Options for {@link resolveOpenFinClawConfig} */
export interface ResolveOpenFinClawConfigOptions {
  /**
   * Explicit Hub API key (e.g. CLI `--api-key`). Highest priority.
   */
  apiKey?: string;
  /**
   * Explicit DeepAgent API key (e.g. CLI `--deepagent-api-key`). Highest priority.
   */
  deepagentApiKey?: string;
  /**
   * When true, return a config with `apiKey: ""` instead of throwing if no
   * Hub key can be resolved. Used by paths that only talk to DeepAgent (a
   * separately-authenticated service with its own key), so a user who set
   * only `OPENFINCLAW_DEEPAGENT_API_KEY` can still run `deepagent *` and
   * `doctor` commands.
   *
   * Callers must still check `config.apiKey` before hitting Hub/DataHub.
   */
  allowMissingApiKey?: boolean;
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

/** Shape of the user config file on disk. */
interface UserConfigFile {
  apiKey?: string;
  deepagentApiKey?: string;
}

/**
 * Read the user config JSON. Returns empty object when missing/invalid.
 * @param filePath - Path to JSON file
 */
function readUserConfigFile(filePath: string): UserConfigFile {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as UserConfigFile;
    return {
      apiKey: typeof data.apiKey === "string" ? data.apiKey.trim() || undefined : undefined,
      deepagentApiKey:
        typeof data.deepagentApiKey === "string"
          ? data.deepagentApiKey.trim() || undefined
          : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Read `apiKey` from a JSON file `{ "apiKey": "..." }`. Returns undefined if missing or invalid.
 * @param filePath - Path to JSON file
 */
export function readApiKeyFromConfigFile(filePath: string): string | undefined {
  return readUserConfigFile(filePath).apiKey;
}

/**
 * Resolve the DeepAgent API key (if any) with priority:
 * 1. `options.deepagentApiKey` (CLI flag)
 * 2. `OPENFINCLAW_DEEPAGENT_API_KEY`
 * 3. `FINDOO_DEEPAGENT_API_KEY` (legacy env from findoo-deepagent-plugin)
 * 4. `deepagentApiKey` in user config file
 * Returns `undefined` when not configured — not an error.
 * @param options - Optional explicit key
 */
export function resolveDeepAgentApiKey(
  options: ResolveOpenFinClawConfigOptions = {},
): string | undefined {
  const fromOpt = options.deepagentApiKey?.trim();
  if (fromOpt) return fromOpt;
  const fromEnv =
    process.env.OPENFINCLAW_DEEPAGENT_API_KEY?.trim() ||
    process.env.FINDOO_DEEPAGENT_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const fromFile = readUserConfigFile(getUserConfigFilePath()).deepagentApiKey;
  if (fromFile) return fromFile;
  return undefined;
}

function buildConfigFromApiKey(
  apiKey: string,
  options: ResolveOpenFinClawConfigOptions = {},
): OpenFinClawConfig {
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
    deepagentApiUrl: (
      process.env.DEEPAGENT_API_URL?.trim() || DEFAULT_DEEPAGENT_API_URL
    ).replace(/\/+$/, ""),
    deepagentApiKey: resolveDeepAgentApiKey(options),
    deepagentSseTimeoutMs: Math.max(
      60_000,
      Math.min(
        3_600_000,
        Number(process.env.DEEPAGENT_SSE_TIMEOUT_MS) || DEFAULT_SSE_TIMEOUT_MS,
      ),
    ),
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
    return buildConfigFromApiKey(fromOpt, options);
  }

  const fromEnv = process.env.OPENFINCLAW_API_KEY?.trim();
  if (fromEnv) {
    return buildConfigFromApiKey(fromEnv, options);
  }

  const fromFile = readApiKeyFromConfigFile(getUserConfigFilePath());
  if (fromFile) {
    return buildConfigFromApiKey(fromFile, options);
  }

  if (options.allowMissingApiKey) {
    return buildConfigFromApiKey("", options);
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
