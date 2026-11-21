# Repo guidance

## Setup and commands

- Use pnpm 11 (`packageManager: pnpm@11.25.0`, `corepack enable`) and Node 24 (`.nvmrc`); TypeScript 6. Root scripts use `pnpm -r --if-present`, so workspaces without a script are skipped; tsconfigs use `paths` without `baseUrl`.
- Full local flow: `pnpm install && docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev`.
- `pnpm dev` starts API (`:3000`, docs `/docs`), web (`:5173` — the frontend) and worker via `scripts/dev.mjs`. `pnpm dev:app` is API + web only; `pnpm dev:worker` is worker only.
- The worker needs `ffmpeg`/`ffprobe` on PATH. `scripts/dev.mjs` stops every child when any child exits, so a worker failure will take down Vite too; use `pnpm dev:app` when you only need the frontend. The Docker worker is opt-in (`docker compose --profile worker up -d --build`).
- `pnpm dev:mobile` starts Expo. Set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env` (physical device = LAN IP, Android emulator = `http://10.0.2.2:3000`, iOS simulator = `http://localhost:3000`) and restart with `pnpm --filter @reel/mobile dev -- --clear` after env changes.

## Verification

- CI runs `pnpm typecheck` → `pnpm lint` → `pnpm test` on Node 24/pnpm 11 with Postgres and Redis service containers.
- `pnpm test` runs Vitest in api/web/queries plus mobile Jest (`--passWithNoTests`). API tests use Postgres `reel_test` and Redis logical DB 1 (override with `TEST_DATABASE_URL` / `TEST_REDIS_URL`); `src/test/global-setup.ts` migrates the test DB and flushes Redis, and `fileParallelism: false`.
- Single tests: `pnpm --filter @reel/api test src/features/auth/auth.test.ts`, `pnpm --filter @reel/web test src/path/to/file.test.tsx`, `pnpm --filter @reel/queries test src/optimistic.test.ts`.

## Boundaries and conventions

- Workspaces: `apps/{api,web,mobile}`, `packages/{shared,queries,tokens,config}`. `@reel/shared`, `@reel/queries`, `@reel/tokens` are consumed as TS source with no build step; aliases point at `src/index.ts`. Add shared schemas/types under `packages/shared/src/schemas/*` and re-export from `packages/shared/src/index.ts` — never app-local copies.
- API config is Zod-validated in `apps/api/src/env.ts` and loads root `.env` when present; dev defaults mean no `.env` is needed. Production rejects JWT/cookie secrets that still start with `dev-only-`. Trust `env.ts` over `.env.example`.
- API routes live in `apps/api/src/features/<domain>/plugin.ts` (plus `videos/interactions.ts`) and are registered with prefixes in `apps/api/src/app.ts`; `/health` and `/ready` are unprefixed. Feature folders have real routes — the comment in `create-feature-plugin.ts` is stale. Swagger `/docs` is generated from route Zod schemas.
- Fastify uses `fastify-type-provider-zod` v7 with Zod 4 (`import { z } from 'zod'`). Routes declare request/response schemas; errors flow through the central handler as `{ error: { code, message, requestId, details? } }` using helpers in `apps/api/src/lib/errors.ts`.
- DB changes: edit `apps/api/src/db/schema.ts`, then `pnpm db:generate`, `pnpm db:migrate`, and commit `apps/api/drizzle/`.
- Docker Compose uses `elestio/minio` (server) and `insectai/minio` (bucket init) because official MinIO Docker Hub repos were removed — do not switch back.
- Tailwind v4 is CSS-first: `apps/web/src/index.css` imports `@reel/tokens/tokens.css`, defines `@custom-variant dark` and theme tokens; use tokens, not raw values. UI helpers live in `apps/web/src/components/ui`; Motion comes from `motion/react`. Web env: `VITE_API_BASE_URL` defaults to `:3000`, optional `VITE_GOOGLE_WEB_CLIENT_ID`.
- Expo SDK 58 auto-configures Metro for pnpm workspaces: keep `apps/mobile/metro.config.js` minimal (no `watchFolders`, `nodeModulesPaths`, `disableHierarchicalLookup`); `.npmrc` intentionally avoids `node-linker=hoisted`.
- pnpm blocks dependency build scripts by default; `pnpm-workspace.yaml` `allowBuilds` enables argon2, esbuild, msgpackr-extract and simple-git-hooks. Add an entry there for new native deps.
- Pre-commit runs `lint-staged` (eslint --fix + prettier --write on TS/JS, prettier on JSON/MD/YAML/CSS/HTML), so staged files may be rewritten on commit.
- No `any`, no TODO placeholder comments, no dead code. Deeper architecture notes live in `knowledge.md`; verify against source when they conflict.
