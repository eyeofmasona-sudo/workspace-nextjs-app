/**
 * Browser Operator Service
 *
 * Main orchestrator for the Browser Operator Module.
 * Connects the queue, provider registry, and adapters.
 * Runs a processing loop that dequeues and executes tasks.
 *
 * Security:
 * - Localhost-only (API key check on every request)
 * - Does NOT store passwords
 * - Does NOT log cookies/tokens
 * - Does NOT bypass CAPTCHA, 2FA, paywalls, or rate limits
 * - Does NOT reverse-engineer private APIs
 */

import type {
  BrowserTask,
  BrowserTaskInput,
  BrowserTaskOutput,
  BrowserTaskStatus,
  BrowserProvidersApiResponse,
} from './BrowserOperatorTypes';
import { BrowserOperatorQueue } from './BrowserOperatorQueue';
import { getBrowserProviderRegistry } from './BrowserOperatorProviderRegistry';
import { CustomAdapter } from './adapters/CustomAdapter';
import { BrowserSessionManager } from './playwright/BrowserSessionManager';
import { ScreenshotService } from './playwright/ScreenshotService';
import { BrowserOperatorToolBridge } from './BrowserOperatorToolBridge';

// ── Service Config ─────────────────────────────────────────────
export interface BrowserOperatorConfig {
  /** Max concurrent browser tasks (default 1) */
  maxConcurrent: number;
  /** Process interval in ms (default 2000) */
  processInterval: number;
  /** Auto-cleanup age in ms (default 3600000 = 1h) */
  cleanupAge: number;
  /** Screenshots directory */
  screenshotsDir: string;
}

const DEFAULT_CONFIG: BrowserOperatorConfig = {
  maxConcurrent: 1,
  processInterval: 2000,
  cleanupAge: 3600_000,
  screenshotsDir: '/tmp/browser-operator/screenshots',
};

// ── Service ────────────────────────────────────────────────────
class BrowserOperatorService {
  private queue: BrowserOperatorQueue;
  private config: BrowserOperatorConfig;
  private sessionManager: BrowserSessionManager;
  private screenshotService: ScreenshotService;
  private toolBridge: BrowserOperatorToolBridge;
  private processing: boolean = false;
  private processTimer: ReturnType<typeof setInterval> | null = null;
  private initialized: boolean = false;

  constructor(config?: Partial<BrowserOperatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionManager = new BrowserSessionManager(this.config.screenshotsDir);
    this.screenshotService = new ScreenshotService(this.config.screenshotsDir);
    this.queue = new BrowserOperatorQueue(this.config.maxConcurrent);
    this.toolBridge = new BrowserOperatorToolBridge();
  }

  // ── Initialization ───────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const registry = getBrowserProviderRegistry();

    // Register built-in adapters
    const customAdapter = new CustomAdapter(this.sessionManager, this.screenshotService);
    registry.register(customAdapter);

    // Initialize all providers
    await registry.initializeAll();

    // Start processing loop
    this.startProcessing();

    // Attach ToolExecution bridge for DB sync
    this.toolBridge.attach(this.queue);

