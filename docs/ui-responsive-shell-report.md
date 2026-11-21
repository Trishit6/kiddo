# Responsive application shell report

**Status:** complete for the global design foundation and shell. Individual pages
were not redesigned.

Date: 2026-11-21 · Scope: `apps/web` shell, theme foundation and shared tokens.

## Implemented

### Desktop (`≥ 1024px`)

- Floating full-height glass sidebar, 272 px, with logo, profile summary and
  post/follower/following counts.
- Discover navigation: For You, Following, Explore, Search, Notifications.
- Your space: Create, Saved, Settings, Profile.
- Account menu with profile, settings and logout.
- Full top toolbar (64 px): search field, theme picker, notifications, Create and
  avatar.
- Rounded translucent workspace with independent scroll region.

### Tablet (`768–1023px`)

- Same sidebar component collapsed to a 76 px icon rail; labels hidden, accessible
  names and tooltips retained.
- Compact toolbar: search becomes an icon, Create stays visible, theme and
  notifications stay reachable.
- Two-column discovery grid; no horizontal overflow.
- No separate duplicate sidebar implementation.

### Mobile (`< 768px`)

- Desktop sidebar is removed from layout entirely (`hidden`), not merely squeezed.
- Compact 56 px header (plus `env(safe-area-inset-top)`) with Kiddo branding,
  search, theme picker and profile.
- Fixed five-tab bottom navigation: Home, Explore, Create, Notifications, Profile.
  - 70 px tall plus `env(safe-area-inset-bottom)`.
  - Frosted `glass-nav` surface with a hairline top border.
  - Active tab gets a mint pill, lift and colour change; `aria-current` is supplied
    by React Router.
  - Create is visually distinguished by an elevated 44 px brand circle and a
    visible label.
  - Every tab is at least 70 × 70 px; header controls are 44 × 44 px.
- Header and bottom navigation are functional links, not mockups.
- Main content has explicit bottom clearance so no page content sits under the
  navigation; the immersive feed is sized to the space above it.
- Logo targets Home inside the shell; auth/landing surfaces keep their own target.

### Cross-cutting

- Introduced `AppShell`, `DesktopSidebar`, `TopToolbar`, `MobileHeader` and
  `MobileBottomNavigation` exports in `components/layout.tsx`; `App` now renders
  `AppShell`.
- Added shell geometry, motion, z-index and breakpoint tokens; replaced hard-coded
  shell widths/heights and overlay z-indexes with token values.
- All icon buttons are 44 px; header avatar links have a 44 px hit area.
- Loading creator strip is horizontally scrollable, preventing the skeleton row
  from widening the mobile layout viewport while data is pending.
- Desktop and tablet feed routes now retain the top toolbar; mobile feed routes
  remain fully immersive above the bottom navigation.
- Theme: light/dark/system with persistence, OS change listener, no-flash boot
  script, and themed inputs, dialogs, drawers, menus and navigation.

## Breakpoint behaviour

| Width      | Sidebar         | Bottom nav | Header  | Toolbar | Discovery columns |
| ---------- | --------------- | ---------- | ------- | ------- | ----------------- |
| `< 768`    | hidden          | visible    | compact | hidden  | 2                 |
| `768–1023` | 76 px icon rail | hidden     | hidden  | compact | 2                 |
| `≥ 1024`   | 272 px full     | hidden     | hidden  | full    | 3                 |

`1024×768` is treated as desktop because the shell breakpoint is `lg` (1024 px).
The prompt lists it under tablet testing, but its own breakpoint definition puts
desktop at 1024 and above; the implementation follows the stated breakpoint rules.

## Verification

Browser: Google Chrome via Playwright, with mobile viewport emulation
(`isMobile`, touch) below 768 px. The API was mocked at `http://localhost:3000`
with authenticated, trending, feed, profile, saved and notification fixtures.
This exercises the real React app, router, theme provider and components; it does
not exercise the real backend.

