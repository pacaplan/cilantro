/**
 * Core type definitions for Cilantro
 */

/**
 * Backend interface that all AI agent backends must implement
 */
export interface Backend {
  /** Unique name of the backend (e.g., "claude", "codex") */
  name: string;

  /** Check if this backend is installed and available */
  detect(): Promise<boolean>;

  /** Get the capabilities of this backend */
  capabilities(): BackendCapabilities;

  /** Execute a prompt using this backend */
  execute(options: ExecuteOptions): Promise<ExecutionResult>;
}

/**
 * Capabilities that a backend may support
 */
export interface BackendCapabilities {
  /** Can read and understand codebase context */
  canReadCodebase: boolean;

  /** Supports headless/non-interactive execution */
  supportsHeadless: boolean;

  /** Supports structured JSON output */
  supportsJsonOutput: boolean;
}

/**
 * Options for executing a prompt
 */
export interface ExecuteOptions {
  /** The prompt to execute */
  prompt: string;

  /** Working directory for the execution */
  workingDirectory: string;

  /** Optional timeout in milliseconds */
  timeout?: number;
}

/**
 * Result of executing a prompt
 */
export interface ExecutionResult {
  /** Whether the execution was successful */
  success: boolean;

  /** Name of the backend that was used */
  backend: string;

  /** The AI's response content (parsed output) */
  output: string;

  /** Raw stdout from the process */
  stdout: string;

  /** Raw stderr from the process */
  stderr: string;

  /** Exit code from the process */
  exitCode: number;

  /** Error message if execution failed */
  error?: string;
}

/**
 * Cilantro configuration file structure (~/.cilantro.json)
 */
export interface CilantroConfig {
  /** Default backend to use when not specified */
  defaultBackend: string;

  /** Backend-specific configuration */
  backends: Record<string, BackendConfig>;

  /** Default timeout in milliseconds */
  timeout: number;
}

/**
 * Configuration for a specific backend
 */
export interface BackendConfig {
  /** Command to execute */
  command: string;

  /** Default arguments to pass */
  args: string[];
}
