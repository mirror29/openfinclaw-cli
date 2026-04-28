# @openfinclaw/core

**Core logic for OpenFinClaw** — DeepAgent client, strategy tools & shared types. Zero framework dependencies.

[![npm](https://img.shields.io/npm/v/@openfinclaw/core)](https://www.npmjs.com/package/@openfinclaw/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/mirror29/openfinclaw-cli/blob/main/LICENSE)

This is the **library core** used by [`@openfinclaw/cli`](https://www.npmjs.com/package/@openfinclaw/cli) (the MCP Server + CLI). Install this directly only if you are building your own MCP wrapper, custom agent integration, or calling the OpenFinClaw DeepAgent / Hub APIs from code.

> 🧪 **Try DeepAgent online first** → <https://hub.openfinclaw.ai/en/chat> — no install required.

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

Two tool groups, both exported as **pure functions + JSON schemas**. Bring your own MCP SDK / agent framework. Both groups share a single `fch_` API key (`Authorization: Bearer fch_...`)—DeepAgent traffic is routed through the Hub Gateway, strategy traffic hits commons-hub directly.

| Group | Tools | Auth |
|---|---|---|
| **DeepAgent** (one-stop quant agent) | `fin_deepagent_health` · `_skills` · `_threads` · `_messages` · `_research_submit` · `_research_poll` · `_research_finalize` · `_status` · `_cancel` · `_backtests` · `_backtest_result` · `_packages` · `_package_meta` · `_download_package` | `Authorization: Bearer fch_...` (Hub Gateway) |
| **Strategy** (advanced local FEP v2.0 workflow) | `skill_publish` · `skill_validate` · `skill_fork` · `skill_leaderboard` · `skill_get_info` · `skill_list_local` · `skill_publish_verify` | `Authorization: Bearer fch_...` (Hub) |

DeepAgent covers market data, analysis, deep reports, strategy generation, backtesting and paper trading — a one-stop quant-trading agent you can reach from any coding assistant via MCP.

---

## Quick example

```ts
import { resolveOpenFinClawConfig, executeDeepagentResearchSubmit } from "@openfinclaw/core";

// Picks up OPENFINCLAW_API_KEY from env / ~/.openfinclaw/config.json automatically.
const config = resolveOpenFinClawConfig();

const { taskId } = await executeDeepagentResearchSubmit(
  { query: "Research NVDA momentum over the last 90 days, propose a strategy, backtest 1y" },
  config,
);
// Then poll with executeDeepagentResearchPoll / finalize with executeDeepagentResearchFinalize
```

Every tool follows the same signature:

```ts
execute<ToolName>(params: Params, config: OpenFinClawConfig): Promise<Result>
```

Each tool also ships a paired JSON schema (e.g. `deepagentResearchSubmitSchema`) for wiring into any MCP SDK, OpenAI function-calling, or custom validation layer.

---

## Configuration

```ts
import { resolveOpenFinClawConfig, type OpenFinClawConfig } from "@openfinclaw/core";

const config: OpenFinClawConfig = resolveOpenFinClawConfig({
  apiKey: "fch_...",          // unified key for both strategy & deepagent
  allowMissingApiKey: true,    // diagnostic mode (used by `doctor`)
});
```

Resolution order (highest priority first):

1. `options.apiKey`
2. `OPENFINCLAW_API_KEY` env
3. `~/.openfinclaw/config.json#apiKey`

Override the config file path with `OPENFINCLAW_CONFIG_PATH`. The DeepAgent base URL defaults to `https://gateway.openfinclaw.ai/api/v1/agent` and can be overridden with `DEEPAGENT_API_URL` for staging.

---

## DeepAgent streaming (optional)

For terminal-side true token-by-token streaming, use `parseDeepAgentSSE` directly:

```ts
import { parseDeepAgentSSE } from "@openfinclaw/core";

const resp = await fetch(`${config.deepagentApiUrl}/threads/${threadId}/runs`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  },
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
resolveOpenFinClawConfig, resolveConfigFromEnv
getUserConfigFilePath, readApiKeyFromConfigFile
OpenFinClawConfig (type)

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
- **[DeepAgent online chat](https://hub.openfinclaw.ai/en/chat)** — try the agent in a browser before installing
- **[Hub API Key](https://hub.openfinclaw.ai)** — get your `fch_` key for the strategy group

---

## License

MIT
