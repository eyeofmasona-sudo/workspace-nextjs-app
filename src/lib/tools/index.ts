// ─── Agent OS — Stage 3: Tools Barrel Export ────────────────────

// Types
export type {
  ITool,
  ToolPermission,
  ToolInputSchema,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolRegistration,
  ToolRegistryStats,
} from './types';

export { ToolValidationError, ToolPermissionError } from './types';

// Registry
export { toolRegistry } from './registry';

// Executor
export { toolExecutor } from './executor';

// Built-in Tools
export { calculatorTool } from './tools/calculator-tool';
export { httpTool } from './tools/http-tool';
export { fileReaderTool } from './tools/file-reader-tool';
export { default as browserOperatorTool } from './tools/browser-operator-tool';

// Convenience: all built-in tools as an array
import { calculatorTool } from './tools/calculator-tool';
import { httpTool } from './tools/http-tool';
import { fileReaderTool } from './tools/file-reader-tool';
import browserOperatorTool from './tools/browser-operator-tool';

export const BUILTIN_TOOLS = [calculatorTool, httpTool, fileReaderTool, browserOperatorTool];
