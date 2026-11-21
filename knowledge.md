# Project knowledge: Reel

Reel is a short-video social app (TikTok/Instagram style) built as a pnpm monorepo: Fastify API, Vite web app and Expo mobile app. Current state is **Phase 4** — auth/profiles, video upload/processing, both feeds, comments, likes, saves, follows, notifications and an admin area.

## Where the code lives

- `apps/api` — Fastify 5 API (TypeScript, ESM), Drizzle ORM + Postgres, Redis/BullMQ, MinIO/S3, ffmpeg worker.
  - `src/app.ts` — `buildApp()`; registers plugins, `/docs` (Swagger UI generated from the Zod schemas) and route prefixes.
  - `src/env.ts` — Zod-validated config with dev defaults. Production fails fast if JWT/cookie secrets are still `dev-only-*`.
  - `src/features/<name>/plugin.ts` — one Fastify plugin per domain: `auth`, `users`, `videos` (+ `interactions.ts`), `feed`, `comments`, `notifications`, `admin`. `features/create-feature-plugin.ts` is the template helper.
  - `src/plugins/` — cross-cutting: `db`, `redis`, `s3`, `queues`, `mail`,`app-auth` (`app.authenticate` preHandler), `rate-limit`, `error-handler`, `video-provider`.
  - `src/feed/` — `queries.ts` (candidate generation), `filters.ts`, `session.ts` (Redis for-you session), `ranker.ts` (`FeedRanker`), `data.ts` (`FeedItem` loading).
  - `src/db/schema.ts` — single source of truth for tables; `migrate.ts`, `seed.ts`, `seed-load.ts`.
  - `src/worker.ts` + `src/worker/` — BullMQ worker (transcode, probe, cleanup, social jobs); `src/video/` — provider logic.
  - `src/events.ts` — typed in-process domain event bus (`video.liked`, `user.followed`, …) used for Phase 7 notifications.
  - `src/lib/` — helpers: `errors.ts`, `visibility.ts`, `cursor.ts`, `videos.ts`, `video-access.ts`, `tokens.ts`, `rate-limit-key.ts`.
  - `src/routes/health.ts` — unprefixed `/health` and `/ready` (consumed by both clients).
  - `src/test/` — Vitest global setup and helpers (test DB is migrated automatically).
  - `drizzle/` — generated SQL migrations + snapshots; commit them.
- `apps/web` — Vite + React 19, React Router 7, TanStack Query, Tailwind v4, Motion (`motion/react`), shadcn-style UI in `src/components/ui`, pages in `src/pages`. API access goes through `src/lib/api.ts` (built on `@reel/shared`).
- `apps/mobile` — Expo SDK 58 + Expo Router. Routes in `app/`: `index`, `login`, `signup`, `verify-email`, `forgot-password`, `reset-password`, `video/`, and tabs `feed`/`explore`/`upload`/`inbox`/`profile`. Shared pieces in `src/components` and `src/lib` (`secure-storage.ts`, `google.ts`, `api.ts`).
- `packages/shared` — Zod schemas and inferred types (`src/schemas/*`), constants, and the typed API client (`src/client.ts`). Consumed as TypeScript source; **no build step**.
- `packages/queries` — shared TanStack Query hooks, keys, optimistic helpers and view tracker used by web and mobile; has its own Vitest suite.
- `packages/tokens` — design tokens exported as `tokens.css` (imported by `apps/web/src/index.css`); consumed as source.
- `packages/config` — shared tsconfigs, ESLint flat config, Prettier config.
- `docker/` — Postgres test-DB init SQL, MinIO CORS, worker Dockerfile.

## Commands

```bash
pnpm install
docker compose up -d          # postgres, redis, mailpit, minio (+ bucket init)
pnpm db:migrate
pnpm db:seed                  # 10 users (seeduser1..10 / Password123!), videos, social data
pnpm dev                      # API :3000, web :5173, worker
```

