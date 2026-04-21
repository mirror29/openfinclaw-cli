<div align="center">

**[English](COMPARISON.md)** | **[中文](COMPARISON.zh-CN.md)**

</div>

# OpenFinClaw vs Other Tools

Honest, non-promotional comparison with the quant tools our users commonly ask
about. We try to be generous to alternatives — the right tool depends on your
workflow, not on marketing.

## TL;DR

OpenFinClaw is not a replacement for QuantConnect or Backtrader — it's a
different **layer**. Think of it as the **AI-agent-native interface** to a
one-stop quant workflow, not another backtest engine.

| You're here if... | Consider instead... |
|---|---|
| You want the full **research → strategy → backtest** loop from inside Claude Code / Cursor, in natural language | You want direct programmatic control over a custom engine → **Backtrader** / **Zipline** |
| You want to try without maintaining infrastructure or learning a DSL | You're a pro with an existing **QuantConnect** / **JoinQuant** pipeline |
| You use an MCP-compatible AI agent daily and want quant workflows inside it | You work in a traditional IDE / Jupyter loop without AI agents |

---

## One-line positioning

| Tool | What it is |
|---|---|
| **OpenFinClaw** | AI-agent-native. One natural-language prompt → full research → strategy → backtest loop. Runs inside any MCP client. |
| **QuantConnect** | Mature cloud platform for algo devs. Python/C#, full stack, live broker integration, web IDE. |
| **Backtrader** | Python library for local backtesting. Full programmatic control. Self-hosted. |
| **Zipline Reloaded** | Python backtester, Quantopian heritage. Local, open-source, pandas-native. |
| **JoinQuant / 聚宽** | China-focused cloud quant platform. A-shares + futures. Chinese UI. |
| **Generic MCP finance servers** (e.g. single-data-source MCP tools) | Give agent tools for one data slice (quote / fundamentals / news). No research intelligence, no strategy generation. |
| **Claude / ChatGPT alone** | Great at explaining and drafting, but can't actually fetch live data or run a backtest without tool integration. |

---

## Feature matrix

| Capability | OpenFinClaw | QuantConnect | Backtrader | JoinQuant | Generic MCP finance |
|---|:---:|:---:|:---:|:---:|:---:|
| AI-agent-native (MCP) | ✅ | ❌ | ❌ | ❌ | ✅ |
| One natural-language prompt → full loop | ✅ | ❌ | ❌ | ❌ | ❌ |
| US + A-shares + HK + Crypto + FX | ✅ | ✅ | partial | CN-only | depends |
| Streaming terminal output | ✅ | ❌ | ❌ | ❌ | partial |
| Cloud-hosted backtest (no infra) | ✅ | ✅ | ❌ (local) | ✅ | ❌ |
| Self-hosted open-source runtime | CLI/MCP yes · backend no | ❌ | ✅ | ❌ | varies |
| Live broker / real-money | planned | ✅ | via plugins | ✅ | ❌ |
| Community strategy exchange | ✅ leaderboard + fork + publish | partial (shared projects) | ❌ | partial | ❌ |
| Free to try without signup | ✅ [try online](https://hub.openfinclaw.ai/en/chat) | limited sandbox | fully free | limited | varies |
| Learning curve | 1 prompt | Python + their DSL | Python | Python | tool-specific |

---

## When to choose OpenFinClaw

- You already spend time inside **Claude Code / Cursor / an MCP agent** and want quant workflows there — without context-switching to another IDE or browser tab.
- You prefer to **describe** a strategy and iterate in natural language, rather than hand-code an entry/exit DSL.
- You want cross-market coverage (US · A · HK · Crypto · FX) without juggling multiple accounts.
- You want to browse the community leaderboard, fork a strategy, tweak it, and publish back — treating quant research as a collaborative loop instead of a lone exercise.

## When to choose something else

- **You need live broker execution today.** OpenFinClaw's Paper/Live engine is planned, not shipped. For real-money today → **QuantConnect**, Alpaca, or a broker SDK.
- **You need full control over the backtest engine.** Custom transaction-cost models, custom market calendars, ultra-low-latency simulation → **Backtrader** / **Zipline** directly.
- **You're a China-only professional quant.** **JoinQuant / 米筐 / 聚宽** have deeper A-share microstructure data and broker connectivity than we do today.
- **You don't use an AI agent.** If you live in VS Code + Jupyter without an MCP client, OpenFinClaw's primary surface (MCP + natural-language CLI) is largely wasted.
- **You need an academic / research-grade backtest** with full audit trail and survivorship-bias-free datasets. We're optimized for iteration speed, not peer-reviewable research.

---

## The non-obvious part

OpenFinClaw sits at a layer that didn't exist 18 months ago: **between an AI
agent and a quant backend**.

It assumes you've already bought into AI-agent-driven workflows. If you
haven't, most other tools will feel more natural. If you have, OpenFinClaw
removes the single biggest friction in AI-assisted quant work: **the gap
between "a smart prompt" and "an actionable backtest + strategy package you
can iterate on"**.

We're happy to co-exist. Many users run OpenFinClaw for ideation and then
export the FEP v2.0 strategy package into QuantConnect or Backtrader for
deeper backtesting. That's a legitimate workflow — nothing in our design
prevents it.

---

## Spot a mistake or missing tool?

Open a PR against [`COMPARISON.md`](./COMPARISON.md) (or the Chinese version
[`COMPARISON.zh-CN.md`](./COMPARISON.zh-CN.md)). We care about getting this
page right more than winning the comparison.
