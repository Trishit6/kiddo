# Kiddo UI redesign implementation plan

## Architecture summary

Kiddo is a pnpm workspace with a Fastify/Drizzle API in `apps/api`, a React/Vite web client in `apps/web`, and an Expo Router React Native client in `apps/mobile`. API contracts and the typed API client live in `packages/shared`; shared TanStack Query hooks and cache behavior live in `packages/queries`; semantic colors and cross-platform layout/type scales live in `packages/tokens`.

The web route tree and providers are composed in `apps/web/src/App.tsx`. Pages are in `apps/web/src/pages`, app shell and reusable features are in `apps/web/src/components`, and Tailwind v4 semantic styles are defined in `apps/web/src/index.css`. Mobile routes are in `apps/mobile/app`, with feature components under `apps/mobile/src/components`. Web and mobile theme providers already support light/dark/system preference and persistence.

## Existing functionality to preserve

- Web and mobile authentication, refresh behavior, Google sign-in, and protected routes.
- Feed pagination, playback state, HLS playback, visibility rules, views, and feed keyboard/touch controls.
- Likes, saves, follows, comments/replies, profile and upload flows using `@reel/queries` and `@reel/shared`.
- Mobile Expo video player lifecycle, safe areas, bottom sheets, and navigation.
- Existing semantic palette, typography, spacing, glass primitives, responsive containers, and reduced-motion handling.
- Existing API authorization and Zod contracts; do not introduce mock services or UI-level endpoint calls.

## Current UI and identified gaps

- The web already has a glass-styled shell, landing, immersive feeds, explore/tag/profile, upload, authentication, settings and shared UI primitives.
- Mobile already has native feed/player, Explore, upload, profiles, comments, auth, settings, and shared theme tokens.
- Search and notification contracts/client methods exist in `packages/shared`, but no matching route handlers exist in `apps/api/src`; `apps/api/src/features/notifications/plugin.ts` and `features/admin/plugin.ts` still use the no-op `createFeaturePlugin`.
- Search screens now exist on web and mobile, and the mobile inbox and web notifications route use shared query hooks. Both surfaces explicitly report unavailable API routes rather than fabricating empty results.
- The route tree does not expose an admin dashboard, and the admin API plugin is also a no-op. Do not invent admin data or imply that moderation actions work until server routes exist.
- Existing settings and privacy/account capabilities should be checked against the implemented API before presenting controls; do not render nonfunctional options.

## Files and components to extend

- `packages/queries/src/keys.ts` and `packages/queries/src/hooks.ts`: query keys/hooks for existing search and notification API methods.
- `apps/web/src/App.tsx`, `apps/web/src/components/layout.tsx`: lazy routes and navigation for search, notifications, and any authorized admin surface.
- `apps/web/src/pages/Explore.tsx` and new page/component files under `apps/web/src/pages` / `apps/web/src/components`: search and notification surfaces using the existing typed client; show truthful unavailable/error states while server handlers are absent.
- `apps/mobile/app/(tabs)/inbox.tsx`, `apps/mobile/app/(tabs)/explore.tsx`, and `apps/mobile/src/components`: native search and notification surfaces using shared query hooks; show truthful unavailable/error states while server handlers are absent.
- `packages/tokens/src/tokens.css`, `packages/tokens/src/index.ts`, `apps/web/src/index.css`, and existing theme providers: modify only when a verified token/theme gap requires it; keep CSS and native token representations in sync.
- Add focused tests alongside existing tests in `packages/queries/src`, `apps/web/src`, and `apps/mobile/src`.

## Implementation status

- Added shared search and notification query keys/hooks in `packages/queries/src/keys.ts` and `packages/queries/src/hooks.ts`.
- Added web search and notifications pages in `apps/web/src/pages/Search.tsx` and `apps/web/src/pages/Notifications.tsx`, with responsive layouts, query-backed states, retry/read actions, and explicit handling for missing API routes.
- Added native search at `apps/mobile/app/search.tsx` and replaced the placeholder inbox in `apps/mobile/app/(tabs)/inbox.tsx`; both use shared queries and preserve truthful error states. The native search also retains recent terms locally.
- Wired web routes/navigation and mobile search entry points. Search and notification server handlers remain absent; admin functionality remains blocked by the no-op admin plugin. No mock data or success-shaped fallbacks were added.
- The broader redesign is not complete: no admin screens, full responsive viewport/browser validation, or physical Android device validation have been completed.

