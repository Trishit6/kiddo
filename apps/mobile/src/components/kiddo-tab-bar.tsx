import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, radius } from '@reel/tokens';
import { useTheme } from '@/theme/theme-provider';

const icons: Record<
  string,
  {
    active: keyof typeof Ionicons.glyphMap;
    inactive: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  feed: { active: 'home', inactive: 'home-outline', label: 'Home' },
  explore: { active: 'compass', inactive: 'compass-outline', label: 'Explore' },
  upload: { active: 'add', inactive: 'add', label: 'Upload' },
  inbox: { active: 'notifications', inactive: 'notifications-outline', label: 'Notifications' },
  profile: { active: 'person', inactive: 'person-outline', label: 'Profile' },
};

export function KiddoTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const overlay = pathname === '/feed';

  return (
    <View
      style={[
        styles.bar,
        {
          height: layout.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: overlay ? 'rgba(6, 12, 9, 0.34)' : colors.card,
          borderTopColor: overlay ? 'transparent' : colors.border,
          borderTopWidth: overlay ? 0 : StyleSheet.hairlineWidth,
        },
        overlay ? styles.overlay : null,
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key]?.options;
        const config = icons[route.name] ?? icons.feed!;
        const tint = focused
          ? overlay
            ? '#ffffff'
            : colors.brand
          : overlay
            ? 'rgba(255,255,255,0.7)'
            : colors.mutedForeground;
        const isUpload = route.name === 'upload';

        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigateToTab(route.key);
          }
        };

        const onLongPress = () => {
          emitter.emit({ type: 'tabLongPress', target: route.key });
        };

        if (isUpload) {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel="Upload a video"
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.item}
              testID="tab-upload"
            >
              <View
                style={[
                  styles.uploadButton,
                  {
                    backgroundColor: colors.brand,
                    borderColor: mode === 'dark' ? colors.card : '#ffffff',
                  },
                ]}
              >
                <Ionicons name="add" size={28} color={colors.brandForeground} />
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={options?.title ?? config.label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.item}
            testID={`tab-${route.name}`}
          >
            <Ionicons name={focused ? config.active : config.inactive} size={24} color={tint} />
            <Text
              style={[
                styles.label,
                { color: tint, fontFamily: focused ? 'Inter_600SemiBold' : 'Inter_500Medium' },
              ]}
            >
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.tabBarHeight,
    gap: 2,
  },
  label: { fontSize: 10, letterSpacing: 0.1 },
  uploadButton: {
    width: 48,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginTop: -8,
  },
});