### Matrix

9 viewports × 9 routes = **81 route/viewport checks, 0 failures**.

Viewports:

- Mobile: 360 × 800, 375 × 812, 390 × 844, 430 × 932
- Tablet: 768 × 1024
- Boundary/desktop: 1024 × 768, 1280 × 800, 1440 × 900, 1920 × 1080

Routes: `/`, `/following`, `/explore`, `/search?q=sage`, `/notifications`,
`/upload`, `/@avery`, `/settings`, `/saved`.

Per route/viewport assertions:

- No horizontal document or body overflow.
- Correct sidebar visibility and width (0 / 76 / 272 px).
- Tablet labels hidden; desktop labels visible.
- Bottom navigation only below 768, anchored to the viewport bottom.
- Bottom-nav links at least 44 × 44 px; header controls at least 44 × 44 px.
- Mobile header present on non-immersive routes.
- Immersive feed fills the area above the bottom navigation.
- Toolbar present on all tablet/desktop shell routes.
- Non-immersive desktop content scrolls inside the workspace; immersive feeds use
  their internal snap scroller.

### Theme results

| Check                                     | Result |
| ----------------------------------------- | ------ |
| No flash: saved dark applied before React | pass   |
| Dark → Light switch                       | pass   |
| Light persists after reload               | pass   |
| Light → Dark switch                       | pass   |
| System follows emulated OS light/dark     | pass   |
| Five mobile tabs route correctly          | pass   |

Tab paths: `/`, `/explore`, `/upload`, `/notifications`, `/@avery`.

Computed light/dark canvas and foreground matched the tokens
(`#EDF2EE` / `#202C25`, `#101916` / `#F4F7F4`).

### Screenshots inspected

Captured to a temporary `.screenshots` folder and inspected, then removed:

- Mobile 390: Explore shell, light and dark.
- Tablet 768: Explore shell, light and dark.
- Desktop 1440: Explore shell, light and dark; Home with toolbar, dark.
- Desktop 1920: Explore shell, light and dark.

The screenshots confirmed the compact header, five-tab navigation, active tab,
distinguished Create control, icon rail, desktop toolbar, content clearance and
theme parity. No overlapping controls or clipped interface text were found.

### Commands

```text
pnpm --filter @reel/web typecheck   # pass
npx eslint <changed files>          # pass, 0 warnings/errors
pnpm --filter @reel/web test        # 4 files, 12 tests passed
pnpm --filter @reel/web build       # pass; existing >500 kB hls chunk warning
```

## Known limitations

1. Safe-area insets are implemented with `env(safe-area-inset-*)` and
   `viewport-fit=cover`, but nonzero insets cannot be emulated by desktop Chrome.
   No physical iOS/Android device test was performed.
2. Screenshots used deterministic SVG poster fixtures and a mocked API. Auth,
   uploads, notifications, search and HLS playback were not exercised end-to-end
   against the real backend.
3. iOS keyboard behaviour around the comments composer was not hardware-tested;
   the app declares `interactive-widget=resizes-content` and sizes the sheet with
   `dvh`/safe-area padding.
4. Light secondary text on the pale canvas measures 4.21:1 and light brand small
   text 4.31:1. Both are close to AA but below it; secondary text on white cards is
   4.77:1. The approved accents were preserved. Typography contrast should be
   tuned in the page-design phase.
5. `LoadingState`, `EmptyState` and `ErrorState` are still page-specific plus
   `Spinner`/`Skeleton`. They were not consolidated, to avoid duplicating and
   restyling page UX during the shell task.
6. The production build retains the existing large `hls` chunk warning unrelated
   to shell work.

## Remaining work

- Page-by-page redesign against this foundation (feed, profile, discovery, creator
  tools).
- Consolidate loading/empty/error primitives while redesigning those pages.
- Test safe areas and keyboard avoidance on real iOS and Android hardware.
- Decide whether light-theme brand text needs a darker small-text variant.
