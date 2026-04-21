<div align="center">

# @openfinclaw/cli

**One-stop quant-trading AI agent for any coding assistant — MCP server + CLI**

[![npm](https://img.shields.io/npm/v/@openfinclaw/cli)](https://www.npmjs.com/package/@openfinclaw/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/mirror29/openfinclaw-cli/blob/main/LICENSE)

Market data · analysis · deep reports · strategy generation · backtest · paper trading — all via DeepAgent, across 20+ AI agent platforms.

[Try DeepAgent online](https://hub.openfinclaw.ai/en/chat) · [Get an API Key](https://hub.openfinclaw.ai) · [Quick Start](#quick-start) · [Supported Platforms](#supported-platforms) · [GitHub](https://github.com/mirror29/openfinclaw-cli)

</div>

> 🧪 **Try DeepAgent in your browser first** → <https://hub.openfinclaw.ai/en/chat> — no install required.

---

## What is it?

OpenFinClaw plugs a **one-stop quant-trading agent** into any MCP-compatible coding assistant. Its core is **DeepAgent**: a remote multi-agent service that fetches market data, analyses it, writes deep reports, generates strategies, backtests them and proposes paper-trade plans — from a single natural-language prompt. Reach it from Claude Code, Claude Desktop, Cursor, VS Code Copilot, Hermes, and 20+ other platforms. Also runs as a standalone terminal CLI.

## Tool groups

| Group | Tools | Tokens | Purpose |
|---|---|---|---|
| `deepagent` | `fin_deepagent_*` (14 tools) | ~1,400 | **One-stop quant agent** — research · analysis · reports · strategy gen · backtest · paper trade |
| `strategy` | `skill_publish` · `skill_validate` · `skill_fork` · `skill_leaderboard` · `skill_get_info` · `skill_list_local` · `skill_publish_verify` | ~1,000 | Advanced local FEP v2.0 workflow: publish / fork / validate strategy packages, query Hub leaderboards |

Load only what you need with `--tools=deepagent,strategy` (either subset).

---

## Quick Start

> 💡 Not ready to install? **[Try DeepAgent online](https://hub.openfinclaw.ai/en/chat)** and decide after.

### 1. Interactive setup (recommended)

```bash
npx @openfinclaw/cli init
```

The wizard will:
- Ask for your **DeepAgent API Key** (required for the `deepagent` group)
- Optionally ask for a **Hub API Key** (`fch_...`, only if you enable the `strategy` group)
- Let you pick tool groups
- Auto-detect installed platforms (by app bundles, user data dirs, CLI on `PATH`, or existing MCP config)
- Write MCP config to each selected platform
- Save keys to `~/.openfinclaw/config.json` (chmod 600 on Unix) so the terminal CLI works without `export`

`init` also supports scripted, non-interactive use (useful on Windows / CI where raw-mode prompts don't work):

```bash
npx @openfinclaw/cli init --yes \
    --platforms cursor,claude-code \
    --tool-groups deepagent,strategy \
    --deepagent-api-key <your-deepagent-key> \
    --api-key fch_xxx
```

### 2. Manual MCP configuration

Drop this into your agent platform's MCP config file (path varies per platform — see below):

```json
{
  "mcpServers": {
    "openfinclaw": {
      "command": "npx",
      "args": ["@openfinclaw/cli", "serve"],
      "env": {
        "OPENFINCLAW_DEEPAGENT_API_KEY": "<your-deepagent-key>",
        "OPENFINCLAW_API_KEY": "<your-hub-key>"
      }
    }
  }
}
```

Omit whichever key you don't need — DeepAgent and Hub are independently authenticated.

### 3. Terminal CLI

For repeated terminal use, install globally so you can call `openfinclaw` directly instead of prefixing every command with `npx`:

```bash
npm install -g @openfinclaw/cli     # or: pnpm add -g @openfinclaw/cli
openfinclaw doctor                  # confirms the install + keys
```

> Not installing globally? Every example below also works prefixed with `npx -y @openfinclaw/cli` (slower first run).

```bash
# DeepAgent — real token-by-token streaming in the terminal, covers the whole quant flow
openfinclaw deepagent research "Research NVDA last 90 days, propose a momentum strategy, backtest 1y, paper-trade plan"
openfinclaw deepagent skills
openfinclaw deepagent backtests
openfinclaw deepagent packages
openfinclaw deepagent download <package_id>

# Strategy management (Hub key required)
openfinclaw leaderboard --limit 10
openfinclaw strategy-info <uuid>
openfinclaw fork <uuid>
openfinclaw validate ./my-strategy
openfinclaw publish ./my-strategy.zip

# Diagnostics (works with any subset of keys)
openfinclaw doctor
```

> **Hub key vs DeepAgent key.** The two services authenticate independently.
> `deepagent *` and `doctor` run fine with **only** a DeepAgent key configured;
> `leaderboard`, `publish`, `fork` etc. (strategy group) need the Hub `fch_` key.

---

## Supported Platforms

| Category | Platforms |
|---|---|
| **Chat** | Claude Desktop, ChatGPT, Chatbox, LM Studio |
| **IDEs** | Claude Code, VS Code (Copilot), Cursor, Windsurf, JetBrains Junie, Zed, Cline, Continue.dev, Roo Code |
| **CLI Agents** | Codex (OpenAI), OpenCode, Amazon Q CLI |
| **Frameworks** | Hermes Agent, BeeAI, Swarms |
| **AI Agents** | OpenClaw, NanoClaw |
| **Other** | v0 (Vercel), Postman, Amp (Sourcegraph) |

### Platform config snippets

<details>
<summary><b>Claude Code</b> — <code>~/.claude/settings.json</code></summary>

```json
{
  "mcpServers": {
    "openfinclaw": {
      "command": "npx",
      "args": ["@openfinclaw/cli", "serve"],
      "env": {
        "OPENFINCLAW_DEEPAGENT_API_KEY": "<your-deepagent-key>",
        "OPENFINCLAW_API_KEY": "<your-hub-key>"
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
      "args": ["@openfinclaw/cli", "serve"],
      "env": {
        "OPENFINCLAW_DEEPAGENT_API_KEY": "<your-deepagent-key>",
        "OPENFINCLAW_API_KEY": "<your-hub-key>"
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
      "args": ["@openfinclaw/cli", "serve"],
      "env": {
        "OPENFINCLAW_DEEPAGENT_API_KEY": "<your-deepagent-key>",
        "OPENFINCLAW_API_KEY": "<your-hub-key>"
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
    args: ["@openfinclaw/cli", "serve"]
    env:
      OPENFINCLAW_DEEPAGENT_API_KEY: "<your-deepagent-key>"
      OPENFINCLAW_API_KEY: "<your-hub-key>"
```
</details>

<details>
<summary><b>OpenCode</b> — <code>~/.config/opencode/opencode.json</code></summary>

```json
{
  "mcp": {
    "openfinclaw": {
      "type": "local",
      "command": ["npx", "@openfinclaw/cli", "serve"],
      "environment": {
        "OPENFINCLAW_DEEPAGENT_API_KEY": "<your-deepagent-key>",
        "OPENFINCLAW_API_KEY": "<your-hub-key>"
      },
      "enabled": true
    }
  }
}
```
</details>

---

## Configuration

### API Keys (two independent keys)

| Key | Env var | Used by |
|---|---|---|
| DeepAgent | `OPENFINCLAW_DEEPAGENT_API_KEY` | `deepagent` group + CLI `deepagent *` subcommands — the one-stop quant agent |
| Hub (`fch_...`) | `OPENFINCLAW_API_KEY` | `strategy` group + CLI strategy subcommands (`leaderboard`, `publish`, `fork`, …) |

Either key is optional on its own — the CLI lets you run the subcommands that match whichever keys you have. `doctor` works with any subset of keys.

Resolution order for each key (highest first):

1. CLI flag: `--deepagent-api-key <key>` / `--api-key <key>`
2. Environment variable
3. `~/.openfinclaw/config.json` (written by `openfinclaw init`)

Get keys at [hub.openfinclaw.ai](https://hub.openfinclaw.ai), or trial DeepAgent online at <https://hub.openfinclaw.ai/en/chat>.

### Environment variables

| Variable | Description | Default |
|---|---|---|
| `OPENFINCLAW_DEEPAGENT_API_KEY` | DeepAgent API key | (required for authenticated deepagent tools) |
| `OPENFINCLAW_API_KEY` | Hub API key | (required for strategy group) |
| `OPENFINCLAW_CONFIG_PATH` | Override config file path | `~/.openfinclaw/config.json` |
| `HUB_API_URL` | Hub base URL | `https://hub.openfinclaw.ai` |
| `DEEPAGENT_API_URL` | DeepAgent base URL | `https://api.openfinclaw.ai/agent` |
| `REQUEST_TIMEOUT_MS` | HTTP timeout (ms) | `60000` |
| `DEEPAGENT_SSE_TIMEOUT_MS` | SSE stream timeout (ms) | `900000` (15 min) |

---

## Streaming & long-running tools

DeepAgent research runs can take 3–10 minutes. Two access patterns:

- **Terminal CLI** (`openfinclaw deepagent research "..."`): true **token-by-token** streaming directly to stdout
- **MCP clients**: the `research` workflow is split into three calls — `fin_deepagent_research_submit` (returns a `taskId` immediately), `fin_deepagent_research_poll` (every 30–60 s for progress), `fin_deepagent_research_finalize` (fetch full result). The agent drives this loop itself — works consistently across Claude Desktop, Cursor, Hermes, Windsurf, and other MCP clients.

---

## Related

- **[@openfinclaw/core](https://www.npmjs.com/package/@openfinclaw/core)** — Platform-independent library core. Use directly only if you are building a custom MCP wrapper.
- **[DeepAgent online chat](https://hub.openfinclaw.ai/en/chat)** — try it in a browser first.
- **[GitHub](https://github.com/mirror29/openfinclaw-cli)** — source, issues, Chinese README.

---

## License

MIT
