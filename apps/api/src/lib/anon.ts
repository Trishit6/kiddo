import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { badRequest } from './errors.js';

const anonIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

export function readAnonId(request: FastifyRequest): string | null {
  const raw = request.headers['x-anon-id'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const parsed = anonIdSchema.safeParse(value);
  if (!parsed.success) throw badRequest('VALIDATION_ERROR', 'Invalid x-anon-id header');
  return parsed.data;
}
