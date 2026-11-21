import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app.js';
import { healthResponseSchema } from '@reel/shared';

describe('health routes', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json()).status).toBe('ok');
  });

  it('GET /ready returns ok when Postgres and Redis respond', async () => {
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json()).service).toBe('reel-api');
  });

  it('GET /ready returns 503 when a dependency fails', async () => {
    const ping = vi.spyOn(app.redis, 'ping').mockRejectedValueOnce(new Error('redis down'));
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: { code: 'SERVICE_UNAVAILABLE', requestId: expect.any(String) },
    });
    ping.mockRestore();
  });
});
