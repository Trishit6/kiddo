import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';
import { usePreferences } from '@/theme/preferences-provider';

export type HapticKind = 'light' | 'medium' | 'success' | 'warning';

export function useHaptics() {
  const { haptics } = usePreferences();

  const fire = useCallback(
    (kind: HapticKind) => {
      if (!haptics) return;
      const run =
        kind === 'success'
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : kind === 'warning'
            ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            : Haptics.impactAsync(
                kind === 'medium'
                  ? Haptics.ImpactFeedbackStyle.Medium
                  : Haptics.ImpactFeedbackStyle.Light,
              );
      void run.catch(() => undefined);
    },
    [haptics],
  );

  return useMemo(
    () => ({
      light: () => fire('light'),
      medium: () => fire('medium'),
      success: () => fire('success'),
      warning: () => fire('warning'),
    }),
    [fire],
  );
}
