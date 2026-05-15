import { describe, it, expect } from "vitest";
import {
  strategyLeaderboardSchema,
  strategyGetInfoSchema,
  strategyForkSchema,
  strategyListLocalSchema,
  strategyValidateSchema,
  strategyPublishSchema,
  strategyPublishVerifySchema,
} from "../strategy/tools.js";

describe("Strategy tool schemas", () => {
  it("strategyLeaderboardSchema should have optional boardType enum", () => {
    expect(strategyLeaderboardSchema.properties.boardType.enum).toEqual([
      "composite", "returns", "risk", "popular", "rising",
    ]);
  });

  it("strategyGetInfoSchema should require strategyId", () => {
    expect(strategyGetInfoSchema.required).toContain("strategyId");
  });

  it("strategyForkSchema should require strategyId", () => {
    expect(strategyForkSchema.required).toContain("strategyId");
    expect(strategyForkSchema.properties.name.type).toBe("string");
  });

  it("strategyListLocalSchema should have no required params", () => {
    expect(strategyListLocalSchema.required).toHaveLength(0);
  });

  it("strategyValidateSchema should require dirPath", () => {
    expect(strategyValidateSchema.required).toContain("dirPath");
  });

  it("strategyPublishSchema should require filePath", () => {
    expect(strategyPublishSchema.required).toContain("filePath");
    expect(strategyPublishSchema.properties.visibility.enum).toEqual([
      "public", "private", "unlisted",
    ]);
  });

  it("strategyPublishVerifySchema should have optional params", () => {
    expect(strategyPublishVerifySchema.required).toHaveLength(0);
    expect(strategyPublishVerifySchema.properties.submissionId.type).toBe("string");
    expect(strategyPublishVerifySchema.properties.backtestTaskId.type).toBe("string");
  });
});
