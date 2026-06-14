// Format orchestrator responses for Telegram
// Telegram has 4096 char limit per message, supports MarkdownV2

import { OrchestratorResult } from './orchestrator-client';

const MAX_MSG_LENGTH = 4000; // leave buffer under 4096

export function formatResponse(result: OrchestratorResult): string[] {
  const parts: string[] = [];

  let text = result.response.trim();

  // Add delegation summary if agents were used
  if (result.delegatedTasks.length > 0) {
    const agentNames = [...new Set(result.delegatedTasks.map((t) => t.agentId))].join(', ');
    const durationSec = (result.totalDurationMs / 1000).toFixed(1);
    text += `\n\n_[${agentNames} · ${durationSec}s · ${result.tokensUsed} tokens]_`;
  }

  // Split into chunks if needed (Telegram 4096 char limit)
  if (text.length <= MAX_MSG_LENGTH) {
    parts.push(text);
  } else {
    // Split at paragraph boundaries
    const paragraphs = text.split(/\n\n+/);
    let current = '';
    for (const para of paragraphs) {
      if ((current + '\n\n' + para).length > MAX_MSG_LENGTH) {
        if (current) parts.push(current.trim());
        current = para;
      } else {
        current = current ? current + '\n\n' + para : para;
      }
    }
    if (current.trim()) parts.push(current.trim());
  }

  return parts.length > 0 ? parts : ['(empty response)'];
}

export function formatError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('timeout')) {
    return '⏱ Request timed out. The orchestrator is taking too long — try again or simplify your request.';
  }
  if (msg.includes('Cannot reach') || msg.includes('ECONNREFUSED')) {
    return '🔌 Cannot connect to Agent OS. Is the server running on port 3000?';
  }
  if (msg.includes('HTTP 5')) {
    return `⚠️ Orchestrator error: ${msg}`;
  }
  return `❌ Error: ${msg}`;
}

export function formatTypingHint(message: string): string {
  // Show what's happening for longer waits
  const words = message.trim().split(/\s+/).length;
  if (words > 30) return '🤔 Processing your request (may take up to 2 min for complex tasks)...';
  return '🤔 Thinking...';
}
