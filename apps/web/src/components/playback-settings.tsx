import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const MUTE_KEY = 'kiddo-muted';

interface PlaybackSettingsValue {
  muted: boolean;
  setMuted(muted: boolean): void;
  toggleMuted(): void;
}

const PlaybackSettingsContext = createContext<PlaybackSettingsValue | null>(null);

function initialMuted(): boolean {
  try {
    const saved = localStorage.getItem(MUTE_KEY);
    if (saved === 'true') return true;
    if (saved === 'false') return false;
  } catch {
    // Storage may be unavailable; start muted for autoplay policies.
  }
  return true;
}

/**
 * Mute is a session-wide preference: unmuting one video unmutes the rest until
 * the tab is closed (and is remembered for the next visit).
 */
export function PlaybackSettingsProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(initialMuted);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    try {
      localStorage.setItem(MUTE_KEY, String(next));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const value = useMemo(
    () => ({
      muted,
      setMuted,
      toggleMuted: () => setMuted(!muted),
    }),
    [muted, setMuted],
  );

  return (
    <PlaybackSettingsContext.Provider value={value}>{children}</PlaybackSettingsContext.Provider>
  );
}

export function usePlaybackSettings(): PlaybackSettingsValue {
  const value = useContext(PlaybackSettingsContext);
  if (!value) throw new Error('usePlaybackSettings must be used inside PlaybackSettingsProvider');
  return value;
}
