/**
 * GET /api/browser-operator/screenshots/[filename]
 *
 * Serves screenshot files from the screenshots directory.
 *
 * Security:
 * - Validates filename doesn't contain path traversal (no `..`, no leading `/`)
 * - Only serves .png files
 * - Requires BROWSER_OPERATOR_API_KEY from .env (if set)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SCREENSHOTS_DIR = '/tmp/browser-operator/screenshots';

// ── API Key check ──────────────────────────────────────────────
function validateApiKey(request: NextRequest): boolean {
  const requiredKey = process.env.BROWSER_OPERATOR_API_KEY;
  if (!requiredKey) return true; // No key configured = open (dev mode)

  const providedKey = request.headers.get('x-browser-operator-key')
    ?? request.nextUrl.searchParams.get('key');

  return providedKey === requiredKey;
}

// ── Filename validation ────────────────────────────────────────
function isValidFilename(filename: string): boolean {
  // No path traversal
  if (filename.includes('..')) return false;
  // No leading slash
  if (filename.startsWith('/')) return false;
  // Only PNG files
  if (!filename.endsWith('.png')) return false;
  // No directory separators
  if (filename.includes('/') || filename.includes('\\')) return false;
  // Must be a reasonable filename
  if (filename.length > 255) return false;

  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  // Security: API key check
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized — invalid or missing API key' },
      { status: 401 },
    );
  }

  const { filename } = await params;

  // Validate filename
  if (!isValidFilename(filename)) {
    return NextResponse.json(
      { error: 'Invalid filename — must be a .png file with no path traversal' },
      { status: 400 },
    );
  }

  const filepath = join(SCREENSHOTS_DIR, filename);

  // Check if file exists
  if (!existsSync(filepath)) {
    return NextResponse.json(
      { error: 'Screenshot not found' },
      { status: 404 },
    );
  }

  try {
    const fileBuffer = readFileSync(filepath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to read screenshot file' },
      { status: 500 },
    );
  }
}
