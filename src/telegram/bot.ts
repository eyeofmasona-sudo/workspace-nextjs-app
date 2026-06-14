#!/usr/bin/env node
// Agent OS — Telegram Bot
// Run: npx ts-node --project tsconfig.bot.json src/telegram/bot.ts
// Or:  node dist/telegram/bot.js (after build)
//
// Env required:
//   TELEGRAM_BOT_TOKEN   — from @BotFather
//   ORCHESTRATOR_URL     — default: http://localhost:3000/api/orchestrator/chat
//
// Architecture: long-polling (local), no webhook needed

import TelegramBot from 'node-telegram-bot-api';
import { sessionStore } from './session';
import { orchestratorClient } from './orchestrator-client';
import { formatResponse, formatError, formatTypingHint } from './formatter';

// ─── Config ────────────────────────────────────────────────────

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('[TelegramBot] TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

// Optional: restrict to specific chat IDs (comma-separated)
const ALLOWED_CHATS = process.env.TELEGRAM_ALLOWED_CHATS
  ? new Set(process.env.TELEGRAM_ALLOWED_CHATS.split(',').map((s) => s.trim()))
  : null;

// ─── Bot init ──────────────────────────────────────────────────

const bot = new TelegramBot(TOKEN, { polling: true });

console.log('[TelegramBot] Starting with long polling...');

// ─── Helpers ───────────────────────────────────────────────────

function isAllowed(chatId: number): boolean {
  if (!ALLOWED_CHATS) return true;
  return ALLOWED_CHATS.has(String(chatId));
}

async function sendChunks(chatId: number, chunks: string[]): Promise<void> {
  for (const chunk of chunks) {
    try {
      await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
    } catch {
      // Markdown failed (e.g. unbalanced backticks) — send as plain text
      await bot.sendMessage(chatId, chunk);
    }
  }
}

// ─── Command handlers ──────────────────────────────────────────

bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(chatId)) return;

  await bot.sendMessage(
    chatId,
    '👋 *Agent OS connected.*\n\nSend any message and the orchestrator will route it to the right specialist agents.\n\n`/clear` — clear conversation history\n`/status` — check system status',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/^\/clear$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(chatId)) return;
  sessionStore.clear(chatId);
  await bot.sendMessage(chatId, '🗑 Conversation history cleared.');
});

bot.onText(/^\/status$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(chatId)) return;

  try {
    const res = await fetch('http://localhost:3000/api/status', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json() as { status: { agents: number; tools?: number; events: number } };
      const s = data.status;
      await bot.sendMessage(
        chatId,
        `✅ *Agent OS running*\n\nAgents: ${s.agents}\nTools: ${s.tools ?? '—'}\nEvents: ${s.events}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await bot.sendMessage(chatId, '⚠️ Agent OS responded with an error.');
    }
  } catch {
    await bot.sendMessage(chatId, '🔌 Cannot reach Agent OS on port 3000.');
  }
});

// ─── Main message handler ──────────────────────────────────────

bot.on('message', async (msg) => {
  // Ignore non-text, commands, channel posts
  if (!msg.text || msg.text.startsWith('/')) return;
  if (msg.chat.type === 'channel') return;

  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text.trim();

  if (!isAllowed(chatId)) {
    await bot.sendMessage(chatId, '⛔ This bot is restricted to authorized chats.');
    return;
  }

  console.log(`[TelegramBot] [chat:${chatId}] [user:${userId}] "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`);

  // Send typing indicator + hint for complex requests
  await bot.sendChatAction(chatId, 'typing');

  const history = sessionStore.getHistory(chatId);

  // For longer requests, send a "thinking" message
  let thinkingMsgId: number | undefined;
  if (text.split(/\s+/).length > 15) {
    try {
      const hint = await bot.sendMessage(chatId, formatTypingHint(text));
      thinkingMsgId = hint.message_id;
    } catch {}
  }

  // Persist user message to session
  sessionStore.push(chatId, 'user', text);

  let result;
  try {
    result = await orchestratorClient.chat(text, history);
  } catch (err) {
    console.error(`[TelegramBot] Orchestrator error for chat ${chatId}:`, err);

    // Delete thinking message if present
    if (thinkingMsgId) {
      try { await bot.deleteMessage(chatId, thinkingMsgId); } catch {}
    }

    await bot.sendMessage(chatId, formatError(err));
    return;
  }

  // Delete thinking message
  if (thinkingMsgId) {
    try { await bot.deleteMessage(chatId, thinkingMsgId); } catch {}
  }

  // Persist assistant response to session
  sessionStore.push(chatId, 'assistant', result.response);

  // Send response (chunked if needed)
  const chunks = formatResponse(result);
  await sendChunks(chatId, chunks);

  console.log(
    `[TelegramBot] [chat:${chatId}] responded in ${result.totalDurationMs}ms, ${result.tokensUsed} tokens, agents: ${result.delegatedTasks.length}`
  );
});

// ─── Error handlers ────────────────────────────────────────────

bot.on('polling_error', (err) => {
  console.error('[TelegramBot] Polling error:', err.message);
  // Non-fatal — polling auto-recovers
});

bot.on('error', (err) => {
  console.error('[TelegramBot] Bot error:', err);
});

// ─── Graceful shutdown ─────────────────────────────────────────

async function shutdown(signal: string) {
  console.log(`[TelegramBot] ${signal} received — shutting down`);
  await bot.stopPolling();
  sessionStore.destroy();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log('[TelegramBot] Ready. Waiting for messages...');
