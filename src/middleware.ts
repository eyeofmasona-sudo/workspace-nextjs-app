// src/middleware.ts
// 1. Auth gate: all /api/* except public routes require NextAuth session.
// 2. Rate limiting: /api/ai/*, /api/orchestrator/*, /api/tools/execute
//    keyed by session user (sub/email) → fallback to client IP.
//    Uses Upstash Redis if UPSTASH_REDIS_REST_URL is set, else in-memory bucket.

import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// ── Public routes (no auth, no rate limit) ────────────────────

const PUBLIC_PREFIXES = [
  '/api/auth/',   // NextAuth sign-in/callback
  '/api/health',  // Health check
  '/api/status',  // Build/runtime status
];

// ── Rate-limited routes ───────────────────────────────────────

// Ordered: first match wins
const RATE_LIMITED: Array<{ prefix: string; bucket: keyof typeof RATE_LIMITS }> = [
  { prefix: '/api/ai/',               bucket: 'ai'           },
  { prefix: '/api/orchestrator/',     bucket: 'orchestrator' },
  { prefix: '/api/tools/execute',     bucket: 'tools'        },
];

// ── Middleware ────────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Only handle /api/* routes
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  // Allow public routes through (no auth, no rate limit)
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── 1. Auth check ───────────────────────────────────────────
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized', hint: 'Sign in at /api/auth/signin or pass a valid session cookie.' },
      { status: 401 }
    );
  }

  // ── 2. Rate limit check ─────────────────────────────────────
  const match = RATE_LIMITED.find((r) => pathname.startsWith(r.prefix));
  if (match) {
    const limited = await rateLimit(request, match.bucket, RATE_LIMITS[match.bucket]);
    if (limited) return limited;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
