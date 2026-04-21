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

### 1. Interactive Setup (Recommended)

```bash
npx @openfinclaw/cli init
```

The wizard will:
- Ask for your API key(s) — Hub (optional, for strategy group) and/or DeepAgent
- Let you choose which tool groups to enable
- Pre-select platforms when **either** common install markers match (app bundles, user data dirs, CLI on `PATH`) **or** the expected MCP config path already exists — these are not the same as "every app you have installed"
- Write MCP config to each selected platform
- Save `~/.openfinclaw/config.json` so terminal CLI works without `export` (Unix: file mode 600)

**CLI vs MCP:** Agent platforms load the API key from their MCP `env` block. That does **not** change your shell profile. A shell `OPENFINCLAW_API_KEY` / `OPENFINCLAW_DEEPAGENT_API_KEY` is still visible to any process you start in that terminal—this is normal. Resolution order for `openfinclaw` / `serve` is: CLI flag → env var → `~/.openfinclaw/config.json`.

### 2. Manual Configuration

Add to your agent platform's MCP config:

```json
{
  "mcpServers": {
    "openfinclaw": {
      "command": "npx",
      "args": ["@openfinclaw/cli", "serve"],
      "env": {
        "OPENFINCLAW_DEEPAGENT_API_KEY": "your_deepagent_key_here",
        "OPENFINCLAW_API_KEY": "fch_your_key_here"
      }
    }
  }
}
```

Omit whichever key you don't need — DeepAgent and Hub are independently authenticated.

### 3. CLI Mode (Human Use)

**Step 1 — Install (choose one)**

```bash
# Option A (recommended): install globally, use the short `openfinclaw` command everywhere
npm install -g @openfinclaw/cli      # or: pnpm add -g @openfinclaw/cli

# Option B: no install — prefix every command with `npx -y @openfinclaw/cli`
#   (slower first run while the package is fetched)
```

All examples below use the short `openfinclaw <cmd>` form. If you chose Option B, replace it with `npx -y @openfinclaw/cli <cmd>`.

**Step 2 — Provide your API key (choose one)**

```bash
# A. Run the init wizard once (writes ~/.openfinclaw/config.json, mode 600)
openfinclaw init

# B. Export for the current shell session
export OPENFINCLAW_DEEPAGENT_API_KEY=your_deepagent_key_here
export OPENFINCLAW_API_KEY=fch_your_key_here   # only needed for strategy group

# C. Pass it inline per command
openfinclaw deepagent research "..." --deepagent-api-key your_key
```

**Step 3 — Run commands**

```bash
# Streaming research / analysis / strategy / backtest — all in one prompt
openfinclaw deepagent research "Research NVDA last 90 days, propose a momentum strategy, backtest 1y, suggest a paper-trade plan"

# Inspect past DeepAgent runs
openfinclaw deepagent backtests
openfinclaw deepagent packages
openfinclaw deepagent download <packageId>

# Service health (public, no key needed)
openfinclaw deepagent health

# Strategy leaderboard (Hub key required)
openfinclaw leaderboard --limit 10

# Diagnose config & connectivity
openfinclaw doctor

# Upgrade to the latest version
openfinclaw update
```

**All CLI commands**

| Group | Commands |
|-------|----------|
| DeepAgent | `deepagent health`, `deepagent skills`, `deepagent research`, `deepagent threads`, `deepagent messages`, `deepagent backtests`, `deepagent packages`, `deepagent download` |
| Strategy | `leaderboard`, `strategy-info`, `fork`, `list-strategies`, `validate`, `publish`, `publish-verify` |
| System | `init`, `serve`, `doctor`, `update` |

Run `openfinclaw --help` for full usage and options.

### 4. DeepAgent in depth

DeepAgent has its **own API key** (`OPENFINCLAW_DEEPAGENT_API_KEY`). You do **not** need a Hub key to use `deepagent *` or `doctor`:

```bash
# Save the key (or pass it inline with --deepagent-api-key)
export OPENFINCLAW_DEEPAGENT_API_KEY=<your-deepagent-key>

# Streaming research in the terminal (token-by-token)
openfinclaw deepagent research "Write me a Tesla Bollinger Bands strategy and run a backtest"
```

`openfinclaw init` can save both keys at once (Hub + DeepAgent) to `~/.openfinclaw/config.json`. Request a DeepAgent key via the Hub dashboard, or trial the service online at <https://hub.openfinclaw.ai/en/chat>.

