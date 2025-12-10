/**
 * Claude Code backend implementation
 */

import type {
  Backend,
  BackendCapabilities,
  ExecuteOptions,
  ExecutionResult,
} from "../types.ts";

export class ClaudeBackend implements Backend {
  name = "claude";

  async detect(): Promise<boolean> {
    try {
      const proc = Bun.spawn(["which", "claude"], {
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
      supportsJsonOutput: true,
    };
  }

  async execute(options: ExecuteOptions): Promise<ExecutionResult> {
    const { prompt, workingDirectory, timeout = 120000 } = options;

    try {
      const proc = Bun.spawn(
        ["claude", "-p", "--output-format", "json", prompt],
        {
          cwd: workingDirectory,
          stdout: "pipe",
          stderr: "pipe",
        }
      );

      // Set up timeout
      const timeoutId = setTimeout(() => {
        proc.kill();
      }, timeout);

      const exitCode = await proc.exited;
      clearTimeout(timeoutId);

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      let output = "";
      if (exitCode === 0) {
        try {
          // Try to parse JSON output
          const parsed = JSON.parse(stdout);
          output = parsed.result || parsed.response || parsed.output || stdout;
        } catch {
          // If JSON parsing fails, use raw stdout
          output = stdout;
        }
      }

      return {
        success: exitCode === 0,
        backend: this.name,
        output,
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
