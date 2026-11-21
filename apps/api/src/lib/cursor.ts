import { z } from 'zod';
import { badRequest } from './errors.js';

const cursorPayloadSchema = z.object({
  v: z.literal(1),
  k: z.array(z.string()),
  id: z.string().min(1),
});

export function encodeCursor(keyParts: (string | number)[], id: string): string {
  const payload = { v: 1, k: keyParts.map(String), id };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { keyParts: string[]; id: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw badRequest('VALIDATION_ERROR', 'Invalid cursor');
  }
  const parsed = cursorPayloadSchema.safeParse(raw);
  if (!parsed.success) throw badRequest('VALIDATION_ERROR', 'Invalid cursor');
  return { keyParts: parsed.data.k, id: parsed.data.id };
}
