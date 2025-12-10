# Cilantro: AI Agent Backend Abstraction Library — Requirements

## Overview

Cilantro provides a programmatic abstraction layer that allows CLI tools to execute AI-powered tasks by leveraging existing AI agent CLIs (Claude Code, Cursor, Codex, etc.) that users already have installed. It enables developers to build AI-enhanced workflows without requiring API keys or additional subscriptions—users simply need one of the supported agents already set up on their machine.

---

## Supported Backends (Initial Release)

| Backend | CLI Command | Read Codebase | Headless Mode | JSON Output |
|---------|-------------|---------------|---------------|-------------|
| Claude Code | `claude` | ✅ | ✅ (`-p`) | ✅ (`--output-format json`) |
| Cursor Agent | `cursor-agent` | ✅ | TBD | TBD |
| Codex CLI | `codex` | ✅ | ✅ | TBD |

---

## Task Execution Behavior

- Cilantro does **not** interpret or modify prompts; it passes them directly to the backend.
- Repo context handling is delegated to the underlying agent.
- Web/MCP/tool usage is determined by backend capabilities.
- Calling tools are responsible for prompt engineering and output parsing.

---

## Example Use Case

A CLI tool called `architect` uses Cilantro to analyze codebases:

```typescript
// architect analyze ./my-project
import {
  executePrompt,
  isInitialized,
  CilantroNotInitializedError
} from 'cilantro';
import { join } from 'path';

async function analyzeCommand(targetDir: string) {
  // Check initialization first
  if (!await isInitialized()) {
    console.error("Cilantro not initialized. Run 'cilantro init' first.");
    process.exit(1);
  }

  const prompt = `
    Analyze the codebase in the current directory.
    Output a markdown document containing:
    1. Project structure overview
    2. Key dependencies and their purposes
    3. Architecture patterns identified
    4. Suggested improvements

    Output only the markdown content, no additional commentary.
  `;

  const result = await executePrompt({
    prompt,
    workingDirectory: targetDir,
  });

  if (result.success) {
    // Caller handles file creation
    const outputPath = join(targetDir, "ANALYSIS.md");
    await Bun.write(outputPath, result.output);
    console.log(`Analysis complete: ${outputPath}`);
  } else {
    console.error(`Analysis failed: ${result.error}`);
  }
}
```

---

## Non-Functional Requirements

- **Portability:** Must run on macOS and Linux.
- **Runtime:** Bun + TypeScript.
- **Dependency minimalism:** Minimal external dependencies.
- **Performance:** Subprocess startup overhead should be minimal.
- **Reliability:** Detect agent crashes, timeouts, and surface meaningful errors.
- **Extensibility:** New backends should be trivial to add (single file per backend).
- **Testability:** Mock backends available for testing consuming tools.

---

## Limitations

- Behaviors differ across backends; Cilantro cannot enforce identical results.
- Some prompts may work better with certain agents.
- Execution time varies significantly by backend and prompt complexity.
- JSON output parsing depends on backend support.
- Interactive mode is out of scope for initial release.

---

## User Stories

Stories are ordered by implementation priority and dependencies.

---

### 1. Define Core Types and Interfaces

**As a** contributor,
**I want to** have well-defined TypeScript interfaces for backends, capabilities, and results,
**So that** all components have a shared contract to code against.

#### Acceptance Criteria
- [ ] `Backend` interface is defined with `name`, `detect()`, `capabilities()`, `execute()` methods
- [ ] `BackendCapabilities` interface is defined with capability flags
- [ ] `ExecuteOptions` interface is defined with prompt, workingDirectory, and timeout
- [ ] `ExecutionResult` interface is defined with success, output, stdout, stderr, exitCode, error
- [ ] `CilantroConfig` interface is defined for configuration file structure
- [ ] All interfaces are exported from a shared types module

#### Interfaces

```typescript
interface Backend {
  name: string;
  detect(): Promise<boolean>;           // Is this backend installed?
  capabilities(): BackendCapabilities;  // What can it do?
  execute(options: ExecuteOptions): Promise<ExecutionResult>;
}

interface BackendCapabilities {
  canReadCodebase: boolean;
  supportsHeadless: boolean;
  supportsJsonOutput: boolean;
}

interface ExecuteOptions {
  prompt: string;
  workingDirectory: string;
  timeout?: number;
}

interface ExecutionResult {
  success: boolean;
  backend: string;
  output: string;     // The AI's response content
  stdout: string;     // Raw stdout from the process
  stderr: string;     // Raw stderr from the process
  exitCode: number;
  error?: string;
}

interface CilantroConfig {
  defaultBackend: string;
  backends: Record<string, { command: string; args: string[] }>;
  timeout: number;
}
```

