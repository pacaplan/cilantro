/**
 * Custom error types for Cilantro
 */

/**
 * Thrown when Cilantro is not initialized (no config file exists)
 */
export class CilantroNotInitializedError extends Error {
  constructor() {
    super("Cilantro not initialized. Run 'cilantro init' first.");
    this.name = "CilantroNotInitializedError";
  }
}

/**
 * Thrown when a requested backend is not found or not available
 */
export class BackendNotFoundError extends Error {
  constructor(backendName: string) {
    super(
      `Backend '${backendName}' not found. Run 'cilantro init' to reconfigure.`
    );
    this.name = "BackendNotFoundError";
  }
}

/**
 * Thrown when a backend execution fails
 */
export class BackendExecutionError extends Error {
  constructor(
    backendName: string,
    public readonly exitCode: number,
    public readonly stderr: string
  ) {
    super(
      `Backend '${backendName}' execution failed with exit code ${exitCode}.\n\nDetails:\n${stderr}`
    );
    this.name = "BackendExecutionError";
  }
}
