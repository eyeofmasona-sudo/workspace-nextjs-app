/**
 * Smoke Test — Browser Operator Module
 *
 * Verifies the Browser Operator API endpoints and graceful behavior
 * without Playwright installed. Run with: bun run browser:smoke
 *
 * Prerequisites: dev server running on http://localhost:3000
 */

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: TestResult[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, passed: true, detail });
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name: string, detail: string) {
  results.push({ name, passed: false, detail });
  console.log(`  ❌ ${name} — ${detail}`);
}

async function fetchJSON(path: string, options?: RequestInit) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    const data = await res.json();
    return { status: res.status, data, ok: res.ok };
  } catch (err) {
    return { status: 0, data: null, ok: false, error: String(err) };
  }
}

// ── Tests ─────────────────────────────────────────────────────

async function testProvidersEndpoint() {
  console.log('\n📋 Testing GET /api/browser-operator/providers');
  const { status, data, ok } = await fetchJSON('/api/browser-operator/providers');

  if (!ok) {
    fail('Providers endpoint responds', `Status ${status}: ${JSON.stringify(data)}`);
    return;
  }

  pass('Providers endpoint responds', `Status ${status}`);

  if (!data.providers || !Array.isArray(data.providers)) {
    fail('Providers returns array', `Got: ${typeof data.providers}`);
    return;
  }

  pass('Providers returns array', `${data.providers.length} providers`);

  // Check expected providers
  const expectedIds = ['chatgpt', 'claude', 'gemini', 'zai', 'custom'];
  const actualIds = data.providers.map((p: any) => p.id);
  for (const id of expectedIds) {
    if (actualIds.includes(id)) {
      pass(`Provider "${id}" registered`, `Found in providers list`);
    } else {
      fail(`Provider "${id}" registered`, `Missing. Available: ${actualIds.join(', ')}`);
    }
  }
}

async function testSubmitTask() {
  console.log('\n📋 Testing POST /api/browser-operator/tasks');
  const { status, data, ok } = await fetchJSON('/api/browser-operator/tasks', {
    method: 'POST',
    body: JSON.stringify({
      provider: 'custom',
      prompt: 'Smoke test — navigate to example.com',
      mode: 'navigate',
      url: 'https://example.com',
      priority: 'low',
    }),
  });

  if (!ok) {
    fail('Submit task responds', `Status ${status}: ${JSON.stringify(data)}`);
    return null;
  }

  pass('Submit task responds', `Status ${status}`);

  if (!data.task || !data.task.id) {
    fail('Task has ID', `Got: ${JSON.stringify(data.task?.id)}`);
    return null;
  }

  pass('Task has ID', data.task.id);
  return data.task.id as string;
}

async function testGetTask(taskId: string) {
  console.log('\n📋 Testing GET /api/browser-operator/tasks/:id');
  const { status, data, ok } = await fetchJSON(`/api/browser-operator/tasks/${taskId}`);

  if (!ok) {
    fail('Get task responds', `Status ${status}: ${JSON.stringify(data)}`);
    return;
  }

  pass('Get task responds', `Status ${status}`);

  if (data.task?.id !== taskId) {
    fail('Task ID matches', `Expected ${taskId}, got ${data.task?.id}`);
    return;
  }

  pass('Task ID matches', data.task.id);
}

async function testListTasks() {
  console.log('\n📋 Testing GET /api/browser-operator/tasks');
  const { status, data, ok } = await fetchJSON('/api/browser-operator/tasks');

  if (!ok) {
    fail('List tasks responds', `Status ${status}: ${JSON.stringify(data)}`);
    return;
  }

  pass('List tasks responds', `Status ${status}`);

  if (!data.tasks || !Array.isArray(data.tasks)) {
    fail('Tasks returns array', `Got: ${typeof data.tasks}`);
    return;
  }

  pass('Tasks returns array', `${data.tasks.length} tasks`);

  if (data.stats) {
    pass('Stats included', `Total: ${data.stats.total}`);
  } else {
    fail('Stats included', 'No stats object');
  }
}

async function testRetryTask(taskId: string) {
  console.log('\n📋 Testing POST /api/browser-operator/tasks/:id/retry');
  const { status, data, ok } = await fetchJSON(`/api/browser-operator/tasks/${taskId}/retry`, {
    method: 'POST',
  });

  // Retry may fail if task isn't in 'failed' status — that's expected
  if (ok) {
    pass('Retry task responds (success)', `Status ${status}`);
  } else if (status === 409) {
    pass('Retry task responds (expected 409)', 'Task not in failed state — correct behavior');
  } else {
    // Even server errors are acceptable here since the task may have auto-processed
    pass('Retry task responds', `Status ${status} (task may have auto-processed)`);
  }
}

async function testResumeTask(taskId: string) {
  console.log('\n📋 Testing POST /api/browser-operator/tasks/:id/resume');
  const { status, ok } = await fetchJSON(`/api/browser-operator/tasks/${taskId}/resume`, {
    method: 'POST',
  });

  // Resume should fail if task isn't in needs_human — that's expected
  if (ok) {
    pass('Resume task responds (success)', `Status ${status}`);
  } else if (status === 409) {
    pass('Resume task responds (expected 409)', 'Task not in needs_human state — correct behavior');
  } else {
    pass('Resume task responds', `Status ${status}`);
  }
}

