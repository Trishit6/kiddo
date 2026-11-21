# Reel/Kiddo repository instructions

## Instruction precedence

- Follow `AGENTS.md` for repository-specific mandatory rules. Nested `AGENTS.md` files override or supplement the root guidance for files below them.
- Before editing, inspect `git status --short` and preserve unrelated or pre-existing worktree changes.
- Check `README.md`, `knowledge.md`, and `docs/performance.md` for feature and performance context; source code wins if documentation is stale.
- `@reel/shared`, `@reel/queries`, `@reel/tokens`, the API route schemas, and the database schema are source-of-truth surfaces. Keep platform implementations in sync when a shared contract or cache behavior changes.

## Toolchain and setup

- Use Node 24 (`.nvmrc`) and pnpm 11.25.0 (`packageManager` in `package.json`; run `corepack enable`).
- The repository is a pnpm monorepo:
  - `apps/api`: Fastify API, Drizzle/Postgres, Redis, BullMQ, S3/MinIO, video worker
  - `apps/web`: Vite, React, React Router, Tailwind v4, TanStack Query
  - `apps/mobile`: Expo Router, React Native, Expo modules
  - `packages/shared`: Zod schemas and the typed API client
  - `packages/queries`: shared TanStack Query hooks, keys, cache helpers and optimistic updates
  - `packages/tokens`: cross-platform colors, spacing, typography and motion values
  - `packages/config`: shared TypeScript, ESLint and Prettier configuration
- Start dependencies and the normal development environment with:

  ```bash
  pnpm install
  docker compose up -d
  pnpm db:migrate
  pnpm db:seed
  pnpm dev
  ```

- `pnpm dev` starts the API on `:3000`, web on `:5173`, and the API worker. Use `pnpm dev:app` for API + web only and `pnpm dev:worker` for the worker only.
- The local worker requires `ffmpeg` and `ffprobe` on `PATH`. The Docker worker is optional: `docker compose --profile worker up -d --build`.
- Mobile development uses `pnpm dev:mobile`. Set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env`; physical devices need the host LAN IP, Android emulators need `http://10.0.2.2:3000`, and iOS simulators need `http://localhost:3000`. Restart Expo with `pnpm --filter @reel/mobile dev -- --clear` after environment changes.
- API and web environment defaults are Zod/standard defaults and can be overridden through root or app `.env` files. Production API secrets must not retain `dev-only-` prefixes.

## Build, verification and tests

Root verification commands:

- `pnpm typecheck` - recursive TypeScript checks
- `pnpm lint` - root ESLint
- `pnpm format:check` - Prettier check
- `pnpm format` - Prettier write
- `pnpm build` - recursive builds where a workspace defines `build`
- `pnpm test` - API, web, queries and mobile test runners

Single-test examples:

```bash
pnpm --filter @reel/api test src/features/auth/auth.test.ts
pnpm --filter @reel/web test src/components/auth-gate.test.tsx
pnpm --filter @reel/queries test src/optimistic.test.ts
pnpm --filter @reel/mobile test src/lib/deep-links.test.ts
```

Other targeted commands:

- API test file: `pnpm --filter @reel/api test src/features/social.test.ts`
- Web test file: `pnpm --filter @reel/web test src/components/feed/action-rail.test.tsx`
- Queries test file: `pnpm --filter @reel/queries test src/optimistic.test.ts`
- Mobile test file: `pnpm --filter @reel/mobile test src/components/feed/action-rail.test.tsx`
- Mobile workspace lint: `pnpm --filter @reel/mobile lint`
- Mobile Maestro E2E: `pnpm --filter @reel/mobile test:e2e`

Mobile tests use Jest via `apps/mobile/package.json`; web and API tests use Vitest.

Run Playwright from the web workspace:

```bash
pnpm --filter @reel/web exec playwright test e2e/social.spec.ts
```

The Playwright config starts the API and web server, runs desktop Chrome and Pixel 7 projects, and stores traces/video/screenshots on failure.

Database commands:

- `pnpm db:generate` - generate a Drizzle migration after changing `apps/api/src/db/schema.ts`
- `pnpm db:migrate` - apply migrations
- `pnpm db:seed` - seed demo users and social data
- `pnpm db:seed:load` - create the load-test fixture
- `pnpm bench:feed` - run the feed benchmark; API must be running

CI runs Node 24/pnpm 11.25.0 and verifies `pnpm typecheck`, `pnpm lint`, and `pnpm test` against Postgres and Redis. API tests use `reel_test` and Redis DB 1; `apps/api/src/test/global-setup.ts` migrates and flushes test Redis. API Vitest uses `fileParallelism: false`, and tests must not use the development database.

