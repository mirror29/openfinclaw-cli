import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  resolveConfigFromEnv,
  DEFAULT_HUB_API_URL,
  DEFAULT_DATAHUB_GATEWAY_URL,
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

  it("should throw if OPENFINCLAW_API_KEY is not set", () => {
    delete process.env.OPENFINCLAW_API_KEY;
    expect(() => resolveConfigFromEnv()).toThrow("OPENFINCLAW_API_KEY");
  });

  it("should resolve config with defaults", () => {
    process.env.OPENFINCLAW_API_KEY = "fch_test123";
    const config = resolveConfigFromEnv();
    expect(config.apiKey).toBe("fch_test123");
    expect(config.hubApiUrl).toBe(DEFAULT_HUB_API_URL);
    expect(config.datahubGatewayUrl).toBe(DEFAULT_DATAHUB_GATEWAY_URL);
    expect(config.requestTimeoutMs).toBe(DEFAULT_TIMEOUT_MS);
  });

  it("should use custom URLs from env", () => {
    process.env.OPENFINCLAW_API_KEY = "fch_test";
    process.env.HUB_API_URL = "https://custom-hub.example.com/";
    process.env.DATAHUB_GATEWAY_URL = "https://custom-datahub.example.com//";
    const config = resolveConfigFromEnv();
    expect(config.hubApiUrl).toBe("https://custom-hub.example.com");
    expect(config.datahubGatewayUrl).toBe("https://custom-datahub.example.com");
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
