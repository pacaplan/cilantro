# Cilantro

AI Agent Backend Abstraction Library

## Overview

Cilantro is a **TypeScript library** that provides a programmatic abstraction layer for AI agent CLIs. It enables developers to build AI-enhanced tools and workflows that work with any supported AI backend (Claude Code, Cursor Agent, Codex, etc.) that users already have installed.

**Key benefit:** Your users don't need API keys or additional subscriptions—they just need one of the supported AI agents already set up on their machine.

## Main Use Case: Building Custom CLI Tools

Cilantro is designed primarily as a **library for building custom tools** that leverage AI capabilities. For example, you could build CLI tools such as:

- Code review automation tools
- Documentation generators
- Test generators
- Refactoring assistants
- Custom AI-powered workflows

Your tool will automatically work with whichever AI backend (Claude, Codex, Cursor) your users have installed.

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.0+)
- At least one of the supported AI agent CLIs:
  - [Claude Code](https://docs.anthropic.com/claude-code)
  - Codex CLI
  - Cursor Agent

## Installation

```bash
bun install cilantro
```

## Usage

### As a Library (Primary Use Case)

Here's a realistic example of building a code review CLI tool:

```typescript
#!/usr/bin/env bun
/**
 * review-changes - Automated code review tool
 * Uses Cilantro to review git changes with any AI backend
 */

import { executePrompt, isInitialized } from "cilantro";
import { execSync } from "child_process";

async function main() {
  // Check if Cilantro is initialized
  if (!(await isInitialized())) {
    console.error("❌ Cilantro not initialized.");
    console.error("Run 'cilantro init' first to set up your AI backend.");
    process.exit(1);
  }

  // Get git diff of staged changes
  let diff: string;
  try {
    diff = execSync("git diff --cached", { encoding: "utf-8" });
  } catch (error) {
    console.error("❌ Error getting git diff:", error);
    process.exit(1);
  }

  if (!diff.trim()) {
    console.log("No staged changes to review.");
    process.exit(0);
  }

  console.log("🔍 Reviewing your changes...\n");

  // Execute AI review
  const result = await executePrompt({
    prompt: `Review this git diff and provide feedback on:
- Potential bugs or issues
- Code quality and best practices
- Security concerns
- Performance implications

Git diff:
\`\`\`
${diff}
\`\`\``,
    workingDirectory: process.cwd(),
  });

  if (result.success) {
    console.log("📝 Review Results:\n");
    console.log(result.output);
  } else {
    console.error("❌ Review failed:", result.error);
    process.exit(1);
  }
}

main();
```

**Using a specific backend:**

```typescript
const result = await executePrompt({
  prompt: "Review this code...",
  workingDirectory: process.cwd(),
  backend: "claude", // Force specific backend
});
```

**With custom timeout:**

```typescript
const result = await executePrompt({
  prompt: "Complex analysis task...",
  workingDirectory: process.cwd(),
  timeout: 300000, // 5 minutes
});
```

### As a CLI Tool (Secondary Use Case)

Cilantro also includes a basic CLI for quick testing:

Initialize Cilantro:

```bash
cilantro init
```

Execute a prompt:

```bash
cilantro "Explain this codebase"
```

Override backend:

```bash
CILANTRO_BACKEND=codex cilantro "What does this code do?"
```

List available backends:

```bash
cilantro backends
```

## API Reference

### Core Functions

#### `executePrompt(options)`

Execute a prompt using the configured AI backend.

```typescript
interface ExecutePromptOptions {
  prompt: string;              // The prompt to execute
  workingDirectory: string;    // Working directory for execution
  backend?: string;            // Optional: override default backend
  timeout?: number;            // Optional: timeout in milliseconds
}

const result = await executePrompt(options);
```

**Returns:** `ExecutionResult`

```typescript
interface ExecutionResult {
  success: boolean;    // Whether execution succeeded
  backend: string;     // Backend that was used
  output: string;      // Clean AI response (parsed from JSON if applicable)
  stdout: string;      // Raw stdout
  stderr: string;      // Raw stderr
  exitCode: number;    // Process exit code
  error?: string;      // Error message if failed
}
```

#### `isInitialized()`

Check if Cilantro has been initialized.

```typescript
const initialized = await isInitialized();
```

#### `detectBackends()`

Detect which AI backends are installed on the system.

```typescript
const backends = await detectBackends();
// Returns: DetectedBackend[]
```

#### `getBackend(name)`

Get a specific backend by name.

```typescript
const backend = getBackend("claude");
```

### Error Handling

```typescript
import {
  CilantroNotInitializedError,
  BackendNotFoundError,
  BackendExecutionError,
} from "cilantro";

