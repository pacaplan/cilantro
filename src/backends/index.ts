/**
 * Backend registry and detection
 */

import type { Backend, BackendCapabilities } from "../types.ts";
import { ClaudeBackend } from "./claude.ts";
import { CodexBackend } from "./codex.ts";
import { CursorBackend } from "./cursor.ts";

/**
 * All available backends
 */
export const ALL_BACKENDS: Backend[] = [
  new ClaudeBackend(),
  new CodexBackend(),
  new CursorBackend(),
];

/**
 * Detected backend information
 */
export interface DetectedBackend {
  name: string;
  installed: boolean;
  capabilities: BackendCapabilities;
}

/**
 * Detect all available backends
 * Returns information about which backends are installed
 */
export async function detectBackends(): Promise<DetectedBackend[]> {
  const results = await Promise.all(
    ALL_BACKENDS.map(async (backend) => ({
      name: backend.name,
      installed: await backend.detect(),
      capabilities: backend.capabilities(),
    }))
  );

  return results;
}

/**
 * Get a backend by name
 */
export function getBackend(name: string): Backend | null {
  return ALL_BACKENDS.find((b) => b.name === name) || null;
}

/**
 * Get all backends
 */
export function getAllBackends(): Backend[] {
  return ALL_BACKENDS;
}
