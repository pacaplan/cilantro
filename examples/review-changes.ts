#!/usr/bin/env bun
/**
 * review-changes - Automated code review tool
 * Uses Cilantro to review git changes with any AI backend
 */

import { executePrompt, isInitialized } from "../src/index.ts";
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
