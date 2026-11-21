# Kiddo web design system

> For the token inventory, responsive shell rules and verification report, see
> [`ui-design-system.md`](./ui-design-system.md) and
> [`ui-responsive-shell-report.md`](./ui-responsive-shell-report.md).

Kiddo is a floating sage-green glass interface over a deep charcoal canvas. The
brand accent is a desaturated mint, not a saturated neon: translucent layered
surfaces, thin light borders and natural shadows carry the identity. The light
theme is a first-class sibling, not an afterthought.

The palette lives in `packages/tokens/src/tokens.css` and is mirrored for React
Native in `packages/tokens/src/index.ts`. Do not add colour values to individual
components.

## Colour

| Token              | Dark                     | Light                    | Use                           |
| ------------------ | ------------------------ | ------------------------ | ----------------------------- |
| `background`       | `#101916`                | `#EDF2EE`                | Page canvas                   |
| `background-deep`  | `#0A120F`                | `#E3EBE5`                | Canvas gradient end           |
| `app-surface`      | `rgb(20 33 27 / 62%)`    | `rgb(255 255 255 / 72%)` | Floating application surface  |
| `glass-bg`         | `rgb(224 239 230 / 9%)`  | `rgb(255 255 255 / 66%)` | Layered panels                |
| `glass-bg-strong`  | `rgb(235 245 239 / 13%)` | `rgb(255 255 255 / 82%)` | Popovers, elevated chrome     |
| `glass-border`     | `rgb(255 255 255 / 16%)` | `rgb(57 83 65 / 13%)`    | Hairline borders              |
| `foreground`       | `#F4F7F4`                | `#202C25`                | Primary text                  |
| `muted-foreground` | `#B3C1B8`                | `#68766D`                | Secondary text                |
| `brand`            | `#9CCBB0`                | `#477C5B`                | Primary actions, active state |
| `brand-secondary`  | `#D5E6D9`                | `#A9C9B2`                | Soft accents, rings           |
| `destructive`      | `#E69086`                | `#B44F45`                | Delete, errors                |

Text on video always uses white over a scrim; the feed never relies on the page
background for contrast. Focus rings use `ring` with a 2 px offset.

## Glass

`app-surface` is the large floating shell. `glass` is a layered panel,
`glass-strong` is elevated chrome and `glass-nav` is the sidebar/top toolbar/mobile
tab bar. All four share `--glass-border`, an inset top highlight and backdrop
blur; they differ only in fill opacity. The shell keeps a soft ambient glow in
`--ambient-one`/`--ambient-two` behind it so translucency reads even when content
is sparse. Blur belongs on floating layers only; solid surfaces must remain
readable when backdrop filters are unsupported.

## Type

- Display: Bricolage Grotesque Variable, tight (-0.035em) and heavy for titles.
- Body: Inter Variable.
- Sizes: `display` 2.75rem/1.02, `title` 1.5rem/1.15, `label` 0.75rem/1.1 with
  0.08em tracking, body 0.9375rem/1.5.
- Never go below 12 px; numbers in rails use tabular figures.

## Layout

- Desktop: floating surface with rounded corners, full glass sidebar (profile
  stats, navigation, library, account) and a top toolbar with search, appearance,
  notifications, Create and profile.
- Discovery content uses CSS-column masonry: two columns on mobile and tablet,
  three from `lg`. Immersive For You keeps snap scrolling and never becomes a grid.
- Tablet: narrower sidebar, search collapses to an icon, two-column masonry.
- Mobile: no floating desktop container. Full-width app, sticky compact header,
  fixed glass bottom navigation, horizontally scrolling creator row.

## Motion

- 150–300 ms, `--ease-snap` for movement, `--ease-pop` for playful pops.
- Animate only `transform` and `opacity`.
- Keyframes available: `flash`, `fade-in`, `zoom-in`, `slide-up`, `slide-right`.
- `prefers-reduced-motion: reduce` collapses every duration to ~0.

## Components

- Buttons: brand fill, secondary surface, ghost, destructive. 44 px minimum
  touch target.
- Cards: `glass` with a 2 px inset media frame, thin border, hover lift and
  overlaid play/duration/view chrome. Actions are four equal columns so they
  never crowd on narrow cards.
- Sheets: bottom sheet on mobile, right panel on desktop (`md` and up).
- Feed: full-bleed video, right action rail, bottom-left author/caption and thin
  scrubber. Chrome is white-on-scrim, never theme-coloured.
- States: every list has a skeleton, an empty state with one clear action, and
  an error state with retry. Optimistic interactions roll back visibly.

Implementation: Tailwind v4 utilities map to the tokens via `@theme inline` in
`apps/web/src/index.css`; shadcn/ui primitives in
`apps/web/src/components/ui`. React Native uses `StyleSheet` with the numeric
scales and palette from `@reel/tokens`.
