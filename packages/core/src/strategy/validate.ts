/**
 * Strategy package validation utilities.
 * Validates that a directory contains a valid FEP v2.0 strategy package
 * compatible with the Hub backtest engine.
 * @module @openfinclaw/core/strategy/validate
 */
import { readFile, stat, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { parse as parseYaml } from "yaml";
import type { FepV2Config } from "../types.js";

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fepConfig?: FepV2Config;
}

/** Hub-compatible riskProfile enum values */
const VALID_RISK_PROFILES = ["conservative", "moderate", "aggressive", "speculative"] as const;

/** Hub-compatible market enum values */
const VALID_MARKETS = ["Crypto", "US", "CN", "HK", "Forex", "Commodity"] as const;

/** Supported strategy code file extensions */
const CODE_EXTENSIONS = [".py", ".js", ".ts", ".mjs"];

/**
 * Recursively find all files in a directory tree.
 * @param dir - Directory to scan
 * @param prefix - Relative path prefix (used internally for recursion)
 * @returns Array of relative file paths
 */
async function findFilesRecursive(dir: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await findFilesRecursive(join(dir, entry.name), rel));
    } else {
      files.push(rel);
    }
  }
  return files;
}

/**
 * Check whether a strategy code file contains a `compute(data, context)` function.
 * Uses a simple regex scan — not a full AST parse — to balance accuracy and speed.
 * @param filePath - Absolute path to the code file
 * @returns true if `compute` function definition is found
 */
