# Kiddo web design system

Kiddo is dark-first, playful and bold. One accent carries the brand: a warm
coral/tangerine (`--brand`). Mint and sun are supporting accents, never
gradients. The light theme is a first-class sibling, not an afterthought.

The palette lives in `packages/tokens/src/tokens.css` and is mirrored for React
Native in `packages/tokens/src/index.ts`. Do not add colour values to individual
components.

## Colour

| Token              | Dark                     | Light                   | Use                           |
| ------------------ | ------------------------ | ----------------------- | ----------------------------- |
| `background`       | `oklch(0.155 0.014 295)` | `oklch(0.985 0.006 80)` | Page canvas                   |
| `card`             | `oklch(0.205 0.018 295)` | `#fff`                  | Panels, sheets                |
| `foreground`       | `oklch(0.965 0.008 85)`  | `oklch(0.19 0.016 45)`  | Primary text                  |
| `muted-foreground` | `oklch(0.75 0.016 290)`  | `oklch(0.47 0.022 50)`  | Secondary text                |
| `brand`            | `oklch(0.74 0.17 38)`    | `oklch(0.58 0.19 32)`   | Primary actions, active state |
| `mint`             | `oklch(0.78 0.14 165)`   | `oklch(0.7 0.13 165)`   | Success, follow confirmation  |
| `sun`              | `oklch(0.86 0.16 90)`    | `oklch(0.84 0.15 88)`   | Highlights, badges            |
| `destructive`      | `oklch(0.68 0.2 25)`     | `oklch(0.55 0.22 27)`   | Delete, errors                |

Text on video always uses `onVideo` over a scrim; the feed never relies on the
page background for contrast. Focus rings use `ring` with a 2 px offset.

## Type

- Display: Bricolage Grotesque Variable, tight (-0.035em) and heavy for titles.
- Body: Inter Variable.
- Sizes: `display` 2.75rem/1.02, `title` 1.5rem/1.15, `label` 0.75rem/1.1 with
  0.08em tracking, body 0.9375rem/1.5.
- Never go below 12 px; numbers in rails use tabular figures.

## Shape and spacing

4 pt scale (`space` in the tokens package). Radii: 8, 12, 16, 24 and pill.
Cards use `--shadow-soft`; floating layers use `--shadow-lift`. On video, chrome
is a blur/scrim instead of a shadow.

## Motion

- 150–300 ms, `--ease-snap` for movement, `--ease-pop` for playful pops.
- Animate only `transform` and `opacity`.
- Keyframes available: `flash`, `fade-in`, `zoom-in`, `slide-up`, `slide-right`.
- Icon flashes (double-tap like) last 480 ms but stay transform/opacity only.
- `prefers-reduced-motion: reduce` collapses every duration to ~0. React Native
  reads `useReducedMotion()` and skips bursts/slides.

## Components

- Buttons: brand fill, secondary surface, ghost, destructive. 44 px minimum
  touch target, pill or 12 px radius depending on context.
- Sheets: bottom sheet on mobile, right panel on desktop (`md` and up).
- Feed: full-bleed video, right action rail, bottom-left author/caption, thin
  scrubber. Chrome is white-on-scrim, never theme-coloured.
- States: every list has a skeleton, an empty state with one clear action, and
  an error state with retry. Optimistic interactions roll back visibly.

Implementation: Tailwind v4 utilities map to the tokens via `@theme inline` in
`apps/web/src/index.css`; shadcn/ui primitives in
`apps/web/src/components/ui`. React Native uses `StyleSheet` with the numeric
scales from `@reel/tokens`.
