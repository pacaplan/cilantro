/**
 * Codex CLI backend implementation
 */

import type {
  Backend,
  BackendCapabilities,
  ExecuteOptions,
  ExecutionResult,
} from "../types.ts";

export class CodexBackend implements Backend {
  name = "codex";

  async detect(): Promise<boolean> {
    try {
      const proc = Bun.spawn(["which", "codex"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const exitCode = await proc.exited;
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  capabilities(): BackendCapabilities {
    return {
      canReadCodebase: true,
      supportsHeadless: true,
      supportsJsonOutput: false, // TBD per requirements
    };
  }

  async execute(options: ExecuteOptions): Promise<ExecutionResult> {
    const { prompt, workingDirectory, timeout = 120000 } = options;

    try {
      // Use 'exec' subcommand for non-interactive execution
      const proc = Bun.spawn(["codex", "exec", prompt], {
        cwd: workingDirectory,
        stdout: "pipe",
        stderr: "pipe",
      });

      const timeoutId = setTimeout(() => {
        proc.kill();
      }, timeout);

      const exitCode = await proc.exited;
      clearTimeout(timeoutId);

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      return {
        success: exitCode === 0,
        backend: this.name,
        output: stdout,
        stdout,
        stderr,
        exitCode,
        error: exitCode !== 0 ? stderr || "Execution failed" : undefined,
      };
    } catch (error) {
      return {
        success: false,
        backend: this.name,
        output: "",
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
