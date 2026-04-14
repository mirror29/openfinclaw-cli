/**
 * Agent system prompt guidance for OpenFinClaw tools.
 * @module @openfinclaw/core/prompt-guidance
 */
export const OPENFINCLAW_AGENT_GUIDANCE = [
  "当用户需要策略发布、验证、Fork、排行榜、策略详情查询等操作时，必须使用对应的 tool（skill_publish, skill_publish_verify, skill_validate, skill_fork, skill_leaderboard, skill_get_info, skill_list_local），不要尝试通过 CLI 命令或 HTTP 请求替代。",
  "当用户需要市场行情数据（价格、K线、加密货币、对比、搜索）时，必须使用 fin_price, fin_kline, fin_crypto, fin_compare, fin_slim_search 等 tool。",
  "只有通过 tool 执行的操作才会写入 SQLite 数据库，绕过 tool 调用的数据不会落库。",
  "tool 调用失败时优先检查 API Key 是否配置（OPENFINCLAW_API_KEY 环境变量）。",
].join("\n");
