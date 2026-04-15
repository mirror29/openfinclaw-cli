<div align="center">

**[English](README.md)** | **[中文](README.zh-CN.md)**

# OpenFinClaw

**Cross-platform financial tools for AI agents**

[![npm](https://img.shields.io/npm/v/@openfinclaw/cli)](https://www.npmjs.com/package/@openfinclaw/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

One package. 20+ agent platforms. Zero lock-in.

[Get your API Key](https://hub.openfinclaw.ai) | [Documentation](#quick-start) | [Supported Platforms](#supported-platforms)

</div>

---

## What is OpenFinClaw?

OpenFinClaw is a **universal financial toolkit** that works with any AI agent platform via [MCP (Model Context Protocol)](https://modelcontextprotocol.io). It provides market data and strategy management — accessible from Claude Code, Hermes, Cursor, VS Code Copilot, and 20+ other platforms.

### Key Features

| Category | Tools | Description |
|----------|-------|-------------|
| **Market Data** | `fin_price` `fin_kline` `fin_crypto` `fin_compare` `fin_slim_search` | Real-time prices, OHLCV candlesticks, crypto/DeFi data, multi-asset comparison, symbol search |
| **Strategy Management** | `skill_publish` `skill_validate` `skill_fork` `skill_leaderboard` `skill_get_info` `skill_list_local` `skill_publish_verify` | Publish strategies to Hub, validate FEP v2.0 packages, fork public strategies, query leaderboards |

---

## Quick Start

### 1. Interactive Setup (Recommended)

```bash
npx @openfinclaw/cli init
```

The wizard will:
- Ask for your API key
- Let you choose which tool groups to enable
- Auto-detect installed agent platforms
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

```bash
# Option A: use key from init (writes ~/.openfinclaw/config.json)
npx @openfinclaw/cli init

# Option B: set environment variable for this session
export OPENFINCLAW_API_KEY=fch_your_key_here

# Option C: pass API key for a single command (optional)
npx @openfinclaw/cli compare AAPL,MSFT --api-key fch_your_key_here

# Query prices
npx @openfinclaw/cli price AAPL
npx @openfinclaw/cli price BTC/USDT

# Get K-line data
npx @openfinclaw/cli kline 600519.SH --limit 30

# Compare assets
npx @openfinclaw/cli compare AAPL,GOOGL,MSFT,AMZN

# Search symbols
npx @openfinclaw/cli search "tesla"

# Diagnose configuration
npx @openfinclaw/cli doctor
```

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
| `OPENFINCLAW_API_KEY` | One of key sources | API key for Hub and DataHub (`fch_` prefix). Ignored if `--api-key` is set; otherwise falls back to `~/.openfinclaw/config.json` after init. | — |
| `OPENFINCLAW_CONFIG_PATH` | No | Override path to JSON config `{ "apiKey": "..." }` (tests / custom layout) | `~/.openfinclaw/config.json` |
| `HUB_API_URL` | No | Hub API URL | `https://hub.openfinclaw.ai` |
| `DATAHUB_GATEWAY_URL` | No | DataHub Gateway URL | `https://datahub.openfinclaw.ai` |
| `REQUEST_TIMEOUT_MS` | No | HTTP request timeout (ms) | `60000` |

Get your API key at [hub.openfinclaw.ai](https://hub.openfinclaw.ai).

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
