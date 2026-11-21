import autocannon from 'autocannon';
import process from 'node:process';

const API_URL = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const EMAIL = process.env.BENCH_EMAIL ?? 'load-user-1@example.com';
const PASSWORD = process.env.BENCH_PASSWORD ?? 'Password123!';
const CONNECTIONS = Number(process.env.BENCH_CONNECTIONS ?? 10);
const DURATION = Number(process.env.BENCH_DURATION ?? 10);

function percentile(sorted, value) {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((value / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
}

async function login() {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-client': 'mobile' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      `Login as ${EMAIL} failed (${response.status}). Run \`pnpm db:seed:load\` and make sure the API is running.`,
    );
  }
  return body.tokens.accessToken;
}

function run(kind, token) {
  return new Promise((resolve, reject) => {
    const latencies = [];
    const instance = autocannon({
      url: `${API_URL}/feed/${kind}?limit=10`,
      connections: CONNECTIONS,
      duration: DURATION,
      headers: { authorization: `Bearer ${token}` },
    });

    instance.on('response', (_client, statusCode, _bytes, responseTime) => {
      if (Number(statusCode) === 200) latencies.push(responseTime);
    });
    instance.on('error', reject);
    instance.on('done', (result) => {
      latencies.sort((left, right) => left - right);
      resolve({
        kind,
        requestsPerSecond: Math.round((result['2xx'] ?? 0) / (result.duration || DURATION)),
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        non2xx: result.non2xx,
        errors: result.errors,
        samples: latencies.length,
      });
    });
  });
}

const token = await login();
const results = [];
for (const kind of ['for-you', 'following']) {
  console.log(`Benchmarking GET /feed/${kind}?limit=10 ...`);
  results.push(await run(kind, token));
}

console.table(
  results.map((row) => ({
    endpoint: `/feed/${row.kind}`,
    'req/sec': row.requestsPerSecond,
    'p50 (ms)': row.p50,
    'p95 (ms)': row.p95,
    'non-2xx': row.non2xx,
    errors: row.errors,
    samples: row.samples,
  })),
);

const totalNon2xx = results.reduce((sum, row) => sum + row.non2xx, 0);
if (totalNon2xx > 0) {
  console.warn(
    `${totalNon2xx} non-2xx responses; results are invalid. Restart the API with a higher RATE_LIMIT_MAX.`,
  );
  process.exitCode = 1;
}

const slowest = Math.max(...results.map((row) => row.p95));
if (slowest >= 150) {
  console.warn(`p95 ${slowest} ms is above the 150 ms target.`);
  process.exitCode = 1;
}
