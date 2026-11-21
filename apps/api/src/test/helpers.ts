import { expect } from 'vitest';
import type { InjectOptions } from 'light-my-request';
import type { AuthResponse } from '@reel/shared';
import type { App } from '../app.js';
import { users } from '../db/schema.js';
import type { TestMailProvider } from '../plugins/mail.js';

let ipCounter = 0;
let userCounter = 0;

export function nextIp(): string {
  ipCounter += 1;
  return `10.20.${Math.floor(ipCounter / 250) % 250}.${(ipCounter % 250) + 1}`;
}

export async function mobileRequest(
  app: App,
  options: InjectOptions,
  remoteAddress: string = nextIp(),
) {
  return app.inject({
    ...options,
    remoteAddress,
    headers: { 'x-client': 'mobile', ...(options.headers ?? {}) },
  });
}

export function expectStatus<T extends { statusCode: number }>(response: T, status: number): T {
  expect(response.statusCode).toBe(status);
  return response;
}

export function authBody(response: { json(): unknown }): AuthResponse {
  return response.json() as AuthResponse;
}

export function testMail(app: App): TestMailProvider {
  if (!app.testMail) throw new Error('Test mail provider is not installed');
  return app.testMail;
}

export async function cleanUsers(app: App): Promise<void> {
  await app.db.delete(users);
  testMail(app).messages.length = 0;
}

export async function signupMobile(
  app: App,
  overrides: Partial<{
    email: string;
    username: string;
    password: string;
    displayName: string;
  }> = {},
) {
  userCounter += 1;
  const payload = {
    email: overrides.email ?? `user${userCounter}@example.com`,
    username: overrides.username ?? `user${userCounter}`,
    password: overrides.password ?? 'Str0ng!Passphrase',
    ...(overrides.displayName ? { displayName: overrides.displayName } : {}),
  };
  const response = await mobileRequest(app, {
    method: 'POST',
    url: '/auth/signup',
    payload,
  });
  return { response, body: authBody(response), payload };
}