    this.initialized = true;
    console.info('[BrowserOperator] Service initialized');
  }

  // ── Task Submission ──────────────────────────────────────────

  /** Submit a new browser task */
  async submitTask(input: BrowserTaskInput): Promise<BrowserTask> {
    await this.ensureReady();

    // Validate provider exists
    const registry = getBrowserProviderRegistry();
    if (!registry.get(input.provider)) {
      throw new Error(`Unknown provider "${input.provider}". Available: ${registry.listIds().join(', ')}`);
    }

    // Validate URL is allowed
    if (input.url && !registry.isUrlAllowed(input.provider, input.url)) {
      throw new Error(`URL "${input.url}" is not allowed for provider "${input.provider}"`);
    }

    const task = this.queue.enqueue(input);
    console.info(`[BrowserOperator] Task ${task.id} queued (${input.mode}, priority: ${input.priority ?? 'normal'})`);

    // Try to process immediately
    this.processQueue();

    return task;
  }

  /** Get task by ID */
  getTask(taskId: string): BrowserTask | undefined {
    return this.queue.get(taskId);
  }

  /** Get task or throw */
  getTaskOrThrow(taskId: string): BrowserTask {
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task "${taskId}" not found`);
    return task;
  }

  /** List tasks (optionally filtered by status) */
  listTasks(status?: BrowserTaskStatus): BrowserTask[] {
    return this.queue.list(status);
  }

  // ── Task Actions ─────────────────────────────────────────────

  /** Retry a failed task */
  async retryTask(taskId: string): Promise<BrowserTask> {
    await this.ensureReady();
    const task = this.queue.retry(taskId);
    if (!task) throw new Error(`Cannot retry task "${taskId}" (not found, not failed, or max retries reached)`);
    console.info(`[BrowserOperator] Task ${taskId} retried (attempt ${task.retryCount})`);
    this.processQueue();
    return task;
  }

  /** Resume a needs_human task (after manual intervention) */
  async resumeTask(taskId: string): Promise<BrowserTaskOutput> {
    await this.ensureReady();
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task "${taskId}" not found`);
    if (task.output.status !== 'needs_human') {
      throw new Error(`Task "${taskId}" is not in needs_human state (current: ${task.output.status})`);
    }

    // Use the adapter's resume method
    const registry = getBrowserProviderRegistry();
    const adapter = registry.getOrThrow(task.input.provider);
    const result = await adapter.resume(taskId);

    // Update task
    this.queue.updateStatus(taskId, result.status, result);

    console.info(`[BrowserOperator] Task ${taskId} resumed → ${result.status}`);
    return result;
  }

  /** Take a manual screenshot for a task */
  async takeScreenshot(taskId: string): Promise<string> {
    await this.ensureReady();
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task "${taskId}" not found`);

    const registry = getBrowserProviderRegistry();
    const adapter = registry.getOrThrow(task.input.provider);
    const filename = await adapter.screenshot(taskId, 'manual');

    if (!filename) throw new Error('Failed to capture screenshot — no active browser session');

    // Add screenshot to task
    task.output.screenshots.push(filename);
    task.updatedAt = new Date().toISOString();

    return filename;
  }

  /** Cancel a task */
  cancelTask(taskId: string): boolean {
    return this.queue.cancel(taskId);
  }

  // ── Providers ────────────────────────────────────────────────

  /** Get provider list with status */
  getProviders(): BrowserProvidersApiResponse {
    const registry = getBrowserProviderRegistry();
    return { providers: registry.listAll() };
  }

  // ── Queue Processing ─────────────────────────────────────────

  private startProcessing(): void {
    if (this.processTimer) return;
    this.processTimer = setInterval(() => this.processQueue(), this.config.processInterval);
  }

  private stopProcessing(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;

    const task = this.queue.dequeue();
    if (!task) return;

    this.processing = true;

    try {
      this.queue.updateStatus(task.id, 'running');
      console.info(`[BrowserOperator] Processing task ${task.id} (${task.input.mode})`);

      const registry = getBrowserProviderRegistry();
      const adapter = registry.getOrThrow(task.input.provider);
      const result = await adapter.execute(task.input, task);

      this.queue.updateStatus(task.id, result.status, result);
      console.info(`[BrowserOperator] Task ${task.id} → ${result.status}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.queue.updateStatus(task.id, 'failed', {
        error: errorMsg,
        status: 'failed',
      });
      console.error(`[BrowserOperator] Task ${task.id} failed:`, errorMsg);
    } finally {
      this.processing = false;
      // Check for more tasks
      const nextTask = this.queue.dequeue();
      if (nextTask) {
        // Re-enqueue and let the interval pick it up
        this.queue.updateStatus(nextTask.id, 'queued');
      }
    }
  }

  // ── Cleanup & Shutdown ───────────────────────────────────────

  /** Cleanup old tasks */
  cleanup(): number {
    return this.queue.cleanup(this.config.cleanupAge);
  }

  /** Get queue stats */
  getStats() {
    return this.queue.getStats();
  }

  /** Full shutdown */
  async shutdown(): Promise<void> {
    this.stopProcessing();
    this.toolBridge.detach();
    await this.sessionManager.closeAll();
    const registry = getBrowserProviderRegistry();
    await registry.shutdownAll();
    this.initialized = false;
    console.info('[BrowserOperator] Service shut down');
  }

  // ── Internal ─────────────────────────────────────────────────

  private async ensureReady(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────
let _instance: BrowserOperatorService | null = null;

export function getBrowserOperatorService(): BrowserOperatorService {
  if (!_instance) {
    _instance = new BrowserOperatorService();
  }
  return _instance;
}

export { BrowserOperatorService };
