export type FeedShortcut =
  | 'next'
  | 'previous'
  | 'toggle-play'
  | 'toggle-mute'
  | 'like'
  | 'comments'
  | 'close'
  | 'help'
  | null;

/** Maps a keyboard event key to a feed action; typing targets are filtered by the caller. */
export function feedShortcut(key: string): FeedShortcut {
  switch (key) {
    case 'ArrowDown':
    case 'j':
    case 'J':
      return 'next';
    case 'ArrowUp':
    case 'k':
    case 'K':
      return 'previous';
    case ' ':
      return 'toggle-play';
    case 'm':
    case 'M':
      return 'toggle-mute';
    case 'l':
    case 'L':
      return 'like';
    case 'c':
    case 'C':
      return 'comments';
    case 'Escape':
      return 'close';
    case '?':
      return 'help';
    default:
      return null;
  }
}

export function shouldMountPlayer(index: number, activeIndex: number): boolean {
  return Math.abs(index - activeIndex) <= 1;
}
