/**
 * @openfinclaw/core — Platform-independent financial tools core.
 * @module @openfinclaw/core
 */

// Config
export {
  type OpenFinClawConfig,
  resolveConfigFromEnv,
  DEFAULT_HUB_API_URL,
  DEFAULT_DATAHUB_GATEWAY_URL,
  DEFAULT_TIMEOUT_MS,
} from "./config.js";

// Types
export * from "./types.js";

// DataHub
export { DataHubClient, guessMarket } from "./datahub/client.js";
export {
  executeFinPrice,
  finPriceSchema,
  executeFinKline,
  finKlineSchema,
  executeFinCrypto,
  finCryptoSchema,
  executeFinCompare,
  finCompareSchema,
  executeFinSlimSearch,
  finSlimSearchSchema,
} from "./datahub/tools.js";

// Strategy
export { hubApiRequest } from "./strategy/client.js";

// Strategy tools
export {
  executeSkillLeaderboard,
  skillLeaderboardSchema,
  executeSkillGetInfo,
  skillGetInfoSchema,
  executeSkillFork,
  skillForkSchema,
  executeSkillListLocal,
  skillListLocalSchema,
  executeSkillValidate,
  skillValidateSchema,
  executeSkillPublish,
  skillPublishSchema,
  executeSkillPublishVerify,
  skillPublishVerifySchema,
} from "./strategy/tools.js";

// Strategy utilities
export { forkStrategy, fetchStrategyInfo } from "./strategy/fork.js";
export { listLocalStrategies, getStrategiesRoot } from "./strategy/storage.js";
export { validateStrategyPackage } from "./strategy/validate.js";

// Scheduler tools
export {
  executeStrategyDailyScan, strategyDailyScanSchema,
  executeStrategyPriceMonitor, strategyPriceMonitorSchema,
  executeStrategyScanHistory, strategyScanHistorySchema,
  executeStrategyPeriodicReport, strategyPeriodicReportSchema,
} from "./scheduler/tools.js";

// Tournament tools
export {
  executeTournamentPick, tournamentPickSchema,
  executeTournamentLeaderboard, tournamentLeaderboardSchema,
  executeTournamentResult, tournamentResultSchema,
} from "./tournament/tools.js";

// Prompt guidance
export { OPENFINCLAW_AGENT_GUIDANCE } from "./prompt-guidance.js";
