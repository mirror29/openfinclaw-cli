# OpenFinClaw CLI — Repository Guidelines

## Project Structure

- Monorepo with pnpm workspaces
- `packages/core/` — `@openfinclaw/core`: Platform-independent business logic (API clients, types, schemas). Zero framework dependencies.
- `packages/cli/` — `@openfinclaw/cli`: MCP Server + CLI + interactive init wizard. Depends on `@modelcontextprotocol/sdk` and `@clack/prompts`.
- `configs/` — Example MCP configuration files for various agent platforms.

## Build & Development

- Runtime: Node 18+
- Install: `pnpm install`
- Build: `pnpm build` (runs `tsc` in both packages, core first)
- Core `tsconfig.json` excludes `src/**/__tests__/**` so tests are not emitted into `dist/` (smaller npm tarball); Vitest still runs `*.test.ts` from source.
- Run CLI: `OPENFINCLAW_API_KEY=<your-hub-key> node packages/cli/dist/index.js <command>`
- Run MCP: `OPENFINCLAW_API_KEY=<your-hub-key> node packages/cli/dist/index.js serve`
- 启用 DeepAgent 工具组时额外传入：`OPENFINCLAW_DEEPAGENT_API_KEY=<your-deepagent-key>`

## API Key Safety

- **永远不要把真实 API Key 写进仓库里**（代码、测试、Markdown、提交说明、issue、PR 描述都不行）。示例和文档统一使用占位符：`fch_xxx`、`<your-hub-key>`、`<your-deepagent-key>`。
- **两把独立的 Key**：
  - `OPENFINCLAW_API_KEY` — Hub + DataHub（`fch_` 前缀，`Authorization: Bearer` 鉴权）
  - `OPENFINCLAW_DEEPAGENT_API_KEY` — DeepAgent（服务端独立鉴权，走 `X-API-Key` header）
- **用户层持久化**：`~/.openfinclaw/config.json`（由 `openfinclaw init` 写入；Unix 自动 `chmod 600`）。字段：`apiKey` / `deepagentApiKey`。
- **MCP 子进程层**：各 agent 平台配置文件里的 `env` 字段（由 `init` 写入；例 `~/Library/Application Support/Claude/claude_desktop_config.json`）。
- 提交代码前检查：`git diff` 不应出现任何像 key 的字符串（`fch_[0-9a-f]{32,}`、`[0-9a-f]{12,}` 等）。
- `doctor` 命令打印 Key 时只显示前 8 位 + `…`，生产行为应当与之保持一致；新代码打印/日志 Key 时务必截断。

## Architecture Principles

- **Core is platform-agnostic**: No OpenClaw, MCP, or agent framework imports in `@openfinclaw/core`. All tool logic is exported as pure functions + JSON schemas.
- **CLI is a thin adapter**: `@openfinclaw/cli` wraps core functions with MCP SDK (Zod schemas) and CLI formatting. Keep it minimal.
- **Config via injection**: Core functions accept `OpenFinClawConfig` interface. Resolution lives in `resolveOpenFinClawConfig()` / `resolveConfigFromEnv()`:
  - Hub key: `--api-key` (CLI) → `OPENFINCLAW_API_KEY` → `~/.openfinclaw/config.json#apiKey`
  - DeepAgent key: `--deepagent-api-key` → `OPENFINCLAW_DEEPAGENT_API_KEY` / `FINDOO_DEEPAGENT_API_KEY` → `~/.openfinclaw/config.json#deepagentApiKey`
  - Override config file path with `OPENFINCLAW_CONFIG_PATH`。
- **Independent auth surfaces**: Hub 和 DeepAgent 服务端是两套鉴权系统。不要假设一把 Key 两处通用；任何 DeepAgent API 调用必须走 `deepagentApiRequest()` 并用 `X-API-Key`。
- **Long-running LLM tools**: 远端 Agent 类长耗时操作采用 submit/poll/finalize 三段式（cross-platform-safe，见 `deepagent/tools.ts` 的 `research_submit` / `research_poll` / `research_finalize`）。**不要**试图在单次 MCP tool call 内阻塞等待 LLM 全部完成 —— MCP 客户端会超时或缓冲。
- **CLI ≠ MCP for streaming**: 终端命令（如 `deepagent research`）可以直接消费 SSE 流做真正 token-by-token 渲染（`process.stdout.write`）；MCP 路径则必须回落到 submit/poll。

## Tool Groups

Tools are organized into 3 groups that can be loaded independently via `--tools=` flag:
- `datahub` — 5 market data tools (fin_price, fin_kline, fin_crypto, fin_compare, fin_slim_search)
- `strategy` — 7 strategy management tools (skill_publish, skill_validate, skill_fork, skill_leaderboard, skill_get_info, skill_list_local, skill_publish_verify)
- `deepagent` — 14 远端 AI Agent 工具 (fin_deepagent_health / _skills / _threads / _messages / _research_submit / _research_poll / _research_finalize / _status / _cancel / _backtests / _backtest_result / _packages / _package_meta / _download_package)

未传 `--tools=` 时三组全部加载。示例：`--tools=datahub,deepagent` 只加载其中两组。

### DeepAgent 子模块结构（`packages/core/src/deepagent/`）

