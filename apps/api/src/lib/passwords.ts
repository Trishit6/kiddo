import * as argon2 from 'argon2';
import { COMMON_PASSWORDS } from '@reel/shared';
import { badRequest } from './errors.js';

export function isCommonPassword(password: string): boolean {
  const normalized = password.toLowerCase();
  return COMMON_PASSWORDS.some(
    (common) => normalized === common || normalized.replace(/[^a-z]/g, '') === common,
  );
}

export async function hashPassword(password: string): Promise<string> {
  if (isCommonPassword(password)) {
    throw badRequest('AUTH_PASSWORD_TOO_COMMON', 'Choose a less common password');
  }
  return argon2.hash(password);
}

export async function verifyPassword(hash: string | null, password: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
