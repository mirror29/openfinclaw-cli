/**
 * Strategy tool execute functions and JSON schemas.
 * @module @openfinclaw/core/strategy/tools
 */
import { readFile } from "node:fs/promises";
import type { OpenFinClawConfig } from "../config.js";
import type { BoardType, LeaderboardResponse } from "../types.js";
import { hubApiRequest } from "./client.js";
import { forkStrategy, fetchStrategyInfo } from "./fork.js";
import { listLocalStrategies } from "./storage.js";
import { validateStrategyPackage } from "./validate.js";

// ── skill_leaderboard ────────────────────────────────────────────────────

/** JSON Schema for the skill_leaderboard tool */
export const skillLeaderboardSchema = {
  type: "object" as const,
  properties: {
    boardType: {
      type: "string",
      enum: ["composite", "returns", "risk", "popular", "rising"],
      description: "Leaderboard type (default: composite)",
    },
    limit: { type: "number", description: "Max results (max 100, default: 20)" },
    offset: { type: "number", description: "Pagination offset" },
  },
  required: [] as string[],
};

/**
 * Execute the skill_leaderboard tool.
 * Fetches the strategy leaderboard from the Hub API.
 * @param params - Tool parameters
 * @param config - Core configuration
 */
export async function executeSkillLeaderboard(
  params: { boardType?: string; limit?: number; offset?: number },
  config: OpenFinClawConfig,
) {
  const board = (params.boardType as BoardType) ?? "composite";
  const limit = Math.min(params.limit ?? 20, 100);
  const offset = params.offset ?? 0;

  const url = `${config.hubApiUrl}/api/v1/skill/leaderboard/${board}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(config.requestTimeoutMs),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Leaderboard API error (${resp.status}): ${text.slice(0, 300)}`);
  }

  const data = (await resp.json()) as LeaderboardResponse;
  const strategies = data.strategies?.slice(offset, offset + limit) ?? [];

  return {
    board: data.board ?? board,
    total: data.total ?? strategies.length,
    cachedAt: data.cachedAt,
    strategies: strategies.map((s) => ({
      rank: s.rank,
      rankDelta: s.rankDelta,
      name: s.name,
      id: s.id,
      slug: s.slug,
      market: s.market,
      style: s.style,
      author: s.author?.displayName,
      performance: s.performance,
      scores: s.scores,
      isNewEntry: s.isNewEntry,
      hotLabel: s.hotLabel,
    })),
  };
}

// ── skill_get_info ───────────────────────────────────────────────────────

/** JSON Schema for the skill_get_info tool */
export const skillGetInfoSchema = {
  type: "object" as const,
  properties: {
    strategyId: {
      type: "string",
      description: "Strategy ID (UUID or Hub URL)",
    },
  },
  required: ["strategyId"],
};

/**
 * Execute the skill_get_info tool.
 * Fetches detailed information about a strategy from the Hub.
 * @param params - Tool parameters
 * @param config - Core configuration
 */
export async function executeSkillGetInfo(
  params: { strategyId: string },
  config: OpenFinClawConfig,
) {
  const result = await fetchStrategyInfo(config, params.strategyId);
  if (!result.success || !result.data) {
    return { error: result.error ?? "Failed to fetch strategy info" };
  }
  const info = result.data;
  return {
    id: info.id,
    slug: info.slug,
    name: info.name,
    description: info.description,
    summary: info.summary,
    version: info.version,
    visibility: info.visibility,
    author: info.author,
    stats: info.stats,
    backtestResult: info.backtestResult,
    hubUrl: `https://hub.openfinclaw.ai/strategy/${info.id}`,
  };
}

// ── skill_fork ───────────────────────────────────────────────────────────

/** JSON Schema for the skill_fork tool */
export const skillForkSchema = {
  type: "object" as const,
  properties: {
    strategyId: { type: "string", description: "Strategy ID (UUID or Hub URL)" },
    name: { type: "string", description: "Custom name for the forked strategy" },
    targetDir: { type: "string", description: "Custom target directory" },
  },
  required: ["strategyId"],
};

/**
 * Execute the skill_fork tool.
 * Forks a strategy from the Hub and downloads it locally.
 * @param params - Tool parameters
 * @param config - Core configuration
 */
