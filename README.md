<div align="center">

**[English](README.md)** | **[中文](README.zh-CN.md)**

<img src="imgs/logo.svg" alt="OpenFinClaw" width="680">

### Your quant research team, in one prompt.

Research · strategy · backtest · paper trade — ship a complete quant workflow from a single natural-language prompt, inside Claude Code, Cursor, and 20+ AI agents.

[![npm](https://img.shields.io/npm/v/@openfinclaw/cli)](https://www.npmjs.com/package/@openfinclaw/cli) [![npm downloads](https://img.shields.io/npm/dw/@openfinclaw/cli)](https://www.npmjs.com/package/@openfinclaw/cli) [![MCP compatible](https://img.shields.io/badge/MCP-compatible-8A2BE2)](https://modelcontextprotocol.io) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

### 🚀 [Try it in 60 seconds — zero install](https://hub.openfinclaw.ai/en/chat)

Run a full research → strategy → backtest loop in your browser. No install, no API key, real market data.

[Quick Start](#quick-start) · [Example Prompts](#example-prompts) · [Community](#community-leaderboard--fork--publish) · [Platforms](#supported-platforms) · [vs. other tools](COMPARISON.md)

</div>

---

## What you get

| | |
|---|---|
| 🧠 **DeepAgent analysis skills** | **60+** built-in — technical · fundamental · sentiment · risk · timing · factor |
| 🌍 **Markets covered** | **5** — US equities · A-shares · HK · Crypto · Forex |
| 🤖 **Works with** | **20+** AI platforms — Claude Code · Cursor · VS Code · Hermes · Windsurf · Codex … |
| 🔄 **End-to-end flow** | research → strategy → backtest → paper trade → publish to the leaderboard |
| ⚡ **How you interact** | streaming token-by-token in the terminal · MCP tool calls · in-browser playground |

<p align="center">
  <img src="imgs/deepagent-backtest-metrics.png" alt="DeepAgent backtest result — Tesla Bollinger Bands" width="620">
  <br/>
  <sub><em>Live output from <code>openfinclaw deepagent research</code> — one prompt: research → strategy → backtest → metrics.</em></sub>
</p>

---

## Example Prompts

Copy-paste any of these into `openfinclaw deepagent research "…"` (or drop them straight into your AI agent). Each one runs the full research → strategy → backtest loop.

**📈 Technical analysis**
- `Find RSI divergence signals on NVDA in the last 6 months, then backtest them.`
- `Compare a Bollinger Bands strategy on TSLA vs AAPL over 1 year — which wins?`
- `Screen the S&P 500 for golden-cross signals this month.`

**📊 Fundamentals & macro**
- `Pull Apple's last 8 quarters of revenue, margins, and guidance. Summarize the trend.`
- `What's driving the NVDA move this quarter — earnings, guidance, or narrative?`
- `Compare AMD / INTC / NVDA on growth, margin, and valuation.`

**🎯 Strategy generation**
- `Design a momentum strategy on US mega-cap tech. Backtest 2y. Tell me where it breaks.`
- `Write a mean-reversion strategy on BTC and show drawdown behavior through 2022.`
- `A-shares 沪深 300 日内轮动策略，年化目标 15%，最大回撤 < 10%。`

**🧪 Backtest & stress-test**
- `Backtest a 50/200 SMA crossover on SPY from 2015. Include costs and slippage.`
- `Stress-test my forked strategy against the 2020 and 2022 crashes.`

> Want a ready-made one? Run `openfinclaw leaderboard` to browse the community's highest-ranked strategies, then `fork` any of them.

---

## Quick Start

> 💡 Want to see it in action before installing? **[Try DeepAgent in your browser](https://hub.openfinclaw.ai/en/chat)** first.

### 60-second onboarding

```bash
npx @openfinclaw/cli@latest install               # wizard + MCP configs + Skill registration + doctor
openfinclaw deepagent +research "盘点 BTC 周线"     # streaming research / strategy / backtest
```

`install` runs the interactive wizard, writes MCP configs to every detected AI agent, persists your `fch_` key to `~/.openfinclaw/config.json` (chmod 600 on Unix), drops a `SKILL.md` under `~/.claude/skills/openfinclaw/` so Claude Code / Cursor auto-trigger on keywords like `quant` / `backtest` / `量化`, and finishes with a connectivity check.

Non-interactive / CI:

```bash
npx @openfinclaw/cli@latest install --yes \
  --platforms cursor,claude-code --tool-groups deepagent,strategy \
  --api-key fch_xxx --register-skill
```

Just the wizard, no SKILL.md registration, no doctor: `npx @openfinclaw/cli init`.

### CLI quick reference

A single `fch_` key drives both DeepAgent and the strategy group. Resolution order: `--api-key` → `OPENFINCLAW_API_KEY` → `~/.openfinclaw/config.json`.

| Group | Commands |
|-------|----------|
| DeepAgent | `deepagent +research "<query>"`, `deepagent health`, `deepagent skills`, `deepagent threads`, `deepagent messages`, `deepagent backtests`, `deepagent packages`, `deepagent download` |
| Strategy | `leaderboard`, `strategy-info`, `fork`, `list-strategies`, `validate`, `publish`, `publish-verify` |
| Raw | `api GET <path>` · `api POST <path> --json '<body>'` — direct Hub Gateway call, auth pre-attached |
| System | `install` · `init` · `skill-install` · `serve` · `doctor` · `update` · `examples` |

`+verb` (e.g. `deepagent +research`) is the human-friendly streaming path; the bare verbs and MCP-only atomic triplet `research_submit / research_poll / research_finalize` are for agents/scripts. Run `openfinclaw --help` for the full surface.

**Sample DeepAgent output** — one prompt → strategy definition + backtest metrics + per-trade P&L + improvement notes:

<p align="center">
  <img src="imgs/deepagent-backtest-metrics.png" alt="DeepAgent — strategy definition & performance metrics" width="49%" />
  <img src="imgs/deepagent-backtest-trades.png" alt="DeepAgent — trades, conclusions & optimization suggestions" width="49%" />
</p>

---

## Community: leaderboard → fork → publish

OpenFinClaw ships with a community strategy exchange. Browse what others are running, copy any strategy locally, tweak it, and publish back — think of it as a Hugging Face for quant strategies.

```bash
openfinclaw leaderboard --limit 20          # Browse top-ranked strategies
openfinclaw strategy-info <id>              # See how a strategy performs
openfinclaw fork <id>                       # Copy to ./strategies/<slug>
# ... edit strategy.py, tweak fep.yaml ...
openfinclaw validate ./strategies/<slug>    # Pre-flight FEP v2.0 check
openfinclaw publish ./my-strategy.zip       # Ship to the leaderboard
openfinclaw publish-verify --submission-id <id>   # Track backtest progress
```

Every published strategy is backtested server-side and ranked by live-market-equivalent returns — no self-reported numbers.

---

## Supported Platforms

OpenFinClaw works with any MCP-compatible agent platform:

| Category | Platforms |
|----------|-----------|
| **Chat** | Claude Desktop, Claude.ai, ChatGPT, Chatbox, LM Studio |
| **IDEs** | Claude Code, VS Code (Copilot), Cursor, Windsurf, JetBrains Junie, Zed, Cline, Continue.dev |
| **CLI Agents** | Codex (OpenAI), OpenCode, Amazon Q CLI |
| **Frameworks** | Hermes Agent, BeeAI, Swarms |
| **AI Agents** | OpenClaw, NanoClaw |
| **Other** | v0 (Vercel), Postman, Roo Code, Amp (Sourcegraph) |

### Platform Config Examples

<details>
<summary><b>Claude Code</b> — <code>~/.claude/settings.json</code></summary>

```json
{
  "mcpServers": {
    "openfinclaw": {
      "command": "npx",
      "args": ["@openfinclaw/cli", "serve", "--tools=deepagent,strategy"],
      "env": {
        "OPENFINCLAW_API_KEY": "fch_xxx"
      }
    }
  }
}
```
</details>

<details>
<summary><b>Cursor</b> — <code>.cursor/mcp.json</code></summary>

```json
{
  "mcpServers": {
    "openfinclaw": {
      "command": "npx",
      "args": ["@openfinclaw/cli", "serve", "--tools=deepagent,strategy"],
      "env": {
        "OPENFINCLAW_API_KEY": "fch_xxx"
      }
    }
  }
}
```
</details>

For other platforms (VS Code, Hermes, Windsurf, Zed, OpenClaw, Junie, Trae, …), see [`configs/`](configs/) for ready-to-copy templates. The shape is the same — only the host key (`servers` vs `mcpServers` vs `context_servers`) and config path differ.

---

## Tool Groups & Context Optimization

Load only what you need to save tokens: `serve --tools=deepagent` (~1,400 tk) or `serve --tools=strategy` (~1,000 tk), or omit `--tools` for both.

| Group | Tools |
|-------|-------|
| `deepagent` | 14 remote-agent tools — `fin_deepagent_health` / `_skills` / `_research_submit` / `_research_poll` / `_research_finalize` / `_status` / `_cancel` / `_threads` / `_messages` / `_backtests` / `_backtest_result` / `_packages` / `_package_meta` / `_download_package` |
| `strategy` | 7 local FEP v2.0 tools — `strategy_publish` / `strategy_validate` / `strategy_fork` / `strategy_leaderboard` / `strategy_get_info` / `strategy_list_local` / `strategy_publish_verify` |

---

## Environment Variables

Only one is required:

| Variable | Description |
|----------|-------------|
| `OPENFINCLAW_API_KEY` | Unified `fch_` key. Drives both strategy (Hub) and deepagent (Hub Gateway). Falls back to `~/.openfinclaw/config.json` if unset. Get a key at [hub.openfinclaw.ai](https://hub.openfinclaw.ai). |

Advanced overrides (rarely needed): `OPENFINCLAW_CONFIG_PATH`, `HUB_API_URL`, `DEEPAGENT_API_URL`, `REQUEST_TIMEOUT_MS`, `DEEPAGENT_SSE_TIMEOUT_MS` — see `packages/core/src/config.ts`.

---

## Development

```bash
git clone https://github.com/mirror29/openfinclaw-cli.git && cd openfinclaw-cli && pnpm install && pnpm build
OPENFINCLAW_API_KEY=<fch_...> node packages/cli/dist/index.js doctor   # smoke test
```

Monorepo: `@openfinclaw/core` (zero-dep business logic) + `@openfinclaw/cli` (MCP server + terminal CLI + install wizard).

---

## License

MIT
