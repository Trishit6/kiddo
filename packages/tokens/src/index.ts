/**
 * Kiddo cross-platform design tokens (see docs/web-design.md).
 *
 * The web builds its CSS variables from tokens.css; React Native consumes the
 * sRGB palette and numeric scales below. Native has no OKLCH support, so the
 * hex values are the closest sRGB projection of the same palette.
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  brand: string;
  brandForeground: string;
  brandSecondary: string;
  accentPink: string;
  success: string;
  warning: string;
  error: string;
  /** Backward-compatible aliases. */
  mint: string;
  sun: string;
  /** Readable scrim for text over video. */
  scrim: string;
  /** Solid placeholder used while posters and avatars load. */
  placeholder: string;
  /** Inverted overlay chrome on top of video. */
  onVideo: string;
  onVideoMuted: string;
}

export const lightColors: ThemeColors = {
  background: '#EDF2EE',
  foreground: '#202C25',
  card: '#FFFFFF',
  cardForeground: '#202C25',
  popover: '#FFFFFF',
  popoverForeground: '#202C25',
  primary: '#477C5B',
  primaryForeground: '#FFFFFF',
  secondary: '#F2F7F3',
  secondaryForeground: '#202C25',
  muted: '#E9F0EA',
  mutedForeground: '#68766D',
  accent: '#E4EEE7',
  accentForeground: '#202C25',
  destructive: '#B44F45',
  border: 'rgba(57, 83, 65, 0.13)',
  input: 'rgba(57, 83, 65, 0.18)',
  ring: '#477C5B',
  brand: '#477C5B',
  brandForeground: '#FFFFFF',
  brandSecondary: '#A9C9B2',
  accentPink: '#B98C81',
  success: '#477C5B',
  warning: '#B07F36',
  error: '#B44F45',
  mint: '#477C5B',
  sun: '#B07F36',
  scrim: 'rgba(32, 44, 37, 0.48)',
  placeholder: '#E9F0EA',
  onVideo: '#FFFFFF',
  onVideoMuted: 'rgba(255, 255, 255, 0.72)',
};

export const darkColors: ThemeColors = {
  background: '#101916',
  foreground: '#F4F7F4',
  card: '#1C2924',
  cardForeground: '#F4F7F4',
  popover: '#22312A',
  popoverForeground: '#F4F7F4',
  primary: '#9CCBB0',
  primaryForeground: '#0E1A14',
  secondary: 'rgba(235, 245, 239, 0.10)',
  secondaryForeground: '#E7EFE9',
  muted: 'rgba(235, 245, 239, 0.07)',
  mutedForeground: '#B3C1B8',
  accent: 'rgba(235, 245, 239, 0.12)',
  accentForeground: '#F4F7F4',
  destructive: '#E69086',
  border: 'rgba(255, 255, 255, 0.16)',
  input: 'rgba(255, 255, 255, 0.12)',
  ring: '#9CCBB0',
  brand: '#9CCBB0',
  brandForeground: '#0E1A14',
  brandSecondary: '#D5E6D9',
  accentPink: '#C9A79D',
  success: '#9CCBB0',
  warning: '#E4C48F',
  error: '#E69086',
  mint: '#9CCBB0',
  sun: '#E4C48F',
  scrim: 'rgba(6, 12, 9, 0.62)',
  placeholder: 'rgba(235, 245, 239, 0.10)',
  onVideo: '#FFFFFF',
  onVideoMuted: 'rgba(255, 255, 255, 0.72)',
};

export const palettes: Record<ThemeMode, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

/** Translucent surfaces used by glassmorphism components on native. */
export const glass = {
  light: {
    background: 'rgba(255, 255, 255, 0.66)',
    strong: 'rgba(255, 255, 255, 0.82)',
    border: 'rgba(57, 83, 65, 0.13)',
    highlight: 'rgba(255, 255, 255, 0.72)',
    surface: 'rgba(255, 255, 255, 0.66)',
    scrim: 'rgba(32, 44, 37, 0.48)',
  },
  dark: {
    background: 'rgba(224, 239, 230, 0.09)',
    strong: 'rgba(235, 245, 239, 0.13)',
    border: 'rgba(255, 255, 255, 0.16)',
    highlight: 'rgba(255, 255, 255, 0.10)',
    surface: 'rgba(28, 41, 36, 0.72)',
    scrim: 'rgba(6, 12, 9, 0.62)',
  },
} as const;

/** 4pt base scale. Use these instead of raw numbers in styles. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 34, lineHeight: 36, letterSpacing: -1.1 },
  title: { fontSize: 24, lineHeight: 28, letterSpacing: -0.5 },
  heading: { fontSize: 18, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, letterSpacing: 0 },
  label: { fontSize: 12, lineHeight: 14, letterSpacing: 0.8 },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0 },
} as const;

export const fontFamily = {
  sans: 'Inter',
  display: 'BricolageGrotesque',
} as const;

/** Motion stays between 150 and 300 ms, transform/opacity only. */
export const motion = {
  fast: 150,
  base: 220,
  slow: 300,
  easing: { x1: 0.32, y1: 0.72, x2: 0, y2: 1 },
} as const;

export const layout = {
  tabBarHeight: 58,
  actionRailWidth: 64,
  minTouchTarget: 44,
  feedMaxPlayerWindow: 3,
  commentsSheet: { collapsed: '70%', expanded: '92%' },
} as const;

/** Web shell geometry, mirrored from tokens.css. */
export const shell = {
  maxWidth: 1720,
  gutter: 16,
  gutterWide: 20,
  sidebarWidth: 272,
  sidebarCompactWidth: 76,
  toolbarHeight: 64,
  mobileHeaderHeight: 56,
  mobileNavHeight: 70,
} as const;

/** Tailwind viewport targets. Keep in sync with the @theme breakpoints. */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 30,
  nav: 40,
  overlay: 50,
  modal: 60,
  toast: 70,
} as const;

export const themes = { light: lightColors, dark: darkColors } as const;
