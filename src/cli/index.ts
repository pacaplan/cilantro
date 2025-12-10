#!/usr/bin/env bun

/**
 * Cilantro CLI entry point
 */

import { detectBackends, getBackend } from "../backends/index.ts";
import { isInitialized, loadConfig, saveConfig } from "../config.ts";
import { CilantroNotInitializedError, BackendNotFoundError } from "../errors.ts";
import type { CilantroConfig } from "../types.ts";

const args = process.argv.slice(2);

/**
 * Parse command-line arguments
 */
function parseArgs() {
  let backendOverride: string | undefined;
  const nonFlagArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    // Handle --backend=<name> format
    if (arg.startsWith("--backend=")) {
      backendOverride = arg.slice(10);
    }
    // Handle --backend <name> format
    else if (arg === "--backend" && i + 1 < args.length) {
      const nextArg = args[i + 1];
      if (nextArg) {
        backendOverride = nextArg;
      }
      i++; // Skip next argument
    }
    // Non-flag arguments
    else {
      nonFlagArgs.push(arg);
    }
  }

  return { backendOverride, nonFlagArgs };
}

async function main() {
  const { backendOverride, nonFlagArgs } = parseArgs();
  const command = nonFlagArgs[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  if (command === "init") {
    await initCommand();
  } else if (command === "backends") {
    await backendsCommand();
  } else {
    // Treat first argument as a prompt
    await executeCommand(command, backendOverride);
  }
}

function printHelp() {
  console.log(`
Cilantro - AI Agent Backend Abstraction Library

Usage:
  cilantro init                       Initialize Cilantro configuration
  cilantro backends                   List available backends
  cilantro "<prompt>"                 Execute a prompt in headless mode
  cilantro --backend=<name> "<prompt>" Execute with specific backend
  cilantro help                       Show this help message

Options:
  --backend=<name>    Override the default backend (claude, codex, cursor)

Examples:
  cilantro init
  cilantro "Explain this codebase"
  cilantro "Generate a README" > README.md
  cilantro --backend=codex "What is this project?"
  cilantro --backend claude "Analyze the code"
`);
}

async function initCommand() {
  console.log("Detecting AI agent backends...\n");

  const detected = await detectBackends();
  const installed = detected.filter((b) => b.installed);

  console.log("Detected backends:");
  for (const backend of detected) {
    const status = backend.installed ? "✅" : "❌";
    const label = backend.installed ? "" : " (not found)";
    console.log(`  ${status} ${backend.name}${label}`);
  }

  if (installed.length === 0) {
    console.error("\nNo AI agent backend detected. Please install one of:");
    console.error("- Claude Code: https://docs.anthropic.com/claude-code");
    console.error("- Codex CLI: https://github.com/openai/codex");
    console.error("- Cursor Agent: https://cursor.com");
    console.error("\nThen run 'cilantro init' again.");
    process.exit(1);
  }

  // For now, just use the first detected backend
  // TODO: Add interactive selection if multiple backends are available
  const firstBackend = installed[0];
  if (!firstBackend) {
    console.error("No backends available");
    process.exit(1);
  }
  const defaultBackend = firstBackend.name;

  const config: CilantroConfig = {
    defaultBackend,
    backends: {
      claude: {
        command: "claude",
        args: ["-p", "--output-format", "json"],
      },
      codex: {
        command: "codex",
        args: [],
      },
      cursor: {
        command: "cursor-agent",
        args: ["-p", "--output-format", "json"],
      },
    },
    timeout: 120000,
  };

  await saveConfig(config);
  console.log(`\nCilantro initialized! Default backend: ${defaultBackend}`);
}

async function backendsCommand() {
  if (!(await isInitialized())) {
    throw new CilantroNotInitializedError();
  }

  const config = await loadConfig();
  const detected = await detectBackends();

  console.log("Available backends:\n");

  for (const backend of detected) {
    const status = backend.installed ? "✅ Installed" : "❌ Not found";
    const isDefault = backend.name === config?.defaultBackend ? " (default)" : "";
    console.log(`${backend.name}${isDefault}`);
    console.log(`  Status: ${status}`);
    console.log(`  Capabilities:`);
    console.log(`    - Read codebase: ${backend.capabilities.canReadCodebase ? "Yes" : "No"}`);
    console.log(`    - JSON output: ${backend.capabilities.supportsJsonOutput ? "Yes" : "No"}`);
    console.log();
  }
}

async function executeCommand(prompt: string, backendOverride?: string) {
  if (!(await isInitialized())) {
    throw new CilantroNotInitializedError();
  }

  const config = await loadConfig();
  if (!config) {
    throw new CilantroNotInitializedError();
  }

  // Determine backend (priority: explicit parameter > env var > config)
  const backendName =
    backendOverride || process.env.CILANTRO_BACKEND || config.defaultBackend;

  const backend = getBackend(backendName);
  if (!backend) {
    throw new BackendNotFoundError(backendName);
  }

  const result = await backend.execute({
    prompt,
    workingDirectory: process.cwd(),
    timeout: config.timeout,
  });

  if (result.success) {
    console.log(result.output);
    process.exit(0);
  } else {
    console.error(result.error || "Execution failed");
    process.exit(result.exitCode || 1);
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
