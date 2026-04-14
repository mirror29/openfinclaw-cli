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
- Run CLI: `OPENFINCLAW_API_KEY=fch_xxx node packages/cli/dist/index.js <command>`
- Run MCP: `OPENFINCLAW_API_KEY=fch_xxx node packages/cli/dist/index.js serve`

## Architecture Principles

- **Core is platform-agnostic**: No OpenClaw, MCP, or agent framework imports in `@openfinclaw/core`. All tool logic is exported as pure functions + JSON schemas.
- **CLI is a thin adapter**: `@openfinclaw/cli` wraps core functions with MCP SDK (Zod schemas) and CLI formatting. Keep it minimal.
- **Config via injection**: Core functions accept `OpenFinClawConfig` interface. Environment variable parsing lives in `resolveConfigFromEnv()`.

## Tool Groups

Tools are organized into 4 groups that can be loaded independently via `--tools=` flag:
- `datahub` — 5 market data tools (fin_price, fin_kline, fin_crypto, fin_compare, fin_slim_search)
- `strategy` — 7 strategy management tools (skill_publish, skill_validate, skill_fork, skill_leaderboard, skill_get_info, skill_list_local, skill_publish_verify)
- `scheduler` — 4 scheduled monitoring tools (strategy_daily_scan, strategy_price_monitor, strategy_scan_history, strategy_periodic_report)
- `tournament` — 3 competition tools (tournament_pick, tournament_leaderboard, tournament_result)

## Adding New Tools

1. Add pure execute function + schema in `packages/core/src/<group>/tools.ts`
2. Export from `packages/core/src/index.ts`
3. Register MCP tool with Zod schema in `packages/cli/src/mcp.ts`
4. Optionally add CLI command in `packages/cli/src/cli.ts`

## Testing

- Framework: Vitest
- Test files: colocated in `packages/core/src/__tests__/*.test.ts`
- Run tests: `npx vitest run packages/core/src/__tests__/`
- Run with live API: `OPENFINCLAW_API_KEY=fch_xxx npx vitest run packages/core/src/__tests__/`

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
- Do NOT hardcode API keys in test files. Always read from `process.env.OPENFINCLAW_API_KEY`.
- Each test file should be self-contained — no shared mutable state between files.
- Clean up env vars in `afterEach` when tests modify `process.env`.

### Adding tests for new tools

1. Add schema validation test in `packages/core/src/__tests__/<group>-tools.test.ts`
2. If the tool has pure utility functions, add unit tests for those
3. If the tool calls an API, add a live test in `live.test.ts` guarded by `describe.skipIf(!HAS_KEY)`
4. Run `npx vitest run packages/core/src/__tests__/` to verify

## Coding Style

- TypeScript ESM (`.js` extensions in imports)
- Strict mode enabled
- JSDoc comments on modules and exports
- JSON Schema objects in core (not Zod — Zod is CLI-only for MCP SDK)
