// ─── Agent OS — Tool Adapter Registry ────────────────────────
// Registry that resolves tool keys to adapter instances.

import { ADAPTER_MAP } from './adapters';
import type { ToolAdapter } from './types';

class ToolAdapterRegistry {
  private static instance: ToolAdapterRegistry | null = null;
  private customAdapters: Map<string, ToolAdapter> = new Map();

  private constructor() {}

  static getInstance(): ToolAdapterRegistry {
    if (!ToolAdapterRegistry.instance) {
      ToolAdapterRegistry.instance = new ToolAdapterRegistry();
    }
    return ToolAdapterRegistry.instance;
  }

  /**
   * Get adapter for a tool key
   */
  getAdapter(toolKey: string): ToolAdapter | null {
    // Check custom adapters first, then default adapters
    return this.customAdapters.get(toolKey) ?? ADAPTER_MAP.get(toolKey) ?? null;
  }

  /**
   * Register a custom adapter (for future extensibility)
   */
  registerAdapter(adapter: ToolAdapter): void {
    this.customAdapters.set(adapter.key, adapter);
  }

  /**
   * Get all registered adapter keys
   */
  getRegisteredKeys(): string[] {
    const defaultKeys = Array.from(ADAPTER_MAP.keys());
    const customKeys = Array.from(this.customAdapters.keys());
    return [...new Set([...defaultKeys, ...customKeys])];
  }

  /**
   * Check if an adapter exists for a tool key
   */
  hasAdapter(toolKey: string): boolean {
    return this.customAdapters.has(toolKey) || ADAPTER_MAP.has(toolKey);
  }
}

export const toolAdapterRegistry = ToolAdapterRegistry.getInstance();
