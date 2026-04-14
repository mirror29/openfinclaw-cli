import { describe, it, expect } from "vitest";
import { guessMarket } from "../datahub/client.js";

describe("guessMarket", () => {
  it("should detect crypto symbols with /", () => {
    expect(guessMarket("BTC/USDT")).toBe("crypto");
    expect(guessMarket("ETH/USDT")).toBe("crypto");
  });

  it("should detect A-share symbols", () => {
    expect(guessMarket("600519.SH")).toBe("equity");
    expect(guessMarket("000001.SZ")).toBe("equity");
    expect(guessMarket("300750.SZ")).toBe("equity");
  });

  it("should detect HK stock symbols", () => {
    expect(guessMarket("00700.HK")).toBe("equity");
    expect(guessMarket("09988.HK")).toBe("equity");
  });

  it("should detect US stock symbols (pure letters)", () => {
    expect(guessMarket("AAPL")).toBe("equity");
    expect(guessMarket("GOOGL")).toBe("equity");
    expect(guessMarket("MSFT")).toBe("equity");
  });

  it("should detect BJ symbols", () => {
    expect(guessMarket("430047.BJ")).toBe("equity");
  });

  it("should detect numeric-only symbols as equity", () => {
    expect(guessMarket("600519")).toBe("equity");
    expect(guessMarket("00001")).toBe("equity");
  });

  it("should default to crypto for ambiguous symbols", () => {
    expect(guessMarket("BTCUSDT")).toBe("crypto");
  });
});
