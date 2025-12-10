/**
 * Testing utilities for Cilantro
 */

import type {
  Backend,
  BackendCapabilities,
  ExecuteOptions,
  ExecutionResult,
} from "../types.ts";

/**
 * Mock backend for testing
 */
export class MockBackend implements Backend {
  name = "mock";
  private responses: Map<string, ExecutionResult> = new Map();
  private calls: ExecuteOptions[] = [];

  detect(): Promise<boolean> {
    return Promise.resolve(true);
  }

  capabilities(): BackendCapabilities {
    return {
      canReadCodebase: true,
      supportsHeadless: true,
      supportsJsonOutput: true,
    };
  }

  /**
   * Configure a mock response for a specific prompt
   */
  mockResponse(prompt: string, result: Partial<ExecutionResult>): void {
    this.responses.set(prompt, {
      success: true,
      backend: this.name,
      output: "",
      stdout: "",
      stderr: "",
      exitCode: 0,
      ...result,
    });
  }

  /**
   * Configure the backend to simulate an error
   */
  mockError(prompt: string, error: string, exitCode = 1): void {
    this.responses.set(prompt, {
      success: false,
      backend: this.name,
      output: "",
      stdout: "",
      stderr: error,
      exitCode,
      error,
    });
  }

  /**
   * Get all recorded execute calls
   */
  getCalls(): ExecuteOptions[] {
    return [...this.calls];
  }

  /**
   * Clear all recorded calls
   */
  clearCalls(): void {
    this.calls = [];
  }

  async execute(options: ExecuteOptions): Promise<ExecutionResult> {
    this.calls.push(options);

    const mockResult = this.responses.get(options.prompt);
    if (mockResult) {
      return mockResult;
    }

    // Default response if no mock configured
    return {
      success: true,
      backend: this.name,
      output: `Mock response for: ${options.prompt}`,
      stdout: `Mock response for: ${options.prompt}`,
      stderr: "",
      exitCode: 0,
    };
  }
}
