# Cilantro: AI Agent Backend Abstraction Library — Requirements

## Overview

Cilantro provides a programmatic abstraction layer that allows CLI tools to execute AI-powered tasks by leveraging existing AI agent CLIs (Claude Code, Cursor, Codex, etc.) that users already have installed. It enables developers to build AI-enhanced workflows without requiring API keys or additional subscriptions—users simply need one of the supported agents already set up on their machine.

---

## Supported Backends

| Backend | CLI Command | Read Codebase | JSON Output |
|---------|-------------|---------------|-------------|
| Claude Code | `claude` | Yes | Yes (`--output-format json`) |
| Cursor Agent | `cursor-agent` | Yes | Yes (`--output-format json`) |
| Codex CLI | `codex` | Yes | No |

**Note:** The Cursor Agent backend is referenced as `cursor` in Cilantro commands and configuration, but uses the `cursor-agent` CLI command internally.

---

## User Stories

Stories are ordered by user workflow. Each story includes acceptance criteria and CLI test cases.

---

### Story 1: Display Help

**As a** user,
**I want to** see help information about Cilantro commands,
**So that** I understand how to use the tool.

#### Acceptance Criteria

- [ ] `cilantro help` displays usage information
- [ ] `cilantro --help` and `cilantro -h` also display help
- [ ] Running `cilantro` with no arguments displays help
- [ ] Help includes all available commands and options
- [ ] Help includes usage examples

#### Test Cases

| Test | Command | Expected Output |
|------|---------|-----------------|
| Help command | `cilantro help` | Shows usage info with commands: `init`, `backends`, `"<prompt>"`, `help` |
| Help flag | `cilantro --help` | Same as `cilantro help` |
| Short help flag | `cilantro -h` | Same as `cilantro help` |
| No arguments | `cilantro` | Same as `cilantro help` |
| Shows options | `cilantro help` | Output contains `--backend=<name>` option |
| Shows examples | `cilantro help` | Output contains example commands |

---

### Story 2: Initialize Configuration

**As a** user,
**I want to** run `cilantro init` to set up my configuration,
**So that** I can start using Cilantro with my preferred backend.

#### Acceptance Criteria

- [ ] `cilantro init` detects installed backends
- [ ] Displays detected backends with status indicators (✅/❌)
- [ ] If no backends found, shows installation instructions and exits with error code 1
- [ ] If backends found, selects first available as default
- [ ] Saves configuration to `~/.cilantro.json`
- [ ] Displays success confirmation with default backend name
- [ ] Can be run multiple times (reinitializes)

#### Test Cases

| Test | Command | Expected Output | Expected Exit Code |
|------|---------|-----------------|-------------------|
| Successful init | `cilantro init` | Contains "Cilantro initialized!" and shows detected backends | 0 |
| Shows detected backends | `cilantro init` | Contains "Detected backends:" with ✅ or ❌ for each | 0 |
| Creates config file | `cilantro init && cat ~/.cilantro.json` | Valid JSON with `defaultBackend`, `backends`, `timeout` | 0 |
| Config has timeout | `cilantro init && cat ~/.cilantro.json` | Contains `"timeout": 120000` | 0 |
| Reinitialize | `cilantro init && cilantro init` | Second run succeeds, overwrites config | 0 |

#### Test Case: No Backends Available

```bash
# Temporarily rename backends to simulate none available
# Expected: Exit code 1
# Expected output contains: "No AI agent backend detected"
# Expected output contains: installation URLs
```

---

### Story 3: View Available Backends

**As a** user,
**I want to** see which AI backends are available and which is selected,
**So that** I can understand my options and current configuration.

#### Acceptance Criteria

- [ ] `cilantro backends` displays list of all known backends
- [ ] Shows installation status for each (✅ Installed / ❌ Not found)
- [ ] Indicates which backend is currently set as default
- [ ] Shows capabilities for each backend (Read codebase, JSON output)
- [ ] Fails with clear error if not initialized

#### Test Cases

