/**
 * Browser Operator Module — Barrel Export
 *
 * Provides browser automation capabilities via Playwright.
 * Independent module — does not modify UI, agents, or orchestrator.
 */

// Types
export type {
  BrowserTaskStatus,
  BrowserTaskMode,
  BrowserTaskPriority,
  BrowserTaskInput,
  BrowserTaskOutput,
  BrowserLogEntry,
  BrowserTask,
  BrowserProviderConfig,
  IBrowserProviderAdapter,
  BrowserQueueEventType,
  BrowserQueueEvent,
  BrowserQueueEventHandler,
  BrowserTaskApiResponse,
  BrowserProvidersApiResponse,
} from './BrowserOperatorTypes';

// Service
export { getBrowserOperatorService, BrowserOperatorService } from './BrowserOperatorService';
export type { BrowserOperatorConfig } from './BrowserOperatorService';

// Queue
export { BrowserOperatorQueue } from './BrowserOperatorQueue';

// Provider Registry
export { getBrowserProviderRegistry, BrowserOperatorProviderRegistry } from './BrowserOperatorProviderRegistry';

// Adapters
export { BaseBrowserProviderAdapter } from './adapters/BaseBrowserProviderAdapter';
export { CustomAdapter } from './adapters/CustomAdapter';

// Playwright
export { BrowserSessionManager } from './playwright/BrowserSessionManager';
export { ScreenshotService } from './playwright/ScreenshotService';
