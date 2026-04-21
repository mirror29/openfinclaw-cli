<div align="center">

**[English](README.md)** | **[中文](README.zh-CN.md)**

<img src="imgs/logo.svg" alt="OpenFinClaw" width="680">

**One-stop quant-trading AI agent for Claude Code, Cursor & 20+ AI agents — via MCP**

Market data · analysis · deep reports · strategy generation · backtest · paper trading — everything through a single DeepAgent.

[![npm](https://img.shields.io/npm/v/@openfinclaw/cli)](https://www.npmjs.com/package/@openfinclaw/cli) [![npm downloads](https://img.shields.io/npm/dw/@openfinclaw/cli)](https://www.npmjs.com/package/@openfinclaw/cli) [![MCP compatible](https://img.shields.io/badge/MCP-compatible-8A2BE2)](https://modelcontextprotocol.io) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Try DeepAgent online](https://hub.openfinclaw.ai/en/chat) · [Get API Key](https://hub.openfinclaw.ai) · [Quick Start](#quick-start) · [Platforms](#supported-platforms)

</div>

> 🧪 **Try DeepAgent online first → <https://hub.openfinclaw.ai/en/chat>** — browse the full quant workflow (research · strategy · backtest · paper trade) in your browser, no install required.

---

## What is OpenFinClaw?

OpenFinClaw plugs a **one-stop quant-trading agent** into any AI coding assistant via [MCP (Model Context Protocol)](https://modelcontextprotocol.io). At its core is **DeepAgent** — a remote multi-agent service that handles market data fetching, analysis, deep reports, strategy generation, backtesting and paper trading from a single natural-language prompt. Reach it from Claude Code, Hermes, Cursor, VS Code Copilot, and 20+ other platforms.

<p align="center">
  <img src="imgs/deepagent-backtest-metrics.png" alt="DeepAgent backtest result — Tesla Bollinger Bands" width="620">
  <br/>
  <sub><em>Live output from <code>openfinclaw deepagent research</code> — Tesla Bollinger-Bands strategy, research → backtest → metrics, from one prompt.</em></sub>
</p>

### Key Features

| Category | Tools | Description |
|----------|-------|-------------|
| **DeepAgent** (one-stop quant agent) | `fin_deepagent_research_*` · `_backtests` · `_backtest_result` · `_packages` · `_package_meta` · `_download_package` · `_threads` · `_messages` · `_health` · `_skills` · `_status` · `_cancel` | Ask anything finance-related — market data, analysis, deep reports, strategy generation, backtests, paper-trade suggestions. One agent end-to-end. |
| **Strategy** (advanced local FEP v2.0 workflow) | `skill_publish` · `skill_validate` · `skill_fork` · `skill_leaderboard` · `skill_get_info` · `skill_list_local` · `skill_publish_verify` | For strategy authors: publish to Hub, validate FEP v2.0 packages, fork public strategies, query leaderboards. |

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
