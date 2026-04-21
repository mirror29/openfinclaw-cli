/**
 * Interactive setup wizard — configures MCP on multiple agent platforms.
 * @module @openfinclaw/cli/init
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { createInterface } from "node:readline";
import { getUserConfigFilePath } from "@openfinclaw/core";

// ─── Terminal Theme (no extra deps) ───────────────────────────────────

/**
 * ANSI color helper (TTY-safe). If not a TTY, returns the raw string.
 * @param code - ANSI SGR code list (e.g. "1" for bold, "36" for cyan)
 * @param input - Text to wrap
 */
function sgr(code: string, input: string): string {
  if (!process.stdout.isTTY) return input;
  return `\u001b[${code}m${input}\u001b[0m`;
}

/** @param s - text */
function dim(s: string): string {
  return sgr("2", s);
}

/** @param s - text */
function bold(s: string): string {
  return sgr("1", s);
}

/** @param s - text */
function cyan(s: string): string {
  return sgr("36", s);
}

/** @param s - text */
function hiCyan(s: string): string {
  return sgr("96", s);
}

/** @param s - text */
function green(s: string): string {
  return sgr("32", s);
}

/** @param s - text */
function hiGreen(s: string): string {
  return sgr("92", s);
}

/** @param s - text */
function yellow(s: string): string {
  return sgr("33", s);
}

/** @param s - text */
function red(s: string): string {
  return sgr("31", s);
}

/** @param s - text */
function boldCyan(s: string): string {
  return sgr("1;36", s);
}

/** 24-bit amber bold — matches Logo Bloomberg-amber accent. */
function boldAmber(s: string): string {
  return sgr("1;38;2;245;158;11", s);
}

/** Amber divider line (Tailwind amber-700, #b45309) — pairs with the gold banner. */
function amberRule(width: number): string {
  return sgr("38;2;180;83;9", "─".repeat(width));
}

// ─── Banner ──────────────────────────────────────────────────────────

/**
 * Big ANSI-Shadow "OpenFinClaw" ASCII art (6 rows × 90 cols).
 */
const BIG_BANNER_LINES: readonly string[] = [
  " ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██╗███╗   ██╗ ██████╗██╗      █████╗ ██╗    ██╗",
  "██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║████╗  ██║██╔════╝██║     ██╔══██╗██║    ██║",
  "██║   ██║██████╔╝█████╗  ██╔██╗ ██║█████╗  ██║██╔██╗ ██║██║     ██║     ███████║██║ █╗ ██║",
  "██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██╔══╝  ██║██║╚██╗██║██║     ██║     ██╔══██║██║███╗██║",
  "╚██████╔╝██║     ███████╗██║ ╚████║██║     ██║██║ ╚████║╚██████╗███████╗██║  ██║╚███╔███╔╝",
  " ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝     ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ",
] as const;

/** Width in terminal cells of {@link BIG_BANNER_LINES}. */
const BIG_BANNER_WIDTH = 90;

/**
 * Compact ASCII banner for narrow terminals (width ≥ 58).
 */
const COMPACT_BANNER_LINES: readonly string[] = [
  "  ___                  ___ _      ___ _               ",
  " / _ \\ _ __  ___ _ _  | __(_)_ _ / __| |__ ___ __ __ ",
  "| (_) | '_ \\/ -_) ' \\ | _|| | ' \\ (__| / _` \\ V  V /",
  " \\___/| .__/\\___|_||_|_|  |_|_||_\\___|_\\__,_|\\_/\\_/",
  "      |_|                                              ",
] as const;

/** Width of {@link COMPACT_BANNER_LINES}. */
const COMPACT_BANNER_WIDTH = 58;

/**
 * Apply a vertical Bloomberg-amber gradient (pale gold → deep bronze) to ASCII-art rows.
 * Uses 24-bit truecolor (38;2;R;G;B) so palette maps exactly to README SVG fills:
 * #fde68a → #fcd34d → #fbbf24 → #f59e0b → #d97706 → #92400e (Tailwind amber 200–800).
 * @param lines - Raw ASCII lines, one per row
 */
function gradientLines(lines: readonly string[]): string[] {
  const palette = [
    "38;2;253;230;138",
    "38;2;252;211;77",
    "38;2;251;191;36",
    "38;2;245;158;11",
    "38;2;217;119;6",
    "38;2;146;64;14",
  ];
  return lines.map((line, i) => sgr(palette[i] ?? "33", line));
}

/**
 * Render the pre-clack banner block. Width-adaptive: falls back to a compact
 * banner or plain title for narrow terminals.
 * @param version - CLI package version string, optional
 */
function renderBanner(version?: string): string {
  const cols = process.stdout.columns ?? 80;
  const v = version ? `v${version}` : "";
  const tagline = "One-stop quant-trading agent · MCP setup wizard · auto-detect platforms";

  if (cols >= BIG_BANNER_WIDTH + 2) {
    const art = gradientLines(BIG_BANNER_LINES).join("\n");
    const rule = amberRule(Math.min(BIG_BANNER_WIDTH, cols));
    const badge = `${boldAmber("MCP")} ${dim("·")} ${boldAmber("init")} ${dim(v)}`;
    return `\n${art}\n${rule}\n  ${badge}  ${dim("·")}  ${dim(tagline)}\n`;
  }

  if (cols >= COMPACT_BANNER_WIDTH + 2) {
    const art = gradientLines(COMPACT_BANNER_LINES).join("\n");
    const rule = amberRule(Math.min(COMPACT_BANNER_WIDTH, cols));
    const badge = `${boldAmber("MCP")} ${dim("·")} ${boldAmber("init")} ${dim(v)}`;
    return `\n${art}\n${rule}\n  ${badge}  ${dim("·")}  ${dim(tagline)}\n`;
  }

  // Very narrow (< 60 cols): plain title.
  const title = `${boldAmber("OpenFinClaw")} ${dim("·")} ${boldAmber("MCP · init")} ${dim(v)}`;
  return `\n  ${title}\n  ${dim(tagline)}\n`;
}

