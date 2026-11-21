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
import { useColorScheme } from 'react-native';
import { palettes, type ThemeColors, type ThemeMode } from '@reel/tokens';

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'kiddo-theme';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  preference: ThemePreference;
  ready: boolean;
  setPreference(value: ThemePreference): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && isPreference(stored)) setPreferenceState(stored);
      } catch {
        // A failed read only means the default system preference is used.
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    void AsyncStorage.setItem(STORAGE_KEY, value).catch(() => undefined);
  }, []);

  const mode: ThemeMode =
    preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, colors: palettes[mode], preference, ready, setPreference }),
    [mode, preference, ready, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
