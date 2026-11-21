import * as SecureStore from 'expo-secure-store';
import type { SessionTokens, TokenStorage } from '@reel/shared';

const ACCESS_TOKEN_KEY = 'reel.accessToken';
const REFRESH_TOKEN_KEY = 'reel.refreshToken';
const EXPIRES_IN_KEY = 'reel.expiresIn';

async function remove(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export const secureTokenStorage: TokenStorage = {
  async get(): Promise<SessionTokens | null> {
    const [accessToken, refreshToken, expiresIn] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(EXPIRES_IN_KEY),
    ]);
    if (!accessToken) return null;
    const parsedExpiresIn = expiresIn === null ? Number.NaN : Number(expiresIn);
    return {
      accessToken,
      refreshToken,
      expiresIn: Number.isFinite(parsedExpiresIn) ? parsedExpiresIn : undefined,
    };
  },
  async set(tokens: SessionTokens): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } else {
      await remove(REFRESH_TOKEN_KEY);
    }
    if (tokens.expiresIn !== undefined) {
      await SecureStore.setItemAsync(EXPIRES_IN_KEY, String(tokens.expiresIn));
    } else {
      await remove(EXPIRES_IN_KEY);
    }
  },
  async clear(): Promise<void> {
    await Promise.all([
      remove(ACCESS_TOKEN_KEY),
      remove(REFRESH_TOKEN_KEY),
      remove(EXPIRES_IN_KEY),
    ]);
  },
};
