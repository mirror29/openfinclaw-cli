import { describe, it, expect } from "vitest";
import {
  skillLeaderboardSchema,
  skillGetInfoSchema,
  skillForkSchema,
  skillListLocalSchema,
  skillValidateSchema,
  skillPublishSchema,
  skillPublishVerifySchema,
} from "../strategy/tools.js";

describe("Strategy tool schemas", () => {
  it("skillLeaderboardSchema should have optional boardType enum", () => {
    expect(skillLeaderboardSchema.properties.boardType.enum).toEqual([
      "composite", "returns", "risk", "popular", "rising",
    ]);
  });

  it("skillGetInfoSchema should require strategyId", () => {
    expect(skillGetInfoSchema.required).toContain("strategyId");
  });

  it("skillForkSchema should require strategyId", () => {
    expect(skillForkSchema.required).toContain("strategyId");
    expect(skillForkSchema.properties.name.type).toBe("string");
  });

  it("skillListLocalSchema should have no required params", () => {
    expect(skillListLocalSchema.required).toHaveLength(0);
  });

  it("skillValidateSchema should require dirPath", () => {
    expect(skillValidateSchema.required).toContain("dirPath");
  });

  it("skillPublishSchema should require filePath", () => {
    expect(skillPublishSchema.required).toContain("filePath");
    expect(skillPublishSchema.properties.visibility.enum).toEqual([
      "public", "private", "unlisted",
    ]);
  });

  it("skillPublishVerifySchema should have optional params", () => {
    expect(skillPublishVerifySchema.required).toHaveLength(0);
    expect(skillPublishVerifySchema.properties.submissionId.type).toBe("string");
    expect(skillPublishVerifySchema.properties.backtestTaskId.type).toBe("string");
  });
});