| Test | Command | Expected Output | Expected Exit Code |
|------|---------|-----------------|-------------------|
| List backends | `cilantro backends` | Shows claude, codex, cursor with status | 0 |
| Shows default | `cilantro backends` | One backend marked with "(default)" | 0 |
| Shows capabilities | `cilantro backends` | Contains "Capabilities:" with Yes/No for each | 0 |
| Claude capabilities | `cilantro backends` | Claude shows: Read codebase: Yes, JSON output: Yes | 0 |
| Not initialized error | `rm ~/.cilantro.json && cilantro backends` | Contains "not initialized" | 1 |

#### Expected Output Format

```
Available backends:

claude (default)
  Status: ✅ Installed
  Capabilities:
    - Read codebase: Yes
    - JSON output: Yes

codex
  Status: ✅ Installed
  Capabilities:
    - Read codebase: Yes
    - JSON output: No

cursor
  Status: ❌ Not found
  Capabilities:
    - Read codebase: Yes
    - JSON output: Yes
```

---

### Story 4: Execute Prompts via CLI

**As an** end user,
**I want to** run AI prompts directly from the command line,
**So that** I can quickly execute AI tasks without writing code.

#### Acceptance Criteria

- [ ] `cilantro "<prompt>"` executes the prompt using the default backend
- [ ] Output is printed to stdout (can be piped/redirected)
- [ ] Fails with clear error if not initialized
- [ ] Exit code 0 on success, non-zero on failure
- [ ] Error messages go to stderr, AI output goes to stdout

#### Test Cases

**Claude Backend (Default) Tests:**

| # | Test | Command | Expected Output | Exit Code |
|---|------|---------|-----------------|-----------|
| 1 | Execute simple prompt | `cilantro "What is 2+2?"` | Clean response: "2+2=4" or "4" (no JSON) | 0 |
| 2 | Verify JSON parsing | `cilantro "What is 1+1?"` | Output is plain text "2" not raw JSON object | 0 |
| 3 | Pipe to file | `cilantro "Say hello" > /tmp/out.txt && cat /tmp/out.txt` | File contains clean AI response | 0 |
| 4 | Read codebase context | `cilantro "What language is this codebase?"` | Response mentions TypeScript/Bun | 0 |
| 5 | Verify clean output | `cilantro "test" \| grep -v "^{"` | Should output response, not JSON | 0 |

**Codex Backend Tests:**

| # | Test | Command | Expected Output | Exit Code |
|---|------|---------|-----------------|-----------|
| 6 | Execute with codex | `CILANTRO_BACKEND=codex cilantro "What is 2+2?"` | Plain text response (no JSON available) | 0 |
| 7 | Verify plain text | `CILANTRO_BACKEND=codex cilantro "What is 3+3?"` | Output is plain text, e.g., "6" | 0 |
| 8 | Pipe to file | `CILANTRO_BACKEND=codex cilantro "test" > /tmp/codex.txt && cat /tmp/codex.txt` | File contains response | 0 |
| 9 | Exec subcommand | `CILANTRO_BACKEND=codex cilantro "hello"` | No "stdin is not a terminal" error | 0 |
| 10 | Read codebase | `CILANTRO_BACKEND=codex cilantro "What files are in this project?"` | Response mentions project files | 0 |

**Cursor Backend Tests:**

| # | Test | Command | Expected Output | Exit Code |
|---|------|---------|-----------------|-----------|
| 11 | Execute with cursor | `CILANTRO_BACKEND=cursor cilantro "What is 5+5?"` | Clean response: "10" (no JSON) | 0 |
| 12 | Verify JSON parsing | `CILANTRO_BACKEND=cursor cilantro "What is 7+3?"` | Output is plain text "10" not raw JSON | 0 |
| 13 | Pipe to file | `CILANTRO_BACKEND=cursor cilantro "test" > /tmp/cursor.txt && cat /tmp/cursor.txt` | File contains clean response | 0 |
| 14 | Headless mode | `CILANTRO_BACKEND=cursor cilantro "ping"` | Executes without interactive prompt | 0 |
| 15 | Read codebase | `CILANTRO_BACKEND=cursor cilantro "Summarize this codebase"` | Response about the project | 0 |

**Error Handling Tests:**

| # | Test | Command | Expected Output | Exit Code |
|---|------|---------|-----------------|-----------|
| 16 | Not initialized | `rm ~/.cilantro.json && cilantro "test"` | Error: "not initialized" on stderr | 1 |
| 17 | Empty prompt | `cilantro ""` | Executes (backend-specific behavior) | 0 or 1 |

