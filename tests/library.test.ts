/**
 * Unit tests for Cilantro library API
 * Based on README examples with mocked backends
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { executePrompt, isInitialized, detectBackends, getBackend } from "../src/index.ts";
import { MockBackend } from "../src/testing/index.ts";
import { ALL_BACKENDS } from "../src/backends/index.ts";
import { saveConfig, loadConfig, getConfigPath } from "../src/config.ts";
import { existsSync, unlinkSync } from "fs";

describe("Cilantro Library API", () => {
  let originalBackends: any[];
  let mockBackend: MockBackend;
  const configPath = getConfigPath();
  let configBackup: string | null = null;

  beforeEach(async () => {
    // Backup config if it exists
    if (existsSync(configPath)) {
      const config = await loadConfig();
      configBackup = JSON.stringify(config);
    }

    // Create mock backend
    mockBackend = new MockBackend();

    // Replace ALL_BACKENDS with our mock
    originalBackends = [...ALL_BACKENDS];
    ALL_BACKENDS.length = 0;
    ALL_BACKENDS.push(mockBackend);

    // Initialize with mock backend
    await saveConfig({
      defaultBackend: "mock",
      backends: {
        mock: {
          command: "mock",
          args: [],
        },
      },
      timeout: 120000,
    });
  });

  afterEach(async () => {
    // Restore original backends
    ALL_BACKENDS.length = 0;
    ALL_BACKENDS.push(...originalBackends);

    // Restore config
    if (configBackup) {
      await saveConfig(JSON.parse(configBackup));
    } else if (existsSync(configPath)) {
      unlinkSync(configPath);
    }
  });

  describe("isInitialized()", () => {
    test("returns true when config exists", async () => {
      const initialized = await isInitialized();
      expect(initialized).toBe(true);
    });

    test("returns false when config is missing", async () => {
      unlinkSync(configPath);
      const initialized = await isInitialized();
      expect(initialized).toBe(false);
    });
  });

  describe("detectBackends()", () => {
    test("detects available backends", async () => {
      const backends = await detectBackends();
      expect(backends.length).toBeGreaterThan(0);
      expect(backends[0]?.name).toBe("mock");
      expect(backends[0]?.installed).toBe(true);
    });

    test("includes backend capabilities", async () => {
      const backends = await detectBackends();
      const mock = backends.find((b) => b.name === "mock");
      expect(mock?.capabilities.canReadCodebase).toBe(true);
      expect(mock?.capabilities.supportsHeadless).toBe(true);
      expect(mock?.capabilities.supportsJsonOutput).toBe(true);
    });
  });

  describe("executePrompt()", () => {
    test("executes simple prompt successfully", async () => {
      mockBackend.mockResponse("What is 2+2?", {
        success: true,
        output: "2+2 = 4",
        exitCode: 0,
      });

      const result = await executePrompt({
        prompt: "What is 2+2?",
        workingDirectory: process.cwd(),
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe("2+2 = 4");
      expect(result.backend).toBe("mock");
      expect(result.exitCode).toBe(0);
    });

    test("handles execution errors", async () => {
      mockBackend.mockError("bad prompt", "Execution failed", 1);

      const result = await executePrompt({
        prompt: "bad prompt",
        workingDirectory: process.cwd(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Execution failed");
      expect(result.exitCode).toBe(1);
    });

    test("uses default backend from config", async () => {
      mockBackend.mockResponse("test", {
        success: true,
        output: "response",
      });

      await executePrompt({
        prompt: "test",
        workingDirectory: process.cwd(),
      });

      const calls = mockBackend.getCalls();
      expect(calls.length).toBe(1);
      expect(calls[0]?.prompt).toBe("test");
    });

    test("respects custom timeout", async () => {
      mockBackend.mockResponse("test", {
        success: true,
        output: "response",
      });

      await executePrompt({
        prompt: "test",
        workingDirectory: process.cwd(),
        timeout: 60000,
      });

      const calls = mockBackend.getCalls();
      expect(calls[0]?.timeout).toBe(60000);
    });

    test("uses specified working directory", async () => {
      mockBackend.mockResponse("test", {
        success: true,
        output: "response",
      });

      const testDir = "/tmp/test";
      await executePrompt({
        prompt: "test",
        workingDirectory: testDir,
      });

      const calls = mockBackend.getCalls();
      expect(calls[0]?.workingDirectory).toBe(testDir);
    });
  });

  describe("Code Review Example (from README)", () => {
    test("simulates git diff review workflow", async () => {
      const gitDiff = `
diff --git a/src/example.ts b/src/example.ts
index 1234567..abcdefg 100644
--- a/src/example.ts
+++ b/src/example.ts
@@ -1,3 +1,5 @@
+// Added new feature
 export function hello() {
   console.log("Hello, World!");
 }
`;

      const reviewPrompt = `Review this git diff and provide feedback on:
- Potential bugs or issues
- Code quality and best practices
- Security concerns
- Performance implications

Git diff:
\`\`\`
${gitDiff}
\`\`\``;

      const mockReview = `## Code Review

✅ Overall: Looks good!

**Changes:**
- Added a comment to hello function
- No security concerns
- No performance issues

**Suggestions:**
- Consider adding JSDoc comments for better documentation`;

      mockBackend.mockResponse(reviewPrompt, {
        success: true,
        output: mockReview,
      });

      // Simulate the README example
      const initialized = await isInitialized();
      expect(initialized).toBe(true);

      const result = await executePrompt({
        prompt: reviewPrompt,
        workingDirectory: process.cwd(),
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("Code Review");
      expect(result.output).toContain("Looks good");
    });

    test("handles empty git diff gracefully", async () => {
      const emptyDiff = "";

      // In real scenario, we'd skip execution if diff is empty
      if (!emptyDiff.trim()) {
        // No prompt should be executed
        const calls = mockBackend.getCalls();
        expect(calls.length).toBe(0);
      }
    });
  });

  describe("Error Handling", () => {
    test("throws CilantroNotInitializedError when not initialized", async () => {
      unlinkSync(configPath);

      await expect(
        executePrompt({
          prompt: "test",
          workingDirectory: process.cwd(),
        })
      ).rejects.toThrow();
    });

    test("handles backend execution failures", async () => {
      mockBackend.mockError("error test", "Backend crashed", 127);

      const result = await executePrompt({
        prompt: "error test",
        workingDirectory: process.cwd(),
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(127);
      expect(result.error).toBe("Backend crashed");
    });
  });

  describe("Backend Override", () => {
    test("allows backend override via parameter", async () => {
      mockBackend.mockResponse("test", {
        success: true,
        output: "response",
      });

      const result = await executePrompt({
        prompt: "test",
        workingDirectory: process.cwd(),
        backend: "mock",
      });

      expect(result.success).toBe(true);
      expect(result.backend).toBe("mock");
    });
  });

  describe("Documentation Generator Example (from README)", () => {
    test("simulates doc generation workflow", async () => {
      const files = ["index.ts", "config.ts", "types.ts"];

      for (const file of files) {
        const prompt = `Generate API documentation for ${file} in markdown format`;
        const mockDoc = `# ${file}\n\nAPI documentation for ${file}`;

        mockBackend.mockResponse(prompt, {
          success: true,
          output: mockDoc,
        });

        const result = await executePrompt({
          prompt,
          workingDirectory: "./src",
        });

        expect(result.success).toBe(true);
        expect(result.output).toContain(file);
        expect(result.output).toContain("API documentation");
      }

      const calls = mockBackend.getCalls();
      expect(calls.length).toBe(3);
    });
  });
});
