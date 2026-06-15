#!/usr/bin/env node
// scripts/smoke-dev-tools.ts
// Smoke test for real filesystem, git, and project tool adapters.
// Run: npx ts-node --project tsconfig.bot.json scripts/smoke-dev-tools.ts

import * as path from 'path';
import * as assert from 'assert/strict';

// ── Setup: set WORKSPACE_ROOT so adapters resolve correctly ──
process.env.WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? path.resolve(__dirname, '..');
const WORKSPACE = process.env.WORKSPACE_ROOT!;

// Lazy imports to pick up WORKSPACE_ROOT
async function getAdapters() {
  const fs = await import('../src/lib/tool-hub/adapters/filesystem');
  const git = await import('../src/lib/tool-hub/adapters/git');
  const project = await import('../src/lib/tool-hub/adapters/project');
  return { fs, git, project };
}

function makeInput(toolKey: string, input: unknown) {
  return { workspaceId: 'smoke', agentId: 'smoke-agent', toolKey, action: 'run', input };
}

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${name}... `);
  try {
    await fn();
    console.log('✓');
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`✗\n    ${msg}`);
    failed++;
  }
}

async function main() {
  console.log('\n─── Agent OS Dev Tools Smoke Test ───────────────────\n');
  const { fs, git, project } = await getAdapters();

  // ── filesystem.list ──────────────────────────────────────
  console.log('Filesystem:');

  await test('filesystem.list (root)', async () => {
    const result = await fs.filesystemListAdapter.execute(makeInput('filesystem.list', { path: '.' }));
    assert.ok(result.success, `Failed: ${result.error}`);
    const data = result.data as { items: Array<{ name: string; type: string }>; count: number };
    assert.ok(data.count > 0, 'Expected files in root');
    const hasPackageJson = data.items.some(i => i.name === 'package.json');
    assert.ok(hasPackageJson, 'package.json not found in root listing');
    console.log(`     → ${data.count} entries`);
  });

  await test('filesystem.read (package.json)', async () => {
    const result = await fs.filesystemReadAdapter.execute(makeInput('filesystem.read', { path: 'package.json' }));
    assert.ok(result.success, `Failed: ${result.error}`);
    const data = result.data as { content: string; size: number };
    assert.ok(data.content.includes('"name"'), 'package.json content missing "name" field');
    console.log(`     → ${data.size} bytes`);
  });

  await test('filesystem.exists (package.json)', async () => {
    const result = await fs.filesystemExistsAdapter.execute(makeInput('filesystem.exists', { path: 'package.json' }));
    assert.ok(result.success);
    const data = result.data as { exists: boolean; type: string };
    assert.ok(data.exists);
    assert.equal(data.type, 'file');
  });

  await test('filesystem.exists (missing file)', async () => {
    const result = await fs.filesystemExistsAdapter.execute(makeInput('filesystem.exists', { path: 'nonexistent-file-xyz.ts' }));
    assert.ok(result.success);
    const data = result.data as { exists: boolean };
    assert.ok(!data.exists);
  });

  await test('filesystem.read (denied: .env)', async () => {
    const result = await fs.filesystemReadAdapter.execute(makeInput('filesystem.read', { path: '.env' }));
    assert.ok(!result.success, 'Should have denied access to .env');
    assert.ok(result.error?.includes('Access denied'), `Wrong error: ${result.error}`);
  });

  await test('filesystem.read (denied: node_modules)', async () => {
    const result = await fs.filesystemReadAdapter.execute(makeInput('filesystem.read', { path: 'node_modules/something' }));
    assert.ok(!result.success, 'Should have denied access to node_modules');
  });

  await test('filesystem.search (find "PreviewPanel")', async () => {
    const result = await fs.filesystemSearchAdapter.execute(makeInput('filesystem.search', { query: 'PreviewPanel', dir: 'src' }));
    assert.ok(result.success, `Failed: ${result.error}`);
    const data = result.data as { matches: Array<{ file: string; line: number }>; matchCount: number };
    assert.ok(data.matchCount > 0, 'Expected to find PreviewPanel references');
    console.log(`     → ${data.matchCount} matches in ${data.matches[0]?.file}`);
  });

  // ── git ──────────────────────────────────────────────────
  console.log('\nGit (read-only):');

  await test('git.status', async () => {
    const result = await git.gitStatusAdapter.execute(makeInput('git.status', {}));
    assert.ok(result.success, `Failed: ${result.error}`);
    const data = result.data as { branch: string; staged: string[]; unstaged: string[]; untracked: string[] };
    assert.ok(typeof data.branch === 'string', 'Missing branch');
    assert.ok(Array.isArray(data.staged));
    assert.ok(Array.isArray(data.unstaged));
    assert.ok(Array.isArray(data.untracked));
    console.log(`     → branch: ${data.branch}, staged: ${data.staged.length}, unstaged: ${data.unstaged.length}`);
  });

  await test('git.branch', async () => {
    const result = await git.gitBranchAdapter.execute(makeInput('git.branch', {}));
    assert.ok(result.success, `Failed: ${result.error}`);
    const data = result.data as { current: string; branches: string[] };
    assert.ok(data.current.length > 0, 'Expected current branch');
    console.log(`     → current: ${data.current}`);
  });

  await test('git.log', async () => {
    const result = await git.gitLogAdapter.execute(makeInput('git.log', { limit: 5 }));
    assert.ok(result.success, `Failed: ${result.error}`);
    const data = result.data as { commits: Array<{ hash: string; message: string }>; count: number };
    assert.ok(data.count > 0, 'Expected at least one commit');
    assert.ok(data.commits[0].hash.length > 0, 'Missing commit hash');
    console.log(`     → ${data.count} commits, latest: ${data.commits[0].message.slice(0, 50)}`);
  });

  await test('git.diff', async () => {
    const result = await git.gitDiffAdapter.execute(makeInput('git.diff', {}));
    assert.ok(result.success, `Failed: ${result.error}`);
    const data = result.data as { diff: string; empty: boolean };
    assert.ok(typeof data.diff === 'string');
    console.log(`     → diff ${data.empty ? 'empty (clean)' : `${data.diff.length} chars`}`);
  });

  // ── project.build ────────────────────────────────────────
  console.log('\nProject (spawned npm):');

  await test('project.typecheck (workspace root)', async () => {
    console.log('\n     → Running tsc --noEmit (may take ~20s)...');
    const result = await project.projectTypecheckAdapter.execute(makeInput('project.typecheck', { dir: '.' }));
    assert.ok(result.success, `Typecheck failed: ${result.error}\n${(result.data as Record<string, unknown>)?.stderr}`);
    const data = result.data as { exitCode: number; durationMs: number };
    assert.equal(data.exitCode, 0);
    console.log(`     → exitCode: ${data.exitCode}, duration: ${(data.durationMs / 1000).toFixed(1)}s`);
  });

  await test('project.lint (adapter exists)', async () => {
    // Verify the adapter invokes npm correctly (lint may fail in CI without eslint config)
    const result = await project.projectLintAdapter.execute(makeInput('project.lint', { dir: '.' }));
    // Accept both success and known eslint config failures (environment-specific)
    const data = result.data as { exitCode: number; durationMs: number } | undefined;
    // exitCode=1 means lint warnings found — adapter working correctly
    const isExpectedLintFailure = !result.success && result.error?.includes('Lint failed');
    assert.ok(result.success || isExpectedLintFailure, `Unexpected lint error: ${result.error}`);
    console.log(`     → exitCode: ${data?.exitCode ?? 'n/a'} (lint: ${result.success ? 'passed' : 'env issue'})`);
  });

  // ── Summary ──────────────────────────────────────────────
  console.log(`\n─────────────────────────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('All smoke tests passed ✓');
  }
}

main().catch(err => {
  console.error('\nFatal:', err);
  process.exit(1);
});