**Sample output** — one prompt produces strategy definition, backtest metrics, trade-level P&L, and improvement suggestions:

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
        "OPENFINCLAW_DEEPAGENT_API_KEY": "your_deepagent_key",
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
        "OPENFINCLAW_DEEPAGENT_API_KEY": "your_deepagent_key",
        "OPENFINCLAW_API_KEY": "fch_xxx"
      }
    }
  }
}
```
</details>

<details>
<summary><b>VS Code (Copilot)</b> — <code>.vscode/mcp.json</code></summary>

```json
{
  "servers": {
    "openfinclaw": {
      "command": "npx",
      "args": ["@openfinclaw/cli", "serve", "--tools=deepagent,strategy"],
      "env": {
        "OPENFINCLAW_DEEPAGENT_API_KEY": "your_deepagent_key",
        "OPENFINCLAW_API_KEY": "fch_xxx"
      }
    }
  }
}
```
</details>

<details>
<summary><b>Hermes Agent</b> — <code>~/.hermes/config.yaml</code></summary>

```yaml
mcp_servers:
  openfinclaw:
    command: "npx"
    args: ["@openfinclaw/cli", "serve", "--tools=deepagent,strategy"]
    env:
      OPENFINCLAW_DEEPAGENT_API_KEY: "your_deepagent_key"
      OPENFINCLAW_API_KEY: "fch_xxx"
```
</details>

<details>
<summary><b>OpenClaw</b></summary>

Add OpenFinClaw to your MCP config (e.g. `~/.openclaw/mcp.json`):
```json
{
  "mcpServers": {
    "openfinclaw": {
      "command": "npx",
      "args": ["@openfinclaw/cli", "serve"],
      "env": {
        "OPENFINCLAW_DEEPAGENT_API_KEY": "your_deepagent_key",
        "OPENFINCLAW_API_KEY": "fch_xxx"
      }
    }
  }
}
```
</details>

---

## Tool Groups & Context Optimization

Load only the tools you need to minimize token usage:

```bash
# DeepAgent only — the one-stop quant agent (~1,400 tokens)
npx @openfinclaw/cli serve --tools=deepagent

# Strategy group only (~1,000 tokens)
npx @openfinclaw/cli serve --tools=strategy

# Multiple groups
npx @openfinclaw/cli serve --tools=deepagent,strategy

# All tools (default)
npx @openfinclaw/cli serve
```

| Group | Tools | Tokens |
|-------|-------|--------|
| `deepagent` | fin_deepagent_health / _skills / _research_submit / _research_poll / _research_finalize / _status / _cancel / _threads / _messages / _backtests / _backtest_result / _packages / _package_meta / _download_package | ~1,400 |
| `strategy` | skill_publish, skill_validate, skill_fork, skill_leaderboard, skill_get_info, skill_list_local, skill_publish_verify | ~1,000 |

---

## Architecture

```
┌─────────────────────────────────┐
│       @openfinclaw/core         │  Pure business logic
│  (zero platform dependencies)   │  DeepAgent client, strategy tools, types
└──────────────┬──────────────────┘
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
   ┌───────┐ ┌─────┐ ┌──────┐
   │  MCP  │ │ CLI │ │ Init │
   │Server │ │Mode │ │Wizard│
   └───┬───┘ └──┬──┘ └──┬───┘
       │        │       │
       ▼        ▼       ▼
   20+ Agent  Terminal  Auto-config
   Platforms   Users    Platforms
```

The project is a monorepo with two packages:

- **`@openfinclaw/core`** — Platform-independent business logic (DeepAgent client, strategy tools, shared types)
- **`@openfinclaw/cli`** — MCP Server + CLI + interactive setup wizard

---

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENFINCLAW_DEEPAGENT_API_KEY` | For DeepAgent tools | DeepAgent service key (distinct from the Hub `fch_` key; sent as `X-API-Key`). Falls back to `~/.openfinclaw/config.json`. | — |
| `OPENFINCLAW_API_KEY` | For strategy group | Hub API key (`fch_` prefix). Needed only for the strategy group; not needed for `deepagent *` or `doctor`. | — |
| `OPENFINCLAW_CONFIG_PATH` | No | Override path to JSON config `{ "apiKey": "...", "deepagentApiKey": "..." }` | `~/.openfinclaw/config.json` |
| `HUB_API_URL` | No | Hub API URL | `https://hub.openfinclaw.ai` |
| `DEEPAGENT_API_URL` | No | DeepAgent API URL | `https://api.openfinclaw.ai/agent` |
| `REQUEST_TIMEOUT_MS` | No | HTTP request timeout (ms) | `60000` |
| `DEEPAGENT_SSE_TIMEOUT_MS` | No | DeepAgent SSE stream timeout (ms) | `900000` |

Get your Hub API key at [hub.openfinclaw.ai](https://hub.openfinclaw.ai). Request a DeepAgent key on the same dashboard, or try DeepAgent online first at <https://hub.openfinclaw.ai/en/chat>. The **Hub key and the DeepAgent key are independent** — having one does not grant access to the other.

---

## Development

```bash
# Clone and install
git clone https://github.com/mirror29/openfinclaw-cli.git
cd openfinclaw-cli
pnpm install

# Build all packages
pnpm build

# Run CLI locally
OPENFINCLAW_DEEPAGENT_API_KEY=<key> node packages/cli/dist/index.js deepagent health

# Run MCP server locally
OPENFINCLAW_DEEPAGENT_API_KEY=<key> node packages/cli/dist/index.js serve
```

---

## License

MIT
