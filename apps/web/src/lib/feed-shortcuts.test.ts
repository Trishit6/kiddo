import { describe, expect, it } from 'vitest';
import { feedShortcut, shouldMountPlayer } from './feed-shortcuts';

describe('feed keyboard shortcuts', () => {
  it('maps navigation keys', () => {
    expect(feedShortcut('ArrowDown')).toBe('next');
    expect(feedShortcut('j')).toBe('next');
    expect(feedShortcut('ArrowUp')).toBe('previous');
    expect(feedShortcut('K')).toBe('previous');
  });

  it('maps playback and social keys', () => {
    expect(feedShortcut(' ')).toBe('toggle-play');
    expect(feedShortcut('m')).toBe('toggle-mute');
    expect(feedShortcut('l')).toBe('like');
    expect(feedShortcut('c')).toBe('comments');
    expect(feedShortcut('Escape')).toBe('close');
    expect(feedShortcut('?')).toBe('help');
  });

  it('ignores unrelated keys', () => {
    expect(feedShortcut('Enter')).toBeNull();
    expect(feedShortcut('Tab')).toBeNull();
  });
});

describe('player window', () => {
  it('mounts the active video and its immediate neighbours only', () => {
    const active = 5;
    const mounted = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((index) =>
      shouldMountPlayer(index, active),
    );
    expect(mounted).toEqual([4, 5, 6]);
  });

  it('clamps at the start of the feed', () => {
    expect(shouldMountPlayer(0, 0)).toBe(true);
    expect(shouldMountPlayer(1, 0)).toBe(true);
    expect(shouldMountPlayer(2, 0)).toBe(false);
  });
});
