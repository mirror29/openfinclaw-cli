<div align="center">

**[English](README.md)** | **[中文](README.zh-CN.md)**

# OpenFinClaw

**跨平台 AI Agent 金融工具**

[![npm](https://img.shields.io/npm/v/@openfinclaw/cli)](https://www.npmjs.com/package/@openfinclaw/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

一个包，20+ Agent 平台，零锁定。

[获取 API Key](https://hub.openfinclaw.ai) | [使用文档](#快速开始) | [支持的平台](#支持的平台)

</div>

---

## 简介

OpenFinClaw 是一个**通用金融工具包**，通过 [MCP (Model Context Protocol)](https://modelcontextprotocol.io) 协议与任何 AI Agent 平台对接。提供行情数据与策略管理 — 可从 Claude Code、Hermes、Cursor、VS Code Copilot 等 20+ 平台访问。

### 功能一览

| 分类 | 工具 | 说明 |
|------|------|------|
| **行情数据** | `fin_price` `fin_kline` `fin_crypto` `fin_compare` `fin_slim_search` | 实时价格、K线/OHLCV、加密货币/DeFi 数据、多资产对比、代码搜索 |
| **策略管理** | `skill_publish` `skill_validate` `skill_fork` `skill_leaderboard` `skill_get_info` `skill_list_local` `skill_publish_verify` | 发布策略到 Hub、验证 FEP v2.0 包、Fork 公开策略、排行榜查询 |

---

## 快速开始

### 方式一：交互式安装（推荐）

```bash
npx @openfinclaw/cli init
```

安装向导会：
- 引导输入 API Key
- 让你选择要启用的工具组
- 自动检测已安装的 Agent 平台
- 将 MCP 配置写入所选平台
- 写入 `~/.openfinclaw/config.json`（仅保存 API Key），终端可直接用 CLI 而无需 `export`（Unix 下文件权限 600）

**CLI 与 MCP：** 各 Agent 从自己的 MCP 配置里 `env` 注入密钥，**不会**改你的 shell 配置。若终端里已 `export OPENFINCLAW_API_KEY`，本机启动的进程仍会读到该变量，这是正常现象。`openfinclaw` / `serve` 解析顺序：`--api-key` → 环境变量 `OPENFINCLAW_API_KEY` → `~/.openfinclaw/config.json`。

### 方式二：手动配置

在你的 Agent 平台的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "openfinclaw": {
      "command": "npx",
      "args": ["@openfinclaw/cli", "serve"],
      "env": {
        "OPENFINCLAW_API_KEY": "fch_你的密钥"
      }
    }
  }
}
```

### 方式三：命令行直接使用

```bash
# 方式 A：已通过 init 写入 ~/.openfinclaw/config.json（推荐）

# 方式 B：当前 shell 会话设置环境变量
export OPENFINCLAW_API_KEY=fch_你的密钥

# 方式 C：单次命令传入
npx @openfinclaw/cli price AAPL --api-key fch_你的密钥

# 查询价格
npx @openfinclaw/cli price AAPL
npx @openfinclaw/cli price BTC/USDT

# 获取 K 线数据
npx @openfinclaw/cli kline 600519.SH --limit 30

# 多资产对比
npx @openfinclaw/cli compare AAPL,GOOGL,MSFT,AMZN

# 搜索代码
npx @openfinclaw/cli search "茅台"

# 诊断配置
npx @openfinclaw/cli doctor
```

---

## 支持的平台

OpenFinClaw 支持所有兼容 MCP 协议的 Agent 平台：

| 类别 | 平台 |
|------|------|
| **聊天界面** | Claude Desktop, Claude.ai, ChatGPT, Chatbox, LM Studio |
| **IDE/编辑器** | Claude Code, VS Code (Copilot), Cursor, Windsurf, JetBrains Junie, Zed, Cline, Continue.dev |
| **CLI Agent** | Codex (OpenAI), OpenCode, Amazon Q CLI |
| **Agent 框架** | Hermes Agent, BeeAI, Swarms |
| **AI Agent** | OpenClaw, NanoClaw |
| **其他** | v0 (Vercel), Postman, Roo Code, Amp (Sourcegraph) |

### 各平台配置示例

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

在 MCP 配置中添加 OpenFinClaw（例如 `~/.openclaw/mcp.json`）：
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

## 工具分组与上下文优化

按需加载工具组，减少 token 消耗：

```bash
# 仅加载行情数据（~700 tokens）
npx @openfinclaw/cli serve --tools=datahub

# 仅加载策略管理（~1,000 tokens）
npx @openfinclaw/cli serve --tools=strategy

# 多个分组
npx @openfinclaw/cli serve --tools=datahub,strategy

# 全部工具（默认，~1,700 tokens）
npx @openfinclaw/cli serve
```

| 分组 | 工具 | tokens 估算 |
|------|------|------------|
| `datahub` | fin_price, fin_kline, fin_crypto, fin_compare, fin_slim_search | ~700 |
| `strategy` | skill_publish, skill_validate, skill_fork, skill_leaderboard, skill_get_info, skill_list_local, skill_publish_verify | ~1,000 |

---

## 架构

```
┌─────────────────────────────────┐
│       @openfinclaw/core         │  纯业务逻辑
│     (零平台依赖)                 │  API 客户端、类型、Schema
└──────────────┬──────────────────┘
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
   ┌───────┐ ┌─────┐ ┌──────┐
   │  MCP  │ │ CLI │ │ Init │
   │Server │ │ 模式│ │ 向导 │
   └───┬───┘ └──┬──┘ └──┬───┘
       │        │       │
       ▼        ▼       ▼
   20+ Agent  终端     自动配置
    平台      用户     各平台
```

项目是 monorepo 结构，包含两个包：

- **`@openfinclaw/core`** — 平台无关的业务逻辑（API 客户端、类型定义、工具 Schema）
- **`@openfinclaw/cli`** — MCP Server + CLI 命令 + 交互式安装向导

---

## 环境变量

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `OPENFINCLAW_API_KEY` | 密钥来源之一 | Hub 与 DataHub API Key（`fch_` 前缀）。若未传 `--api-key`，可在 init 后回退读取 `~/.openfinclaw/config.json`。 | — |
| `OPENFINCLAW_CONFIG_PATH` | 否 | 覆盖 JSON 配置文件路径 `{ "apiKey": "..." }`（测试或自定义） | `~/.openfinclaw/config.json` |
| `HUB_API_URL` | 否 | Hub API 地址 | `https://hub.openfinclaw.ai` |
| `DATAHUB_GATEWAY_URL` | 否 | DataHub 网关地址 | `https://datahub.openfinclaw.ai` |
| `REQUEST_TIMEOUT_MS` | 否 | HTTP 请求超时（毫秒） | `60000` |

在 [hub.openfinclaw.ai](https://hub.openfinclaw.ai) 获取 API Key。

---

## 开发

```bash
# 克隆并安装
git clone https://github.com/mirror29/openfinclaw-cli.git
cd openfinclaw-cli
pnpm install

# 构建所有包
pnpm build

# 本地运行 CLI
OPENFINCLAW_API_KEY=fch_xxx node packages/cli/dist/index.js price AAPL

# 本地运行 MCP Server
OPENFINCLAW_API_KEY=fch_xxx node packages/cli/dist/index.js serve
```

---

## 许可证

MIT