#### Test Case: Verify Stdout/Stderr Separation

```bash
# Test success case
cilantro "Say hello" > /tmp/stdout.txt 2> /tmp/stderr.txt

# Expected:
# - /tmp/stdout.txt contains AI response
# - /tmp/stderr.txt is empty

# Test error case
rm ~/.cilantro.json
cilantro "test" > /tmp/stdout.txt 2> /tmp/stderr.txt

# Expected:
# - /tmp/stdout.txt is empty
# - /tmp/stderr.txt contains "not initialized" error
```

---

### Story 5: Override Backend via CLI Flag

**As a** user,
**I want to** override the default backend using a command-line flag,
**So that** I can use different backends for different tasks.

#### Acceptance Criteria

- [ ] `--backend=<name>` flag overrides the default backend
- [ ] `--backend <name>` (space-separated) also works
- [ ] Error if specified backend is not available/installed
- [ ] Flag works with any prompt

#### Test Cases

| Test | Command | Expected Behavior | Expected Exit Code |
|------|---------|-------------------|-------------------|
| Override with equals | `cilantro --backend=codex "test"` | Uses codex backend | 0 |
| Override with space | `cilantro --backend codex "test"` | Uses codex backend | 0 |
| Invalid backend | `cilantro --backend=fake "test"` | Error: "Backend 'fake' not found" | 1 |
| Flag before prompt | `cilantro --backend=claude "hello"` | Uses claude backend | 0 |

---

### Story 6: Override Backend via Environment Variable

**As a** user or developer,
**I want to** override the default backend using an environment variable,
**So that** I can configure backend selection in scripts and CI environments.

#### Acceptance Criteria

- [ ] `CILANTRO_BACKEND` environment variable overrides config default
- [ ] CLI flag takes priority over environment variable
- [ ] Error if specified backend is not available

#### Test Cases

| Test | Command | Expected Behavior | Expected Exit Code |
|------|---------|-------------------|-------------------|
| Env var override | `CILANTRO_BACKEND=codex cilantro "test"` | Uses codex backend | 0 |
| Flag beats env var | `CILANTRO_BACKEND=codex cilantro --backend=claude "test"` | Uses claude (flag wins) | 0 |
| Invalid env var | `CILANTRO_BACKEND=fake cilantro "test"` | Error: "Backend 'fake' not found" | 1 |

#### Override Priority Order

1. CLI flag (`--backend=<name>`)
2. Environment variable (`CILANTRO_BACKEND`)
3. Config file (`defaultBackend` in `~/.cilantro.json`)

---

### Story 7: Error Handling

**As a** user,
**I want to** receive clear, actionable error messages,
**So that** I know exactly how to fix problems.

#### Acceptance Criteria

- [ ] "Not initialized" error includes instruction to run `cilantro init`
- [ ] "Backend not found" error includes the backend name and suggests `cilantro init`
- [ ] All errors exit with non-zero exit code
- [ ] Error messages are written to stderr

#### Test Cases

| Test | Command | Expected Error Message | Expected Exit Code |
|------|---------|------------------------|-------------------|
| Not initialized | `rm ~/.cilantro.json && cilantro "test"` | "Cilantro not initialized. Run 'cilantro init' first." | 1 |
| Backend not found | `cilantro --backend=nonexistent "test"` | "Backend 'nonexistent' not found" | 1 |
| Backends without init | `rm ~/.cilantro.json && cilantro backends` | "Cilantro not initialized. Run 'cilantro init' first." | 1 |

---

## Configuration File Format

Location: `~/.cilantro.json`

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
      "args": []
    }
  },
  "timeout": 120000
}
```

---

## Non-Functional Requirements

- **Portability:** Must run on macOS and Linux
- **Runtime:** Bun + TypeScript
- **Dependency minimalism:** Minimal external dependencies
- **Performance:** Subprocess startup overhead should be minimal
- **Reliability:** Detect agent crashes, timeouts, and surface meaningful errors

---

## Limitations

- Behaviors differ across backends; Cilantro cannot enforce identical results
- Some prompts may work better with certain agents
- Execution time varies significantly by backend and prompt complexity
- JSON output parsing depends on backend support
- Interactive mode is out of scope for initial release
