/**
 * DataHub tool execute functions and JSON schemas.
 * Pure functions — no framework dependency.
 * @module @openfinclaw/core/datahub/tools
 */
import type { OpenFinClawConfig } from "../config.js";
import type { MarketType } from "../types.js";
import { DataHubClient, guessMarket } from "./client.js";

/** Helper to pick string params. */
function pick(params: Record<string, unknown>, ...keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    if (params[k] != null) out[k] = String(params[k]);
  }
  return out;
}

function makeClient(config: OpenFinClawConfig): DataHubClient {
  return new DataHubClient(config.datahubGatewayUrl, config.apiKey, config.requestTimeoutMs);
}

// ── fin_price ────────────────────────────────────────────────────────────

export const finPriceSchema = {
  type: "object" as const,
  properties: {
    symbol: {
      type: "string",
      description:
        "Asset symbol. Crypto: BTC/USDT, ETH/USDT; A-share: 600519.SH; HK: 00700.HK; US: AAPL",
    },
    market: {
      type: "string",
      enum: ["crypto", "equity"],
      description: "Market type. Auto-detected if omitted.",
    },
  },
  required: ["symbol"],
};

export async function executeFinPrice(
  params: { symbol: string; market?: string },
  config: OpenFinClawConfig,
) {
  const client = makeClient(config);
  const symbol = String(params.symbol);
  const market = (params.market as MarketType) ?? guessMarket(symbol);
  const ticker = await client.getTicker(symbol, market);
  return {
    symbol: ticker.symbol,
    market: ticker.market,
    price: ticker.last,
    volume24h: ticker.volume24h,
    timestamp: new Date(ticker.timestamp).toISOString(),
  };
}

// ── fin_kline ────────────────────────────────────────────────────────────

export const finKlineSchema = {
  type: "object" as const,
  properties: {
    symbol: { type: "string", description: "Asset symbol (BTC/USDT, 600519.SH, AAPL, etc.)" },
    market: { type: "string", enum: ["crypto", "equity"], description: "Market type (auto-detected if omitted)" },
    limit: { type: "number", description: "Number of bars to return (default: 30)" },
  },
  required: ["symbol"],
};

export async function executeFinKline(
  params: { symbol: string; market?: string; limit?: number },
  config: OpenFinClawConfig,
) {
  const client = makeClient(config);
  const symbol = String(params.symbol);
  const market = (params.market as MarketType) ?? guessMarket(symbol);
  const limit = params.limit ?? 30;
  const ohlcv = await client.getOHLCV({ symbol, market, limit });
  return {
    symbol,
    market,
    count: ohlcv.length,
    bars: ohlcv.map((b) => ({
      date: new Date(b.timestamp).toISOString().slice(0, 10),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
    })),
  };
}

// ── fin_crypto ───────────────────────────────────────────────────────────

export const finCryptoSchema = {
  type: "object" as const,
  properties: {
    endpoint: {
      type: "string",
      enum: [
        "market/ticker", "market/tickers", "market/orderbook", "market/trades",
        "market/funding_rate", "coin/market", "coin/historical", "coin/info",
        "coin/categories", "coin/trending", "coin/global_stats",
        "defi/protocols", "defi/tvl_historical", "defi/protocol_tvl", "defi/chains",
        "defi/yields", "defi/stablecoins", "defi/fees", "defi/dex_volumes",
        "defi/bridges", "defi/coin_prices", "price/historical", "search",
      ],
      description: "DataHub crypto endpoint path",
    },
    symbol: { type: "string", description: "Coin ID, trading pair, or protocol slug" },
    start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
    end_date: { type: "string", description: "End date (YYYY-MM-DD)" },
    limit: { type: "number", description: "Max results (default: 20)" },
  },
  required: ["endpoint"],
};

export async function executeFinCrypto(
  params: { endpoint: string; symbol?: string; start_date?: string; end_date?: string; limit?: number },
  config: OpenFinClawConfig,
) {
  const client = makeClient(config);
  const endpoint = String(params.endpoint ?? "coin/market");
  const qp = pick(params as Record<string, unknown>, "symbol", "start_date", "end_date", "limit");
  if (!qp.limit) qp.limit = "20";
  if (qp.symbol) {
    const coinIdEndpoints = ["coin/historical", "coin/info"];
    if (coinIdEndpoints.includes(endpoint)) {
      qp.coin_id = qp.symbol;
      delete qp.symbol;
    } else if (endpoint === "defi/protocol_tvl") {
      qp.protocol = qp.symbol;
      delete qp.symbol;
    } else if (endpoint === "defi/coin_prices") {
      qp.coins = qp.symbol;
      delete qp.symbol;
    }
  }
  const results = await client.crypto(endpoint, qp);
  return { success: true, endpoint: `crypto/${endpoint}`, count: results.length, results };
}

// ── fin_compare ──────────────────────────────────────────────────────────

export const finCompareSchema = {
  type: "object" as const,
  properties: {
    symbols: {
      type: "string",
      description: "Comma-separated symbols (2-5). Example: BTC/USDT,ETH/USDT,600519.SH",
    },
  },
  required: ["symbols"],
};

export async function executeFinCompare(
  params: { symbols: string },
  config: OpenFinClawConfig,
) {
  const client = makeClient(config);
  const symbols = String(params.symbols).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5);
  if (symbols.length < 2) return { error: "Need at least 2 symbols, comma-separated" };

  const results = await Promise.allSettled(
    symbols.map(async (sym) => {
      const market = guessMarket(sym);
      const ticker = await client.getTicker(sym, market);
      const bars = await client.getOHLCV({ symbol: sym, market, limit: 7 });
      const weekAgo = bars.length > 0 ? bars[0]!.close : ticker.last;
      const weekChange = weekAgo > 0 ? ((ticker.last - weekAgo) / weekAgo) * 100 : 0;
      return { symbol: sym, market, price: ticker.last, weekChange: parseFloat(weekChange.toFixed(2)) };
    }),
  );

  return {
    comparison: results.map((r, i) =>
      r.status === "fulfilled" ? r.value : { symbol: symbols[i], error: (r.reason as Error).message },
    ),
  };
}

// ── fin_slim_search ──────────────────────────────────────────────────────

export const finSlimSearchSchema = {
  type: "object" as const,
  properties: {
    query: { type: "string", description: "Search keyword (e.g. '茅台', 'bitcoin', 'Tesla')" },
    market: { type: "string", enum: ["crypto", "equity"], description: "Limit search to market type" },
  },
  required: ["query"],
};

export async function executeFinSlimSearch(
  params: { query: string; market?: string },
  config: OpenFinClawConfig,
) {
  const client = makeClient(config);
  const q = String(params.query);
  const market = params.market;
  const results: unknown[] = [];

  if (!market || market === "crypto") {
    try {
      const crypto = await client.crypto("search", { query: q, limit: "5" });
      results.push(...crypto.map((r) => ({ ...(r as object), market: "crypto" })));
    } catch { /* ignore */ }
  }

  if (!market || market === "equity") {
    try {
      const equity = await client.equity("search", { query: q, limit: "5" });
      results.push(...equity.map((r) => ({ ...(r as object), market: "equity" })));
    } catch { /* ignore */ }
  }

  return { query: q, count: results.length, results };
}