export async function executeSkillFork(
  params: { strategyId: string; name?: string; targetDir?: string },
  config: OpenFinClawConfig,
) {
  const result = await forkStrategy(config, params.strategyId, {
    name: params.name,
    targetDir: params.targetDir,
  });
  return result;
}

// ── skill_list_local ─────────────────────────────────────────────────────

/** JSON Schema for the skill_list_local tool */
export const skillListLocalSchema = {
  type: "object" as const,
  properties: {},
  required: [] as string[],
};

/**
 * Execute the skill_list_local tool.
 * Lists all locally stored strategies.
 * @param _params - Tool parameters (unused)
 * @param _config - Core configuration (unused)
 */
export async function executeSkillListLocal(
  _params: Record<string, unknown>,
  _config: OpenFinClawConfig,
) {
  const strategies = await listLocalStrategies();
  return {
    count: strategies.length,
    strategies: strategies.map((s) => ({
      name: s.name,
      displayName: s.displayName,
      type: s.type,
      dateDir: s.dateDir,
      localPath: s.localPath,
      sourceId: s.sourceId,
      createdAt: s.createdAt,
    })),
  };
}

// ── skill_validate ───────────────────────────────────────────────────────

/** JSON Schema for the skill_validate tool */
export const skillValidateSchema = {
  type: "object" as const,
  properties: {
    dirPath: {
      type: "string",
      description: "Strategy package directory path (must contain fep.yaml)",
    },
  },
  required: ["dirPath"],
};

/**
 * Execute the skill_validate tool.
 * Validates a local strategy package directory.
 * @param params - Tool parameters
 * @param _config - Core configuration (unused)
 */
export async function executeSkillValidate(
  params: { dirPath: string },
  _config: OpenFinClawConfig,
) {
  return validateStrategyPackage(params.dirPath);
}

// ── skill_publish ────────────────────────────────────────────────────────

/** JSON Schema for the skill_publish tool */
export const skillPublishSchema = {
  type: "object" as const,
  properties: {
    filePath: {
      type: "string",
      description: "Path to strategy ZIP file (must contain fep.yaml)",
    },
    visibility: {
      type: "string",
      enum: ["public", "private", "unlisted"],
      description: "Override visibility from fep.yaml",
    },
  },
  required: ["filePath"],
};

/**
 * Execute the skill_publish tool.
 * Publishes a strategy ZIP to the Hub.
 * @param params - Tool parameters
 * @param config - Core configuration
 */
export async function executeSkillPublish(
  params: { filePath: string; visibility?: string },
  config: OpenFinClawConfig,
) {
  const zipBuffer = await readFile(params.filePath);
  const base64 = zipBuffer.toString("base64");

  const body: Record<string, unknown> = { zipBase64: base64 };
  if (params.visibility) body.visibility = params.visibility;

  const { status, data } = await hubApiRequest(config, "POST", "/skill/publish", { body });
  if (status >= 400) {
    return { error: `Publish failed (HTTP ${status})`, details: data };
  }
  return data;
}

// ── skill_publish_verify ─────────────────────────────────────────────────

/** JSON Schema for the skill_publish_verify tool */
export const skillPublishVerifySchema = {
  type: "object" as const,
  properties: {
    submissionId: { type: "string", description: "Submission ID from skill_publish response" },
    backtestTaskId: { type: "string", description: "Backtest task ID from skill_publish response" },
  },
  required: [] as string[],
};

/**
 * Execute the skill_publish_verify tool.
 * Checks the status of a strategy publish submission.
 * @param params - Tool parameters
 * @param config - Core configuration
 */
export async function executeSkillPublishVerify(
  params: { submissionId?: string; backtestTaskId?: string },
  config: OpenFinClawConfig,
) {
  if (!params.submissionId && !params.backtestTaskId) {
    return { error: "At least one of submissionId or backtestTaskId is required" };
  }

  const searchParams: Record<string, string> = {};
  if (params.submissionId) searchParams.submissionId = params.submissionId;
  if (params.backtestTaskId) searchParams.backtestTaskId = params.backtestTaskId;

  const { status, data } = await hubApiRequest(config, "GET", "/skill/publish/verify", { searchParams });
  if (status >= 400) {
    return { error: `Verify failed (HTTP ${status})`, details: data };
  }
  return data;
}
