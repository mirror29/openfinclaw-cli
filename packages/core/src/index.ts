/**
 * @openfinclaw/core — Platform-independent financial tools core.
 * @module @openfinclaw/core
 */

// Config
export {
  type OpenFinClawConfig,
  type ResolveOpenFinClawConfigOptions,
  resolveConfigFromEnv,
  resolveOpenFinClawConfig,
  resolveDeepAgentApiKey,
  getUserConfigFilePath,
  readApiKeyFromConfigFile,
  DEFAULT_HUB_API_URL,
  DEFAULT_DEEPAGENT_API_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_SSE_TIMEOUT_MS,
} from "./config.js";

// Types
export * from "./types.js";

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

// DeepAgent (remote multi-agent research / strategy-generation)
export {
  deepagentApiRequest,
  parseDeepAgentSSE,
  getDeepAgentTask,
  listDeepAgentTasks,
  clearDeepAgentTask,
  startDeepAgentRun,
} from "./deepagent/client.js";
export type {
  DeepAgentHealth,
  DeepAgentSkill,
  DeepAgentSkillsResponse,
  DeepAgentThread,
  DeepAgentMessage,
  DeepAgentBacktestSummary,
  DeepAgentBacktestsResponse,
  DeepAgentPackage,
  DeepAgentPackagesResponse,
  DeepAgentSSEEvent,
  DeepAgentSSEEventType,
  DeepAgentTaskState,
} from "./deepagent/types.js";
export {
  executeDeepagentHealth,
  deepagentHealthSchema,
  executeDeepagentSkills,
  deepagentSkillsSchema,
  executeDeepagentThreads,
  deepagentThreadsSchema,
  executeDeepagentMessages,
  deepagentMessagesSchema,
  executeDeepagentResearchSubmit,
  deepagentResearchSubmitSchema,
  executeDeepagentResearchPoll,
  deepagentResearchPollSchema,
  executeDeepagentResearchFinalize,
  deepagentResearchFinalizeSchema,
  executeDeepagentStatus,
  deepagentStatusSchema,
  executeDeepagentCancel,
  deepagentCancelSchema,
  executeDeepagentBacktests,
  deepagentBacktestsSchema,
  executeDeepagentBacktestResult,
  deepagentBacktestResultSchema,
  executeDeepagentPackages,
  deepagentPackagesSchema,
  executeDeepagentPackageMeta,
  deepagentPackageMetaSchema,
  executeDeepagentDownloadPackage,
  deepagentDownloadPackageSchema,
} from "./deepagent/tools.js";

// Prompt guidance
export { OPENFINCLAW_AGENT_GUIDANCE } from "./prompt-guidance.js";
