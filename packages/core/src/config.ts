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
/**
 * Default DeepAgent base URL — Hub Gateway. APISIX 在该路径前置 fch_ key 鉴权 +
 * 多租户隔离 + URL rewrite 后转给 DeepAgent 后端。完整路径形如
 * `https://gateway.openfinclaw.ai/api/v1/agent/threads`。
 */
export const DEFAULT_DEEPAGENT_API_URL = "https://gateway.openfinclaw.ai/api/v1/agent";
export const DEFAULT_TIMEOUT_MS = 60_000;
/** Default SSE timeout for long-running DeepAgent research (15 min) */
export const DEFAULT_SSE_TIMEOUT_MS = 900_000;

/** Core configuration interface */
export interface OpenFinClawConfig {
  /**
   * Unified API Key (fch_ prefix). Drives both Hub (`/api/v1/skill/*`) and
   * DeepAgent (`/api/v1/agent/*` via Gateway).
   */
  apiKey: string;
  /** Hub API URL */
  hubApiUrl: string;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** Optional local workspace database path (`OPENFINCLAW_DB_PATH`) */
  dbPath?: string;
  /**
   * DeepAgent API base URL. Defaults to {@link DEFAULT_DEEPAGENT_API_URL}.
   * Override via `DEEPAGENT_API_URL` (e.g. staging gateway).
   */
  deepagentApiUrl?: string;
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
   * When true, return a config with `apiKey: ""` instead of throwing if no
   * key can be resolved. Used by `doctor` so it can render a "key missing"
   * diagnostic instead of crashing on resolution.
   *
   * Callers must still check `config.apiKey` before hitting Hub / DeepAgent.
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

function buildConfigFromApiKey(apiKey: string): OpenFinClawConfig {
  return {
    apiKey,
    hubApiUrl: (process.env.HUB_API_URL?.trim() || DEFAULT_HUB_API_URL).replace(/\/+$/, ""),
    requestTimeoutMs: Math.max(
      5000,
      Math.min(300_000, Number(process.env.REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS),
    ),
    dbPath: process.env.OPENFINCLAW_DB_PATH?.trim() || undefined,
    deepagentApiUrl: (
      process.env.DEEPAGENT_API_URL?.trim() || DEFAULT_DEEPAGENT_API_URL
    ).replace(/\/+$/, ""),
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

  if (options.allowMissingApiKey) {
    return buildConfigFromApiKey("");
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
