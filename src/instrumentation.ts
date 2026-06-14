// Next.js server instrumentation - runs once on server startup
// Automatically seeds the database with default data if empty

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initializeSystem } = await import('./lib/seed');
      await initializeSystem();
      console.log('[Instrumentation] System initialized');
    } catch (error) {
      console.error('[Instrumentation] Initialization failed:', error);
    }
  }
}
