// ─── Prisma Client singleton ──────────────────────────────────
// DB: Supabase Postgres
//   DATABASE_URL → pooled connection (pgBouncer :6543, ?pgbouncer=true&connection_limit=1)
//                  используется во runtime (Next.js, API routes, agents)
//   DIRECT_URL   → direct connection (:5432)
//                  используется только prisma migrate/introspect
//
// Singleton через globalThis — обязателен для Next.js:
//   • В dev hot-reload пересоздаёт модули, без globalThis каждый reload
//     открывал новый пул соединений → "too many connections" в Supabase.
//   • В production (один процесс) globalThis.prisma просто undefined
//     → создаётся один экземпляр на весь lifecycle.
//
// connection_limit=1 в DATABASE_URL: pgBouncer в transaction mode
// не поддерживает prepared statements и именованные параметры —
// Prisma добавляет ?pgbouncer=true чтобы переключиться на inline params.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
