// Per-chat conversation history store (in-memory)
// Key: chatId (string), Value: message history array

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_HISTORY = 10; // messages per chat (5 turns)
const MAX_IDLE_MS = 30 * 60 * 1000; // 30 min — auto-clear inactive sessions

interface Session {
  history: HistoryMessage[];
  lastActivity: number;
}

class SessionStore {
  private sessions = new Map<string, Session>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup stale sessions every 10 min
    this.cleanupTimer = setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  getHistory(chatId: string | number): HistoryMessage[] {
    const key = String(chatId);
    return this.sessions.get(key)?.history ?? [];
  }

  push(chatId: string | number, role: 'user' | 'assistant', content: string): void {
    const key = String(chatId);
    const session = this.sessions.get(key) ?? { history: [], lastActivity: 0 };
    session.history.push({ role, content });
    session.lastActivity = Date.now();
    // Keep only last MAX_HISTORY messages
    if (session.history.length > MAX_HISTORY) {
      session.history = session.history.slice(-MAX_HISTORY);
    }
    this.sessions.set(key, session);
  }

  clear(chatId: string | number): void {
    this.sessions.delete(String(chatId));
  }

  private cleanup(): void {
    const cutoff = Date.now() - MAX_IDLE_MS;
    for (const [key, session] of this.sessions) {
      if (session.lastActivity < cutoff) {
        this.sessions.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }
}

export const sessionStore = new SessionStore();
