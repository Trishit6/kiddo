import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const HAPTICS_KEY = 'kiddo-haptics';
const START_UNMUTED_KEY = 'kiddo-start-unmuted';
const MUTED_KEY = 'kiddo-muted';

interface Preferences {
  haptics: boolean;
  startUnmuted: boolean;
  muted: boolean;
}

interface PreferencesContextValue extends Preferences {
  ready: boolean;
  setHaptics(value: boolean): void;
  setStartUnmuted(value: boolean): void;
  setMuted(value: boolean): void;
  toggleMuted(): void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

async function readBoolean(key: string, fallback: boolean): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>({
    haptics: true,
    startUnmuted: false,
    muted: true,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [haptics, startUnmuted, muted] = await Promise.all([
        readBoolean(HAPTICS_KEY, true),
        readBoolean(START_UNMUTED_KEY, false),
        readBoolean(MUTED_KEY, true),
      ]);
      if (!active) return;
      setPreferences({ haptics, startUnmuted, muted });
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((key: string, value: boolean) => {
    void AsyncStorage.setItem(key, String(value)).catch(() => undefined);
  }, []);

  const setHaptics = useCallback(
    (value: boolean) => {
      setPreferences((current) => ({ ...current, haptics: value }));
      persist(HAPTICS_KEY, value);
    },
    [persist],
  );

  const setStartUnmuted = useCallback(
    (value: boolean) => {
      setPreferences((current) => ({ ...current, startUnmuted: value, muted: !value }));
      persist(START_UNMUTED_KEY, value);
      persist(MUTED_KEY, !value);
    },
    [persist],
  );

  const setMuted = useCallback(
    (value: boolean) => {
      setPreferences((current) => ({ ...current, muted: value }));
      persist(MUTED_KEY, value);
    },
    [persist],
  );

  const toggleMuted = useCallback(() => {
    setPreferences((current) => {
      persist(MUTED_KEY, !current.muted);
      return { ...current, muted: !current.muted };
    });
  }, [persist]);

  const value = useMemo<PreferencesContextValue>(
    () => ({ ...preferences, ready, setHaptics, setStartUnmuted, setMuted, toggleMuted }),
    [preferences, ready, setHaptics, setStartUnmuted, setMuted, toggleMuted],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}
