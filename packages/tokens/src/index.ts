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
  background: '#F6F6FA',
  foreground: '#20202B',
  card: '#FFFFFF',
  cardForeground: '#20202B',
  popover: '#FFFFFF',
  popoverForeground: '#20202B',
  primary: '#7557F6',
  primaryForeground: '#FFFFFF',
  secondary: '#F0EFF6',
  secondaryForeground: '#20202B',
  muted: '#F0EFF6',
  mutedForeground: '#777785',
  accent: '#F0EFF6',
  accentForeground: '#20202B',
  destructive: '#EF5350',
  border: '#E9E8F0',
  input: '#E9E8F0',
  ring: '#7557F6',
  brand: '#7557F6',
  brandForeground: '#FFFFFF',
  brandSecondary: '#9878FF',
  accentPink: '#FF5576',
  success: '#19B99A',
  warning: '#F4B64A',
  error: '#EF5350',
  mint: '#19B99A',
  sun: '#F4B64A',
  scrim: 'rgba(32, 32, 43, 0.48)',
  placeholder: '#E9E8F0',
  onVideo: '#FFFFFF',
  onVideoMuted: 'rgba(255, 255, 255, 0.72)',
};

export const darkColors: ThemeColors = {
  background: '#111116',
  foreground: '#F4F3F8',
  card: '#191922',
  cardForeground: '#F4F3F8',
  popover: '#22222D',
  popoverForeground: '#F4F3F8',
  primary: '#9878FF',
  primaryForeground: '#111116',
  secondary: '#292936',
  secondaryForeground: '#F4F3F8',
  muted: '#22222D',
  mutedForeground: '#A2A0AF',
  accent: '#292936',
  accentForeground: '#F4F3F8',
  destructive: '#EF5350',
  border: '#343441',
  input: '#343441',
  ring: '#9878FF',
  brand: '#9878FF',
  brandForeground: '#111116',
  brandSecondary: '#7557F6',
  accentPink: '#FF5576',
  success: '#19B99A',
  warning: '#F4B64A',
  error: '#EF5350',
  mint: '#19B99A',
  sun: '#F4B64A',
  scrim: 'rgba(0, 0, 0, 0.60)',
  placeholder: '#292936',
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
    background: 'rgba(255, 255, 255, 0.72)',
    strong: 'rgba(255, 255, 255, 0.88)',
    border: 'rgba(255, 255, 255, 0.78)',
  },
  dark: {
    background: 'rgba(25, 25, 34, 0.72)',
    strong: 'rgba(25, 25, 34, 0.90)',
    border: 'rgba(255, 255, 255, 0.08)',
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

export const themes = { light: lightColors, dark: darkColors } as const;
