/**
 * Interactive setup wizard — configures MCP on multiple agent platforms.
 * @module @openfinclaw/cli/init
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { getUserConfigFilePath } from "@openfinclaw/core";

// ─── Platform Definitions ───────────────────────────────────────────

interface PlatformDef {
  value: string;
  label: string;
  hint?: string;
  configPath: string;
  format: "json" | "yaml";
  mcpKey: string;
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
  { value: "opencode", label: "OpenCode", hint: "开源终端 AI", configPath: "~/.opencode/config.json", format: "json", mcpKey: "mcpServers" },
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
  if (info.installed) parts.push("已安装");
  if (info.hasConfig) parts.push("已有 MCP 配置");
  return `✓ ${parts.join(" · ")}`;
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

function buildMcpEntry(toolGroups: string[], apiKey: string) {
  const args = ["@openfinclaw/cli", "serve"];
  /** When both groups are selected, omit --tools (same as serve default). */
  if (toolGroups.length > 0 && toolGroups.length < 2) {
    args.push(`--tools=${toolGroups.join(",")}`);
  }
  return { command: "npx", args, env: { OPENFINCLAW_API_KEY: apiKey } };
}

function writeJsonConfig(platform: PlatformDef, entry: object) {
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
  mcpSection["openfinclaw"] = entry;
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

  const insertBlock = `  openfinclaw:\n    command: "${entry.command}"\n    args: ${JSON.stringify(entry.args)}\n    env:\n      OPENFINCLAW_API_KEY: "${entry.env.OPENFINCLAW_API_KEY}"\n`;

  content = content.replace(/\n  openfinclaw:\n(?:    [^\n]*\n)*/g, "");

  if (content.includes("mcp_servers:")) {
    content = content.replace("mcp_servers:", "mcp_servers:\n" + insertBlock);
  } else {
    content += `\nmcp_servers:\n${insertBlock}`;
  }

  writeFileSync(fullPath, content);
  return fullPath;
}

/**
 * Persist API key to `~/.openfinclaw/config.json` so terminal `openfinclaw` works without `export`.
 * Unix: chmod 600 on the file.
 * @param apiKey - Hub API key
 * @returns Written file path
 */
function writeUserConfigFile(apiKey: string): string {
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

  clack.intro("OpenFinClaw 配置向导");

  // ── Step 1: Select platforms ──
  clack.log.step("选择要配置的 AI Agent 平台");
  const platformStates = detectPlatformStates();
  const detected = selectDetectedPlatforms(platformStates);

  const platforms = await clack.multiselect({
    message:
      "结合本机安装痕迹与 MCP 配置文件自动勾选（空格选择，回车确认）",
    options: PLATFORMS.map((p) => ({
      value: p.value,
      label: p.label,
      hint: formatDetectHint(p, platformStates.get(p.value) ?? { hasConfig: false, installed: false }),
    })),
    initialValues: [...detected],
  });
  if (clack.isCancel(platforms) || (platforms as string[]).length === 0) {
    clack.cancel("已取消");
    process.exit(0);
  }

  // ── Step 2: Select tool groups ──
  clack.log.step("选择要启用的工具组");

  const toolGroups = await clack.multiselect({
    message: "按需选择，减少不必要的 Token 消耗",
    options: [
      { value: "datahub", label: "📊 datahub", hint: "行情数据 — 价格/K线/加密/对比/搜索 (~700 tokens)" },
      { value: "strategy", label: "🧠 strategy", hint: "策略管理 — 发布/验证/Fork/排行榜 (~1,000 tokens)" },
    ],
    initialValues: ["datahub", "strategy"],
  });
  if (clack.isCancel(toolGroups)) {
    clack.cancel("已取消");
    process.exit(0);
  }

  // ── Step 3: Enter API Key ──
  clack.log.step("输入 API Key");

  // Show where to get the key
  clack.log.info("还没有 API Key? 免费获取: https://hub.openfinclaw.ai");

  const apiKey = await clack.password({
    message: "请输入 API Key (fch_ 开头):",
  });
  if (clack.isCancel(apiKey) || !apiKey) {
    clack.cancel("已取消");
    process.exit(0);
  }

  // Validate key format
  if (!(apiKey as string).startsWith("fch_")) {
    clack.log.warn("API Key 应以 fch_ 开头，请确认是否正确");
    const confirm = await clack.select({
      message: "仍然继续?",
      options: [
        { value: "yes", label: "继续使用这个 Key" },
        { value: "no", label: "重新输入" },
      ],
    });
    if (clack.isCancel(confirm) || confirm === "no") {
      clack.cancel("已取消");
      process.exit(0);
    }
  }

  // ── Step 4: Write configs ──
  clack.log.step("正在写入配置文件...");

  const entry = buildMcpEntry(toolGroups as string[], apiKey as string);
  let successCount = 0;

  for (const pv of platforms as string[]) {
    const platform = PLATFORMS.find((p) => p.value === pv);
    if (!platform) continue;
    try {
      const writtenPath =
        platform.format === "yaml"
          ? writeYamlConfig(platform, entry)
          : writeJsonConfig(platform, entry);
      clack.log.success(`${platform.label}  →  ${writtenPath}`);
      successCount++;
    } catch (err) {
      clack.log.error(
        `${platform.label} 写入失败: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  try {
    const userConfigPath = writeUserConfigFile(apiKey as string);
    clack.log.success(`CLI 配置已保存  →  ${userConfigPath}（终端可直接运行 openfinclaw，无需 export）`);
  } catch (err) {
    clack.log.warn(
      `写入 ~/.openfinclaw/config.json 失败: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── Summary ──
  const s = clack.spinner();
  s.start("验证配置...");
  await new Promise((r) => setTimeout(r, 800));
  s.stop(`${successCount} 个平台配置完成`);

  clack.outro(
    "试试在你的 Agent 中说：「查询 AAPL 的价格」\n\n"
    + "  文档: https://github.com/mirror29/openfinclaw-cli\n"
    + "  获取 API Key: https://hub.openfinclaw.ai",
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
