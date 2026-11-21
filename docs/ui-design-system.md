# Kiddo design system

**Status:** implemented foundation. This document covers the shared visual language
and application chrome; individual page redesigns are out of scope.

Kiddo uses a floating sage-green glass interface over a deep forest canvas. Glass
is translucent, borders are hairline, shadows are soft and natural, and the mint
accent is desaturated. Dark is the primary theme; light is a first-class sibling.
The Expo app consumes the same palette and numeric scales.

## Source of truth

| Concern                                         | Web                                                                            | Native / shared                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| Colours, glass, shell geometry, motion, z-index | `packages/tokens/src/tokens.css`                                               | `packages/tokens/src/index.ts`                    |
| Typography, radius, shadows, breakpoints        | `apps/web/src/index.css` (`@theme`)                                            | `packages/tokens/src/index.ts` (`type`, `radius`) |
| Component utilities                             | `apps/web/src/index.css` (`glass`, `glass-strong`, `glass-nav`, `app-surface`) | RN components use `glass` tokens                  |
| Shell                                           | `apps/web/src/components/layout.tsx`                                           | `apps/mobile/src/components/kiddo-tab-bar.tsx`    |

Never add page-local hex, rgb, shadow or z-index values. Add a token and consume it.
Keep the CSS and TypeScript token files in sync.

## Colour

| Token              | Dark                     | Light                    | Role                                 |
| ------------------ | ------------------------ | ------------------------ | ------------------------------------ |
| `background`       | `#101916`                | `#EDF2EE`                | Page canvas                          |
| `background-deep`  | `#0A120F`                | `#E3EBE5`                | Canvas gradient end                  |
| `card`             | `#1C2924`                | `#FFFFFF`                | Opaque card / sheet                  |
| `foreground`       | `#F4F7F4`                | `#202C25`                | Primary copy                         |
| `muted-foreground` | `#B3C1B8`                | `#68766D`                | Secondary copy, metadata             |
| `brand`            | `#9CCBB0`                | `#477C5B`                | Actions, active navigation, focus    |
| `brand-secondary`  | `#D5E6D9`                | `#A9C9B2`                | Decorative highlights and rings      |
| `border`           | `rgba(255,255,255,.16)`  | `rgba(57,83,65,.13)`     | Solid control borders                |
| `glass-border`     | `rgba(255,255,255,.16)`  | `rgba(57,83,65,.13)`     | Glass hairlines                      |
| `app-surface`      | `rgb(20 33 27 / 62%)`    | `rgb(255 255 255 / 72%)` | Floating workspace                   |
| `glass-bg`         | `rgb(224 239 230 / 9%)`  | `rgb(255 255 255 / 66%)` | Sidebar, cards                       |
| `glass-bg-strong`  | `rgb(235 245 239 / 13%)` | `rgb(255 255 255 / 82%)` | Toolbar, popovers, mobile navigation |
| `destructive`      | `#E69086`                | `#B44F45`                | Destructive actions and errors       |

Video overlays always use white text over the supplied scrim; the shell does not
rely on the page background for legibility over media.

Measured WCAG contrast:

| Pair                              | Ratio   |
| --------------------------------- | ------- |
| Dark primary on background        | 16.59:1 |
| Dark secondary on background      | 9.58:1  |
| Dark brand on background          | 9.88:1  |
| Light primary on background       | 12.80:1 |
| Light secondary on background     | 4.21:1  |
| Light secondary on white surfaces | 4.77:1  |
| Light brand on background         | 4.31:1  |

Light secondary copy is AA on white cards (where most of it sits) but not on the
pale canvas. Light brand-coloured small text on the canvas is 4.31:1, just below
AA for normal text. Those two combinations are recorded as a known issue and
should be tuned when page typography is finalised; changing the approved palette
now would break the established visual direction.

## Typography

- Families: `Inter Variable` for UI, `Bricolage Grotesque Variable` for display.
- `display`: 2.75rem / 1.02 / -0.035em.
- `title`: 1.5rem / 1.15 / -0.02em.
- `label`: 0.75rem / 1.1 / 0.08em, uppercase for section labels.
- Body uses Tailwind's `text-sm`/`text-base` with `leading-relaxed` for prose.
- Never go below 12 px. Counts and metrics use tabular figures.

## Spacing and radius

- Spacing is a 4 px scale (`--spacing: 0.25rem`); use the nearest step, not raw pixels.
- Native mirrors the scale in `space` (`xxs` 2 → `huge` 48).
- Radius: shell surfaces `1.75–2rem`, panels/cards `1.25–1.5rem`, controls `0.75rem`,
  pills and avatars `999px`. Native: `8/12/16/24/999`.
