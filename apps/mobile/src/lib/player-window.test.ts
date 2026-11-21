import { playerWindow, shouldMountPlayer, shouldPlayVideo } from './player-window';

describe('player window', () => {
  it('never mounts more than three players around the active index', () => {
    expect(playerWindow(0, 100)).toEqual([0, 1]);
    expect(playerWindow(1, 100)).toEqual([0, 1, 2]);
    expect(playerWindow(50, 100)).toEqual([49, 50, 51]);
    expect(playerWindow(99, 100)).toEqual([98, 99]);
    expect(playerWindow(0, 2)).toEqual([0, 1]);
  });

  it('returns an empty window for empty lists', () => {
    expect(playerWindow(0, 0)).toEqual([]);
    expect(playerWindow(-1, 10)).toEqual([]);
  });

  it('mounts only the active video and its neighbours', () => {
    expect(shouldMountPlayer(4, 4)).toBe(true);
    expect(shouldMountPlayer(3, 4)).toBe(true);
    expect(shouldMountPlayer(5, 4)).toBe(true);
    expect(shouldMountPlayer(2, 4)).toBe(false);
    expect(shouldMountPlayer(6, 4)).toBe(false);
  });

  it('counts live players across a 120 item scroll and caps at three', () => {
    for (let active = 0; active < 120; active += 1) {
      expect(playerWindow(active, 120).length).toBeLessThanOrEqual(3);
    }
  });
});

describe('playback gating', () => {
  const playing = {
    isActive: true,
    appActive: true,
    screenFocused: true,
    tabFocused: true,
    pausedByUser: false,
  };

  it('plays only when every condition holds', () => {
    expect(shouldPlayVideo(playing)).toBe(true);
    expect(shouldPlayVideo({ ...playing, isActive: false })).toBe(false);
    expect(shouldPlayVideo({ ...playing, appActive: false })).toBe(false);
    expect(shouldPlayVideo({ ...playing, screenFocused: false })).toBe(false);
    expect(shouldPlayVideo({ ...playing, tabFocused: false })).toBe(false);
    expect(shouldPlayVideo({ ...playing, pausedByUser: true })).toBe(false);
  });

  it('pauses when the app is backgrounded and resumes when active', () => {
    expect(shouldPlayVideo({ ...playing, appActive: false })).toBe(false);
    expect(shouldPlayVideo({ ...playing, appActive: true })).toBe(true);
  });
});
