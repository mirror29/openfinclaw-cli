/**
 * Interactive setup wizard — configures MCP on multiple agent platforms.
 * @module @openfinclaw/cli/init
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

interface PlatformDef {
  value: string;
  label: string;
  configPath: string;
  format: "json" | "yaml";
  mcpKey: string;
}

const PLATFORMS: PlatformDef[] = [
  { value: "claude-code", label: "Claude Code", configPath: "~/.claude/settings.json", format: "json", mcpKey: "mcpServers" },
  { value: "claude-desktop", label: "Claude Desktop", configPath: "~/Library/Application Support/Claude/claude_desktop_config.json", format: "json", mcpKey: "mcpServers" },
  { value: "cursor", label: "Cursor", configPath: ".cursor/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "vscode", label: "VS Code (Copilot)", configPath: ".vscode/mcp.json", format: "json", mcpKey: "servers" },
  { value: "windsurf", label: "Windsurf", configPath: "~/.codeium/windsurf/mcp_config.json", format: "json", mcpKey: "mcpServers" },
  { value: "junie", label: "JetBrains Junie", configPath: "~/.junie/mcp.json", format: "json", mcpKey: "mcpServers" },
  { value: "cline", label: "Cline", configPath: "~/.cline/mcp_settings.json", format: "json", mcpKey: "mcpServers" },
  { value: "codex", label: "Codex (OpenAI)", configPath: "~/.codex/config.json", format: "json", mcpKey: "mcpServers" },
  { value: "opencode", label: "OpenCode", configPath: "~/.opencode/config.json", format: "json", mcpKey: "mcpServers" },
  { value: "hermes", label: "Hermes Agent", configPath: "~/.hermes/config.yaml", format: "yaml", mcpKey: "mcp_servers" },
];

function expandPath(p: string): string {
  return p.startsWith("~") ? join(homedir(), p.slice(1)) : join(process.cwd(), p);
}

function detectPlatforms(): Set<string> {
  const detected = new Set<string>();
  for (const p of PLATFORMS) {
    const fullPath = expandPath(p.configPath);
    const dir = dirname(fullPath);
    if (existsSync(dir) || existsSync(fullPath)) {
      detected.add(p.value);
    }
  }
  return detected;
}

function buildMcpEntry(toolGroups: string[], apiKey: string) {
  const args = ["@openfinclaw/cli", "serve"];
  if (toolGroups.length < 4) {
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

  if (content.includes("mcp_servers:")) {
    content = content.replace("mcp_servers:", "mcp_servers:\n" + insertBlock);
  } else {
    content += `\nmcp_servers:\n${insertBlock}`;
  }

  writeFileSync(fullPath, content);
  return fullPath;
}

export async function runInit() {
  let clack: typeof import("@clack/prompts");
  try {
    clack = await import("@clack/prompts");
  } catch {
    console.error("@clack/prompts not found. Running in basic mode.\n");
    runBasicInit();
    return;
  }

  clack.intro("OpenFinClaw MCP Server 配置向导");

  const apiKey = await clack.password({ message: "请输入 API Key (fch_ 开头):" });
  if (clack.isCancel(apiKey) || !apiKey) {
    clack.cancel("已取消");
    process.exit(0);
  }

  const toolGroups = await clack.multiselect({
    message: "选择要启用的工具组:",
    options: [
      { value: "datahub", label: "datahub", hint: "行情数据（价格/K线/加密/对比/搜索）" },
      { value: "strategy", label: "strategy", hint: "策略管理（发布/验证/Fork/排行榜）" },
      { value: "scheduler", label: "scheduler", hint: "定时任务（每日扫描/价格监控/报告）" },
      { value: "tournament", label: "tournament", hint: "竞赛（选策略/排行榜/结果）" },
    ],
    initialValues: ["datahub", "strategy"],
  });
  if (clack.isCancel(toolGroups)) {
    clack.cancel("已取消");
    process.exit(0);
  }

  const detected = detectPlatforms();
  const platforms = await clack.multiselect({
    message: "选择要配置的平台:",
    options: PLATFORMS.map((p) => ({
      value: p.value,
      label: p.label,
      hint: detected.has(p.value) ? "已检测到" : undefined,
    })),
    initialValues: [...detected],
  });
  if (clack.isCancel(platforms)) {
    clack.cancel("已取消");
    process.exit(0);
  }

  const entry = buildMcpEntry(toolGroups as string[], apiKey as string);
  for (const pv of platforms as string[]) {
    const platform = PLATFORMS.find((p) => p.value === pv);
    if (!platform) continue;
    try {
      const writtenPath =
        platform.format === "yaml"
          ? writeYamlConfig(platform, entry)
          : writeJsonConfig(platform, entry);
      clack.log.success(`已写入 ${writtenPath} (${platform.label})`);
    } catch (err) {
      clack.log.error(
        `写入 ${platform.label} 配置失败: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  clack.outro("完成！试试在你的 Agent 中说：「查询 AAPL 的价格」");
}

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