| Command                | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `pnpm dev`             | API + web + worker in parallel (`scripts/dev.mjs`) |
| `pnpm dev:app`         | API + web only                                     |
| `pnpm dev:worker`      | Worker only (needs ffmpeg on the host)             |
| `pnpm dev:mobile`      | Expo dev server                                    |
| `pnpm build`           | `pnpm -r --if-present build`                       |
| `pnpm typecheck`       | TypeScript across all workspaces                   |
| `pnpm lint` / `format` | ESLint / Prettier write                            |
| `pnpm test`            | Vitest suites in api + queries (Docker required)   |
| `pnpm db:generate`     | `drizzle-kit generate` after editing `schema.ts`   |
| `pnpm db:migrate`      | Apply pending migrations                           |
| `pnpm db:seed`         | Seed demo data                                     |
| `pnpm db:seed:load`    | Bulk fixture (50k videos / 5k users) for profiling |
| `pnpm bench:feed`      | Autocannon p50/p95 for both feeds (API must run)   |

Single test: `pnpm --filter @reel/api test src/path/to/file.test.ts`. Tests need Postgres `reel_test` and Redis logical DB 1; Vitest is configured with `fileParallelism: false`. Tests never use the dev DB.

## Conventions and gotchas

- Node 24 (`.nvmrc`), pnpm 11, TypeScript 6. tsconfigs use `paths` without deprecated `baseUrl`.
- Fastify uses `fastify-type-provider-zod` v7 with Zod 4 (`import { z } from 'zod'`). Every route declares request and response schemas — they drive both validation and `/docs`.
- Errors go through `plugins/error-handler.ts` in the shape `{ error: { code, message, requestId, details? } }`. Throw via helpers in `lib/errors.ts` (`badRequest`, `unauthorized`, `forbidden`, `conflict`, `AppError`) using codes from `apiErrorCodeSchema` in `@reel/shared`.
- Add shared schemas/types to `packages/shared/src/schemas` and re-export from `packages/shared/src/index.ts` — never app-local copies. Vitest aliases `@reel/shared` to `packages/shared/src/index.ts` and inlines it as source.
- DB changes: edit `apps/api/src/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate` → commit `apps/api/drizzle/`.
- List visibility rules live in `lib/visibility.ts`; keyset pagination cursors in `lib/cursor.ts`. Both feeds must use them rather than ad-hoc filters.
- For-you feed: a 200-video session is cached in Redis (30 min TTL) on first request and later pages slice it, so pagination stays stable. Ranking uses `hot_score`, a follow boost, a 20% fresh reserve and author spacing; `hot_score` is refreshed every 5 min by a BullMQ repeatable job.
- Auth: 15-min HS256 access JWT (memory only on web), opaque hashed refresh tokens rotated on use, reuse revokes the family. Web keeps the refresh token in a signed httpOnly cookie scoped to `/auth`; mobile sends `x-client: mobile` and uses `expo-secure-store`. Banned users are blocked everywhere.
- Web env lives in `apps/web/.env` (`VITE_API_BASE_URL`, `VITE_GOOGLE_WEB_CLIENT_ID`); mobile in `apps/mobile/.env` (`EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`). Restart Expo with `--clear` after changing mobile env.
- Android emulator → `http://10.0.2.2:3000`; iOS simulator → `http://localhost:3000`; physical device → LAN IP.
- Expo Metro is auto-configured for pnpm workspaces: keep `apps/mobile/metro.config.js` minimal (no `watchFolders`, `nodeModulesPaths`, `disableHierarchicalLookup`). `.npmrc` intentionally avoids `node-linker=hoisted`.
- Tailwind v4 is CSS-first: design tokens and `@custom-variant dark` live in `apps/web/src/index.css`.
- Docker Compose uses `elestio/minio` (server) and `insectai/minio` (`mc` bucket init) because the official MinIO Docker Hub repos were removed — do not change them back.
- Worker image is opt-in: `docker compose --profile worker up -d --build`, otherwise run `pnpm dev:worker` with ffmpeg installed.
- Pre-commit hook runs `lint-staged` (`eslint --fix`, `prettier --write`) on staged files, so commits may rewrite them.
- Code standards: no `any`, no TODO placeholders, no dead code.
