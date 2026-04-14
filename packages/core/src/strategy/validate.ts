/**
 * Strategy package validation utilities.
 * Validates that a directory contains a valid FEP v2.0 strategy package.
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

/**
 * Validate a strategy package directory.
 * Checks for required fep.yaml, validates its structure, and checks for strategy code.
 */
export async function validateStrategyPackage(dirPath: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check directory exists
  try {
    const dirStat = await stat(dirPath);
    if (!dirStat.isDirectory()) {
      return { valid: false, errors: [`Path is not a directory: ${dirPath}`], warnings };
    }
  } catch {
    return { valid: false, errors: [`Directory does not exist: ${dirPath}`], warnings };
  }

  // Check fep.yaml exists
  const fepPath = join(dirPath, "fep.yaml");
  let fepRaw: string;
  try {
    fepRaw = await readFile(fepPath, "utf-8");
  } catch {
    return { valid: false, errors: ["Missing required file: fep.yaml"], warnings };
  }

  // Parse YAML
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

  // Validate required fields
  if (!fepConfig.fep) {
    errors.push("Missing required field: fep (version)");
  } else if (fepConfig.fep !== "2.0") {
    errors.push(`Unsupported FEP version: ${fepConfig.fep} (expected 2.0)`);
  }

  if (!fepConfig.identity) {
    errors.push("Missing required section: identity");
  } else {
    if (!fepConfig.identity.id) errors.push("Missing required field: identity.id");
    if (!fepConfig.identity.name) errors.push("Missing required field: identity.name");
  }

  if (!fepConfig.backtest) {
    errors.push("Missing required section: backtest");
  } else {
    if (!fepConfig.backtest.symbol) errors.push("Missing required field: backtest.symbol");
    if (!fepConfig.backtest.defaultPeriod) {
      errors.push("Missing required field: backtest.defaultPeriod");
    }
    if (fepConfig.backtest.initialCapital == null) {
      errors.push("Missing required field: backtest.initialCapital");
    }
  }

  // Check for strategy code files
  try {
    const files = await readdir(dirPath);
    const codeFiles = files.filter((f) => {
      const ext = extname(f).toLowerCase();
      return [".py", ".js", ".ts", ".mjs"].includes(ext);
    });
    if (codeFiles.length === 0) {
      warnings.push("No strategy code files found (.py, .js, .ts)");
    }
  } catch {
    warnings.push("Could not list directory contents");
  }

  // Check entry point if specified
  if (fepConfig.technical?.entryPoint) {
    try {
      await stat(join(dirPath, fepConfig.technical.entryPoint));
    } catch {
      errors.push(`Entry point file not found: ${fepConfig.technical.entryPoint}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fepConfig: errors.length === 0 ? fepConfig : undefined,
  };
}
