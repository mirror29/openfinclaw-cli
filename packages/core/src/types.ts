/**
 * Type definitions for FEP v2.0 strategy packages.
 * @module @openfinclaw/core/types
 */

/** FEP protocol version */
export type FepVersion = "2.0";

/** Strategy style */
export type FepV2Style =
  | "trend"
  | "mean-reversion"
  | "momentum"
  | "value"
  | "growth"
  | "breakout"
  | "rotation"
  | "hybrid";

/** K-line timeframe */
export type FepV2Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

export interface FepV2Identity {
  id: string;
  name: string;
  type?: string;
  version?: string;
  style?: FepV2Style;
  visibility?: "public" | "private" | "unlisted";
  summary?: string;
  description?: string;
  tags?: string[];
  license?: string;
  author?: { name?: string; wallet?: string };
  changelog?: Array<{ version: string; date: string; changes: string }>;
}

export interface FepV2Technical {
  language?: string;
  entryPoint?: string;
}

export interface FepV2Universe {
  symbols: string[];
}

export interface FepV2Rebalance {
  frequency: "daily" | "weekly" | "monthly";
  maxHoldings?: number;
  weightMethod?: "equal" | "market_cap";
}

export interface FepV2Backtest {
  symbol: string;
  timeframe?: FepV2Timeframe;
  defaultPeriod: { startDate: string; endDate: string };
  initialCapital: number;
  universe?: FepV2Universe;
  rebalance?: FepV2Rebalance;
}

export interface FepV2Risk {
  maxDrawdownThreshold?: number;
  dailyLossLimitPct?: number;
  maxTradesPerDay?: number;
}

export interface FepV2Paper {
  barIntervalSeconds?: number;
  maxDurationHours?: number;
  warmupBars?: number;
  timeframe?: FepV2Timeframe;
}

export interface FepV2Parameter {
  name: string;
  default: string | number | boolean;
  type: "integer" | "number" | "string" | "boolean";
  label?: string;
  range?: { min?: number; max?: number; step?: number };
}

export interface FepV2Classification {
  archetype?: "systematic" | "discretionary" | "hybrid";
  market?: "Crypto" | "US" | "CN" | "HK" | "Forex" | "Commodity";
  assetClasses?: string[];
  frequency?: "daily" | "weekly" | "monthly";
  riskProfile?: "low" | "medium" | "high";
}

export interface FepV2Config {
  fep: FepVersion;
  identity: FepV2Identity;
  technical?: FepV2Technical;
  parameters?: FepV2Parameter[];
  backtest: FepV2Backtest;
  risk?: FepV2Risk;
  paper?: FepV2Paper;
  classification?: FepV2Classification;
}

export interface BacktestCoreMetrics {
  totalReturn: number;
  sharpe: number;
  maxDrawdown: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
}

export interface BacktestReturnAnalysis {
  sortino: number;
  annualizedReturn: number;
  calmar: number;
  returnsVolatility: number;
  riskReturnRatio: number;
}

export interface BacktestTradeAnalysis {
  expectancy: number;
  avgWinner: number;
  avgLoser: number;
  maxWinner: number;
  maxLoser: number;
  longRatio: number;
}

export interface BacktestExtendedMetrics {
  pnlTotal: number;
  startingBalance: number;
  endingBalance: number;
  backtestStart: string;
  backtestEnd: string;
  totalOrders: number;
}

export interface EquityCurvePoint {
  date: string;
  equity: number;
}

export interface DrawdownCurvePoint {
  date: string;
  drawdown: number;
}

export interface MonthlyReturnPoint {
  month: string;
  return: number;
}

export interface TradeRecord {
  open_date: string;
  close_date: string;
  side: string;
  quantity: number;
  avg_open: number;
  avg_close: number;
  realized_pnl: string;
  return_pct: number;
}

export interface BacktestPerformance {
  core?: BacktestCoreMetrics;
  returns?: BacktestReturnAnalysis;
  trades?: BacktestTradeAnalysis;
  extended?: BacktestExtendedMetrics;
  hints?: string[];
  monthlyReturns?: Record<string, number> | MonthlyReturnPoint[];
  recentValidation?: {
    decay?: { sharpeDecay30d: number; sharpeDecay90d: number; warning?: string };
    recent?: Array<{
      period?: string;
      window?: string;
      sharpe?: number;
      finalEquity?: number;
      maxDrawdown?: number;
      totalReturn?: number;
      totalTrades?: number;
    }>;
    historical?: {
      period?: string;
      sharpe?: number;
      finalEquity?: number;
      maxDrawdown?: number;
      totalReturn?: number;
      totalTrades?: number;
    };
  };
}