## Architecture

The API is assembled in `apps/api/src/app.ts`:

- `buildApp()` registers cross-cutting plugins, Swagger at `/docs`, and domain feature plugins.
- Feature routes live in `apps/api/src/features/<domain>/plugin.ts`; video interactions are in `features/videos/interactions.ts`.
- `/health` and `/ready` are unprefixed routes in `apps/api/src/routes/health.ts`.
- Fastify plugins in `apps/api/src/plugins/` provide database, Redis, S3, queues, mail, authentication, rate limiting, video providers and central error handling.
- `apps/api/src/db/schema.ts` is the Drizzle source of truth. Generated SQL and metadata belong in `apps/api/drizzle/`.
- `apps/api/src/worker.ts` and `apps/api/src/worker/` process BullMQ video and social jobs.
- `apps/api/src/feed/` owns candidate generation, filtering, ranking and Redis-backed For You sessions.
- `apps/api/src/events.ts` is the typed in-process domain event bus.

The web app uses `apps/web/src/App.tsx` for routing and provider composition. Pages are lazy-loaded under `apps/web/src/pages/`; reusable UI is under `apps/web/src/components/`, with primitives under `components/ui`.

The mobile app uses Expo Router under `apps/mobile/app/`, with shared implementations under `apps/mobile/src/components/` and `apps/mobile/src/lib/`. It uses Expo auth, secure storage, Expo video, gesture handler and bottom sheets.

The shared contract flow is:

1. Define Zod request/response schemas and inferred types in `packages/shared/src/schemas/<domain>.ts`.
2. Re-export them from `packages/shared/src/index.ts`.
3. Add API methods to `packages/shared/src/client.ts`.
4. Expose application behavior through TanStack Query hooks in `packages/queries/src/hooks.ts`.
5. Consume those hooks in web and mobile UI; do not call API endpoints directly from components.

`@reel/shared`, `@reel/queries`, and `@reel/tokens` are consumed as TypeScript source without build steps.

The normal contract flow is:

1. API feature routes import Zod 4 schemas and inferred types from `@reel/shared`.
2. Shared contracts live in `packages/shared/src/schemas/<domain>.ts`, are re-exported from `packages/shared/src/index.ts`, and are implemented by `packages/shared/src/client.ts`.
3. TanStack Query hooks live in `packages/queries/src/hooks.ts`; use shared query keys and cache helpers rather than app-local API fetches.
4. Web and mobile consume the shared hooks and typed client. Do not call `fetch` or API endpoints directly from UI components.

The API assembly starts in `apps/api/src/app.ts`; domain route plugins are registered there. Cross-cutting behavior belongs in `apps/api/src/plugins/`, reusable data visibility in `apps/api/src/lib/visibility.ts`, and keyset cursor logic in `apps/api/src/lib/cursor.ts`.

The web route shell is `apps/web/src/App.tsx`; routes are lazy-loaded and composed under `AppShell`. The For You and Following screens share `apps/web/src/components/feed/feed-screen.tsx`. The mobile feed is in `apps/mobile/src/components/feed/feed-screen.tsx` and its tab route is in Expo Router.

## API conventions

- Use Zod 4 and `fastify-type-provider-zod` v7. Every route declares request and response schemas for validation and Swagger generation.
- Use `app.authenticate` for protected routes where appropriate. Keep app-specific guards and plugin extensions in `apps/api/src/types.ts`.
- Throw API errors through helpers in `apps/api/src/lib/errors.ts` (`badRequest`, `unauthorized`, `forbidden`, `conflict`, `AppError`). The central handler in `apps/api/src/plugins/error-handler.ts` emits `{ error: { code, message, requestId, details? } }`.
- Error codes come from `apiErrorCodeSchema` in `@reel/shared`.
- Put reusable visibility rules in `apps/api/src/lib/visibility.ts` and keyset cursors in `apps/api/src/lib/cursor.ts`; feed and list endpoints must reuse these rather than duplicating filters or offset pagination.
- List visibility, counters and social mutations must preserve their existing transactional and idempotency behavior.
- For You sessions are Redis-backed and stable for later pages. Do not bypass the existing session/ranking/visibility flow.
- Edit `apps/api/src/db/schema.ts`, generate the migration, apply it locally, and commit the generated `apps/api/drizzle/` changes. Never edit old migration SQL.
- The For You endpoint builds a 200-video Redis session (30-minute TTL). Keep cursor pagination stable by preserving session IDs and offsets; do not replace it with ad-hoc offset pagination.
- Candidate generation, filtering, ranking, and session logic belong in `apps/api/src/feed/`; social mutations belong in the existing feature route and interaction plugins.
- List/count mutations must retain idempotency and transactional behavior. Preserve existing viewer state hydration and soft-delete semantics.