try {
  const result = await executePrompt({ ... });
} catch (error) {
  if (error instanceof CilantroNotInitializedError) {
    console.error("Run 'cilantro init' first");
  } else if (error instanceof BackendNotFoundError) {
    console.error("Backend not found");
  }
}
```

## Supported Backends

| Backend | CLI Command | Read Codebase | JSON Output |
|---------|-------------|---------------|-------------|
| Claude Code | `claude` | Yes | Yes |
| Cursor Agent | `cursor-agent` | Yes | Yes |
| Codex CLI | `codex` | Yes | No |

All backends support headless/non-interactive execution.

## Project Structure

```
cilantro/
├── src/
│   ├── index.ts              # Main library exports
│   ├── types.ts              # Core interfaces
│   ├── errors.ts             # Custom error classes
│   ├── config.ts             # Configuration management
│   ├── backends/             # Backend implementations
│   │   ├── index.ts          # Backend registry
│   │   ├── claude.ts         # Claude Code backend
│   │   ├── codex.ts          # Codex CLI backend
│   │   └── cursor.ts         # Cursor Agent backend
│   ├── cli/                  # CLI interface
│   │   └── index.ts          # CLI entry point
│   └── testing/              # Testing utilities
│       └── index.ts          # Mock backend
├── tests/                    # Test files
├── docs/
│   └── requirements.md       # Detailed requirements
└── package.json
```

## Development

Type check:

```bash
bun run typecheck
```

Run tests:

```bash
bun test
```

## Configuration

Cilantro stores its configuration in `~/.cilantro.json`:

```json
{
  "defaultBackend": "claude",
  "backends": {
    "claude": {
      "command": "claude",
      "args": ["-p", "--output-format", "json"]
    },
    "codex": {
      "command": "codex",
      "args": []
    },
    "cursor": {
      "command": "cursor-agent",
      "args": ["-p", "--output-format", "json"]
    }
  },
  "timeout": 120000
}
```

Users initialize this by running `cilantro init`, which detects available backends and creates the config file.

## Example: Building a Documentation Generator

```typescript
#!/usr/bin/env bun
import { executePrompt, isInitialized } from "cilantro";
import { readdirSync, writeFileSync } from "fs";
import { join } from "path";

async function generateDocs() {
  if (!(await isInitialized())) {
    console.error("Run 'cilantro init' first");
    process.exit(1);
  }

  const srcDir = "./src";
  const files = readdirSync(srcDir).filter((f) => f.endsWith(".ts"));

  for (const file of files) {
    console.log(`Generating docs for ${file}...`);

    const result = await executePrompt({
      prompt: `Generate API documentation for ${file} in markdown format`,
      workingDirectory: srcDir,
    });

    if (result.success) {
      const docFile = join("./docs", file.replace(".ts", ".md"));
      writeFileSync(docFile, result.output);
      console.log(`✅ Created ${docFile}`);
    }
  }
}

generateDocs();
```

## License

Apache-2.0

## Examples

Working examples are available in the `examples/` directory:

- **[test-library.ts](examples/test-library.ts)** - Tests core library functions
- **[review-changes.ts](examples/review-changes.ts)** - Code review tool that analyzes git diffs

Run them with:

```bash
# Test the library API
bun run examples/test-library.ts

# Review your staged git changes
git add <files>
bun run examples/review-changes.ts
```


## Testing

Run the test suite:

```bash
bun test
```

The library includes comprehensive unit tests with mocked backends, so no real AI backends are required for testing. See [tests/library.test.ts](tests/library.test.ts) for examples.

Test coverage includes:
- ✅ Initialization checking
- ✅ Backend detection
- ✅ Prompt execution with mocked responses
- ✅ Error handling
- ✅ Backend override functionality
- ✅ Real-world examples (code review, documentation generation)

