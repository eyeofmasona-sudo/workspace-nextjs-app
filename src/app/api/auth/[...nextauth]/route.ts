// src/app/api/auth/[...nextauth]/route.ts
// NextAuth v4 — credentials provider backed by NEXTAUTH_SECRET.
// For local/self-hosted use. Set NEXTAUTH_SECRET and AGENT_OS_PASSWORD in .env.

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';

const AGENT_OS_PASSWORD = process.env.AGENT_OS_PASSWORD ?? 'changeme';

const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  providers: [
    CredentialsProvider({
      name: 'Agent OS',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.password) return null;
        // Constant-time comparison to avoid timing attacks
        const supplied = Buffer.from(credentials.password);
        const expected = Buffer.from(AGENT_OS_PASSWORD);
        if (
          supplied.length !== expected.length ||
          !require('crypto').timingSafeEqual(supplied, expected)
        ) {
          return null;
        }
        return { id: 'admin', name: 'Agent OS Admin', email: 'admin@agent-os.local' };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