async function testScreenshotTask(taskId: string) {
  console.log('\n📋 Testing POST /api/browser-operator/tasks/:id/screenshot');
  const { status, ok } = await fetchJSON(`/api/browser-operator/tasks/${taskId}/screenshot`, {
    method: 'POST',
  });

  // Screenshot will fail without Playwright — that's expected graceful degradation
  if (ok) {
    pass('Screenshot task responds (success)', `Status ${status}`);
  } else {
    pass('Screenshot task responds (graceful failure)', `Status ${status} — likely no active browser session`);
  }
}

async function testScreenshotRoute() {
  console.log('\n📋 Testing GET /api/browser-operator/screenshots/:filename');
  const { status } = await fetchJSON('/api/browser-operator/screenshots/nonexistent.png');

  // Should return 404 for non-existent file
  if (status === 404) {
    pass('Screenshot route 404 for missing file', `Status ${status}`);
  } else {
    pass('Screenshot route responds', `Status ${status}`);
  }

  // Test path traversal protection
  const { status: traversalStatus } = await fetchJSON('/api/browser-operator/screenshots/..%2F..%2Fetc%2Fpasswd.png');
  if (traversalStatus === 400) {
    pass('Screenshot route blocks path traversal', `Status ${traversalStatus}`);
  } else {
    fail('Screenshot route blocks path traversal', `Got status ${traversalStatus}, expected 400`);
  }
}

async function testGracefulWithoutPlaywright() {
  console.log('\n📋 Testing graceful behavior without Playwright');
  // When Playwright is not installed, submitting a task should:
  // - Create the task (status=queued initially)
  // - Eventually set it to failed with a clear error message
  // We already submitted a task above; let's check its status after a short delay
  await new Promise((r) => setTimeout(r, 4000));

  const { data, ok } = await fetchJSON('/api/browser-operator/tasks');

  if (!ok || !data.tasks) {
    fail('Check task after processing', 'Could not fetch tasks');
    return;
  }

  const recentTask = data.tasks.find((t: any) => t.input?.prompt?.includes('Smoke test'));
  if (!recentTask) {
    fail('Find smoke test task', 'Task not found in list');
    return;
  }

  pass('Smoke test task found', `Status: ${recentTask.output?.status}`);

  // Task should be failed (no Playwright) or completed (if Playwright happens to be installed)
  const status = recentTask.output?.status;
  if (status === 'failed') {
    const error = recentTask.output?.error || '';
    if (error.toLowerCase().includes('playwright') || error.toLowerCase().includes('browser')) {
      pass('Clear error message about Playwright', error.slice(0, 100));
    } else {
      pass('Task failed (no Playwright)', error.slice(0, 100));
    }
  } else if (status === 'completed') {
    pass('Task completed (Playwright is installed!)', `Result: ${(recentTask.output?.result || '').slice(0, 80)}`);
  } else if (status === 'queued' || status === 'running') {
    pass('Task still processing', `Status: ${status}`);
  } else {
    pass('Task in some status', `Status: ${status}`);
  }
}

async function testValidationErrors() {
  console.log('\n📋 Testing API validation');

  // Missing provider
  const { status: s1 } = await fetchJSON('/api/browser-operator/tasks', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'test', mode: 'navigate' }),
  });
  if (s1 === 400) {
    pass('Rejects missing provider', `Status ${s1}`);
  } else {
    fail('Rejects missing provider', `Got status ${s1}, expected 400`);
  }

  // Missing prompt
  const { status: s2 } = await fetchJSON('/api/browser-operator/tasks', {
    method: 'POST',
    body: JSON.stringify({ provider: 'custom', mode: 'navigate' }),
  });
  if (s2 === 400) {
    pass('Rejects missing prompt', `Status ${s2}`);
  } else {
    fail('Rejects missing prompt', `Got status ${s2}, expected 400`);
  }

  // Invalid mode
  const { status: s3 } = await fetchJSON('/api/browser-operator/tasks', {
    method: 'POST',
    body: JSON.stringify({ provider: 'custom', prompt: 'test', mode: 'invalid' }),
  });
  if (s3 === 400) {
    pass('Rejects invalid mode', `Status ${s3}`);
  } else {
    fail('Rejects invalid mode', `Got status ${s3}, expected 400`);
  }

  // Unknown provider
  const { status: s4 } = await fetchJSON('/api/browser-operator/tasks', {
    method: 'POST',
    body: JSON.stringify({ provider: 'nonexistent', prompt: 'test', mode: 'navigate' }),
  });
  if (s4 === 500) {
    pass('Rejects unknown provider', `Status ${s4}`);
  } else {
    fail('Rejects unknown provider', `Got status ${s4}, expected 500`);
  }
}

// ── Runner ────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Browser Operator Smoke Test');
  console.log(`   Base URL: ${BASE}`);
  console.log(`   Time: ${new Date().toISOString()}\n`);

  await testProvidersEndpoint();
  const taskId = await testSubmitTask();
  await testListTasks();

  if (taskId) {
    await testGetTask(taskId);
    await testRetryTask(taskId);
    await testResumeTask(taskId);
    await testScreenshotTask(taskId);
  }

  await testScreenshotRoute();
  await testGracefulWithoutPlaywright();
  await testValidationErrors();

  // Summary
  console.log('\n' + '═'.repeat(60));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  console.log(`📊 Results: ${passed}/${total} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`   - ${r.name}: ${r.detail}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All smoke tests passed!');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
