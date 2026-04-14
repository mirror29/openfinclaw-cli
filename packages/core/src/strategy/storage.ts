/**
 * Local strategy storage utilities.
 * Manages the ~/.openfinclaw/strategies/ directory tree.
 * @module @openfinclaw/core/strategy/storage
 */
import { readdir, readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ForkMeta, LocalStrategy } from "../types.js";

/** Root directory for all local strategies */
export function getStrategiesRoot(): string {
  return join(homedir(), ".openfinclaw", "strategies");
}

/**
 * Create a date-stamped directory under strategies root.
 * @returns Absolute path to the date directory
 */
export async function createDateDir(): Promise<string> {
  const root = getStrategiesRoot();
  const dateStr = formatDate(new Date());
  const dir = join(root, dateStr);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Generate a unique fork directory name.
 * Format: `fork-<shortId>-<sanitizedName>`
 */
export function generateForkDirName(shortId: string, name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `fork-${shortId}-${sanitized}`;
}

/**
 * Write fork metadata JSON to the strategy directory.
 */
export async function writeForkMeta(dir: string, meta: ForkMeta): Promise<void> {
  await writeFile(join(dir, ".fork-meta.json"), JSON.stringify(meta, null, 2), "utf-8");
}

/**
 * Parse a strategy ID from a UUID string or Hub URL.
 * @returns The extracted UUID
 */
export function parseStrategyId(input: string): string {
  const trimmed = input.trim();

  // Direct UUID
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(trimmed)) return trimmed;

  // Hub URL: https://hub.openfinclaw.ai/strategy/<uuid>
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    const idx = segments.indexOf("strategy");
    if (idx >= 0 && idx + 1 < segments.length) {
      const candidate = segments[idx + 1];
      if (uuidRe.test(candidate)) return candidate;
    }
  } catch {
    // not a URL, fall through
  }

  // Return as-is (might be a slug or short ID)
  return trimmed;
}

/**
 * Format a Date as YYYY-MM-DD.
 */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * List all local strategies found under ~/.openfinclaw/strategies/.
 * Scans date directories for strategy folders containing fep.yaml or .fork-meta.json.
 */
export async function listLocalStrategies(): Promise<LocalStrategy[]> {
  const root = getStrategiesRoot();
  const results: LocalStrategy[] = [];

  let dateDirs: string[];
  try {
    dateDirs = await readdir(root);
  } catch {
    return results;
  }

  for (const dateDir of dateDirs.sort().reverse()) {
    const datePath = join(root, dateDir);
    const dateStat = await stat(datePath).catch(() => null);
    if (!dateStat?.isDirectory()) continue;

    let entries: string[];
    try {
      entries = await readdir(datePath);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = join(datePath, entry);
      const entryStat = await stat(entryPath).catch(() => null);
      if (!entryStat?.isDirectory()) continue;

      const strategy = await readStrategyDir(entryPath, dateDir, entry);
      if (strategy) results.push(strategy);
    }
  }

  return results;
}

/**
 * Read a single strategy directory and construct a LocalStrategy.
 */
async function readStrategyDir(
  dirPath: string,
  dateDir: string,
  dirName: string,
): Promise<LocalStrategy | null> {
  // Check for .fork-meta.json
  let forkMeta: ForkMeta | null = null;
  try {
    const raw = await readFile(join(dirPath, ".fork-meta.json"), "utf-8");
    forkMeta = JSON.parse(raw) as ForkMeta;
  } catch {
    // not a fork
  }

  // Check for fep.yaml existence
  let hasFep = false;
  try {
    await stat(join(dirPath, "fep.yaml"));
    hasFep = true;
  } catch {
    // no fep.yaml
  }

  if (!hasFep && !forkMeta) return null;

  const isForked = !!forkMeta;
  const name = dirName;
  const displayName = forkMeta?.sourceName ?? dirName;

  return {
    name,
    displayName,
    localPath: dirPath,
    dateDir,
    type: isForked ? "forked" : "created",
    sourceId: forkMeta?.sourceId,
    createdAt: forkMeta?.forkedAt ?? dateDir,
  };
}