export interface BacktestResult {
  alpha?: number | null;
  taskId?: string;
  metadata?: {
    id?: string;
    name?: string;
    tags?: string[];
    type?: string;
    style?: string;
    author?: { name?: string };
    market?: string;
    license?: string;
    summary?: string;
    version?: string;
    archetype?: string;
    frequency?: string;
    riskLevel?: string;
    visibility?: string;
    description?: string;
    assetClasses?: string[];
    parameters?: FepV2Parameter[];
  };
  integrity?: {
    fepHash?: string;
    codeHash?: string;
    contentCID?: string;
    contentHash?: string;
    publishedAt?: string;
    timestampProof?: string;
  };
  performance?: BacktestPerformance;
  equityCurve?: EquityCurvePoint[];
  drawdownCurve?: DrawdownCurvePoint[];
  monthlyReturns?: MonthlyReturnPoint[];
  trades?: TradeRecord[];
}

export interface ForkMeta {
  sourceId: string;
  sourceShortId: string;
  sourceName: string;
  sourceVersion: string;
  sourceAuthor?: string;
  forkedAt: string;
  forkDateDir: string;
  hubUrl: string;
  localPath: string;
  forkEntryId?: string;
  forkEntrySlug?: string;
}

export interface LocalStrategy {
  name: string;
  displayName: string;
  localPath: string;
  dateDir: string;
  type: "forked" | "created";
  sourceId?: string;
  createdAt: string;
  performance?: StrategyPerformance;
}

export interface StrategyPerformance {
  totalReturn?: number;
  sharpe?: number;
  maxDrawdown?: number;
  winRate?: number;
  totalTrades?: number;
}

export interface HubPublicEntry {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  summary?: string;
  type?: string;
  tags?: string[];
  version: string;
  visibility: "public" | "private" | "unlisted";
  tier?: string;
  author?: { id?: string; slug?: string; displayName?: string; verified?: boolean };
  stats?: { fcsScore?: number; forkCount?: number; downloadCount?: number; viewCount?: number };
  backtestResult?: { sharpe?: number; totalReturn?: number; maxDrawdown?: number; winRate?: number };
  createdAt?: string;
  updatedAt?: string;
}

export type HubStrategyInfo = HubPublicEntry;

export interface ForkAndDownloadResponse {
  success: boolean;
  entry: { id: string; slug?: string; name: string; version: string };
  parent: { id: string; slug?: string; name: string };
  download: { url: string; filename: string; expiresInSeconds: number; contentHash?: string };
  forkedAt: string;
  creditsEarned?: { action: string; amount: number; message?: string };
}

export interface SkillApiConfig {
  baseUrl: string;
  apiKey: string | undefined;
  requestTimeoutMs: number;
}

export type BoardType = "composite" | "returns" | "risk" | "popular" | "rising";

export interface LeaderboardStrategy {
  id: string;
  slug: string;
  name: string;
  description?: string;
  market?: string;
  style?: string;
  riskLevel?: string;
  author?: { slug?: string; displayName?: string; verified?: boolean; isAgent?: boolean };
  publishedDays?: number;
  subscribers?: number;
  performance?: { returnSincePublish?: number; sharpeRatio?: number; maxDrawdown?: number; winRate?: number };
  scores?: { composite?: number; returns?: number; risk?: number; popular?: number };
  boardRanks?: {
    composite?: { rank: number; rankDelta?: number };
    returns?: { rank: number; rankDelta?: number };
    risk?: { rank: number; rankDelta?: number };
    popular?: { rank: number; rankDelta?: number };
    rising?: { rank: number; rankDelta?: number };
  };
  rank: number;
  rankDelta?: number;
  isNewEntry?: boolean;
  hotLabel?: string | null;
}

export interface LeaderboardResponse {
  board: string;
  strategies: LeaderboardStrategy[];
  total: number;
  cachedAt: string;
}

/** Market type */
export type MarketType = "crypto" | "equity";

/** OHLCV candlestick data */
export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Price ticker */
export interface Ticker {
  symbol: string;
  market: MarketType;
  last: number;
  volume24h?: number;
  timestamp: number;
}
