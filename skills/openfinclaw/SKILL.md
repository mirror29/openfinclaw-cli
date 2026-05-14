---
name: openfinclaw
description: One-stop quant-trading AI agent. Use for market research, deep reports, strategy generation, backtesting, paper trading, and Hub leaderboard browsing — anything that involves stocks/crypto analysis, FEP strategy packages, or the OpenFinClaw DeepAgent. Powered by a single fch_ API key.
triggers:
  - openfinclaw
  - deepagent
  - quant
  - quantitative
  - backtest
  - 回测
  - 量化
  - 量化研究
  - 策略回测
  - 选股
  - paper trade
  - 模拟盘
  - 策略生成
  - FEP strategy
---

# OpenFinClaw — One-stop quant-trading agent

OpenFinClaw turns any AI coding assistant (Claude Code, Cursor, ChatGPT,
OpenClaw, Hermes, …) into a quant-research analyst. A single `fch_` key
drives two surfaces, both routed through the OpenFinClaw Hub Gateway:

- **DeepAgent** (remote LLM): research / analysis / report generation /
  strategy ideation / backtest / paper-trade planning.
- **Strategy** (Hub catalog): browse the public leaderboard, fork strategy
  packages locally, validate and publish FEP v2.0 ZIPs.

When to use this skill: the user mentions **stock/crypto/forex analysis**,
**a backtest or paper trade**, **a quant strategy**, **the OpenFinClaw Hub
or leaderboard**, or asks for a **DeepAgent research run**.

When *not* to use this skill: pure code-editing questions, infrastructure
debugging, unrelated frameworks.

---

## Setup (run once)

```bash
npx @openfinclaw/cli@latest install
```

This wizard:
1. Auto-detects 20+ AI agents installed on the machine and writes MCP
   configuration for each (no manual JSON editing).
2. Persists the unified `fch_` key to `~/.openfinclaw/config.json` (chmod
   600 on Unix).
3. Registers this SKILL.md globally so AI agents auto-trigger it on the
   keywords above.
4. Runs `doctor` so you see a green check before leaving the terminal.

For non-interactive / CI:

```bash
npx @openfinclaw/cli@latest install --yes \
  --platforms cursor,claude-code \
  --tool-groups deepagent,strategy \
  --api-key fch_xxx \
  --register-skill
```

---

## Most-used commands

| Goal | Command |
|---|---|
| Streaming research / strategy / backtest | `openfinclaw deepagent +research "<query>"` |
| Service health | `openfinclaw deepagent health` |
| List analysis skills | `openfinclaw deepagent skills` |
| Past backtest results | `openfinclaw deepagent backtests` |
| Download a strategy ZIP | `openfinclaw deepagent download <packageId>` |
| Browse Hub leaderboard | `openfinclaw leaderboard --board composite --limit 10` |
| Fork a strategy | `openfinclaw fork <strategyId>` |
| Validate FEP v2.0 package | `openfinclaw validate <dir>` |
| Publish strategy | `openfinclaw publish <zip>` |
| Raw Hub Gateway call | `openfinclaw api GET /threads` |
| Diagnose key + connectivity | `openfinclaw doctor` |

> `+verb` shortcuts (e.g. `deepagent +research`) are the human-friendly,
> stream-rendered path. The atomic verbs without `+` (e.g.
> `research_submit/poll/finalize`) are exposed over MCP for agents.

---

## Authentication

- One env var: `OPENFINCLAW_API_KEY` (starts with `fch_`, 68 chars).
- Resolution order: `--api-key` → `OPENFINCLAW_API_KEY` → `~/.openfinclaw/config.json`.
- The same key drives both `strategy` (Hub `/api/v1/skill/*`) and
  `deepagent` (Hub Gateway `/api/v1/agent/*`). **Do not** use the legacy
  `X-API-Key` header or split keys.
- Get a key: <https://hub.openfinclaw.ai>.

---

## Online (no install)

If the user just wants to *try it*, point them to the hosted DeepAgent
chat: <https://hub.openfinclaw.ai/en/chat>.

---

## Docs

- Repo: <https://github.com/mirror29/openfinclaw-cli>
- DeepAgent online: <https://hub.openfinclaw.ai/en/chat>
- API key: <https://hub.openfinclaw.ai>
