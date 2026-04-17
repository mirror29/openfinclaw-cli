# @openfinclaw/core

**Platform-independent financial tools core** — API clients, type definitions, and tool schemas for OpenFinClaw. Zero framework dependencies.

[![npm](https://img.shields.io/npm/v/@openfinclaw/core)](https://www.npmjs.com/package/@openfinclaw/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/mirror29/openfinclaw-cli/blob/main/LICENSE)

This is the **library core** used by [`@openfinclaw/cli`](https://www.npmjs.com/package/@openfinclaw/cli) (the MCP Server + CLI). Install this directly only if you are building your own MCP wrapper, custom agent integration, or calling the OpenFinClaw Hub / DataHub / DeepAgent APIs from code.

👉 **For most users, install [`@openfinclaw/cli`](https://www.npmjs.com/package/@openfinclaw/cli) instead.**

---

## Install

```bash
npm install @openfinclaw/core
# or
pnpm add @openfinclaw/core
```

Node 18+ (ESM only). TypeScript types are bundled.

---

## What's inside

Three independent tool groups, all exported as **pure functions + JSON schemas**. Bring your own MCP SDK / agent framework.

| Group | Tools | Auth |
|---|---|---|
| **DataHub** (market data) | `fin_price` · `fin_kline` · `fin_crypto` · `fin_compare` · `fin_slim_search` | Hub Bearer token |
| **Strategy** (Hub management) | `skill_publish` · `skill_validate` · `skill_fork` · `skill_leaderboard` · `skill_get_info` · `skill_list_local` · `skill_publish_verify` | Hub Bearer token |
| **DeepAgent** (remote AI agent) | `fin_deepagent_health` · `_skills` · `_threads` · `_messages` · `_research_submit` · `_research_poll` · `_research_finalize` · `_status` · `_cancel` · `_backtests` · `_backtest_result` · `_packages` · `_package_meta` · `_download_package` | DeepAgent `X-API-Key` |

---

## Quick example

```ts
import { resolveOpenFinClawConfig, executeFinPrice } from "@openfinclaw/core";

const config = resolveOpenFinClawConfig({ apiKey: process.env.OPENFINCLAW_API_KEY });

const result = await executeFinPrice({ symbol: "BTC/USDT" }, config);
console.log(result); // { symbol: "BTC/USDT", market: "crypto", price: ..., timestamp: ... }
```

Every tool follows the same signature:

```ts
execute<ToolName>(params: Params, config: OpenFinClawConfig): Promise<Result>
```

Each tool also ships a paired JSON schema (e.g. `finPriceSchema`) for wiring into any MCP SDK, OpenAI function-calling, or custom validation layer:

```ts
import { finPriceSchema } from "@openfinclaw/core";

// finPriceSchema = { type: "object", properties: { symbol: {...}, market: {...} }, required: ["symbol"] }
```

---

## Configuration

```ts
import { resolveOpenFinClawConfig, type OpenFinClawConfig } from "@openfinclaw/core";

const config: OpenFinClawConfig = resolveOpenFinClawConfig({
  apiKey: "<your-hub-key>",           // optional; falls back to env / config file
  deepagentApiKey: "<your-deepagent-key>", // optional; only if you use DeepAgent tools
});
```

Resolution order (highest priority first):

| Hub key | DeepAgent key |
|---|---|
| `options.apiKey` | `options.deepagentApiKey` |
| `OPENFINCLAW_API_KEY` env | `OPENFINCLAW_DEEPAGENT_API_KEY` env (also accepts legacy `FINDOO_DEEPAGENT_API_KEY`) |
| `~/.openfinclaw/config.json#apiKey` | `~/.openfinclaw/config.json#deepagentApiKey` |

Override config file path with `OPENFINCLAW_CONFIG_PATH`.

---

## DeepAgent streaming (optional)

For terminal-side true token-by-token streaming, use `parseDeepAgentSSE` directly:

```ts
import { parseDeepAgentSSE } from "@openfinclaw/core";

const resp = await fetch(`${config.deepagentApiUrl}/api/threads/${threadId}/runs`, {
  method: "POST",
  headers: { "X-API-Key": config.deepagentApiKey!, "Content-Type": "application/json" },
  body: JSON.stringify({ message: "Analyze BTC trend" }),
});

for await (const event of parseDeepAgentSSE(resp.body!)) {
  if (event.type === "TEXT_DELTA") process.stdout.write(event.data.delta);
}
```

For MCP server contexts (where token-by-token rendering isn't supported by most clients), use the three-step submit/poll/finalize tools instead — they return immediately and let the agent poll for progress.

---

## Public API

```ts
// Configuration
resolveOpenFinClawConfig, resolveConfigFromEnv, resolveDeepAgentApiKey
getUserConfigFilePath, readApiKeyFromConfigFile
OpenFinClawConfig (type)

// DataHub — execute + schema pairs
executeFinPrice, finPriceSchema
executeFinKline, finKlineSchema
executeFinCrypto, finCryptoSchema
executeFinCompare, finCompareSchema
executeFinSlimSearch, finSlimSearchSchema
DataHubClient, guessMarket

// Strategy — execute + schema pairs
executeSkillLeaderboard, skillLeaderboardSchema
executeSkillGetInfo,     skillGetInfoSchema
executeSkillFork,        skillForkSchema
executeSkillListLocal,   skillListLocalSchema
executeSkillValidate,    skillValidateSchema
executeSkillPublish,     skillPublishSchema
executeSkillPublishVerify, skillPublishVerifySchema
forkStrategy, fetchStrategyInfo, listLocalStrategies, validateStrategyPackage
hubApiRequest

// DeepAgent — execute + schema pairs (14 tools)
executeDeepagentHealth / _Skills / _Threads / _Messages
executeDeepagentResearchSubmit / _Poll / _Finalize
executeDeepagentStatus / _Cancel
executeDeepagentBacktests / _BacktestResult
executeDeepagentPackages / _PackageMeta / _DownloadPackage
parseDeepAgentSSE, deepagentApiRequest, startDeepAgentRun
getDeepAgentTask, listDeepAgentTasks, clearDeepAgentTask

// Prompt
OPENFINCLAW_AGENT_GUIDANCE
```

---

## Related

- **[@openfinclaw/cli](https://www.npmjs.com/package/@openfinclaw/cli)** — MCP Server + terminal CLI (the main entrypoint for end users)
- **[GitHub repository](https://github.com/mirror29/openfinclaw-cli)** — source, issues, contribution guide
- **[Hub API Key](https://hub.openfinclaw.ai)** — get your `fch_` key

---

## License

MIT
