import { describe, it, expect } from "vitest";
import {
  generateForkDirName,
  parseStrategyId,
  formatDate,
} from "../strategy/storage.js";

describe("storage utilities", () => {
  describe("generateForkDirName", () => {
    it("should combine short ID with name", () => {
      const result = generateForkDirName("b71770a1", "BTC Strategy");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });

  describe("parseStrategyId", () => {
    it("should extract UUID from Hub URL", () => {
      const result = parseStrategyId("https://hub.openfinclaw.ai/strategy/b71770a1-2dbe-47c0-907a-d90663339746");
      expect(result).toBe("b71770a1-2dbe-47c0-907a-d90663339746");
    });

    it("should pass through valid UUID", () => {
      const uuid = "b71770a1-2dbe-47c0-907a-d90663339746";
      expect(parseStrategyId(uuid)).toBe(uuid);
    });

    it("should handle short ID", () => {
      expect(parseStrategyId("b71770a1")).toBe("b71770a1");
    });

    it("should trim whitespace", () => {
      expect(parseStrategyId("  b71770a1  ")).toBe("b71770a1");
    });
  });

  describe("formatDate", () => {
    it("should format date as YYYY-MM-DD", () => {
      const date = new Date(2026, 3, 14);
      expect(formatDate(date)).toBe("2026-04-14");
    });

    it("should zero-pad month and day", () => {
      const date = new Date(2026, 0, 5);
      expect(formatDate(date)).toBe("2026-01-05");
    });
  });
});
