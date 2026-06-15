// instrumentation.ts (Next.js instrumentation hook — runs once at server startup)
// Initialises Sentry only when SENTRY_DSN is set.
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (!process.env.SENTRY_DSN) {
    // No DSN → skip; Sentry is optional
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { init } = await import('@sentry/nextjs');
    init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
      // Reduce noise in development
      enabled: process.env.NODE_ENV === 'production',
    });
  }
}
