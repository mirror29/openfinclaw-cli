/**
 * Register openfinclaw as a global AI Skill so Claude Code / Cursor /
 * compatible agents auto-trigger it on keywords like "quant", "backtest",
 * or "deepagent".
 *
 * The source-of-truth SKILL.md lives at `<repo-root>/skills/openfinclaw/`
 * and is copied to `<cli>/dist/skills/openfinclaw/` by the cli `build`
 * script so it ships inside the npm tarball.
 *
 * @module @openfinclaw/cli/skill-install
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Result row for a single target. `written = false` with a `reason` means
 * the slot was deliberately skipped (e.g. parent dir doesn't exist and the
 * agent isn't actually installed).
 */
export interface SkillInstallResult {
  /** Human-readable label, e.g. "Claude Code" or "Cursor". */
  target: string;
  /** Destination directory (e.g. ~/.claude/skills/openfinclaw). */
  path: string;
  /** True when SKILL.md was written. */
  written: boolean;
  /** Optional reason when `written = false`. */
  reason?: string;
}

interface SkillTarget {
  /** Display label. */
  label: string;
  /** Absolute directory to write SKILL.md into. */
  dir: string;
  /**
   * Parent path that must already exist for us to consider this agent
   * installed. If null, we always try to write (e.g. user explicitly asked
   * with --force). For Claude Code we require `~/.claude` because the
   * directory is auto-created on first launch.
   */
  parentMarker: string | null;
}

/**
 * Locate the source `SKILL.md` shipped with the package. In dev mode
 * (running from `packages/cli/dist`), the build script copies the
 * top-level `skills/` dir to `dist/skills/`, so this resolves there. In
 * production (npm tarball), `dist/skills/` is included via the `files`
 * field — same path resolves.
 */
function findSkillSource(): { dir: string; entry: string } | null {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(__dirname, "skills", "openfinclaw"),         // dist/skills/openfinclaw
    join(__dirname, "..", "skills", "openfinclaw"),   // packages/cli/skills/openfinclaw (dev fallback)
    join(__dirname, "..", "..", "..", "skills", "openfinclaw"), // repo root skills/ (dev when running ts directly)
  ];
  for (const dir of candidates) {
    const entry = join(dir, "SKILL.md");
    if (existsSync(entry)) return { dir, entry };
  }
  return null;
}

/**
 * Build the list of well-known global Skill directories on this machine.
 * Empty `parentMarker` means we always write; non-empty means we only
 * write when the parent exists (acts as an "is this agent installed?" check).
 */
function buildTargets(): SkillTarget[] {
  const home = homedir();
  return [
    {
      label: "Claude Code",
      dir: join(home, ".claude", "skills", "openfinclaw"),
      parentMarker: join(home, ".claude"),
    },
    {
      label: "Cursor",
      dir: join(home, ".cursor", "skills", "openfinclaw"),
      parentMarker: join(home, ".cursor"),
    },
    {
      label: "OpenClaw",
      dir: join(home, ".openclaw", "skills", "openfinclaw"),
      parentMarker: join(home, ".openclaw"),
    },
  ];
}

/**
 * Recursively copy every file under `srcDir` into `destDir`. We avoid
 * pulling in `fs.cpSync` so this stays Node 18+ compatible without any
 * experimental flags.
 */
function copyDirContents(srcDir: string, destDir: string): void {
  mkdirSync(destDir, { recursive: true });
  for (const name of readdirSync(srcDir)) {
    const srcPath = join(srcDir, name);
    const destPath = join(destDir, name);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirContents(srcPath, destPath);
    } else if (stat.isFile()) {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Install the openfinclaw Skill into every detected global skill directory.
 *
 * @param opts.force - When true, write to every target even if the parent
 *   agent dir doesn't exist (use for explicit `openfinclaw skill-install`).
 */
export async function registerGlobalSkill(
  opts: { force?: boolean } = {},
): Promise<SkillInstallResult[]> {
  const source = findSkillSource();
  if (!source) {
    throw new Error(
      "SKILL.md not found inside the package. Reinstall @openfinclaw/cli or run `pnpm build` first.",
    );
  }

  const results: SkillInstallResult[] = [];
  for (const t of buildTargets()) {
    if (!opts.force && t.parentMarker && !existsSync(t.parentMarker)) {
      results.push({
        target: t.label,
        path: t.dir,
        written: false,
        reason: "agent not installed (parent dir missing)",
      });
      continue;
    }
    try {
      copyDirContents(source.dir, t.dir);
      results.push({ target: t.label, path: t.dir, written: true });
    } catch (err) {
      results.push({
        target: t.label,
        path: t.dir,
        written: false,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

/**
 * TTY-aware ANSI helper. Honors `NO_COLOR` (https://no-color.org) and
 * `FORCE_COLOR`, and otherwise activates only when stdout is a TTY so
 * piped/redirected output stays free of stray escape sequences.
 *
 * @param code - SGR code (e.g. "32" for green, "2" for dim)
 * @param s - Text to wrap
 */
function sgr(code: string, s: string): string {
  if (process.env.NO_COLOR) return s;
  const force =
    process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0" && process.env.FORCE_COLOR !== "false";
  if (!force && !process.stdout.isTTY) return s;
  return `[${code}m${s}[0m`;
}

const green = (s: string): string => sgr("32", s);
const dim = (s: string): string => sgr("2", s);

/**
 * CLI entry for `openfinclaw skill-install`. Renders results as plain
 * lines so it works in both clack and non-clack contexts. Colors collapse
 * to plain text when stdout is not a TTY or `NO_COLOR` is set, so piped
 * output stays clean.
 *
 * @param argv - Args after the `skill-install` subcommand
 */
export async function runSkillInstall(argv: string[] = []): Promise<void> {
  const force = argv.includes("--force") || argv.includes("-f");
  console.log();
  console.log("Registering openfinclaw as a global AI Skill...");
  console.log();
  const results = await registerGlobalSkill({ force });
  let wrote = 0;
  for (const r of results) {
    if (r.written) {
      wrote++;
      console.log(`  ${green("✔")} ${r.target}  ${dim("→")}  ${r.path}`);
    } else {
      console.log(`  ${dim("○")} ${r.target}  ${dim("→")}  ${r.reason ?? "skipped"}`);
    }
  }
  console.log();
  if (wrote === 0) {
    console.log(
      "  No targets matched. Re-run with --force to write all known locations anyway.",
    );
  } else {
    console.log(
      `  ${green("✔")} ${wrote} target${wrote === 1 ? "" : "s"} registered.`,
    );
  }
  console.log();
}
