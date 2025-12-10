/**
 * Configuration management for Cilantro
 */

import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { CilantroConfig } from "./types.ts";

const CONFIG_FILE_NAME = ".cilantro.json";

/**
 * Get the path to the Cilantro configuration file
 */
export function getConfigPath(): string {
  return join(homedir(), CONFIG_FILE_NAME);
}

/**
 * Check if Cilantro has been initialized
 */
export async function isInitialized(): Promise<boolean> {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return false;
  }

  try {
    await loadConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Load the Cilantro configuration from ~/.cilantro.json
 * Returns null if the file doesn't exist
 * Throws an error if the file is invalid
 */
export async function loadConfig(): Promise<CilantroConfig | null> {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const file = Bun.file(configPath);
    const content = await file.text();
    const config = JSON.parse(content) as CilantroConfig;

    // Basic validation
    if (!config.defaultBackend) {
      throw new Error("Config missing 'defaultBackend' field");
    }
    if (!config.backends || typeof config.backends !== "object") {
      throw new Error("Config missing or invalid 'backends' field");
    }
    if (typeof config.timeout !== "number") {
      throw new Error("Config missing or invalid 'timeout' field");
    }

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Save the Cilantro configuration to ~/.cilantro.json
 */
export async function saveConfig(config: CilantroConfig): Promise<void> {
  const configPath = getConfigPath();
  const content = JSON.stringify(config, null, 2);
  await Bun.write(configPath, content);
}