---

### 2. Implement Configuration Management

**As a** developer,
**I want to** load and save configuration from `~/.cilantro.json`,
**So that** user preferences persist between sessions.

#### Acceptance Criteria
- [ ] `loadConfig()` reads and parses `~/.cilantro.json`
- [ ] `loadConfig()` returns `null` if file doesn't exist
- [ ] `saveConfig(config)` writes config to `~/.cilantro.json`
- [ ] Config file is validated against `CilantroConfig` interface
- [ ] Invalid config files produce clear error messages

#### Example Configuration
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
    }
  },
  "timeout": 120000
}
```

---

### 3. Implement Backend Detection

**As a** user,
**I want** Cilantro to automatically detect which AI backends are installed,
**So that** I don't have to manually configure paths.

#### Acceptance Criteria
- [ ] `detectBackends()` scans `$PATH` for known backend CLIs
- [ ] Returns list of detected backend names with their capabilities
- [ ] Detection is non-blocking and handles missing binaries gracefully
- [ ] Each backend's `detect()` method verifies the CLI is functional (not just present)

#### Known Backend Commands
| Backend | CLI Command |
|---------|-------------|
| Claude Code | `claude` |
| Cursor Agent | `cursor-agent` |
| Codex CLI | `codex` |

---

### 4. Implement Claude Code Backend

**As a** user,
**I want to** execute prompts using Claude Code as a backend,
**So that** I can leverage my existing Claude Code installation.

#### Acceptance Criteria
- [ ] Implements `Backend` interface
- [ ] `detect()` checks if `claude` command exists and is executable
- [ ] `capabilities()` returns: canReadCodebase=true, supportsHeadless=true, supportsJsonOutput=true
- [ ] `execute()` runs `claude -p --output-format json "<prompt>"` in specified working directory
- [ ] Parses JSON output to extract response content
- [ ] Handles timeouts and process errors
- [ ] Returns structured `ExecutionResult`

#### Claude Code CLI Flags
- `-p` — headless/print mode (non-interactive)
- `--output-format json` — structured JSON output

---

### 5. Implement Initialization Command

**As a** user,
**I want to** run `cilantro init` to set up my configuration,
**So that** I can start using Cilantro with my preferred backend.

#### Acceptance Criteria
- [ ] `cilantro init` triggers backend detection
- [ ] Displays detected backends with status indicators
- [ ] If no backends found, shows installation instructions and exits with error
- [ ] If backends found, prompts user to select default backend
- [ ] Saves configuration to `~/.cilantro.json`
- [ ] Displays success confirmation

#### Init Flow Example
```
$ cilantro init

Detected backends:
  ✅ claude (Claude Code)
  ❌ codex (not found)
  ❌ cursor-agent (not found)

Select default backend: claude

Cilantro initialized! Default backend: claude
```

#### No Backends Detected Error
```
No AI agent backend detected. Please install one of:
- Claude Code: https://docs.anthropic.com/claude-code
- Codex CLI: https://github.com/openai/codex
- Cursor Agent: https://cursor.com

Then run 'cilantro init' again.
```

---

### 6. Implement Initialization Check

**As a** CLI tool developer,
**I want to** check if Cilantro has been initialized before using it,
**So that** I can show helpful errors to my users.

#### Acceptance Criteria
- [ ] `isInitialized()` returns `true` if `~/.cilantro.json` exists and is valid
- [ ] `isInitialized()` returns `false` if config file doesn't exist
- [ ] `isInitialized()` returns `false` if config file is invalid
- [ ] Function is async and exported from main module

#### Usage Example
```typescript
import { isInitialized } from 'cilantro';

if (!await isInitialized()) {
  console.error("Cilantro not initialized. Run 'cilantro init' first.");
  process.exit(1);
}
```

---

### 7. Implement executePrompt Function

**As a** CLI tool developer,
**I want to** execute AI prompts programmatically,
**So that** I can build AI-enhanced tools without managing backend complexity.

#### Acceptance Criteria
- [ ] `executePrompt(options)` accepts prompt, workingDirectory, and optional backend
- [ ] Throws `CilantroNotInitializedError` if config doesn't exist
- [ ] Uses default backend from config if none specified
- [ ] Passes prompt directly to backend without modification
- [ ] Returns structured `ExecutionResult`
- [ ] Respects configured timeout settings

#### Library API Example
```typescript
import { executePrompt, CilantroNotInitializedError } from 'cilantro';