## Authentication and client state

- Web stores only the access token in memory and relies on an httpOnly, signed refresh cookie scoped to `/auth`. It detects the mobile client via `x-client: mobile`.
- Mobile stores refresh and access tokens in `expo-secure-store`.
- Refresh handling and signed-out interaction retries are implemented in the shared API client and query providers. Preserve this behavior rather than adding app-local auth fetch logic.
- Cross-origin cookie writes are rejected for browser sessions.
- Web API setup lives in `apps/web/src/lib/api.ts`; mobile API setup lives in `apps/mobile/src/lib/api.ts`.
- TanStack Query defaults and provider setup are in `apps/web/src/App.tsx` and `apps/mobile/app/_layout.tsx`. Shared query keys live in `packages/queries/src/keys.ts`; optimistic cache rules live in `packages/queries/src/optimistic.ts`.
- Shared auth-required interaction handling lives in `packages/queries/src/hooks.ts`. Preserve the existing sign-in retry flow instead of adding app-local authenticated fetch logic.

## Web conventions

- Tailwind v4 is CSS-first. `apps/web/src/index.css` imports the tokens and maps semantic variables through `@theme inline`.
- Source-of-truth web variables are in `packages/tokens/src/tokens.css`; mirror any cross-platform token change in `packages/tokens/src/index.ts`.
- Use existing semantic Tailwind classes and shadcn-style primitives in `apps/web/src/components/ui`. Use `@reel/tokens` palette values and CSS variables rather than raw component colors.
- The web supports light/dark/system through `ThemeProvider`. Preserve `localStorage` key `kiddo-theme`, `documentElement.dataset.theme`, `.dark`, and `colorScheme` behavior; avoid first-load theme flashes.
- Use Motion from `motion/react`, Tailwind utilities, and existing `glass`, `glass-strong`, `glass-nav`, `feed-snap`, `feed-slide`, and reduced-motion CSS utilities.
- Keep lazy-loaded routes in `apps/web/src/App.tsx`. HLS and noncritical UI should remain lazy or otherwise off the initial critical path.
- Preserve legacy routes `/videos/:id` and `/s/:videoId`; they redirect to `/video/:id`.

## Mobile conventions

- Expo SDK 58 uses Expo Router. Keep `apps/mobile/metro.config.js` minimal; it is automatically configured for pnpm workspaces.
- React Native styles should consume `palettes`, `space`, `radius`, `type`, `fontFamily`, `motion`, `glass`, and `layout` from `@reel/tokens`.
- Theme preference and system-theme resolution are implemented in `apps/mobile/src/theme/theme-provider.tsx`; persistence uses AsyncStorage.
- Keep `ExpoVideo`/`expo-video`, HLS behavior, safe areas, keyboard handling, gesture handling and bottom sheets in their existing platform-native implementations.
- Limit the active mobile feed player window to three items and pause/clean up off-screen videos.
- `apps/mobile/src/components/feed/feed-item.tsx` owns Expo Video playback/resource behavior. Preserve `shouldMountPlayer` windowing and the three-player limit; do not create another playback implementation.
- Keep mobile navigation, safe-area handling, secure token storage, and bottom sheets in their existing components.

## Data and media behavior

- PostgreSQL, Redis and MinIO are development/test dependencies. Docker Compose uses `elestio/minio` and `insectai/minio`; do not replace these image names with retired official MinIO repositories.
- Video limits and provider behavior come from Zod-validated API environment configuration in `apps/api/src/env.ts`.
- Upload and processing states must reflect real backend status. Do not fabricate progress or present a failed/uploading video as ready.
- Preserve view dedupe, visibility checks, keyset pagination and existing indexed query paths.
- Performance-sensitive query and index changes should be checked against `docs/performance.md`.
- Use real upload/processing statuses and real backend media. Do not present uploading, processing, deleted, or unavailable videos as ready.
- Web HLS is handled in `apps/web/src/components/feed/feed-player.tsx`; hls.js is lazy-loaded and native HLS remains supported. Preserve active-item-only playback, visibility pausing, cleanup, and the existing resource/window behavior.
