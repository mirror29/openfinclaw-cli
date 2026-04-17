/**
 * Interactive setup wizard — configures MCP on multiple agent platforms.
 * @module @openfinclaw/cli/init
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
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
function magenta(s: string): string {
  return sgr("35", s);
}

/** @param s - text */
function hiMagenta(s: string): string {
  return sgr("95", s);
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
function hiYellow(s: string): string {
  return sgr("93", s);
}

/** @param s - text */
function red(s: string): string {
  return sgr("31", s);
}

/**
 * Render a compact geek-style banner.
 * @param version - CLI package version string, optional
 */
function renderBanner(version?: string): string {
  // clack 的 intro 会自带边框/前缀，这里避免再绘制外框，保持极简、对齐稳定
  const v = version ? ` ${dim(`v${version}`)}` : "";
  const logo = [
    `${hiMagenta("   ____                  _")}`,
    `${hiMagenta("  / __ \\____  ___  _____(_)___  ____ _      __")}`,
    `${hiMagenta(" / / / / __ \\/ _ \\/ ___/ / __ \\/ __ \\ | /| / /")}`,
    `${hiMagenta("/ /_/ / /_/ /  __/ /  / / / / / /_/ / |/ |/ /")}`,
    `${hiMagenta("\\____/ .___/\\___/_/  /_/_/ /_/\\____/|__/|__/")}`,
    `${hiMagenta("    /_/")}   ${hiCyan("MCP")} ${dim("·")} ${hiCyan("init")}${v}`,
  ].join("\n");
  const subtitle = dim("跨平台 MCP 配置向导 · 自动检测 · 一键写入");
  return `${logo}\n${subtitle}`;
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
  { value: "claude-desktop", label: "Claude Desktop", hint: "Anthropic 桌面客户端", configPath: "~/Library/Application Support/Claude/claude_desktop_config.json", format: "json", mcpKey: "mcpServers" },
  { value: "chatgpt", label: "ChatGPT", hint: "OpenAI 桌面客户端", configPath: "~/Library/Application Support/chatgpt/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "chatbox", label: "Chatbox", hint: "多模型聊天客户端", configPath: "~/.chatbox/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "lm-studio", label: "LM Studio", hint: "本地模型推理", configPath: "~/.lmstudio/mcp.json", format: "json", mcpKey: "mcpServers" },

  // ── IDEs ──
  { value: "claude-code", label: "Claude Code", hint: "~/.claude/settings.json", configPath: "~/.claude/settings.json", format: "json", mcpKey: "mcpServers" },
  { value: "vscode", label: "VS Code (Copilot)", hint: ".vscode/mcp.json", configPath: ".vscode/mcp.json", format: "json", mcpKey: "servers" },
  { value: "cursor", label: "Cursor", hint: ".cursor/mcp.json", configPath: ".cursor/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "windsurf", label: "Windsurf", hint: "Codeium AI IDE", configPath: "~/.codeium/windsurf/mcp_config.json", format: "json", mcpKey: "mcpServers" },
  { value: "zed", label: "Zed", hint: "高性能代码编辑器", configPath: ".zed/settings.json", format: "json", mcpKey: "context_servers" },
  { value: "junie", label: "JetBrains Junie", hint: "JetBrains AI Agent", configPath: "~/.junie/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "cline", label: "Cline", hint: "VS Code 自主编码 Agent", configPath: "~/.cline/mcp_settings.json", format: "json", mcpKey: "mcpServers" },
  { value: "continue", label: "Continue.dev", hint: "开源 AI 代码助手", configPath: "~/.continue/config.json", format: "json", mcpKey: "mcpServers" },
  { value: "roo-code", label: "Roo Code", hint: "VS Code AI 编码", configPath: "~/.roo/mcp.json", format: "json", mcpKey: "mcpServers" },

  // ── CLI Agents ──
  { value: "codex", label: "Codex (OpenAI)", hint: "OpenAI 命令行 Agent", configPath: "~/.codex/config.json", format: "json", mcpKey: "mcpServers" },
  { value: "opencode", label: "OpenCode", hint: "开源终端 AI", configPath: "~/.config/opencode/opencode.json", format: "json", mcpKey: "mcp", entryShape: "opencode", installPaths: ["~/.config/opencode", "~/opencode.json"] },
  { value: "amazon-q", label: "Amazon Q CLI", hint: "AWS 命令行助手", configPath: "~/.amazonq/mcp.json", format: "json", mcpKey: "mcpServers" },

  // ── Frameworks ──
  { value: "hermes", label: "Hermes Agent", hint: "~/.hermes/config.yaml", configPath: "~/.hermes/config.yaml", format: "yaml", mcpKey: "mcp_servers" },
  { value: "beeai", label: "BeeAI", hint: "IBM AI Agent 框架", configPath: ".beeai/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "swarms", label: "Swarms", hint: "多 Agent 编排框架", configPath: ".swarms/mcp.json", format: "json", mcpKey: "mcpServers" },

  // ── AI Agents ──
  {
    value: "openclaw",
    label: "OpenClaw",
    hint: "AI Agent 平台",
    configPath: "~/.openclaw/mcp.json",
    format: "json",
    mcpKey: "mcpServers",
    installCliCommands: ["openclaw"],
  },
  { value: "nanoclaw", label: "NanoClaw", hint: "轻量 AI Agent", configPath: "~/.nanoclaw/mcp.json", format: "json", mcpKey: "mcpServers" },

  // ── Other ──
  { value: "v0", label: "v0 (Vercel)", hint: "AI 前端生成平台", configPath: ".v0/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "postman", label: "Postman", hint: "API 开发平台", configPath: "~/postman/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "amp", label: "Amp (Sourcegraph)", hint: "代码智能 Agent", configPath: "~/.amp/config.json", format: "json", mcpKey: "mcpServers" },
];

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
 * @param toolGroups - Selected tool groups (datahub / strategy / deepagent)
 * @param apiKey - Hub API key (fch_...)
 * @param deepagentApiKey - Optional DeepAgent API key (raw, no prefix)
 */
function buildMcpEntry(toolGroups: string[], apiKey: string, deepagentApiKey?: string) {
  const args = ["@openfinclaw/cli", "serve"];
  /** When all 3 groups are selected, omit --tools (same as serve default). */
  if (toolGroups.length > 0 && toolGroups.length < 3) {
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

// ─── Main Wizard ─────────────────────────────────────────────────────

export async function runInit() {
  let clack: typeof import("@clack/prompts");
  try {
    clack = await import("@clack/prompts");
  } catch {
    console.error("@clack/prompts not found. Running in basic mode.\n");
    runBasicInit();
    return;
  }

  clack.intro(renderBanner());

  // ── Step 1: Select platforms ──
  clack.log.step(`${cyan("Step 1")} 选择要配置的 AI Agent 平台`);
  const platformStates = detectPlatformStates();
  const detected = selectDetectedPlatforms(platformStates);

  {
    let installedCount = 0;
    let configuredCount = 0;
    for (const p of PLATFORMS) {
      const s = platformStates.get(p.value);
      if (s?.installed) installedCount++;
      if (s?.hasConfig) configuredCount++;
    }
    clack.log.info(
      `${bold("Detected")} ${dim("→")} ${hiGreen(`${installedCount} installed`)} ${dim("·")} ${hiCyan(`${configuredCount} configured`)}`,
    );
  }

  const platforms = await clack.multiselect({
    message:
      `${dim("自动检测安装痕迹与现有 MCP 配置（空格选择，回车确认）")}`,
    options: PLATFORMS.map((p) => ({
      value: p.value,
      label: p.label,
      hint: formatDetectHint(p, platformStates.get(p.value) ?? { hasConfig: false, installed: false }),
    })),
    initialValues: [...detected],
  });
  if (clack.isCancel(platforms) || (platforms as string[]).length === 0) {
    clack.cancel(dim("已取消"));
    process.exit(0);
  }

  // ── Step 2: Select tool groups ──
  clack.log.step(`${cyan("Step 2")} 选择要启用的工具组`);

  const toolGroups = await clack.multiselect({
    message: `${dim("按需选择，减少不必要的 Token 消耗")}`,
    options: [
      { value: "datahub", label: "datahub", hint: "行情数据 — 价格/K线/加密/对比/搜索 (~700 tokens)" },
      { value: "strategy", label: "strategy", hint: "策略管理 — 发布/验证/Fork/排行榜 (~1,000 tokens)" },
      { value: "deepagent", label: "deepagent", hint: "远程 AI Agent — 研究/回测/策略生成（需独立 Key）(~1,400 tokens)" },
    ],
    initialValues: ["datahub", "strategy", "deepagent"],
  });
  if (clack.isCancel(toolGroups)) {
    clack.cancel(dim("已取消"));
    process.exit(0);
  }

  // ── Step 3: Enter API Key ──
  clack.log.step(`${cyan("Step 3")} 输入 API Key`);

  // Show where to get the key
  clack.log.info(`${dim("还没有 API Key?")} ${cyan("https://hub.openfinclaw.ai")}`);

  const apiKey = await clack.password({
    message: `${dim("请输入 API Key（通常以 fch_ 开头）")}`,
  });
  if (clack.isCancel(apiKey) || !apiKey) {
    clack.cancel(dim("已取消"));
    process.exit(0);
  }

  // Validate key format
  if (!(apiKey as string).startsWith("fch_")) {
    clack.log.warn(`${yellow("⚠")} API Key 通常以 fch_ 开头，请确认是否正确`);
    const confirm = await clack.select({
      message: `${dim("仍然继续？")}`,
      options: [
        { value: "yes", label: "继续使用这个 Key" },
        { value: "no", label: "重新输入" },
      ],
    });
    if (clack.isCancel(confirm) || confirm === "no") {
      clack.cancel(dim("已取消"));
      process.exit(0);
    }
  }

  // ── Step 3.5: DeepAgent API Key（可选） ──
  let deepagentApiKey: string | undefined;
  if ((toolGroups as string[]).includes("deepagent")) {
    clack.log.step(`${cyan("Step 3.5")} DeepAgent API Key ${dim("（可选 · 启用 AI 研究与策略生成）")}`);
    clack.log.info(`${dim("DeepAgent 独立于 Hub，使用不同的 API Key。")}`);
    const dpInput = await clack.password({
      message: `${dim("粘贴 DeepAgent API Key（回车跳过）")}`,
    });
    if (clack.isCancel(dpInput)) {
      clack.cancel(dim("已取消"));
      process.exit(0);
    }
    const dp = (dpInput as string).trim();
    if (dp.length > 0) {
      deepagentApiKey = dp;
      clack.log.success(`${green("✔")} DeepAgent Key 已接受`);
    } else {
      clack.log.info(
        dim(
          "已跳过 — 仅 fin_deepagent_health / fin_deepagent_skills 可用；其他 deepagent 工具会提示配置 Key。",
        ),
      );
    }
  }

  // ── Step 4: Write configs ──
  clack.log.step(`${cyan("Step 4")} 写入配置文件`);

  const entry = buildMcpEntry(toolGroups as string[], apiKey as string, deepagentApiKey);
  let successCount = 0;

  for (const pv of platforms as string[]) {
    const platform = PLATFORMS.find((p) => p.value === pv);
    if (!platform) continue;
    try {
      const writtenPath =
        platform.format === "yaml"
          ? writeYamlConfig(platform, entry)
          : writeJsonConfig(platform, entry);
      clack.log.success(formatPathWrite(platform.label, writtenPath));
      successCount++;
    } catch (err) {
      clack.log.error(
        `${red("✖")} ${platform.label} 写入失败: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  try {
    const userConfigPath = writeUserConfigFile(apiKey as string, deepagentApiKey);
    clack.log.success(
      `${green("✔")} ${bold("CLI 配置已保存")}  ${dim("→")}  ${cyan(userConfigPath)} ${dim("（终端可直接运行 openfinclaw，无需 export）")}`,
    );
  } catch (err) {
    clack.log.warn(
      `${yellow("⚠")} 写入 ~/.openfinclaw/config.json 失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── Summary ──
  const s = clack.spinner();
  s.start(`${dim("验证配置...")}`);
  await new Promise((r) => setTimeout(r, 800));
  s.stop(`${green("✔")} ${bold(`${successCount} 个平台`)} 配置完成`);

  clack.outro(
    [
      `${bold("Next")} ${dim("→")} 试试在你的 Agent 中说：${cyan("“查询 AAPL 的价格”")}`,
      "",
      `${dim("Docs")}     ${cyan("https://github.com/mirror29/openfinclaw-cli")}`,
      `${dim("API Key")}   ${cyan("https://hub.openfinclaw.ai")}`,
    ].join("\n"),
  );
}

// ─── Fallback (no @clack/prompts) ────────────────────────────────────

function runBasicInit() {
  console.log("OpenFinClaw MCP Server — Basic Setup\n");
  console.log(
    "Set the OPENFINCLAW_API_KEY environment variable, then add this to your agent's MCP config:\n",
  );
  console.log(
    JSON.stringify(
      {
        mcpServers: {
          openfinclaw: {
            command: "npx",
            args: ["@openfinclaw/cli", "serve"],
            env: { OPENFINCLAW_API_KEY: "<your-key>" },
          },
        },
      },
      null,
      2,
    ),
  );
}
