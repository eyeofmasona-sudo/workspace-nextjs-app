// src/middleware.ts
// Gates all /api/* routes behind NextAuth session.
// Public: /api/auth/* (login flow), /api/status, /api/health

import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Routes that do NOT require authentication
const PUBLIC_PREFIXES = [
  '/api/auth/',     // NextAuth sign-in/callback
  '/api/health',    // Health check (monitoring)
  '/api/status',    // Build/runtime status
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only gate /api/* routes
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  // Allow public routes through
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verify JWT session (cookie or Authorization: Bearer header)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized', hint: 'Sign in at /api/auth/signin or pass a valid session cookie.' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