- `types.ts` — REST 响应 + 7 种 SSE 事件 + `DeepAgentTaskState` 类型
- `client.ts` — `deepagentApiRequest()` (X-API-Key) + `parseDeepAgentSSE()` async generator + 进程内任务态 store (`getDeepAgentTask / listDeepAgentTasks / clearDeepAgentTask`) + `startDeepAgentRun()`（submit 后后台消费 SSE 更新 store）
- `tools.ts` — 14 个 execute 函数 + JSON schemas；研究类走 submit/poll/finalize，其余同步调用

### 设计备注

- **进程级任务 store**：仅保留在 MCP server 进程内存里，进程重启即丢失。DeepAgent 服务端自己持久化 thread/run，CLI 侧不做 SQLite。
- **Paper Engine** 暂未接入。它是独立 API（`api.openfinclaw.ai/engine`）+ 第三套 Key（`OPENFINCLAW_PAPER_API_KEY`，尚未定义）。如要接入，遵循 deepagent 同样模式新建 `packages/core/src/paper/`，并扩展 `OpenFinClawConfig`。

## Adding New Tools

1. Add pure execute function + schema in `packages/core/src/<group>/tools.ts`（`<group>` 可以是 `datahub` / `strategy` / `deepagent` 或新的子目录）
2. Export from `packages/core/src/index.ts`
3. Register MCP tool via `McpServer.registerTool()` (Zod `inputSchema` in the config object) in `packages/cli/src/mcp.ts`，放入对应的 `if (groups.includes("<group>"))` 分支
4. Optionally add CLI command in `packages/cli/src/cli.ts`，复用 `styles.ts` 里的美化 helper
5. 新增 tool group 时同步更新：`mcp.ts` 的 `ALL_GROUPS` / `init.ts` 向导的 Step 2 选项 / CLI `--help` / 本文件 Tool Groups 列表

## Testing

- Framework: Vitest
- Test files: colocated in `packages/core/src/__tests__/*.test.ts`
- Run tests: `npx vitest run packages/core/src/__tests__/`
- Run with live API: `OPENFINCLAW_API_KEY=<your-hub-key> npx vitest run packages/core/src/__tests__/`

### Test categories

1. **Unit tests** (always run, no API key needed):
   - `config.test.ts` — config resolution, defaults, env var parsing, edge cases
   - `datahub-client.test.ts` — `guessMarket()` symbol detection logic
   - `datahub-tools.test.ts` — JSON schema structure validation for datahub tools
   - `strategy-tools.test.ts` — JSON schema structure validation for strategy tools
   - `strategy-storage.test.ts` — `parseStrategyId()`, `formatDate()`, `generateForkDirName()` utilities

2. **Live API tests** (skipped unless `OPENFINCLAW_API_KEY` env var is set):
   - `live.test.ts` — real Hub API calls (leaderboard fetch, board type filtering)

### Test conventions

- Test tool schemas by checking `required`, `properties`, and `enum` values — not by invoking execute functions with mocked HTTP.
- For pure utility functions (`guessMarket`, `parseStrategyId`, `formatDate`), test all edge cases.
- Live tests use `describe.skipIf(!HAS_KEY)` to skip gracefully when no API key is set.
- **Do NOT hardcode API keys in test files** — always read from `process.env.OPENFINCLAW_API_KEY` / `process.env.OPENFINCLAW_DEEPAGENT_API_KEY`. 同理：快照 / fixture / 日志文件里也不可留真实 key。
- Each test file should be self-contained — no shared mutable state between files.
- Clean up env vars in `afterEach` when tests modify `process.env`.

### Adding tests for new tools

1. Add schema validation test in `packages/core/src/__tests__/<group>-tools.test.ts`
2. If the tool has pure utility functions, add unit tests for those
3. If the tool calls an API, add a live test in `live.test.ts` guarded by `describe.skipIf(!HAS_KEY)`
4. Run `npx vitest run packages/core/src/__tests__/` to verify

## Publishing

- **Always use `pnpm publish`**，不要用 `npm publish`。pnpm 会自动将 `workspace:*` 替换为实际版本号。
- **版本号**：根目录 `package.json` 的 `version` 为仓库统一版本；`@openfinclaw/core` 与 `@openfinclaw/cli` 的 `version` 须与其一致。修改根目录版本后运行 `pnpm sync-versions` 写回各包（或手动同步三者）。
- 发布顺序：先 `packages/core`，再 `packages/cli`（cli 依赖 core）。
- 发布前确保 `pnpm build` 通过。
- 每次 bump 版本后才能发布，不允许覆盖已发布版本。
- 发布后用 `npx @openfinclaw/cli@<version> --help` 验证安装是否正常。

### pnpm workspace 协议

- 本地开发时，`packages/cli/package.json` 中对 core 的依赖使用 `"@openfinclaw/core": "workspace:*"`。
- `pnpm publish` 会自动将 `workspace:*` 替换为实际版本号（如 `^0.2.3`）。
- 如果使用 `npm publish`，`workspace:*` 不会被替换，导致用户安装时报 `EUNSUPPORTEDPROTOCOL`。

## Coding Style

- TypeScript ESM (`.js` extensions in imports)
- Strict mode enabled
- JSDoc comments on modules and exports
- JSON Schema objects in core (not Zod — Zod is CLI-only for MCP SDK)
