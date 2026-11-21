import { eq } from 'drizzle-orm';
import type { InjectOptions } from 'light-my-request';
import type { App } from '../app.js';
import { hashtags, videoHashtags, videos, users } from '../db/schema.js';
import { mobileRequest, signupMobile } from './helpers.js';

export interface TestUser {
  id: string;
  username: string;
  token: string;
}

export function authHeaders(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}

export async function createUser(app: App, prefix: string): Promise<TestUser> {
  const created = await signupMobile(app, {
    email: `${prefix}@example.com`,
    username: prefix,
    displayName: `${prefix} display`,
  });
  if (created.response.statusCode !== 201) {
    throw new Error(`signup failed: ${created.response.body}`);
  }
  await app.db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, created.body.user.id));
  return {
    id: created.body.user.id,
    username: created.body.user.username,
    token: created.body.tokens.accessToken,
  };
}

interface CreateVideoInput {
  ownerId: string;
  caption?: string;
  visibility?: 'public' | 'unlisted' | 'private';
  status?: 'uploading' | 'processing' | 'ready' | 'failed';
  createdAt?: Date;
  deletedAt?: Date | null;
  tag?: string;
  likesCount?: number;
  hotScore?: number;
  viewsCount?: number;
}

export async function createVideo(app: App, input: CreateVideoInput): Promise<string> {
  const id = crypto.randomUUID();
  await app.db.insert(videos).values({
    id,
    ownerId: input.ownerId,
    caption: input.caption ?? 'Test clip',
    status: input.status ?? 'ready',
    visibility: input.visibility ?? 'public',
    durationSeconds: 10,
    width: 720,
    height: 1280,
    storageKey: `videos/${id}/hls/master.m3u8`,
    thumbnailKey: `videos/${id}/thumb.jpg`,
    likesCount: input.likesCount ?? 0,
    hotScore: input.hotScore ?? 0,
    viewsCount: input.viewsCount ?? 0,
    createdAt: input.createdAt ?? new Date(),
    deletedAt: input.deletedAt ?? null,
  });
  if (input.tag) {
    await app.db
      .insert(hashtags)
      .values({ name: input.tag })
      .onConflictDoNothing({ target: hashtags.name });
    const [tag] = await app.db
      .select({ id: hashtags.id })
      .from(hashtags)
      .where(eq(hashtags.name, input.tag))
      .limit(1);
    if (tag) {
      await app.db
        .insert(videoHashtags)
        .values({ videoId: id, hashtagId: tag.id })
        .onConflictDoNothing();
    }
  }
  return id;
}

export async function getJson<T>(
  app: App,
  url: string,
  options: { token?: string; headers?: Record<string, string> } = {},
): Promise<T> {
  const response = await mobileRequest(app, {
    method: 'GET',
    url,
    headers: {
      ...(options.token ? authHeaders(options.token) : {}),
      ...(options.headers ?? {}),
    },
  });
  if (response.statusCode !== 200) {
    throw new Error(`GET ${url} failed (${response.statusCode}): ${response.body}`);
  }
  return response.json() as T;
}

export async function postJson<T>(
  app: App,
  url: string,
  options: {
    token?: string;
    payload?: InjectOptions['payload'];
    headers?: Record<string, string>;
  } = {},
): Promise<{ status: number; body: T }> {
  const response = await mobileRequest(app, {
    method: 'POST',
    url,
    payload: options.payload,
    headers: {
      ...(options.token ? authHeaders(options.token) : {}),
      ...(options.headers ?? {}),
    },
  });
  return { status: response.statusCode, body: response.json() as T };
}
