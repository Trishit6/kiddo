import { createApiClient } from '@reel/shared';
import * as SecureStore from 'expo-secure-store';
import { secureTokenStorage } from '@/lib/secure-storage';

const ANON_ID_KEY = 'reel.anonId';
let anonymousIdPromise: Promise<string> | null = null;

async function anonymousId(): Promise<string> {
  anonymousIdPromise ??= (async () => {
    const existing = await SecureStore.getItemAsync(ANON_ID_KEY);
    if (existing) return existing;
    const id = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    await SecureStore.setItemAsync(ANON_ID_KEY, id);
    return id;
  })();
  return anonymousIdPromise;
}

// Expo inlines EXPO_PUBLIC_* variables at build time. Override this for a
// physical device (LAN IP) or Android emulator (10.0.2.2) — see .env.example.
const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

type SessionClearListener = () => void;
const sessionClearListeners = new Set<SessionClearListener>();

export function onSessionCleared(listener: SessionClearListener): () => void {
  sessionClearListeners.add(listener);
  return () => sessionClearListeners.delete(listener);
}

export const api = createApiClient({
  baseUrl,
  sessionTransport: 'token',
  tokenStorage: secureTokenStorage,
  getAnonId: anonymousId,
  onSessionCleared: () => {
    for (const listener of sessionClearListeners) listener();
  },
});
