/**
 * Tool utility functions for the pixel-office engine.
 *
 * Ported 1:1 from pixel-agents/webview-ui/src/office/toolUtils.ts
 * Maps status strings to tool names, computes default zoom,
 * and manages provider capabilities for tool classification.
 */

import { ZOOM_DEFAULT_DPR_FACTOR, ZOOM_MIN } from './constants';

// ── Status → Tool name mapping ────────────────────────────────────

/** Map status prefixes back to tool names for animation selection */
const STATUS_TO_TOOL: Record<string, string> = {
  Reading: 'Read',
  Searching: 'Grep',
  Globbing: 'Glob',
  Fetching: 'WebFetch',
  'Searching web': 'WebSearch',
  Writing: 'Write',
  Editing: 'Edit',
  Running: 'Bash',
  Task: 'Task',
};

/** Extract tool name from a status string */
export function extractToolName(status: string): string | null {
  for (const [prefix, tool] of Object.entries(STATUS_TO_TOOL)) {
    if (status.startsWith(prefix)) return tool;
  }
  const first = status.split(/[\s:]/)[0];
  return first || null;
}

// ── Default zoom ──────────────────────────────────────────────────

/** Compute a default integer zoom level (device pixels per sprite pixel) */
export function defaultZoom(): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(ZOOM_MIN, Math.round(ZOOM_DEFAULT_DPR_FACTOR * dpr));
}

// ── Provider capabilities (tool taxonomy for rendering decisions) ──
// Populated once by the `providerCapabilities` postMessage after `webviewReady`.
// Modules classifying tools (character animation, subagent creation gate) read
// from here instead of hardcoding Claude-specific tool names.

const providerCaps: {
  readingTools: Set<string>;
  subagentToolNames: Set<string>;
} = {
  readingTools: new Set(),
  subagentToolNames: new Set(),
};

/** Set provider capabilities (reading tools and subagent tool names) */
export function setProviderCapabilities(caps: {
  readingTools: string[];
  subagentToolNames: string[];
}): void {
  providerCaps.readingTools = new Set(caps.readingTools);
  providerCaps.subagentToolNames = new Set(caps.subagentToolNames);
}

/** Check if a tool name is a "reading" tool (affects animation style) */
export function isReadingToolName(
  name: string | null | undefined,
): boolean {
  return typeof name === 'string' && providerCaps.readingTools.has(name);
}

/** Check if a tool name is a subagent-spawning tool */
export function isSubagentToolName(
  name: string | null | undefined,
): boolean {
  return (
    typeof name === 'string' && providerCaps.subagentToolNames.has(name)
  );
}
