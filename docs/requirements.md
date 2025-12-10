# Cilantro: AI Agent Backend Abstraction Library — Requirements Document

## 1. Purpose
Cilantro provides a programmatic abstraction layer that allows CLI tools to execute AI-powered tasks by leveraging existing AI agent CLIs (Claude Code, Cursor, Codex, etc.) that users already have installed. It enables developers to build AI-enhanced workflows without requiring API keys or additional subscriptions—users simply need one of the supported agents already set up on their machine.

## 2. Goals
- Provide a **library** that can be imported by other CLI tools to execute AI prompts.
- Provide a **standalone CLI** for testing and direct usage.
- **Autodetect** installed AI agent backends or allow explicit configuration.
- Support **headless execution** for scripted, non-interactive workflows.
- Return **structured results** (stdout/stderr/exit code) so calling tools can parse and handle output.
- Work regardless of which tools (MCP/web/etc.) the underlying agents support.
- Ensure graceful degradation when backends lack certain capabilities.

## 3. Supported Backends (Initial Release)

| Backend | CLI Command | Read Codebase | Headless Mode | JSON Output |
|---------|-------------|---------------|---------------|-------------|
| Claude Code | `claude` | ✅ | ✅ (`-p`) | ✅ (`--output-format json`) |
| Cursor Agent | `cursor-agent` | ✅ | TBD | TBD |
| Codex CLI | `codex` | ✅ | ✅ | TBD |

### 3.1 Backend Detection
- `cilantro init` scans `$PATH` for known agent CLI binaries.
- Each backend reports its capabilities via a health check.
- User is prompted to select a default backend from detected options.
- Config file is created with the selected backend.

## 4. Functional Requirements

### 4.1 Library API
Cilantro can be imported and used programmatically by other tools:

```typescript
import { executePrompt, isInitialized, CilantroNotInitializedError } from 'cilantro';

// Check if cilantro has been initialized
if (!await isInitialized()) {
  throw new CilantroNotInitializedError();
  // Error message: "Cilantro not initialized. Run 'cilantro init' first."
}

// Execute a prompt and get content back
const result = await executePrompt({
  prompt: "Analyze this codebase and output a refactoring plan as markdown",
  workingDirectory: "./src",
  backend: "claude",  // Optional: uses default from config if omitted
});

// Structured result
interface ExecutionResult {
  success: boolean;
  backend: string;
  output: string;     // The AI's response content
  stdout: string;     // Raw stdout from the process
  stderr: string;     // Raw stderr from the process
  exitCode: number;
  error?: string;
}

// Caller handles file creation
if (result.success) {
  await Bun.write("./src/PLAN.md", result.output);
}
```

**Note:** `executePrompt()` will throw `CilantroNotInitializedError` if config file doesn't exist.

### 4.2 CLI Interface

#### Initialization (required first)
- `cilantro init` — detect available backends, prompt user to select one, create `~/.cilantro.json`.

**All other commands fail if `cilantro init` has not been run:**
```
Error: Cilantro not initialized. Run 'cilantro init' first.
```

#### Usage (after init)
- `cilantro "<prompt>"` — execute prompt in headless mode, print output to stdout.
- `cilantro "<prompt>" --backend=claude` — use specific backend.
- `cilantro "<prompt>" > output.md` — pipe output to file (standard shell redirection).
- `cilantro backends` — show available backends and current selection.

### 4.3 Backend Abstraction
Each backend implements a common interface:

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
```

### 4.4 Configuration
- Config file location: `~/.cilantro.json`
- **Config is required** — created by `cilantro init`.
- Example:
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
- CLI flags override config (e.g., `--backend=cursor`).
- Environment variable `CILANTRO_BACKEND` also supported.

#### `cilantro init` Flow
1. Scan `$PATH` for known backend CLIs.
2. Display detected backends with status:
   ```
   Detected backends:
     ✅ claude (Claude Code)
     ❌ codex (not found)
     ❌ cursor-agent (not found)
   ```
3. If no backends found, show install instructions and exit.
4. Prompt user to select default backend.
5. Write `~/.cilantro.json` with selected backend and detected capabilities.
6. Confirm success:
   ```
   Cilantro initialized! Default backend: claude
   ```

### 4.5 Error Handling

#### Not Initialized
All commands (except `init`) and library calls fail if config doesn't exist:
```
Error: Cilantro not initialized. Run 'cilantro init' first.
```

#### No Backends Detected (during init)
```
No AI agent backend detected. Please install one of:
- Claude Code: https://docs.anthropic.com/claude-code
- Codex CLI: https://github.com/openai/codex
- Cursor Agent: https://cursor.com

Then run 'cilantro init' again.
```

#### Selected Backend Unavailable
If the configured backend is no longer available:
```
Error: Backend 'claude' not found. Run 'cilantro init' to reconfigure.
```

### 4.6 Task Execution
- Cilantro does **not** interpret or modify prompts; it passes them directly to the backend.
- Repo context handling is delegated to the underlying agent.
- Web/MCP/tool usage is determined by backend capabilities.
- Calling tools are responsible for prompt engineering and output parsing.

## 5. Non-Functional Requirements
- **Portability:** Must run on macOS and Linux.
- **Runtime:** Bun + TypeScript.
- **Dependency minimalism:** Minimal external dependencies.
- **Performance:** Subprocess startup overhead should be minimal.
- **Reliability:** Detect agent crashes, timeouts, and surface meaningful errors.
- **Extensibility:** New backends should be trivial to add (single file per backend).
- **Testability:** Mock backends available for testing consuming tools.

## 6. Example Use Case

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

## 7. Limitations
- Behaviors differ across backends; Cilantro cannot enforce identical results.
- Some prompts may work better with certain agents.
- Execution time varies significantly by backend and prompt complexity.
- JSON output parsing depends on backend support.
- Interactive mode is out of scope for initial release.

---

This requirements document defines the MVP scope for Cilantro as an AI execution backend library, enabling CLI tools to leverage existing AI agent installations for AI-powered workflows.
