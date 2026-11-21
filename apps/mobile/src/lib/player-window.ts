/**
 * The feed keeps at most three native players alive: the active video plus its
 * immediate neighbours. Everything else renders a poster only.
 */
export const PLAYER_WINDOW_RADIUS = 1;

export function playerWindow(activeIndex: number, total: number): number[] {
  if (total <= 0 || activeIndex < 0) return [];
  const start = Math.max(0, activeIndex - PLAYER_WINDOW_RADIUS);
  const end = Math.min(total - 1, activeIndex + PLAYER_WINDOW_RADIUS);
  const indices: number[] = [];
  for (let index = start; index <= end; index += 1) indices.push(index);
  return indices;
}

export function shouldMountPlayer(index: number, activeIndex: number): boolean {
  return Math.abs(index - activeIndex) <= PLAYER_WINDOW_RADIUS;
}

export interface PlaybackConditions {
  isActive: boolean;
  appActive: boolean;
  screenFocused: boolean;
  tabFocused: boolean;
  pausedByUser: boolean;
}

export function shouldPlayVideo(conditions: PlaybackConditions): boolean {
  return (
    conditions.isActive &&
    conditions.appActive &&
    conditions.screenFocused &&
    conditions.tabFocused &&
    !conditions.pausedByUser
  );
}
