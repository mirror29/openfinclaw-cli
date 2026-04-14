/**
 * Strategy fork and info-fetching operations.
 * Downloads strategy packages from the Hub and saves them locally.
 * @module @openfinclaw/core/strategy/fork
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { OpenFinClawConfig } from "../config.js";
import type { ForkAndDownloadResponse, ForkMeta, HubStrategyInfo } from "../types.js";
import { hubApiRequest } from "./client.js";
import {
  getStrategiesRoot,
  createDateDir,
  generateForkDirName,
  writeForkMeta,
  parseStrategyId,
  formatDate,
} from "./storage.js";

/** Result wrapper for strategy operations */
export interface StrategyResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch public info for a strategy from the Hub.
 * @param config - Core configuration
 * @param rawId - Strategy ID (UUID or Hub URL)
 */
export async function fetchStrategyInfo(
  config: OpenFinClawConfig,
  rawId: string,
): Promise<StrategyResult<HubStrategyInfo>> {
  const strategyId = parseStrategyId(rawId);
  const { status, data } = await hubApiRequest(config, "GET", `/skill/info/${strategyId}`);

  if (status >= 400) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? (data as Record<string, unknown>).message
        : `HTTP ${status}`;
    return { success: false, error: `Failed to fetch strategy info: ${msg}` };
  }

  return { success: true, data: data as HubStrategyInfo };
}

/**
 * Fork a strategy from the Hub and download it locally.
 * @param config - Core configuration
 * @param rawId - Strategy ID (UUID or Hub URL)
 * @param options - Optional fork name and target directory
 */
export async function forkStrategy(
  config: OpenFinClawConfig,
  rawId: string,
  options?: { name?: string; targetDir?: string },
): Promise<StrategyResult<{ localPath: string; forkMeta: ForkMeta }>> {
  const strategyId = parseStrategyId(rawId);

  // Step 1: Call the fork API
  const { status, data } = await hubApiRequest(config, "POST", `/skill/fork/${strategyId}`);

  if (status >= 400) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? (data as Record<string, unknown>).message
        : `HTTP ${status}`;
    return { success: false, error: `Fork failed: ${msg}` };
  }

  const forkResp = data as ForkAndDownloadResponse;
  if (!forkResp.download?.url) {
    return { success: false, error: "Fork API did not return a download URL" };
  }

  // Step 2: Download the ZIP
  const zipResp = await fetch(forkResp.download.url, {
    signal: AbortSignal.timeout(config.requestTimeoutMs),
  });
  if (!zipResp.ok) {
    return { success: false, error: `Download failed: HTTP ${zipResp.status}` };
  }
  const zipBuffer = Buffer.from(await zipResp.arrayBuffer());

  // Step 3: Create local directory
  const dateDir = options?.targetDir
    ? options.targetDir
    : await createDateDir();

  const shortId = strategyId.slice(0, 8);
  const dirName = options?.name
    ? options.name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60)
    : generateForkDirName(shortId, forkResp.entry.name);

  const localPath = join(dateDir, dirName);
  await mkdir(localPath, { recursive: true });

  // Step 4: Extract ZIP using adm-zip (dynamic import since it's optional)
  try {
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(localPath, true);
  } catch (err) {
    // Fallback: save the raw ZIP file
    await writeFile(join(localPath, "strategy.zip"), zipBuffer);
    return {
      success: true,
      data: {
        localPath,
        forkMeta: buildForkMeta(strategyId, forkResp, localPath, dateDir),
      },
      error: `adm-zip not available; saved raw ZIP. Install adm-zip for auto-extraction. (${err instanceof Error ? err.message : String(err)})`,
    };
  }

  // Step 5: Write fork metadata
  const meta = buildForkMeta(strategyId, forkResp, localPath, dateDir);
  await writeForkMeta(localPath, meta);

  return { success: true, data: { localPath, forkMeta: meta } };
}

/**
 * Build a ForkMeta object from fork API response data.
 */
function buildForkMeta(
  strategyId: string,
  forkResp: ForkAndDownloadResponse,
  localPath: string,
  dateDir: string,
): ForkMeta {
  return {
    sourceId: forkResp.parent.id,
    sourceShortId: forkResp.parent.id.slice(0, 8),
    sourceName: forkResp.parent.name,
    sourceVersion: forkResp.entry.version,
    forkedAt: forkResp.forkedAt ?? new Date().toISOString(),
    forkDateDir: typeof dateDir === "string" ? dateDir.split("/").pop() ?? formatDate(new Date()) : formatDate(new Date()),
    hubUrl: `https://hub.openfinclaw.ai/strategy/${strategyId}`,
    localPath,
    forkEntryId: forkResp.entry.id,
    forkEntrySlug: forkResp.entry.slug,
  };
}
