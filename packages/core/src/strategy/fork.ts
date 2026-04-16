/**
 * Strategy fork and info-fetching operations.
 * Downloads strategy packages from the Hub and saves them locally.
 * @module @openfinclaw/core/strategy/fork
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type AdmZipType from "adm-zip";
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
  const { status, data } = await hubApiRequest(config, "GET", `/skill/public/${strategyId}`);

  if (status >= 400) {
    let msg = `HTTP ${status}`;
    if (typeof data === "string" && data.startsWith("{")) {
      try {
        const json = JSON.parse(data) as Record<string, unknown>;
        const errObj = json.error as Record<string, unknown> | undefined;
        msg = (errObj?.message as string) || (errObj?.code as string) || msg;
      } catch {
        msg = data.slice(0, 200);
      }
    } else if (typeof data === "object" && data !== null) {
      const errObj = data as Record<string, unknown>;
      const inner = errObj.error as Record<string, unknown> | undefined;
      msg = (inner?.message as string) || (errObj.message as string) || msg;
    }
    return { success: false, error: `Failed to fetch strategy info: ${msg}` };
  }

  return { success: true, data: data as HubStrategyInfo };
}

/**
 * Map common HTTP status codes to actionable Chinese hints.
 * Prepended to the server-side message so users know what to do next.
 * @param status - HTTP status code
 * @returns Short hint, or empty string if no specific guidance is available
 */
function hintForStatus(status: number): string {
  switch (status) {
    case 401:
      return "API Key 无效或已过期。请重新运行 `openfinclaw init` 或检查 OPENFINCLAW_API_KEY。";
    case 403:
      return "权限不足（当前 API Key 无法 fork 该策略）。";
    case 404:
      return "策略不存在或未公开。";
    case 400:
    case 422:
      return "请求参数有误。";
    case 0:
      return "网络异常或请求超时。";
    default:
      return "";
  }
}

/**
 * Fork a strategy from the Hub and download it locally.
 * Flow: fetchStrategyInfo → POST fork-and-download → download ZIP → extract → write meta.
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

  // Step 0: Fetch source strategy info (for sourceName / sourceVersion / sourceAuthor)
  const infoResult = await fetchStrategyInfo(config, strategyId);
  if (!infoResult.success || !infoResult.data) {
    return {
      success: false,
      error: infoResult.error ?? "Failed to fetch strategy info",
    };
  }
  const info = infoResult.data;

  // Step 1: Call the fork API with the required body
  const { status, data } = await hubApiRequest(
    config,
    "POST",
    `/skill/entries/${strategyId}/fork-and-download`,
    {
      body: {
        forkConfig: {
          keepGenes: true,
          overrideParams: {},
        },
        ...(options?.name ? { name: options.name } : {}),
      },
    },
  );

  if (status >= 400 || status === 0) {
    let msg = `HTTP ${status}`;
    if (typeof data === "string" && data.startsWith("{")) {
      try {
        const json = JSON.parse(data) as Record<string, unknown>;
        const errObj = json.error as Record<string, unknown> | undefined;
        msg = (errObj?.message as string) || (errObj?.code as string) || msg;
      } catch {
        msg = data.slice(0, 200);
      }
    } else if (typeof data === "object" && data !== null) {
      const errObj = data as Record<string, unknown>;
      const inner = errObj.error as Record<string, unknown> | undefined;
      msg = (inner?.message as string) || (errObj.message as string) || (inner?.code as string) || msg;
    }
    const hint = hintForStatus(status);
    return { success: false, error: hint ? `Fork failed: ${msg} (${hint})` : `Fork failed: ${msg}` };
  }

  const forkResp = data as ForkAndDownloadResponse;
  if (!forkResp.download?.url) {
    return { success: false, error: "Fork API did not return a download URL" };
  }

  // Step 2: Download the ZIP
  let zipBuffer: Buffer;
  try {
    const zipResp = await fetch(forkResp.download.url, {
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    });
    if (!zipResp.ok) {
      return { success: false, error: `Download failed: HTTP ${zipResp.status}` };
    }
    zipBuffer = Buffer.from(await zipResp.arrayBuffer());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Download failed: ${msg}` };
  }

  // Step 3: Create local directory
  const dateDir = options?.targetDir
    ? options.targetDir
    : await createDateDir();

  const shortId = strategyId.slice(0, 8);
  const dirName = resolveForkDirName(options?.name, shortId, forkResp.entry.name);

  const localPath = join(dateDir, dirName);
  await mkdir(localPath, { recursive: true });

  // Step 4: Extract ZIP using adm-zip (dynamic import since it's optional).
  // If every entry shares a common top-level directory, strip it so that
  // fep.yaml lives at `localPath/fep.yaml` (not `localPath/<inner>/fep.yaml`).
  try {
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip(zipBuffer);
    await extractZipFlat(zip, localPath);
  } catch (err) {
    // Fallback: save the raw ZIP file
    await writeFile(join(localPath, "strategy.zip"), zipBuffer);
    return {
      success: true,
      data: {
        localPath,
        forkMeta: buildForkMeta(strategyId, info, forkResp, localPath, dateDir),
      },
      error: `adm-zip not available; saved raw ZIP. Install adm-zip for auto-extraction. (${err instanceof Error ? err.message : String(err)})`,
    };
  }

  // Step 5: Write fork metadata
  const meta = buildForkMeta(strategyId, info, forkResp, localPath, dateDir);
  await writeForkMeta(localPath, meta);

  return { success: true, data: { localPath, forkMeta: meta } };
}

/**
 * Build a ForkMeta object from source strategy info + fork API response.
 * @param strategyId - Source strategy UUID
 * @param info - Source strategy public info (from fetchStrategyInfo)
 * @param forkResp - Fork API response
 * @param localPath - Local directory where files were extracted
 * @param dateDir - Date directory path (parent of localPath)
 */