/**
 * Format a right-arrow path mapping (label -> path), keeping it readable in terminals.
 * @param label - Platform label
 * @param p - Target path
 */
function formatPathWrite(label: string, p: string): string {
  return `${bold(label)}  ${dim("→")}  ${cyan(p)}`;
}

// ─── Platform Definitions ───────────────────────────────────────────

interface PlatformDef {
  value: string;
  label: string;
  hint?: string;
  configPath: string;
  format: "json" | "yaml";
  mcpKey: string;
  /**
   * MCP server entry schema.
   * - "standard": `{ command, args, env }` — default for most platforms.
   * - "opencode": `{ type: "local", command: [cmd, ...args], environment, enabled }` — per opencode.ai/config.json.
   */
  entryShape?: "standard" | "opencode";
  /**
   * Extra install markers: only `~` or absolute paths (never cwd-relative).
   * Merged with {@link extraInstallCandidatePaths} for known IDEs.
   */
  installPaths?: string[];
  /** If any command resolves on PATH, treat the platform as installed. */
  installCliCommands?: string[];
}

const PLATFORMS: PlatformDef[] = [
  // ── Chat ──
  { value: "claude-desktop", label: "Claude Desktop", hint: "Anthropic desktop client", configPath: "~/Library/Application Support/Claude/claude_desktop_config.json", format: "json", mcpKey: "mcpServers" },
  { value: "chatgpt", label: "ChatGPT", hint: "OpenAI desktop client", configPath: "~/Library/Application Support/chatgpt/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "chatbox", label: "Chatbox", hint: "Multi-model chat client", configPath: "~/.chatbox/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "lm-studio", label: "LM Studio", hint: "Local model runtime", configPath: "~/.lmstudio/mcp.json", format: "json", mcpKey: "mcpServers" },

  // ── IDEs ──
  {
    value: "claude-code",
    label: "Claude Code",
    hint: "~/.claude.json",
    configPath: "~/.claude.json",
    format: "json",
    mcpKey: "mcpServers",
    installPaths: ["~/.claude"],
    installCliCommands: ["claude"],
  },
  { value: "vscode", label: "VS Code (Copilot)", hint: ".vscode/mcp.json", configPath: ".vscode/mcp.json", format: "json", mcpKey: "servers" },
  { value: "cursor", label: "Cursor", hint: ".cursor/mcp.json", configPath: ".cursor/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "trae", label: "Trae (ByteDance)", hint: ".trae/mcp.json", configPath: ".trae/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "windsurf", label: "Windsurf", hint: "Codeium AI IDE", configPath: "~/.codeium/windsurf/mcp_config.json", format: "json", mcpKey: "mcpServers" },
  { value: "zed", label: "Zed", hint: "High-performance code editor", configPath: ".zed/settings.json", format: "json", mcpKey: "context_servers" },
  { value: "junie", label: "JetBrains Junie", hint: "JetBrains AI Agent", configPath: "~/.junie/mcp.json", format: "json", mcpKey: "mcpServers" },
  {
    value: "cline",
    label: "Cline",
    hint: "VS Code autonomous coding agent",
    // Cline (VS Code ext) 把 MCP settings 放在 VS Code globalStorage 下；此路径为 macOS 位置
    configPath: "~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
    format: "json",
    mcpKey: "mcpServers",
  },
  {
    value: "roo-code",
    label: "Roo Code",
    hint: ".roo/mcp.json (project-scoped)",
    configPath: ".roo/mcp.json",
    format: "json",
    mcpKey: "mcpServers",
  },

  // ── CLI Agents ──
  { value: "opencode", label: "OpenCode", hint: "Open-source terminal AI", configPath: "~/.config/opencode/opencode.json", format: "json", mcpKey: "mcp", entryShape: "opencode", installPaths: ["~/.config/opencode", "~/opencode.json"] },
  { value: "amazon-q", label: "Amazon Q CLI", hint: "AWS CLI assistant", configPath: "~/.amazonq/mcp.json", format: "json", mcpKey: "mcpServers" },

  // ── Frameworks ──
  { value: "hermes", label: "Hermes Agent", hint: "~/.hermes/config.yaml", configPath: "~/.hermes/config.yaml", format: "yaml", mcpKey: "mcp_servers" },
  { value: "beeai", label: "BeeAI", hint: "IBM AI Agent framework", configPath: ".beeai/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "swarms", label: "Swarms", hint: "Multi-agent orchestration", configPath: ".swarms/mcp.json", format: "json", mcpKey: "mcpServers" },

  // ── AI Agents ──
  {
    value: "openclaw",
    label: "OpenClaw",
    hint: "AI Agent platform",
    configPath: "~/.openclaw/mcp.json",
    format: "json",
    mcpKey: "mcpServers",
    installCliCommands: ["openclaw"],
  },
  { value: "nanoclaw", label: "NanoClaw", hint: "Lightweight AI Agent", configPath: "~/.nanoclaw/mcp.json", format: "json", mcpKey: "mcpServers" },

  // ── Other ──
  { value: "v0", label: "v0 (Vercel)", hint: "AI frontend generator", configPath: ".v0/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "postman", label: "Postman", hint: "API development platform", configPath: "~/postman/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "amp", label: "Amp (Sourcegraph)", hint: "Code-intelligence agent", configPath: "~/.amp/config.json", format: "json", mcpKey: "mcpServers" },
];

const TOOL_GROUP_CHOICES = [
  { value: "deepagent", label: "deepagent (recommended)", hint: "One-stop quant agent — market data / analysis / deep reports / strategy gen / backtest / paper trade (~1,400 tokens)" },
  { value: "strategy", label: "strategy", hint: "Advanced local workflow — publish / validate / fork / leaderboard for FEP v2.0 packages (~1,000 tokens)" },
] as const;

const ALL_GROUP_VALUES = TOOL_GROUP_CHOICES.map((g) => g.value);

// ─── Helpers ─────────────────────────────────────────────────────────

function expandPath(p: string): string {
  return p.startsWith("~") ? join(homedir(), p.slice(1)) : join(process.cwd(), p);
}

/**
 * Resolves install-marker paths only (`~` or absolute). Never uses `process.cwd()`.
 * @param p - Path with leading `~` or an absolute path
 */
function expandInstallPath(p: string): string {
  return p.startsWith("~") ? join(homedir(), p.slice(1)) : p;
}

/**
 * @param cmd - Command name (ASCII, no shell metacharacters)
 * @returns Whether `cmd` is found on PATH
 */
function commandOnPath(cmd: string): boolean {
  try {
    if (process.platform === "win32") {
      execFileSync("where", [cmd], { stdio: "ignore", windowsHide: true });
    } else {
      execFileSync("sh", ["-c", `command -v "${cmd}"`], { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * OS-specific paths that indicate an IDE/app is present (not MCP config alone).
 * @param platformValue - `PlatformDef.value`
 */
function extraInstallCandidatePaths(platformValue: string): string[] {
  const out: string[] = [];
  const plat = process.platform;
  const la = process.env.LOCALAPPDATA;
  const uh = homedir();

  switch (platformValue) {
    case "cursor": {
      out.push(join(uh, ".cursor"));
      if (plat === "darwin") out.push("/Applications/Cursor.app");
      if (plat === "linux") out.push(join(uh, ".config", "Cursor"));
      if (plat === "win32" && la) {
        out.push(join(la, "Programs", "cursor", "Cursor.exe"));
      }
      break;
    }
    case "vscode": {
      out.push(join(uh, ".vscode"));
      if (plat === "darwin") out.push("/Applications/Visual Studio Code.app");
      if (plat === "linux") {
        out.push("/usr/share/code/code");
        out.push(join(uh, ".config", "Code"));
      }
      if (plat === "win32" && la) {
        out.push(join(la, "Programs", "Microsoft VS Code", "Code.exe"));
      }
      break;
    }
    case "zed": {
      if (plat === "darwin") out.push("/Applications/Zed.app");
      if (plat === "linux") out.push(join(uh, ".config", "zed"));
      if (plat === "win32" && la) {
        out.push(join(la, "Programs", "Zed", "Zed.exe"));
      }
      break;
    }
    case "trae": {
      out.push(join(uh, ".trae"));
      if (plat === "darwin") out.push("/Applications/Trae.app");
      if (plat === "linux") out.push(join(uh, ".config", "Trae"));
      if (plat === "win32" && la) {
        out.push(join(la, "Programs", "Trae", "Trae.exe"));
      }
      break;
    }
    case "openclaw": {
      /** Primary OpenClaw config; MCP file may not exist until first MCP setup. */
      out.push(join(uh, ".openclaw", "openclaw.json"));
      break;
    }
    default:
      break;
  }
  return out;
}

/**
 * @returns Whether the MCP config path (project- or home-relative) already exists
 */
function hasMcpConfigPath(p: PlatformDef): boolean {
  const fullPath = expandPath(p.configPath);
  const dir = dirname(fullPath);
  return existsSync(dir) || existsSync(fullPath);
}

/**
 * @returns Whether the app/runtime appears installed (bundle, data dir, or CLI on PATH)
 */
function isPlatformInstalled(p: PlatformDef): boolean {
  const fromDef = (p.installPaths ?? []).map((x) => expandInstallPath(x));
  const merged = [...fromDef, ...extraInstallCandidatePaths(p.value)];
  if (merged.some((path) => existsSync(path))) {
    return true;
  }
  if (p.installCliCommands?.some((c) => commandOnPath(c))) {
    return true;
  }
  return false;
}

interface PlatformDetectInfo {
  hasConfig: boolean;
  installed: boolean;
}

/**
 * Combines MCP path presence with install heuristics (IDE bundles, `~/.cursor`, `openclaw` on PATH, etc.).
 */
function detectPlatformStates(): Map<string, PlatformDetectInfo> {
  const map = new Map<string, PlatformDetectInfo>();
  for (const p of PLATFORMS) {
    map.set(p.value, {
      hasConfig: hasMcpConfigPath(p),
      installed: isPlatformInstalled(p),
    });
  }
  return map;
}

/**
 * @param info - Detection result for one platform
 * @returns Hint for multiselect (Chinese labels per wizard locale)
 */
function formatDetectHint(p: PlatformDef, info: PlatformDetectInfo): string {
  if (!info.hasConfig && !info.installed) {
    return p.hint ?? "";
  }
  const parts: string[] = [];
  if (info.installed) parts.push(`${hiGreen("●")} ${bold("INSTALLED")}`);
  if (info.hasConfig) parts.push(`${hiCyan("●")} ${bold("CONFIGURED")}`);
  return parts.join(dim("  "));
}

/** Platforms to preselect: MCP config exists or install heuristics matched. */
function selectDetectedPlatforms(states: Map<string, PlatformDetectInfo>): Set<string> {
  const detected = new Set<string>();
  for (const p of PLATFORMS) {
    const s = states.get(p.value);
    if (s?.hasConfig || s?.installed) {
      detected.add(p.value);
    }
  }
  return detected;
}

/**
 * Build the MCP entry stanza (command + args + env).
 * @param toolGroups - Selected tool groups (strategy / deepagent)
 * @param apiKey - Hub API key (fch_...)
 * @param deepagentApiKey - Optional DeepAgent API key (raw, no prefix)
 */
function buildMcpEntry(toolGroups: string[], apiKey: string, deepagentApiKey?: string) {
  const args = ["@openfinclaw/cli", "serve"];
  /** When all groups are selected, omit --tools (same as serve default). */
  if (toolGroups.length > 0 && toolGroups.length < TOOL_GROUP_CHOICES.length) {
    args.push(`--tools=${toolGroups.join(",")}`);
  }
  const env: Record<string, string> = { OPENFINCLAW_API_KEY: apiKey };
  if (deepagentApiKey) env.OPENFINCLAW_DEEPAGENT_API_KEY = deepagentApiKey;
  return { command: "npx", args, env };
}

/**
 * Convert the standard `{ command, args, env }` stanza to a platform-specific shape.
 * OpenCode expects `{ type: "local", command: [cmd, ...args], environment, enabled }`
 * (see https://opencode.ai/docs/mcp-servers); other platforms accept the standard shape.
 * @param platform - Target platform definition
 * @param entry - Standard MCP entry from `buildMcpEntry`
 */
function shapeEntryForPlatform(
  platform: PlatformDef,
  entry: { command: string; args: string[]; env: Record<string, string> },
): object {
  if (platform.entryShape === "opencode") {
    return {
      type: "local",
      command: [entry.command, ...entry.args],
      enabled: true,
      environment: entry.env,
    };
  }
  return entry;
}

function writeJsonConfig(
  platform: PlatformDef,
  entry: { command: string; args: string[]; env: Record<string, string> },
) {
  const fullPath = expandPath(platform.configPath);
  mkdirSync(dirname(fullPath), { recursive: true });

  let existing: Record<string, unknown> = {};
  if (existsSync(fullPath)) {
    try {
      existing = JSON.parse(readFileSync(fullPath, "utf-8"));
    } catch {
      existing = {};
    }
  }

  const mcpSection = (existing[platform.mcpKey] ?? {}) as Record<string, unknown>;
  mcpSection["openfinclaw"] = shapeEntryForPlatform(platform, entry);
  existing[platform.mcpKey] = mcpSection;

  writeFileSync(fullPath, JSON.stringify(existing, null, 2) + "\n");
  return fullPath;
}

function writeYamlConfig(
  platform: PlatformDef,
  entry: { command: string; args: string[]; env: Record<string, string> },
) {
  const fullPath = expandPath(platform.configPath);
  mkdirSync(dirname(fullPath), { recursive: true });

  let content = "";
  if (existsSync(fullPath)) {
    content = readFileSync(fullPath, "utf-8");
  }

  const envLines = Object.entries(entry.env)
    .map(([k, v]) => `      ${k}: "${v}"`)
    .join("\n");
  const insertBlock = `  openfinclaw:\n    command: "${entry.command}"\n    args: ${JSON.stringify(entry.args)}\n    env:\n${envLines}\n`;

  content = content.replace(/\n  openfinclaw:\n(?:    [^\n]*\n|      [^\n]*\n)*/g, "");

  if (content.includes("mcp_servers:")) {
    content = content.replace("mcp_servers:", "mcp_servers:\n" + insertBlock);
  } else {
    content += `\nmcp_servers:\n${insertBlock}`;
  }

  writeFileSync(fullPath, content);
  return fullPath;
}

/**
 * Persist API key(s) to `~/.openfinclaw/config.json` so terminal `openfinclaw`
 * works without `export`. Unix: chmod 600 on the file.
 * @param apiKey - Hub API key (fch_...)
 * @param deepagentApiKey - Optional DeepAgent API key
 * @returns Written file path
 */
function writeUserConfigFile(apiKey: string, deepagentApiKey?: string): string {
  const fullPath = getUserConfigFilePath();
  mkdirSync(dirname(fullPath), { recursive: true });

  let existing: Record<string, unknown> = {};
  if (existsSync(fullPath)) {
    try {
      existing = JSON.parse(readFileSync(fullPath, "utf-8")) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }
  existing.apiKey = apiKey;
  if (deepagentApiKey) {
    existing.deepagentApiKey = deepagentApiKey;
  }

  writeFileSync(fullPath, JSON.stringify(existing, null, 2) + "\n", "utf-8");
  if (process.platform !== "win32") {
    try {
      chmodSync(fullPath, 0o600);
    } catch {
      /* ignore chmod failures */
    }
  }
  return fullPath;
}

// ─── Interactivity Detection & Fallback Prompts ──────────────────────

/**
 * Whether the current process can drive clack's key-level prompts.
 *
 * Clack (`@clack/prompts`) relies on `process.stdin.setRawMode(true)` to
 * capture arrow/space keystrokes. On Windows legacy consoles, SSH pipes,
 * some CI runners, and when stdin is redirected, raw mode is unavailable
 * and multiselect silently falls through with its `initialValues`. When
 * that happens we MUST switch to a line-oriented fallback — otherwise the
 * user sees their "auto-selected" platforms written without any prompt.
 */
function canUseClackPrompts(): boolean {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  if (typeof process.stdin.setRawMode !== "function") return false;
  // CI=true and similar sentinels force non-interactive.
  if (process.env.CI === "true" || process.env.CI === "1") return false;
  return true;
}

/**
 * Read a single line from stdin. Closes the readline interface so the
 * process can exit cleanly.
 * @param prompt - Prompt text printed before the input cursor
 */
function readLine(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

interface ChoiceLike {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Line-based multi-select fallback used when clack's raw-mode prompt can't
 * run. Renders a numbered list and parses numeric/comma input.
 *
 * @param title - Section title (already styled)
 * @param options - Choices to render
 * @param initial - Pre-selected values
 * @param allowAll - Accept the literal "all" to select every option
 */
async function multiSelectFallback(
  title: string,
  options: readonly ChoiceLike[],
  initial: readonly string[],
  allowAll = true,
): Promise<string[]> {
  console.log();
  console.log(`  ${bold(title)}`);
  console.log();
  const initialSet = new Set(initial);
  options.forEach((opt, i) => {
    const num = String(i + 1).padStart(2, " ");
    const mark = initialSet.has(opt.value) ? hiGreen("●") : dim("○");
    const hint = opt.hint ? `  ${dim(`— ${opt.hint}`)}` : "";
    console.log(`    ${dim(num + ".")}  ${mark}  ${opt.label}${hint}`);
  });
  console.log();
  const hintLine = allowAll
    ? "Enter numbers (space/comma separated) · Enter = detected · 'all' = select all · 'none' = clear"
    : "Enter numbers (space/comma separated) · Enter = default · 'none' = clear";
  console.log(dim(`    ${hintLine}`));
  const answer = (await readLine(`    ${cyan("▸")} `)).trim();
  if (answer === "") return [...initial];
  const lower = answer.toLowerCase();
  if (lower === "none" || lower === "0") return [];
  if (allowAll && lower === "all") return options.map((o) => o.value);
  const picked = new Set<string>();
  for (const tok of answer.split(/[\s,]+/).filter(Boolean)) {
    const n = Number.parseInt(tok, 10);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) {
      picked.add(options[n - 1]!.value);
    }
  }
  return [...picked];
}

/**
 * Line-based password fallback — prompts on stdout and reads a line from
 * stdin without echo suppression. We intentionally don't try to hide input
 * when clack isn't available, because doing so also needs raw mode.
 * @param title - Prompt label
 */
async function secretFallback(title: string): Promise<string> {
  const answer = await readLine(`    ${cyan("▸")} ${title} `);
  return answer.trim();
}

// ─── Non-Interactive Flag Parsing ────────────────────────────────────

interface InitFlags {
  yes: boolean;
  platforms?: string[];
  toolGroups?: string[];
  apiKey?: string;
  deepagentApiKey?: string;
  forceFallback: boolean;
  help: boolean;
}

/**
 * Parse `init`-specific flags. Unknown flags are ignored so older callers
 * stay compatible.
 * @param argv - Args after the `init` subcommand (i.e. `process.argv.slice(3)`)
 */
function parseInitFlags(argv: string[]): InitFlags {
  const out: InitFlags = { yes: false, forceFallback: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const [keyRaw, inlineVal] = a.startsWith("--") ? a.slice(2).split("=") : ["", undefined];
    const take = (): string | undefined => {
      if (inlineVal !== undefined) return inlineVal;
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        i++;
        return next;
      }
      return undefined;
    };
    const key = keyRaw ?? "";
    switch (key) {
      case "yes":
      case "y":
        out.yes = true;
        break;
      case "help":
      case "h":
        out.help = true;
        break;
      case "no-interactive":
      case "non-interactive":
        out.forceFallback = true;
        break;
      case "platforms": {
        const v = take();
        if (v) out.platforms = v.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      }
      case "tool-groups":
      case "tools": {
        const v = take();
        if (v) out.toolGroups = v.split(",").map((s) => s.trim()).filter(Boolean);
        break;
      }
      case "api-key": {
        const v = take();
        if (v) out.apiKey = v;
        break;
      }
      case "deepagent-api-key": {
        const v = take();
        if (v) out.deepagentApiKey = v;
        break;
      }
      default:
        break;
    }
  }
  return out;
}

function printInitHelp(): void {
  const lines = [
    "",
    `  ${boldCyan("openfinclaw init")}  ${dim("Interactive MCP setup wizard")}`,
    "",
    `  ${bold("Interactive (default)")}`,
    `    openfinclaw init`,
    "",
    `  ${bold("Non-interactive / scripted")}`,
    `    --yes, -y                      Skip every confirmation that can be skipped`,
    `    --platforms <a,b,c>            Target platforms (e.g. cursor,claude-code)`,
    `    --tool-groups <a,b,c>          Tool groups (deepagent / strategy)`,
    `    --api-key <fch_...>            Hub API key (needed for strategy group)`,
    `    --deepagent-api-key <key>      DeepAgent API key (needed for deepagent group)`,
    `    --non-interactive              Force line-input mode (bypass clack)`,
    "",
    `  ${bold("Example")}`,
    `    openfinclaw init --yes --platforms cursor,claude-code \\`,
    `                     --tool-groups deepagent,strategy \\`,
    `                     --api-key fch_xxx --deepagent-api-key <key>`,
    "",
  ];
  console.log(lines.join("\n"));
}

// ─── Main Wizard ─────────────────────────────────────────────────────

/**
 * Run the interactive `init` wizard.
 * @param argv - Args after the `init` subcommand (flags; positional args ignored)
 */
export async function runInit(argv: string[] = []): Promise<void> {
  const flags = parseInitFlags(argv);
  if (flags.help) {
    printInitHelp();
    return;
  }

  // Print the brand banner OUTSIDE clack.intro so it doesn't get truncated
  // by the `│ ` prefix clack adds to every line inside its box.
  process.stdout.write(renderBanner(getCliVersion()));

  let clack: typeof import("@clack/prompts") | undefined;
  const useClack = canUseClackPrompts() && !flags.forceFallback;
  if (useClack) {
    try {
      clack = await import("@clack/prompts");
    } catch {
      clack = undefined;
    }
  }

  const platformStates = detectPlatformStates();
  const detected = selectDetectedPlatforms(platformStates);

  // ── Stats header (works in both modes) ──
  {
    let installedCount = 0;
    let configuredCount = 0;
    for (const p of PLATFORMS) {
      const s = platformStates.get(p.value);
      if (s?.installed) installedCount++;
      if (s?.hasConfig) configuredCount++;
    }
    const statsLine = `${bold("Detected")} ${dim("→")} ${hiGreen(`${installedCount} installed`)} ${dim("·")} ${hiCyan(`${configuredCount} configured`)}`;
    if (clack) {
      clack.intro(`${boldAmber("MCP · init")} ${dim("·")} ${dim("one-stop quant-agent setup wizard")}`);
      clack.log.info(statsLine);
    } else {
      console.log(`  ${statsLine}`);
    }
  }

  // ── Step 1: Platforms ──
  const selectedPlatforms: string[] = await resolvePlatforms(flags, clack, platformStates, detected);
  if (selectedPlatforms.length === 0) {
    printCancel(clack, "No platform selected — cancelled.");
    process.exit(0);
  }

  // ── Step 2: Tool groups ──
  const selectedGroups: string[] = await resolveToolGroups(flags, clack);
  if (selectedGroups.length === 0) {
    printCancel(clack, "No tool group selected — cancelled.");
    process.exit(0);
  }

  // ── Step 3: API key ──
  const hubKey = await resolveApiKey(flags, clack);
  if (!hubKey) {
    printCancel(clack, "No API key provided — cancelled.");
    process.exit(0);
  }

  // ── Step 3.5: DeepAgent key (optional) ──
  let deepagentKey: string | undefined;
  if (selectedGroups.includes("deepagent")) {
    deepagentKey = await resolveDeepagentKey(flags, clack);
  }

  // ── Step 4: Write configs ──
  const entry = buildMcpEntry(selectedGroups, hubKey, deepagentKey);
  let successCount = 0;

  printStep(clack, "Step 4", "Writing config files");

  for (const pv of selectedPlatforms) {
    const platform = PLATFORMS.find((p) => p.value === pv);
    if (!platform) continue;
    try {
      const writtenPath =
        platform.format === "yaml"
          ? writeYamlConfig(platform, entry)
          : writeJsonConfig(platform, entry);
      printSuccess(clack, formatPathWrite(platform.label, writtenPath));
      successCount++;
    } catch (err) {
      printError(
        clack,
        `${platform.label} write failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  try {
    const userConfigPath = writeUserConfigFile(hubKey, deepagentKey);
    printSuccess(
      clack,
      `${bold("CLI config saved")}  ${dim("→")}  ${cyan(userConfigPath)} ${dim("(run `openfinclaw` directly — no export needed)")}`,
    );
  } catch (err) {
    printWarn(
      clack,
      `Failed to write ~/.openfinclaw/config.json: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── Summary ──
  const cliOnPath = isBareCliOnPath();
  const terminalPrefix = cliOnPath ? "openfinclaw" : "npx -y @openfinclaw/cli";
  const installHint = cliOnPath
    ? null
    : `${dim("Tip")} ${dim("→")} For a shorter ${cyan("openfinclaw <cmd>")} command, install globally: ${cyan("npm install -g @openfinclaw/cli")}`;

  if (clack) {
    const s = clack.spinner();
    s.start(`${dim("Verifying config...")}`);
    await new Promise((r) => setTimeout(r, 600));
    s.stop(`${green("✔")} ${bold(`${successCount} platform${successCount === 1 ? "" : "s"}`)} configured`);
    const outroLines = [
      `${bold("In your AI agent")} ${dim("→")} try asking:`,
      `  ${cyan('"Research NVDA last 90 days, generate a momentum strategy, backtest 1y, then give me a paper-trade plan"')}`,
      "",
      `${bold("In the terminal")} ${dim("→")} e.g.`,
      `  ${cyan(`${terminalPrefix} deepagent research "…"`)}`,
      `  ${cyan(`${terminalPrefix} deepagent health`)}`,
      `  ${cyan(`${terminalPrefix} doctor`)}`,
    ];
    if (installHint) outroLines.push("", installHint);
    outroLines.push(
      "",
      `${dim("Try online")} ${cyan("https://hub.openfinclaw.ai/en/chat")}  ${dim("← no install required")}`,
      `${dim("Docs")}       ${cyan("https://github.com/mirror29/openfinclaw-cli")}`,
      `${dim("API Key")}    ${cyan("https://hub.openfinclaw.ai")}`,
    );
    clack.outro(outroLines.join("\n"));
  } else {
    console.log();
    console.log(`  ${green("✔")} ${bold(`${successCount} platform${successCount === 1 ? "" : "s"}`)} configured`);
    console.log();
    console.log(`  ${bold("In your AI agent")} ${dim("→")} try asking:`);
    console.log(`    ${cyan('"Research NVDA last 90 days, generate a momentum strategy, backtest 1y, then give me a paper-trade plan"')}`);
    console.log();
    console.log(`  ${bold("In the terminal")} ${dim("→")} e.g.`);
    console.log(`    ${cyan(`${terminalPrefix} deepagent research "…"`)}`);
    console.log(`    ${cyan(`${terminalPrefix} deepagent health`)}`);
    console.log(`    ${cyan(`${terminalPrefix} doctor`)}`);
    if (installHint) {
      console.log();
      console.log(`  ${installHint}`);
    }
    console.log();
    console.log(`  ${dim("Try online")} ${cyan("https://hub.openfinclaw.ai/en/chat")}  ${dim("← no install required")}`);
    console.log(`  ${dim("Docs")}       ${cyan("https://github.com/mirror29/openfinclaw-cli")}`);
    console.log(`  ${dim("API Key")}    ${cyan("https://hub.openfinclaw.ai")}`);
    console.log();
  }
}

/**
 * @returns true if the bare `openfinclaw` command resolves on the *user's*
 *   PATH (global install). When invoked via `npx`, `argv[1]` sits inside
 *   an ephemeral `_npx` cache that's temporarily on PATH — we detect that
 *   and return false so wizard hints fall back to `npx -y @openfinclaw/cli`.
 */
function isBareCliOnPath(): boolean {
  const self = process.argv[1] ?? "";
  if (/[\\/]_npx[\\/]|[\\/]\.npm[\\/]_npx[\\/]/.test(self)) {
    return false;
  }
  try {
    if (process.platform === "win32") {
      execFileSync("where", ["openfinclaw"], { stdio: "ignore", windowsHide: true });
    } else {
      execFileSync("sh", ["-c", "command -v openfinclaw"], { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

// ─── Step Resolvers (route to clack or fallback) ─────────────────────

/**
 * @returns Final list of platform values to configure
 */
async function resolvePlatforms(
  flags: InitFlags,
  clack: typeof import("@clack/prompts") | undefined,
  states: Map<string, PlatformDetectInfo>,
  detected: Set<string>,
): Promise<string[]> {
  if (flags.platforms) {
    const known = new Set(PLATFORMS.map((p) => p.value));
    const valid = flags.platforms.filter((v) => known.has(v));
    const unknown = flags.platforms.filter((v) => !known.has(v));
    if (unknown.length > 0) {
      printWarn(clack, `Unknown platforms ignored: ${unknown.join(", ")}`);
    }
    return valid;
  }
  if (flags.yes) return [...detected];

  printStep(clack, "Step 1", "Select AI agent platforms to configure");

  if (clack) {
    const result = await clack.multiselect({
      message: dim("Auto-detected installs & existing MCP configs (space = toggle, enter = confirm)"),
      options: PLATFORMS.map((p) => ({
        value: p.value,
        label: p.label,
        hint: formatDetectHint(p, states.get(p.value) ?? { hasConfig: false, installed: false }),
      })),
      initialValues: [...detected],
      required: false,
    });
    if (clack.isCancel(result)) process.exit(0);
    return result as string[];
  }

  return multiSelectFallback(
    "Step 1 · Select AI agent platforms to configure",
    PLATFORMS.map((p) => ({
      value: p.value,
      label: p.label,
      hint: formatDetectHint(p, states.get(p.value) ?? { hasConfig: false, installed: false }),
    })),
    [...detected],
  );
}

async function resolveToolGroups(
  flags: InitFlags,
  clack: typeof import("@clack/prompts") | undefined,
): Promise<string[]> {
  if (flags.toolGroups) {
    const valid = flags.toolGroups.filter((v) => ALL_GROUP_VALUES.includes(v as (typeof ALL_GROUP_VALUES)[number]));
    const unknown = flags.toolGroups.filter((v) => !ALL_GROUP_VALUES.includes(v as (typeof ALL_GROUP_VALUES)[number]));
    if (unknown.length > 0) {
      printWarn(clack, `Unknown tool groups ignored: ${unknown.join(", ")}`);
    }
    return valid.length > 0 ? valid : [...ALL_GROUP_VALUES];
  }
  if (flags.yes) return [...ALL_GROUP_VALUES];

  printStep(clack, "Step 2", "Select tool groups to enable");

  if (clack) {
    const result = await clack.multiselect({
      message: dim("Enable only what you need to save tokens"),
      options: TOOL_GROUP_CHOICES.map((c) => ({ value: c.value, label: c.label, hint: c.hint })),
      initialValues: [...ALL_GROUP_VALUES],
      required: false,
    });
    if (clack.isCancel(result)) process.exit(0);
    return result as string[];
  }

  return multiSelectFallback(
    "Step 2 · Select tool groups to enable",
    TOOL_GROUP_CHOICES,
    [...ALL_GROUP_VALUES],
  );
}

async function resolveApiKey(
  flags: InitFlags,
  clack: typeof import("@clack/prompts") | undefined,
): Promise<string | undefined> {
  if (flags.apiKey) return flags.apiKey.trim();

  printStep(clack, "Step 3", "Enter API key");
  printInfo(clack, `${dim("Don't have one yet?")} ${cyan("https://hub.openfinclaw.ai")}`);

  let key: string | undefined;
  if (clack) {
    const result = await clack.password({
      message: dim("Paste your API key (usually starts with fch_)"),
    });
    if (clack.isCancel(result)) return undefined;
    key = (result as string).trim();
  } else {
    key = await secretFallback(dim("API key (usually starts with fch_):"));
  }

  if (!key) return undefined;

  if (!key.startsWith("fch_")) {
    printWarn(clack, `${yellow("⚠")} API keys usually start with fch_ — double-check this value`);
    if (!flags.yes) {
      const confirmed = await confirmYesNo(clack, "Continue with this key?", true);
      if (!confirmed) return undefined;
    }
  }
  return key;
}

async function resolveDeepagentKey(
  flags: InitFlags,
  clack: typeof import("@clack/prompts") | undefined,
): Promise<string | undefined> {
  if (flags.deepagentApiKey) return flags.deepagentApiKey.trim();
  if (flags.yes) return undefined;

  printStep(clack, "Step 3.5", `DeepAgent API key ${dim("(optional · unlocks AI research & strategy gen)")}`);
  printInfo(clack, dim("DeepAgent is a separate service with its own API key."));

  let dp: string | undefined;
  if (clack) {
    const result = await clack.password({
      message: dim("Paste your DeepAgent API key (enter to skip)"),
    });
    if (clack.isCancel(result)) process.exit(0);
    dp = (result as string).trim();
  } else {
    dp = await secretFallback(dim("DeepAgent API key (enter to skip):"));
  }

  if (dp && dp.length > 0) {
    printSuccess(clack, `${green("✔")} DeepAgent key accepted`);
    return dp;
  }
  printInfo(
    clack,
    dim("Skipped — only fin_deepagent_health / fin_deepagent_skills remain usable; other deepagent tools will prompt to configure a key."),
  );
  return undefined;
}

async function confirmYesNo(
  clack: typeof import("@clack/prompts") | undefined,
  question: string,
  defaultYes: boolean,
): Promise<boolean> {
  if (clack) {
    const result = await clack.select({
      message: dim(question),
      options: [
        { value: "yes", label: "Continue" },
        { value: "no", label: "Cancel" },
      ],
      initialValue: defaultYes ? "yes" : "no",
    });
    if (clack.isCancel(result)) return false;
    return result === "yes";
  }
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = (await readLine(`    ${cyan("▸")} ${question} ${dim(hint)} `)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes";
}

// ─── Logging Helpers (route to clack or plain console) ───────────────

function printStep(
  clack: typeof import("@clack/prompts") | undefined,
  step: string,
  text: string,
): void {
  if (clack) {
    clack.log.step(`${cyan(step)} ${text}`);
  } else {
    console.log();
    console.log(`  ${cyan(step)}  ${bold(text)}`);
  }
}

function printInfo(
  clack: typeof import("@clack/prompts") | undefined,
  text: string,
): void {
  if (clack) clack.log.info(text);
  else console.log(`    ${text}`);
}

function printSuccess(
  clack: typeof import("@clack/prompts") | undefined,
  text: string,
): void {
  if (clack) clack.log.success(text);
  else console.log(`    ${green("✔")} ${text}`);
}

function printWarn(
  clack: typeof import("@clack/prompts") | undefined,
  text: string,
): void {
  if (clack) clack.log.warn(text);
  else console.log(`    ${yellow("⚠")} ${text}`);
}

function printError(
  clack: typeof import("@clack/prompts") | undefined,
  text: string,
): void {
  if (clack) clack.log.error(`${red("✖")} ${text}`);
  else console.error(`    ${red("✖")} ${text}`);
}

function printCancel(
  clack: typeof import("@clack/prompts") | undefined,
  text: string,
): void {
  if (clack) clack.cancel(dim(text));
  else console.log(`\n  ${dim(text)}\n`);
}

// ─── CLI Version Lookup ──────────────────────────────────────────────

/**
 * Best-effort read of the CLI package version from disk. Returns `undefined`
 * when the package.json can't be found (e.g. bundled single-file builds).
 */
function getCliVersion(): string | undefined {
  try {
    const here = dirname(new URL(import.meta.url).pathname);
    // Walk up from dist/init.js → packages/cli/package.json
    for (const rel of ["../package.json", "../../package.json"]) {
      const candidate = join(here, rel);
      if (existsSync(candidate)) {
        const pkg = JSON.parse(readFileSync(candidate, "utf-8")) as { version?: string };
        if (pkg.version) return pkg.version;
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}
