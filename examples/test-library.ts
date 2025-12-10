#!/usr/bin/env bun
/**
 * Test script to verify the library example works correctly
 */

import { executePrompt, isInitialized, detectBackends } from "../src/index.ts";

async function testLibrary() {
  console.log("Testing Cilantro library...\n");

  // Test 1: Check initialization
  console.log("Test 1: Checking initialization...");
  const initialized = await isInitialized();
  console.log(`✅ isInitialized(): ${initialized}\n`);

  if (!initialized) {
    console.error("❌ Please run 'cilantro init' first");
    process.exit(1);
  }

  // Test 2: Detect backends
  console.log("Test 2: Detecting backends...");
  const backends = await detectBackends();
  console.log(`✅ Found ${backends.length} backends:`);
  backends.forEach((b) => {
    console.log(`  - ${b.name}: ${b.installed ? "✅ installed" : "❌ not found"}`);
  });
  console.log();

  // Test 3: Execute simple prompt
  console.log("Test 3: Executing simple prompt...");
  const result = await executePrompt({
    prompt: "What is 10 + 5?",
    workingDirectory: process.cwd(),
  });

  if (result.success) {
    console.log(`✅ Execution successful`);
    console.log(`Backend used: ${result.backend}`);
    console.log(`Output: ${result.output}`);
    console.log(`Exit code: ${result.exitCode}`);
  } else {
    console.error(`❌ Execution failed: ${result.error}`);
    process.exit(1);
  }

  console.log("\n✅ All tests passed!");
}

testLibrary();
