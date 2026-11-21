import { createApiClient } from '@reel/shared';
import type { SessionTokens, TokenStorage } from '@reel/shared';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

let tokens: SessionTokens | null = null;

const tokenStorage: TokenStorage = {
  get: () => tokens,
  set: (next) => {
    // The refresh token lives in an httpOnly cookie on web; only the access
    // token is kept in memory.
    tokens = { accessToken: next.accessToken, expiresIn: next.expiresIn };
  },
  clear: () => {
    tokens = null;
  },
};

type SessionClearListener = () => void;
const sessionClearListeners = new Set<SessionClearListener>();

function anonymousId(): string {
  const key = 'reel.anonId';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, id);
  return id;
}

export function onSessionCleared(listener: SessionClearListener): () => void {
  sessionClearListeners.add(listener);
  return () => sessionClearListeners.delete(listener);
}

export const api = createApiClient({
  baseUrl,
  sessionTransport: 'cookie',
  tokenStorage,
  getAnonId: anonymousId,
  onSessionCleared: () => {
    for (const listener of sessionClearListeners) listener();
  },
});

export const googleWebClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? '';