- Minimum interactive target is 44 × 44 px. Icon buttons are 44 px; navigation
  links are 70 px tall on mobile and 44 px minimum elsewhere.

## Shadows, glass and motion

- `--glass-shadow`: large ambient shadow, paired with an inset top highlight.
- `--shadow-soft`: cards and small raised surfaces.
- `--shadow-lift`: dialogs, drawers, popovers.
- Glass utilities: `glass` (default panel), `glass-strong` (chrome/popover),
  `glass-nav` (navigation), `app-surface` (main workspace). Blur is 20–22 px and
  saturation is pushed slightly.
- Motion: 150 / 220 / 300 ms. `--ease-standard` for layout, `--ease-emphasized`
  for active/press feedback. Transform and opacity only. Reduced-motion users get
  near-zero durations and no smooth scrolling.

## Z-index

| Token         | Value | Use                            |
| ------------- | ----- | ------------------------------ |
| `--z-base`    | 0     | Page content                   |
| `--z-raised`  | 10    | Ambient/shell content          |
| `--z-sticky`  | 30    | Toolbar, mobile header         |
| `--z-nav`     | 40    | Fixed mobile bottom navigation |
| `--z-overlay` | 50    | Dialog/drawer scrim            |
| `--z-modal`   | 60    | Dialog, drawer, menu, popover  |
| `--z-toast`   | 70    | Transient notifications        |

## Shell geometry and breakpoints

| Token                     | Value  |
| ------------------------- | ------ |
| `--shell-max-width`       | 1720px |
| `--shell-gutter`          | 16px   |
| `--shell-gutter-xl`       | 20px   |
| `--sidebar-width`         | 272px  |
| `--sidebar-compact-width` | 76px   |
| `--toolbar-height`        | 64px   |
| `--mobile-header-height`  | 56px   |
| `--mobile-nav-height`     | 70px   |

Breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536. They are
declared in `apps/web/src/index.css` because media queries cannot read CSS custom
properties; the TypeScript mirror is `breakpoints` in `packages/tokens/src/index.ts`.

- `< 768px`: mobile shell — no sidebar, compact header, fixed five-tab navigation.
- `768–1023px`: tablet shell — 76 px icon rail, toolbar with icon search.
- `≥ 1024px`: desktop shell — 272 px glass sidebar, full toolbar search.

## Theme management

`ThemeProvider` (`apps/web/src/components/theme-provider.tsx`) supports `light`,
`dark` and `system`, persists to `localStorage['kiddo-theme']`, listens to
`prefers-color-scheme` while in system mode, and writes `.dark`, `data-theme` and
`color-scheme` on `<html>`. The inline script in `apps/web/index.html` applies the
saved/system theme before first paint to prevent flashing. `ThemeMenu` is the
accessible picker; `ThemeToggle` remains available for simple surfaces.

## Component inventory

| Requested component                          | Implementation                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `AppShell`                                   | `AppShell` in `components/layout.tsx`                                     |
| `DesktopSidebar`                             | `DesktopSidebar` — full at `lg`, compact rail at `md`                     |
| `TabletSidebar`                              | Compact mode of `DesktopSidebar`; intentionally not a duplicate           |
| `MobileHeader`                               | `MobileHeader`                                                            |
| `MobileBottomNavigation`                     | `MobileBottomNavigation`                                                  |
| `ThemeProvider` / toggle                     | `ThemeProvider`, `ThemeMenu`, `ThemeToggle`                               |
| `GlassPanel` / `GlassCard`                   | `components/ui/glass.tsx`                                                 |
| `GlassButton`                                | `Button` variants (`default`, `brand`, `outline`, `ghost`, `destructive`) |
| `GlassDialog`                                | `components/ui/dialog.tsx`; overlays use the scrim and popover tokens     |
| `GlassBottomSheet`                           | `Drawer` — bottom sheet below `md`, side sheet above                      |
| `PageContainer`                              | `ResponsiveContainer`                                                     |
| `ResponsiveContainer`                        | `components/ui/responsive-container.tsx`                                  |
| `LoadingState` / `EmptyState` / `ErrorState` | Page-level states plus `Spinner`, `Skeleton`; not yet consolidated        |

The last row is deliberate: page-specific empty/error/loading treatments exist and
work, but a shared API should be introduced during page-by-page design rather than
duplicating them now.

## Usage rules

1. Compose from tokens and existing primitives before creating a new component.
2. Keep navigation and overlays above content using the z-index tokens.
3. Every interactive element needs a visible focus ring, an accessible name and a
   44 px target on mobile.
4. Video and poster overlays may use white-on-scrim values; everything else must
   pass through theme tokens.
5. Never hard-code `#9CCBB0`, `#101916` or a glass rgba in a component.
