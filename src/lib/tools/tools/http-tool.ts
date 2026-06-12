// ─── Agent OS — Stage 3: HTTP/Web Tool ─────────────────────────
// An HTTP request tool that can fetch web content.
// Demonstrates a tool with side effects and 'read' permission.
// Only agents with 'read' or higher permission can use it.

import type { ITool, ToolExecutionContext, ToolExecutionResult, ToolInputSchema } from '../types';

// ─── Input Schema ────────────────────────────────────────────

const HTTP_REQUEST_SCHEMA: ToolInputSchema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      description: 'The URL to request',
    },
    method: {
      type: 'string',
      enum: ['GET', 'POST'],
      description: 'HTTP method (default: GET)',
    },
    headers: {
      type: 'object',
      description: 'Optional request headers',
    },
    body: {
      type: 'string',
      description: 'Optional request body (for POST)',
    },
    timeout_ms: {
      type: 'number',
      description: 'Request timeout in milliseconds (default: 10000, max: 30000)',
    },
  },
  required: ['url'],
};

// ─── HTTP Tool Implementation ────────────────────────────────

export const httpTool: ITool = {
  id: 'http_request',
  name: 'HTTP Request',
  description:
    'Make HTTP requests to fetch web content. Supports GET and POST. Returns response body as text.',
  version: '1.0.0',
  requiredPermission: 'read',
  inputSchema: HTTP_REQUEST_SCHEMA,

  functionDefinition: {
    name: 'http_request',
    description:
      'Make an HTTP request to a URL. Use GET to fetch content, POST to send data. Returns the response body.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to request',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST'],
          description: 'HTTP method (default: GET)',
        },
        headers: {
          type: 'object',
          description: 'Optional request headers',
        },
        body: {
          type: 'string',
          description: 'Optional request body (for POST)',
        },
        timeout_ms: {
          type: 'number',
          description: 'Request timeout in ms (default: 10000, max: 30000)',
        },
      },
      required: ['url'],
    },
  },

  async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const { url, method, headers, body, timeout_ms } = context.args as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeout_ms?: number;
    };

    const startTime = Date.now();

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `Invalid URL: ${url}`,
        error: 'Invalid URL',
        durationMs: Date.now() - startTime,
      };
    }

    // Security: only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `Unsupported protocol: ${parsedUrl.protocol}. Only http and https are allowed.`,
        error: 'Unsupported protocol',
        durationMs: Date.now() - startTime,
      };
    }

    const httpMethod = (method || 'GET').toUpperCase();
    const timeoutMs = Math.min(timeout_ms || 10000, 30000);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const fetchOptions: RequestInit = {
        method: httpMethod,
        signal: controller.signal,
        headers: {
          'User-Agent': 'AgentOS/1.0',
          ...(headers || {}),
        },
      };

      if (httpMethod === 'POST' && body) {
        fetchOptions.body = body;
        if (!headers?.['Content-Type']) {
          (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeout);

      const responseText = await response.text();
      const durationMs = Date.now() - startTime;

      // Truncate very long responses
      const maxContentLength = 5000;
      const truncated = responseText.length > maxContentLength;
      const content = truncated
        ? responseText.substring(0, maxContentLength) + '\n\n[...truncated]'
        : responseText;

      return {
        success: response.ok,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `HTTP ${httpMethod} ${url} → ${response.status} ${response.statusText}\n\n${content}`,
        durationMs,
        metadata: {
          statusCode: response.status,
          contentType: response.headers.get('content-type'),
          contentLength: responseText.length,
          truncated,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;

      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          toolCallId: context.toolCallId,
          functionName: context.functionName,
          content: `Request timed out after ${timeoutMs}ms: ${url}`,
          error: 'Timeout',
          durationMs,
        };
      }

      return {
        success: false,
        toolCallId: context.toolCallId,
        functionName: context.functionName,
        content: `HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
      };
    }
  },
};
