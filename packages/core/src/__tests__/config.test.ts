import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  resolveConfigFromEnv,
  resolveOpenFinClawConfig,
  readApiKeyFromConfigFile,
  getUserConfigFilePath,
  DEFAULT_HUB_API_URL,
  DEFAULT_TIMEOUT_MS,
} from "../config.js";

describe("resolveConfigFromEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should throw if no API key in env or file", () => {
    delete process.env.OPENFINCLAW_API_KEY;
    process.env.OPENFINCLAW_CONFIG_PATH = join(
      tmpdir(),
      `openfinclaw-missing-config-${Date.now()}.json`,
    );
    expect(() => resolveConfigFromEnv()).toThrow(/No API key found/);
  });

  it("should resolve config with defaults", () => {
    process.env.OPENFINCLAW_API_KEY = "fch_test123";
    const config = resolveConfigFromEnv();
    expect(config.apiKey).toBe("fch_test123");
    expect(config.hubApiUrl).toBe(DEFAULT_HUB_API_URL);
    expect(config.requestTimeoutMs).toBe(DEFAULT_TIMEOUT_MS);
  });

  it("should use custom URLs from env", () => {
    process.env.OPENFINCLAW_API_KEY = "fch_test";
    process.env.HUB_API_URL = "https://custom-hub.example.com/";
    const config = resolveConfigFromEnv();
    expect(config.hubApiUrl).toBe("https://custom-hub.example.com");
  });

  it("should clamp timeout to valid range", () => {
    process.env.OPENFINCLAW_API_KEY = "fch_test";
    process.env.REQUEST_TIMEOUT_MS = "1000";
    expect(resolveConfigFromEnv().requestTimeoutMs).toBe(5000);

    process.env.REQUEST_TIMEOUT_MS = "999999";
    expect(resolveConfigFromEnv().requestTimeoutMs).toBe(300_000);

    process.env.REQUEST_TIMEOUT_MS = "30000";
    expect(resolveConfigFromEnv().requestTimeoutMs).toBe(30000);
  });

  it("should trim whitespace from API key", () => {
    process.env.OPENFINCLAW_API_KEY = "  fch_test  ";
    expect(resolveConfigFromEnv().apiKey).toBe("fch_test");
  });
});

describe("resolveOpenFinClawConfig priority", () => {
  const originalEnv = { ...process.env };
  let tempConfigPath: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    tempConfigPath = join(tmpdir(), `ofc-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    process.env.OPENFINCLAW_CONFIG_PATH = tempConfigPath;
    writeFileSync(tempConfigPath, JSON.stringify({ apiKey: "fch_from_file" }), "utf-8");
  });

  afterEach(() => {
    process.env = originalEnv;
    try {
      unlinkSync(tempConfigPath);
    } catch {
      /* ignore */
    }
  });

  it("should prefer explicit apiKey over env and file", () => {
    process.env.OPENFINCLAW_API_KEY = "fch_from_env";
    const config = resolveOpenFinClawConfig({ apiKey: "fch_explicit" });
    expect(config.apiKey).toBe("fch_explicit");
  });

  it("should prefer env over file when both set", () => {
    process.env.OPENFINCLAW_API_KEY = "fch_from_env";
    const config = resolveOpenFinClawConfig();
    expect(config.apiKey).toBe("fch_from_env");
  });

  it("should read apiKey from file when env unset", () => {
    delete process.env.OPENFINCLAW_API_KEY;
    const config = resolveOpenFinClawConfig();
    expect(config.apiKey).toBe("fch_from_file");
  });
});

describe("readApiKeyFromConfigFile", () => {
  it("returns undefined for missing file", () => {
    expect(readApiKeyFromConfigFile(join(tmpdir(), "nonexistent-openfinclaw-xyz.json"))).toBeUndefined();
  });

  it("parses apiKey from valid JSON", () => {
    const dir = join(tmpdir(), `ofc-read-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const p = join(dir, "c.json");
    writeFileSync(p, JSON.stringify({ apiKey: "  fch_ok  " }), "utf-8");
    expect(readApiKeyFromConfigFile(p)).toBe("fch_ok");
  });
});

describe("getUserConfigFilePath", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = originalEnv;
  });

  it("respects OPENFINCLAW_CONFIG_PATH", () => {
    process.env.OPENFINCLAW_CONFIG_PATH = "/tmp/custom.json";
    expect(getUserConfigFilePath()).toBe("/tmp/custom.json");
  });
});
