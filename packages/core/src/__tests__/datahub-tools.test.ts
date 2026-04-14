import { describe, it, expect } from "vitest";
import {
  finPriceSchema,
  finKlineSchema,
  finCryptoSchema,
  finCompareSchema,
  finSlimSearchSchema,
} from "../datahub/tools.js";

describe("DataHub tool schemas", () => {
  it("finPriceSchema should require symbol", () => {
    expect(finPriceSchema.required).toContain("symbol");
    expect(finPriceSchema.properties.symbol.type).toBe("string");
  });

  it("finPriceSchema should have optional market enum", () => {
    expect(finPriceSchema.properties.market.enum).toEqual(["crypto", "equity"]);
  });

  it("finKlineSchema should require symbol", () => {
    expect(finKlineSchema.required).toContain("symbol");
    expect(finKlineSchema.properties.limit.type).toBe("number");
  });

  it("finCryptoSchema should require endpoint with valid enum", () => {
    expect(finCryptoSchema.required).toContain("endpoint");
    const endpoints = finCryptoSchema.properties.endpoint.enum;
    expect(endpoints).toContain("market/ticker");
    expect(endpoints).toContain("coin/market");
    expect(endpoints).toContain("defi/protocols");
    expect(endpoints).toContain("search");
    expect(endpoints.length).toBeGreaterThanOrEqual(22);
  });

  it("finCompareSchema should require symbols", () => {
    expect(finCompareSchema.required).toContain("symbols");
  });

  it("finSlimSearchSchema should require query", () => {
    expect(finSlimSearchSchema.required).toContain("query");
  });
});
