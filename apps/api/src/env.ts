import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

function findWorkspaceRoot(start: string): string | null {
  let current = start;
  for (;;) {
    if (existsSync(resolve(current, 'pnpm-workspace.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

const moduleDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = findWorkspaceRoot(process.cwd()) ?? findWorkspaceRoot(moduleDir);

if (workspaceRoot && existsSync(resolve(workspaceRoot, '.env'))) {
  dotenv.config({ path: resolve(workspaceRoot, '.env') });
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().positive().max(65535).default(3000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    DATABASE_URL: z.string().min(1).default('postgresql://reel:reel@localhost:5432/reel'),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    REDIS_URL: z.string().min(1).default('redis://localhost:6380/0'),
    S3_ENDPOINT: z.string().min(1).default('http://localhost:9000'),
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_ACCESS_KEY_ID: z.string().min(1).default('reelminio'),
    S3_SECRET_ACCESS_KEY: z.string().min(1).default('reelminio123'),
    S3_BUCKET: z.string().min(1).default('reel-videos'),
    S3_PUBLIC_ENDPOINT: z.url().default('http://localhost:9000'),
    S3_PUBLIC_BASE_URL: z.url().default('http://localhost:9000/reel-videos'),
    MEDIA_PUBLIC_BASE_URL: z.url().default('http://localhost:9000/reel-videos'),
    APP_URL: z.url().default('http://localhost:5173'),
    VIDEO_PROVIDER: z.enum(['local-ffmpeg', 'managed']).default('local-ffmpeg'),
    MAX_VIDEO_MB: z.coerce.number().int().positive().default(200),
    MAX_VIDEO_SECONDS: z.coerce.number().int().positive().default(60),
    MIN_VIDEO_SECONDS: z.coerce.number().int().positive().default(1),
    MAX_VIDEO_DIMENSION: z.coerce.number().int().positive().default(4096),
    KEEP_ORIGINAL_DAYS: z.coerce.number().int().nonnegative().default(7),
    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
    FFMPEG_PATH: z.string().min(1).default('ffmpeg'),
    FFPROBE_PATH: z.string().min(1).default('ffprobe'),
    JWT_ACCESS_SECRET: z.string().min(1).default('dev-only-access-secret-change-me'),
    JWT_REFRESH_SECRET: z.string().min(1).default('dev-only-refresh-secret-change-me'),
    JWT_ACCESS_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60),
    JWT_REFRESH_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(30 * 24 * 60 * 60),
    JWT_ISSUER: z.string().min(1).default('reel-api'),
    JWT_AUDIENCE: z.string().min(1).default('reel-app'),
    COOKIE_SECRET: z.string().min(1).default('dev-only-cookie-secret-change-me'),
    SMTP_HOST: z.string().min(1).default('mailpit'),
    SMTP_PORT: z.coerce.number().int().positive().max(65535).default(1025),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().min(1).default('Reel <no-reply@reel.local>'),
    GOOGLE_WEB_CLIENT_ID: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : undefined)),
    GOOGLE_MOBILE_CLIENT_ID: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .superRefine((values, ctx) => {
    if (values.NODE_ENV !== 'production') return;
    if (!values.DATABASE_URL.startsWith('postgres')) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL must be a postgres connection string',
      });
    }
    if (values.MIN_VIDEO_SECONDS > values.MAX_VIDEO_SECONDS) {
      ctx.addIssue({
        code: 'custom',
        path: ['MIN_VIDEO_SECONDS'],
        message: 'MIN_VIDEO_SECONDS must not exceed MAX_VIDEO_SECONDS',
      });
    }
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET'] as const) {
      if (values[key].startsWith('dev-only')) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} must be replaced in production`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

export const env = parseEnv();
