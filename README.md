<div align="center">

**[English](README.md)** | **[中文](README.zh-CN.md)**

<img src="imgs/logo.svg" alt="OpenFinClaw" width="680">

**Real-time market data + AI backtests for Claude Code, Cursor & 20+ AI agents — via MCP**

[![npm](https://img.shields.io/npm/v/@openfinclaw/cli)](https://www.npmjs.com/package/@openfinclaw/cli) [![npm downloads](https://img.shields.io/npm/dw/@openfinclaw/cli)](https://www.npmjs.com/package/@openfinclaw/cli) [![MCP compatible](https://img.shields.io/badge/MCP-compatible-8A2BE2)](https://modelcontextprotocol.io) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Get API Key](https://hub.openfinclaw.ai) · [Quick Start](#quick-start) · [Platforms](#supported-platforms) · [DeepAgent Demo](#4-deepagent-optional--remote-ai-research--strategy-generation)

</div>

---

## What is OpenFinClaw?

OpenFinClaw is a **universal financial toolkit** that works with any AI agent platform via [MCP (Model Context Protocol)](https://modelcontextprotocol.io). It provides market data and strategy management — accessible from Claude Code, Hermes, Cursor, VS Code Copilot, and 20+ other platforms.

<p align="center">
  <img src="imgs/deepagent-backtest-metrics.png" alt="DeepAgent backtest result — Tesla Bollinger Bands" width="620">
  <br/>
  <sub><em>Live output from <code>openfinclaw deepagent research</code> — Tesla Bollinger-Bands strategy, research → backtest → metrics, from one prompt.</em></sub>
</p>

### Key Features

| Category | Tools | Description |
|----------|-------|-------------|
| **Market Data** | `fin_price` `fin_kline` `fin_crypto` `fin_compare` `fin_slim_search` | Real-time prices, OHLCV candlesticks, crypto/DeFi data, multi-asset comparison, symbol search |
| **Strategy Management** | `skill_publish` `skill_validate` `skill_fork` `skill_leaderboard` `skill_get_info` `skill_list_local` `skill_publish_verify` | Publish strategies to Hub, validate FEP v2.0 packages, fork public strategies, query leaderboards |
| **DeepAgent** | `fin_deepagent_research_*` `fin_deepagent_backtests` `fin_deepagent_packages` `fin_deepagent_download_package` … | Remote AI research / backtest / strategy generation (separate DeepAgent key) |

---

## Quick Start

### 1. Interactive Setup (Recommended)

```bash
npx @openfinclaw/cli init
```

The wizard will:
- Ask for your API key
- Let you choose which tool groups to enable
- Pre-select platforms when **either** common install markers match (app bundles, user data dirs, CLI on `PATH`) **or** the expected MCP config path already exists — these are not the same as “every app you have installed”
- Write MCP config to each selected platform
- Save `~/.openfinclaw/config.json` (API key only) so terminal CLI works without `export` (Unix: file mode 600)

**CLI vs MCP:** Agent platforms load the API key from their MCP `env` block. That does **not** change your shell profile. A shell `OPENFINCLAW_API_KEY` is still visible to any process you start in that terminal—this is normal. Resolution order for `openfinclaw` / `serve` is: `--api-key` → `OPENFINCLAW_API_KEY` → `~/.openfinclaw/config.json`.

### 2. Manual Configuration

Add to your agent platform's MCP config:

```json
{
  "mcpServers": {
    "openfinclaw": {
      "command": "npx",
      "args": ["@openfinclaw/cli", "serve"],
      "env": {
        "OPENFINCLAW_API_KEY": "fch_your_key_here"
      }
    }
  }
}
```

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
export OPENFINCLAW_API_KEY=fch_your_key_here

# C. Pass it inline per command
openfinclaw price AAPL --api-key fch_your_key_here
```

**Step 3 — Run commands**

```bash
# Real-time quotes (stocks / crypto / indices)
openfinclaw price AAPL
openfinclaw price BTC/USDT

# K-line / OHLCV
openfinclaw kline 600519.SH --limit 30

# Multi-asset comparison
openfinclaw compare AAPL,GOOGL,MSFT,AMZN

# Symbol search
openfinclaw search "tesla"

# Leaderboard
openfinclaw leaderboard --limit 10

# Diagnose config & connectivity
openfinclaw doctor

# Upgrade to the latest version
openfinclaw update
```

**All CLI commands**

| Group | Commands |
|-------|----------|
| Market data | `price`, `kline`, `crypto`, `compare`, `search` |
| Strategy | `leaderboard`, `strategy-info`, `fork`, `list-strategies`, `validate`, `publish`, `publish-verify` |
| DeepAgent | `deepagent health`, `deepagent skills`, `deepagent research`, `deepagent threads`, `deepagent messages`, `deepagent backtests`, `deepagent packages`, `deepagent download` |
| System | `init`, `serve`, `doctor`, `update` |

Run `openfinclaw --help` for full usage and options.

### 4. DeepAgent (Optional — remote AI research & strategy generation)

DeepAgent is a **separate service with its own API key** (`OPENFINCLAW_DEEPAGENT_API_KEY`). You do **not** need a Hub key to use `deepagent *` or `doctor`:

```bash
# Save the key (or pass it inline with --deepagent-api-key)
export OPENFINCLAW_DEEPAGENT_API_KEY=<your-deepagent-key>

# Streaming research in the terminal (token-by-token)
npx @openfinclaw/cli deepagent research "Write me a Tesla Bollinger Bands strategy and run a backtest"

# Inspect past runs
npx @openfinclaw/cli deepagent backtests
npx @openfinclaw/cli deepagent packages
npx @openfinclaw/cli deepagent download <packageId>
```

`openfinclaw init` can save both keys at once (Hub + DeepAgent) to `~/.openfinclaw/config.json`. Request a DeepAgent key via the Hub dashboard.

**Sample output** — one prompt produces strategy definition, backtest metrics, trade-level P&L, and improvement suggestions:

<p align="center">
  <img src="imgs/deepagent-backtest-metrics.png" alt="DeepAgent — strategy definition & performance metrics" width="49%" />
  <img src="imgs/deepagent-backtest-trades.png" alt="DeepAgent — trades, conclusions & optimization suggestions" width="49%" />
</p>

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
      "args": ["@openfinclaw/cli", "serve", "--tools=datahub,strategy"],
      "env": { "OPENFINCLAW_API_KEY": "fch_xxx" }
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
      "args": ["@openfinclaw/cli", "serve", "--tools=datahub,strategy"],
      "env": { "OPENFINCLAW_API_KEY": "fch_xxx" }
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
      "args": ["@openfinclaw/cli", "serve", "--tools=datahub,strategy"],
      "env": { "OPENFINCLAW_API_KEY": "fch_xxx" }
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
    args: ["@openfinclaw/cli", "serve", "--tools=datahub,strategy"]
    env:
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
      "env": { "OPENFINCLAW_API_KEY": "fch_xxx" }
    }
  }
}
```
</details>

---

## Tool Groups & Context Optimization

Load only the tools you need to minimize token usage:

```bash
# Market data only (~700 tokens)
npx @openfinclaw/cli serve --tools=datahub

# Strategy management only (~1,000 tokens)
npx @openfinclaw/cli serve --tools=strategy

# Multiple groups
npx @openfinclaw/cli serve --tools=datahub,strategy

# All tools (default, ~1,700 tokens)
npx @openfinclaw/cli serve
```

| Group | Tools | Tokens |
|-------|-------|--------|
| `datahub` | fin_price, fin_kline, fin_crypto, fin_compare, fin_slim_search | ~700 |
| `strategy` | skill_publish, skill_validate, skill_fork, skill_leaderboard, skill_get_info, skill_list_local, skill_publish_verify | ~1,000 |
| `deepagent` | fin_deepagent_health / _skills / _research_submit / _research_poll / _research_finalize / _status / _cancel / _threads / _messages / _backtests / _backtest_result / _packages / _package_meta / _download_package | ~1,400 |

---

## Architecture

```
┌─────────────────────────────────┐
│       @openfinclaw/core         │  Pure business logic
│  (zero platform dependencies)   │  API clients, types, schemas
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

- **`@openfinclaw/core`** — Platform-independent business logic (API clients, types, tool schemas)
- **`@openfinclaw/cli`** — MCP Server + CLI + interactive setup wizard

---

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENFINCLAW_API_KEY` | For Hub / DataHub tools | API key for Hub and DataHub (`fch_` prefix). Falls back to `~/.openfinclaw/config.json` after init. Not needed to run `deepagent *` or `doctor`. | — |
| `OPENFINCLAW_DEEPAGENT_API_KEY` | For DeepAgent tools | Separate API key for the DeepAgent service (distinct from the Hub `fch_` key; sent as `X-API-Key`). | — |
| `OPENFINCLAW_CONFIG_PATH` | No | Override path to JSON config `{ "apiKey": "...", "deepagentApiKey": "..." }` (tests / custom layout) | `~/.openfinclaw/config.json` |
| `HUB_API_URL` | No | Hub API URL | `https://hub.openfinclaw.ai` |
| `DATAHUB_GATEWAY_URL` | No | DataHub Gateway URL | `https://datahub.openfinclaw.ai` |
| `DEEPAGENT_API_URL` | No | DeepAgent API URL | `https://api.openfinclaw.ai/agent` |
| `REQUEST_TIMEOUT_MS` | No | HTTP request timeout (ms) | `60000` |
| `DEEPAGENT_SSE_TIMEOUT_MS` | No | DeepAgent SSE stream timeout (ms) | `900000` |

Get your Hub API key at [hub.openfinclaw.ai](https://hub.openfinclaw.ai). The **Hub key and the DeepAgent key are independent** — having one does not grant access to the other.

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
OPENFINCLAW_API_KEY=fch_xxx node packages/cli/dist/index.js price AAPL

# Run MCP server locally
OPENFINCLAW_API_KEY=fch_xxx node packages/cli/dist/index.js serve
```

---

## License

MIT
