import process from 'node:process';

const origin = process.argv[2];
if (!origin) throw new Error('usage: node scripts/post-deploy-smoke.mjs <origin>');
const normalized = origin.replace(/\/$/, '');

async function check(pathname) {
  const response = await fetch(normalized + pathname, {
    headers: { accept: 'application/json', 'user-agent': 'saasharness-release-verifier/1.0' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true) {
    throw new Error(`${pathname} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

let lastError;
for (let attempt = 1; attempt <= 12; attempt += 1) {
  try {
    const health = await check('/api/health');
    const ready = await check('/api/ready');
    if (health.codeReady !== true) throw new Error('deployed profile is not codeReady');
    console.log(JSON.stringify({ attempt, origin: normalized, health, ready }, null, 2));
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(JSON.stringify({ attempt, error: error instanceof Error ? error.message : String(error) }));
    await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** (attempt - 1), 15_000)));
  }
}
throw lastError ?? new Error('post-deploy smoke failed');
