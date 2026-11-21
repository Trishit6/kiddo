import Ionicons from '@expo/vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space } from '@reel/tokens';
import { useTheme } from '@/theme/theme-provider';

export function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
    return unsubscribe;
  }, []);

  if (!offline) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Showing saved content."
      style={[styles.banner, { top: insets.top + space.xs, backgroundColor: colors.sun }]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={colors.brandForeground} />
      <Text style={[styles.label, { color: colors.brandForeground }]}>You're offline</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  label: { fontSize: 12, fontWeight: '700' },
});
