/**
 * Cilantro - AI Agent Backend Abstraction Library
 * Main library exports
 */

// Re-export types
export type {
  Backend,
  BackendCapabilities,
  ExecuteOptions,
  ExecutionResult,
  CilantroConfig,
  BackendConfig,
} from "./types.ts";

// Re-export errors
export {
  CilantroNotInitializedError,
  BackendNotFoundError,
  BackendExecutionError,
} from "./errors.ts";

// Re-export config functions
export { isInitialized, loadConfig, saveConfig } from "./config.ts";

// Re-export backend utilities
export { detectBackends, getBackend, getAllBackends } from "./backends/index.ts";
export type { DetectedBackend } from "./backends/index.ts";

import { CilantroNotInitializedError, BackendNotFoundError } from "./errors.ts";
import { loadConfig } from "./config.ts";
import { getBackend } from "./backends/index.ts";
import type { ExecuteOptions, ExecutionResult } from "./types.ts";

/**
 * Options for executePrompt function
 */
export interface ExecutePromptOptions {
  /** The prompt to execute */
  prompt: string;

  /** Working directory for execution */
  workingDirectory: string;

  /** Optional backend to use (overrides config default) */
  backend?: string;

  /** Optional timeout in milliseconds (overrides config default) */
  timeout?: number;
}

/**
 * Execute a prompt using the configured AI backend
 *
 * @throws {CilantroNotInitializedError} If Cilantro is not initialized
 * @throws {BackendNotFoundError} If the specified backend is not found
 */
export async function executePrompt(
  options: ExecutePromptOptions
): Promise<ExecutionResult> {
  const config = await loadConfig();

  if (!config) {
    throw new CilantroNotInitializedError();
  }

  // Determine which backend to use (priority: explicit > env var > config)
  const backendName =
    options.backend || process.env.CILANTRO_BACKEND || config.defaultBackend;

  const backend = getBackend(backendName);
  if (!backend) {
    throw new BackendNotFoundError(backendName);
  }

  const executeOptions: ExecuteOptions = {
    prompt: options.prompt,
    workingDirectory: options.workingDirectory,
    timeout: options.timeout || config.timeout,
  };

  return backend.execute(executeOptions);
}
