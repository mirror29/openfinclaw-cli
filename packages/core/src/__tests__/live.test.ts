/**
 * Live API tests — only run when OPENFINCLAW_API_KEY is set.
 * Run with: OPENFINCLAW_API_KEY=fch_xxx pnpm test
 */
import { describe, it, expect } from "vitest";
import { resolveConfigFromEnv } from "../config.js";
import { executeSkillLeaderboard } from "../strategy/tools.js";

const HAS_KEY = !!process.env.OPENFINCLAW_API_KEY;

describe.skipIf(!HAS_KEY)("Live API tests", () => {
  it("should fetch leaderboard from Hub API", async () => {
    const config = resolveConfigFromEnv();
    const result = await executeSkillLeaderboard({ boardType: "composite", limit: 5 }, config);
    expect(result.board).toBe("composite");
    expect(result.strategies.length).toBeGreaterThan(0);
    expect(result.strategies.length).toBeLessThanOrEqual(5);

    const first = result.strategies[0]!;
    expect(first.name).toBeTruthy();
    expect(first.id).toBeTruthy();
    expect(first.rank).toBe(1);
  });

  it("should fetch leaderboard with different board types", async () => {
    const config = resolveConfigFromEnv();
    const result = await executeSkillLeaderboard({ boardType: "returns", limit: 3 }, config);
    expect(result.board).toBe("returns");
    expect(result.strategies.length).toBeGreaterThan(0);
    expect(result.strategies.length).toBeLessThanOrEqual(3);
  });
});