const result = await executePrompt({
  prompt: "Analyze this codebase and output a refactoring plan as markdown",
  workingDirectory: "./src",
  backend: "claude",  // Optional: uses default from config if omitted
});

if (result.success) {
  await Bun.write("./src/PLAN.md", result.output);
}
```

---

### 8. Implement CLI Prompt Execution

**As an** end user,
**I want to** run AI prompts directly from the command line,
**So that** I can quickly execute AI tasks without writing code.

#### Acceptance Criteria
- [ ] `cilantro "<prompt>"` executes the prompt in headless mode
- [ ] Output is printed to stdout (can be piped/redirected)
- [ ] Fails with clear error if not initialized
- [ ] Exit code 0 on success, non-zero on failure
- [ ] Stderr contains error messages, stdout contains only AI output

#### CLI Usage Examples
```bash
# Execute prompt in headless mode, print output to stdout
cilantro "Explain this codebase"

# Pipe output to file (standard shell redirection)
cilantro "Generate a README for this project" > README.md
```

---

### 9. Implement Backend Override

**As a** user or developer,
**I want to** override the default backend on a per-execution basis,
**So that** I can use different backends for different tasks.

#### Acceptance Criteria
- [ ] CLI flag `--backend=<name>` overrides config default
- [ ] Library accepts `backend` option in `executePrompt()` call
- [ ] Environment variable `CILANTRO_BACKEND` serves as override
- [ ] Priority order: explicit parameter > environment variable > config file
- [ ] Error if specified backend is not available

#### Override Priority
1. Explicit parameter (CLI flag or library option)
2. Environment variable `CILANTRO_BACKEND`
3. Config file `defaultBackend`

---

### 10. Implement View Backends Command

**As a** user,
**I want to** see which AI backends are available and which is selected,
**So that** I can understand my options and current configuration.

#### Acceptance Criteria
- [ ] `cilantro backends` displays list of all known backends
- [ ] Shows detection status for each (installed/not installed)
- [ ] Indicates which backend is currently set as default
- [ ] Shows capabilities for each detected backend
- [ ] Fails with clear error if not initialized

---

### 11. Implement Error Types and Messages

**As a** user or developer,
**I want to** receive clear, actionable error messages,
**So that** I know exactly how to fix problems.

#### Acceptance Criteria
- [ ] `CilantroNotInitializedError` class with message: "Cilantro not initialized. Run 'cilantro init' first."
- [ ] `BackendNotFoundError` class with message: "Backend '<name>' not found. Run 'cilantro init' to reconfigure."
- [ ] `BackendExecutionError` class for runtime failures with stderr details
- [ ] All errors include actionable remediation steps
- [ ] Errors are thrown before any processing occurs

---

### 12. Implement Mock Backend for Testing

**As a** CLI tool developer,
**I want to** test my tool against a mock Cilantro backend,
**So that** I can write reliable tests without requiring real AI backends.

#### Acceptance Criteria
- [ ] `MockBackend` class implements `Backend` interface
- [ ] Can be configured to return specific responses
- [ ] Can be configured to simulate errors and timeouts
- [ ] Supports recording of calls for assertion in tests
- [ ] Exported from `cilantro/testing` or similar subpath

---

### 13. Implement Codex CLI Backend

**As a** user,
**I want to** execute prompts using Codex CLI as a backend,
**So that** I can leverage my existing Codex installation.

#### Acceptance Criteria
- [ ] Implements `Backend` interface
- [ ] `detect()` checks if `codex` command exists and is executable
- [ ] `capabilities()` returns: canReadCodebase=true, supportsHeadless=true, supportsJsonOutput=TBD
- [ ] `execute()` runs codex with appropriate flags
- [ ] Returns structured `ExecutionResult`

---

### 14. Implement Cursor Agent Backend

**As a** user,
**I want to** execute prompts using Cursor Agent as a backend,
**So that** I can leverage my existing Cursor installation.

#### Acceptance Criteria
- [ ] Implements `Backend` interface
- [ ] `detect()` checks if `cursor-agent` command exists and is executable
- [ ] `capabilities()` returns appropriate capability flags (TBD based on CLI features)
- [ ] `execute()` runs cursor-agent with appropriate flags
- [ ] Returns structured `ExecutionResult`