## Theme and glass strategy

Keep the current semantic CSS variables in `packages/tokens/src/tokens.css` as the web color source and mirror platform-neutral values in `packages/tokens/src/index.ts`. Preserve the existing `ThemeProvider` behavior, `kiddo-theme` preference, OS preference tracking, and native AsyncStorage persistence. New UI must use semantic tokens and existing glass classes/primitives. Apply blur only to floating surfaces and overlays, retain opaque surface fallbacks, and preserve reduced-motion support.

## Responsive strategy

Extend the existing mobile-first Tailwind layouts rather than scaling desktop layouts. Use the existing sidebar/mobile tab bar shell, responsive containers, and bottom-sheet primitives. Keep discovery grids and administrative tables bounded to viewport width; make dense content horizontally scrollable only when necessary. Use native safe-area insets and keyboard handling for mobile routes. Validate representative mobile, tablet, and desktop sizes from the project acceptance list.

## Web implementation sequence

1. Use existing theme tokens and shell; fix only confirmed accessibility, responsive, or visual gaps.
2. Add shared query hooks for the existing search and notifications contracts.
3. Implement authenticated notification surfaces and read actions against those contracts, with useful loading, empty, and error states; API 404s must remain visible and not be converted to fake empty data.
4. Implement user/video/hashtag search against the existing typed client, with suggestions, recent searches, pagination and explicit service errors.
5. Defer functional admin screens and moderation controls until API routes exist; do not create success-shaped placeholder interactions.
6. Revisit upload, settings, authentication, profiles, landing, and feed only for concrete issues discovered during feature validation.

## Android implementation sequence

1. Preserve existing native theme, feed/player window, safe-area, and bottom-sheet behavior.
2. Replace the Inbox placeholder with the existing notification contract and shared query hooks; preserve API errors.
3. Add native user/video/hashtag search using the typed client/query layer and native list patterns; preserve API errors.
4. Verify notification and search navigation, Android back behavior, loading/error states, and theme colors.
5. Add only additional screens backed by existing API features; do not use a WebView or placeholder data.

## Verification strategy

- Run focused query, web, and mobile tests for new behavior.
- Run targeted ESLint and Prettier checks for modified files.
- Run `pnpm typecheck`, `pnpm lint`, workspace tests, and `pnpm build` where available; distinguish baseline failures from regressions.
- Check actual web layouts at 360x800, 390x844, 768x1024, 1024x768, 1440x900, and 1920x1080 in both themes when browser/device tooling is available.
- Validate API-backed flows against the existing API, and confirm the API/Redis readiness endpoints before relying on live-data checks. Search, notifications and admin routes currently have no server handlers, so their successful live flows are blocked until backend work is authorized and implemented.
- Android device/emulator testing is still required for final playback, gesture, and safe-area acceptance.

## Baseline verification notes

Before this plan was added, API typecheck reported existing errors in `apps/api/src/plugins/db.ts` and `apps/api/src/worker/push-jobs.ts`, including missing `expo-server-sdk`. Root lint reported existing issues in `apps/web/src/components/feed/comment-composer.test.tsx`, `apps/web/src/components/ui/password-input.tsx`, `apps/web/src/pages/Landing.tsx`, `apps/web/src/pages/Settings.tsx`, `apps/web/src/pages/VideoDetail.tsx`, and `packages/shared/src/sanitize.ts`. These should not be hidden or attributed to UI work; rerun checks after changes and fix only regressions introduced by this implementation.

## Latest verification

- `pnpm --filter @reel/web test`: passed (12 tests).
- `pnpm --filter @reel/mobile lint`: passed.
- Prettier check for the four updated search/notification screens: passed.
- `pnpm --filter @reel/mobile typecheck`: blocked by existing Jest-global type errors in test files; the earlier `ListEmptyComponent`/`ListFooterComponent` type errors in `apps/mobile/app/(tabs)/inbox.tsx` have been fixed.
- `pnpm --filter @reel/mobile test`: 19 passed, 2 failed in `src/components/feed/comment-composer.test.tsx`; its expected mutation arguments omit an existing `author` field.
- `pnpm --filter @reel/web typecheck`: blocked by malformed JSX in `src/pages/VideoDetail.tsx` (unclosed `GlassCard`).