function buildForkMeta(
  strategyId: string,
  info: HubStrategyInfo,
  forkResp: ForkAndDownloadResponse,
  localPath: string,
  dateDir: string,
): ForkMeta {
  return {
    sourceId: strategyId,
    sourceShortId: strategyId.slice(0, 8),
    sourceName: info.name,
    sourceVersion: info.version ?? forkResp.entry.version ?? "1.0.0",
    sourceAuthor: info.author?.displayName,
    forkedAt: forkResp.forkedAt ?? new Date().toISOString(),
    forkDateDir: typeof dateDir === "string" ? dateDir.split("/").pop() ?? formatDate(new Date()) : formatDate(new Date()),
    hubUrl: `https://hub.openfinclaw.ai/strategy/${strategyId}`,
    localPath,
    forkEntryId: forkResp.entry.id,
    forkEntrySlug: forkResp.entry.slug,
  };
}

/**
 * Resolve a safe fork directory name.
 * When the user-supplied name sanitizes to empty / all dashes (e.g. pure Chinese
 * characters), fall back to the deterministic `generateForkDirName` helper so we
 * never produce an unusable directory like `-----------------`.
 * @param userName - Optional user-provided fork name
 * @param shortId - 8-char source strategy ID prefix
 * @param fallbackName - Remote entry name used by `generateForkDirName`
 */
function resolveForkDirName(
  userName: string | undefined,
  shortId: string,
  fallbackName: string,
): string {
  if (userName) {
    const sanitized = userName.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
    if (sanitized && !/^-+$/.test(sanitized)) return sanitized;
  }
  return generateForkDirName(shortId, fallbackName);
}

/**
 * Extract a ZIP into `targetDir`, stripping a common top-level directory if all
 * entries share one. This ensures `fep.yaml` lands at the strategy root even
 * when Hub wraps the package in an inner folder (e.g. `sinopec-dca/fep.yaml`).
 * @param zip - Loaded AdmZip instance
 * @param targetDir - Absolute destination directory
 */
async function extractZipFlat(
  zip: AdmZipType,
  targetDir: string,
): Promise<void> {
  const entries = zip.getEntries().filter((e) => !!e.entryName);
  if (entries.length === 0) return;

  // Detect common top-level directory: first path segment shared by every entry.
  const firstTop = entries[0]!.entryName.split("/")[0] ?? "";
  const hasRootFile = entries.some(
    (e) => !e.isDirectory && !e.entryName.includes("/"),
  );
  const allShareTop =
    !hasRootFile &&
    !!firstTop &&
    entries.every((e) => {
      const top = e.entryName.split("/")[0] ?? "";
      return top === firstTop;
    });
  const stripLen = allShareTop ? firstTop.length + 1 : 0;

  for (const entry of entries) {
    const rel = entry.entryName.slice(stripLen);
    if (!rel) continue;
    const outPath = join(targetDir, rel);
    if (entry.isDirectory) {
      await mkdir(outPath, { recursive: true });
    } else {
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, entry.getData());
    }
  }
}