async function checkComputeFunction(filePath: string): Promise<boolean> {
  try {
    const content = await readFile(filePath, "utf-8");
    return /def\s+compute\s*\(\s*data\s*,\s*context\b/.test(content);
  } catch {
    return false;
  }
}

/**
 * Validate a strategy package directory.
 * Checks for required fep.yaml, validates its structure and semantics,
 * and verifies strategy code files are compatible with the Hub backtest engine.
 */
export async function validateStrategyPackage(dirPath: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Directory existence ──────────────────────────────────────────
  try {
    const dirStat = await stat(dirPath);
    if (!dirStat.isDirectory()) {
      return { valid: false, errors: [`Path is not a directory: ${dirPath}`], warnings };
    }
  } catch {
    return { valid: false, errors: [`Directory does not exist: ${dirPath}`], warnings };
  }

  // ── fep.yaml existence ───────────────────────────────────────────
  const fepPath = join(dirPath, "fep.yaml");
  let fepRaw: string;
  try {
    fepRaw = await readFile(fepPath, "utf-8");
  } catch {
    return { valid: false, errors: ["Missing required file: fep.yaml"], warnings };
  }

  // ── YAML parsing ─────────────────────────────────────────────────
  let fepConfig: FepV2Config;
  try {
    fepConfig = parseYaml(fepRaw) as FepV2Config;
  } catch (err) {
    return {
      valid: false,
      errors: [`Invalid YAML in fep.yaml: ${err instanceof Error ? err.message : String(err)}`],
      warnings,
    };
  }

  // ── Required version ──────────────────────────────────────────────
  if (!fepConfig.fep) {
    errors.push("Missing required field: fep (version)");
  } else if (fepConfig.fep !== "2.0") {
    errors.push(`Unsupported FEP version: ${fepConfig.fep} (expected 2.0)`);
  }

  // ── Identity ──────────────────────────────────────────────────────
  if (!fepConfig.identity) {
    errors.push("Missing required section: identity");
  } else {
    if (!fepConfig.identity.id) errors.push("Missing required field: identity.id");
    if (!fepConfig.identity.name) errors.push("Missing required field: identity.name");
  }

  // ── Backtest ──────────────────────────────────────────────────────
  if (!fepConfig.backtest) {
    errors.push("Missing required section: backtest");
  } else {
    if (!fepConfig.backtest.symbol) errors.push("Missing required field: backtest.symbol");
    if (!fepConfig.backtest.defaultPeriod) {
      errors.push("Missing required field: backtest.defaultPeriod");
    } else {
      const { startDate, endDate } = fepConfig.backtest.defaultPeriod;
      if (!startDate) errors.push("Missing required field: backtest.defaultPeriod.startDate");
      if (!endDate) errors.push("Missing required field: backtest.defaultPeriod.endDate");

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime())) {
          errors.push(`Invalid startDate: "${startDate}"`);
        }
        if (isNaN(end.getTime())) {
          errors.push(`Invalid endDate: "${endDate}"`);
        }
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
          errors.push("backtest.defaultPeriod.endDate must be after startDate");
        }
        if (!isNaN(end.getTime()) && end > new Date()) {
          warnings.push(`backtest.defaultPeriod.endDate (${endDate}) is in the future — Hub may not have data yet`);
        }
      }
    }
    if (fepConfig.backtest.initialCapital == null) {
      errors.push("Missing required field: backtest.initialCapital");
    } else if (fepConfig.backtest.initialCapital <= 0) {
      errors.push("backtest.initialCapital must be positive");
    }
  }

  // ── Classification enum checks ────────────────────────────────────
  if (fepConfig.classification) {
    const rp = fepConfig.classification.riskProfile;
    if (rp && !VALID_RISK_PROFILES.includes(rp as (typeof VALID_RISK_PROFILES)[number])) {
      errors.push(
        `classification.riskProfile "${rp}" is not Hub-compatible. Valid values: ${VALID_RISK_PROFILES.join(" | ")}`,
      );
    }
    const mkt = fepConfig.classification.market;
    if (mkt && !VALID_MARKETS.includes(mkt as (typeof VALID_MARKETS)[number])) {
      warnings.push(
        `classification.market "${mkt}" may not be Hub-recognized. Known values: ${VALID_MARKETS.join(" | ")}`,
      );
    }
  }

  // ── Recursive code file scan ──────────────────────────────────────
  let allFiles: string[] = [];
  try {
    allFiles = await findFilesRecursive(dirPath);
  } catch {
    warnings.push("Could not list directory contents");
  }

  const codeFiles = allFiles.filter((f) => {
    const ext = extname(f).toLowerCase();
    return CODE_EXTENSIONS.includes(ext);
  });
  if (codeFiles.length === 0) {
    warnings.push("No strategy code files found (.py, .js, .ts) in any subdirectory");
  }

  // ── Entry point validation ────────────────────────────────────────
  if (fepConfig.technical?.entryPoint) {
    const ep = fepConfig.technical.entryPoint;
    const epAbsolute = join(dirPath, ep);
    let epFound = false;
    try {
      await stat(epAbsolute);
      epFound = true;
    } catch {
      // Not at declared path — try Hub convention: file in scripts/ subdirectory
      const epInScripts = join(dirPath, "scripts", ep);
      try {
        await stat(epInScripts);
        // File exists in scripts/ but entryPoint only has filename — this is the Hub convention
        epFound = true;
      } catch {
        // Neither location works
      }
    }

    if (!epFound) {
      const hasSimilar = codeFiles.some((f) => f.split("/").pop() === ep);
      if (hasSimilar) {
        errors.push(
          `Entry point "${ep}" not found. Hub convention: place code in scripts/ and set entryPoint to just the filename (e.g. "strategy.py")`,
        );
      } else {
        errors.push(`Entry point file not found: ${ep}`);
      }
    }
  } else if (codeFiles.length > 0) {
    warnings.push('No technical.entryPoint specified — Hub requires this (e.g. "strategy.py")');
  }

  // ── compute() function check ──────────────────────────────────────
  if (codeFiles.length > 0) {
    let foundCompute = false;
    for (const cf of codeFiles) {
      if (await checkComputeFunction(join(dirPath, cf))) {
        foundCompute = true;
        break;
      }
    }
    if (!foundCompute) {
      errors.push(
        'No compute(data, context) function found in strategy code — Hub backtest engine requires this entry point',
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fepConfig: errors.length === 0 ? fepConfig : undefined,
  };
}
