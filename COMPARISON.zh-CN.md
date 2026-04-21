<div align="center">

**[English](COMPARISON.md)** | **[中文](COMPARISON.zh-CN.md)**

</div>

# OpenFinClaw 与其它工具对比

与用户常问到的量化工具做一次诚实、不带营销口吻的对比。我们尽量对竞品公平 ——
合适的工具取决于你的工作流，不取决于宣传口号。

## TL;DR

OpenFinClaw 不是用来取代 QuantConnect 或 Backtrader 的 —— 它处在一个
**不同的层**。把它理解成「**AI Agent 原生的量化工作流入口**」，而不是
又一个回测引擎。

| 你是这种情况 | 那应该考虑 |
|---|---|
| 想在 Claude Code / Cursor 里用一句自然语言跑完 **研究 → 策略 → 回测** 整条链路 | 要对自定义回测引擎做程序化精细控制 → **Backtrader** / **Zipline** |
| 想零基础先试一下，不想维护基础设施也不想学一门 DSL | 已经是 **QuantConnect** / **JoinQuant** 的熟练用户，管线跑得好好的 |
| 日常在用兼容 MCP 的 AI Agent，想把量化工作流塞进去 | 不用 AI Agent，IDE + Jupyter 就是你的主战场 |

---

## 一句话定位

| 工具 | 定位 |
|---|---|
| **OpenFinClaw** | AI Agent 原生。一句自然语言 → 研究 → 策略 → 回测整条流程。在任意 MCP 客户端内运行。 |
| **QuantConnect** | 成熟的云端算法交易平台。Python / C#，覆盖研发到实盘，集成券商，自带 Web IDE。 |
| **Backtrader** | 本地 Python 回测库。高度可编程，自托管。 |
| **Zipline Reloaded** | Python 回测框架，Quantopian 遗产，本地、开源、pandas 原生。 |
| **JoinQuant / 聚宽** | 面向中国市场的云端量化平台。A 股 + 期货，中文界面。 |
| **通用 MCP finance server**（只提供一种数据源的 MCP 工具） | 只给 Agent 一个数据切片（行情 / 基本面 / 新闻），没有研究智能，也不做策略生成。 |
| **纯 Claude / ChatGPT** | 擅长讲解和起草，但没有工具集成就没法真正拉数据、跑回测。 |

---

## 功能矩阵

| 能力 | OpenFinClaw | QuantConnect | Backtrader | JoinQuant | 通用 MCP finance |
|---|:---:|:---:|:---:|:---:|:---:|
| AI Agent 原生（MCP） | ✅ | ❌ | ❌ | ❌ | ✅ |
| 一句自然语言跑完整条链路 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 覆盖美股 + A 股 + 港股 + 加密 + 外汇 | ✅ | ✅ | 部分 | 仅 A 股 | 视情况 |
| 终端流式输出 | ✅ | ❌ | ❌ | ❌ | 部分 |
| 云端回测（免基础设施） | ✅ | ✅ | ❌（本地） | ✅ | ❌ |
| 可自托管的开源运行时 | CLI/MCP 开源 · 后端闭源 | ❌ | ✅ | ❌ | 视情况 |
| 实盘券商对接 | 规划中 | ✅ | 通过插件 | ✅ | ❌ |
| 社区策略交易所 | ✅ 排行榜 + Fork + 发布 | 部分（共享项目） | ❌ | 部分 | ❌ |
| 零注册即可试用 | ✅ [在线体验](https://hub.openfinclaw.ai/en/chat) | 有限沙箱 | 完全免费 | 有限 | 视情况 |
| 学习曲线 | 一句 Prompt | Python + 它们的 DSL | Python | Python | 各工具各异 |

---

## 何时选 OpenFinClaw

- 日常就泡在 **Claude Code / Cursor / 某个 MCP Agent** 里 —— 想把量化工作流装进去，而不是切到另一个 IDE 或浏览器标签页。
- 你更愿意**描述**一个策略，用自然语言去迭代，而不是手写入场出场 DSL。
- 想一个入口覆盖**多市场**（美股 · A 股 · 港股 · 加密 · 外汇），不想在多个账号间来回切。
- 想逛社区排行榜、Fork 别人的策略、改吧改吧再发回去 —— 把量化研究当成协作循环，而不是独自的修行。

## 何时不选 OpenFinClaw

- **现在就需要实盘执行。** Paper/Live 引擎还在规划期，没落地。今天要跑真金白银 → **QuantConnect**、Alpaca 或直接用券商 SDK。
- **需要对回测引擎做完全掌控。** 自定义手续费模型、自定义交易日历、超低延迟模拟 → 直接上 **Backtrader** / **Zipline**。
- **你是中国市场的专业量化从业者。** **JoinQuant / 米筐 / 聚宽** 的 A 股微结构数据和券商连通性目前比我们深。
- **你不用 AI Agent。** 如果你只在 VS Code + Jupyter 里工作，没用 MCP 客户端，那 OpenFinClaw 最有价值的那一面（MCP + 自然语言 CLI）基本浪费了。
- **需要学术级 / 研究级回测**（完整审计链路、无幸存者偏差的数据集）。我们是为**迭代速度**优化的，不是为同行评审优化的。

---

## 不那么显眼的那一层

OpenFinClaw 处在一个 18 个月前还不存在的层次：**AI Agent 与量化后端之间**。

它的前提假设是：你已经买账了 AI Agent 驱动的工作流。如果你还没，那别的
工具会显得更顺手。如果你已经是，OpenFinClaw 会抹掉 AI 辅助量化里最大的
那道坎 —— 「**一段聪明的 Prompt**」到「**一个可迭代、可回测、可交付的
策略包**」之间的鸿沟。

我们乐于与其他工具共存。很多用户用 OpenFinClaw 做灵感探索，然后把 FEP v2.0
策略包导出到 QuantConnect 或 Backtrader 里做更深入的回测 —— 这是完全
合理的工作流，我们的设计里没有任何地方阻止你这么做。

---

## 发现错误或缺了什么工具？

欢迎给 [`COMPARISON.md`](./COMPARISON.md) 或中文版
[`COMPARISON.zh-CN.md`](./COMPARISON.zh-CN.md) 提 PR。
我们更在乎把这一页写对，而不是在对比里赢。
