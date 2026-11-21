import Ionicons from '@expo/vector-icons/Ionicons';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space } from '@reel/tokens';
import { useAuth } from '@/components/auth-provider';
import { useSignInPrompt } from '@/components/auth-gate';
import { AppText, Button, Chip, Divider } from '@/components/ui';
import { usePreferences } from '@/theme/preferences-provider';
import { useTheme, type ThemePreference } from '@/theme/theme-provider';

function Row({
  icon,
  label,
  description,
  value,
  onValueChange,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  badge?: string;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      <Ionicons name={icon} size={20} color={colors.foreground} />
      <View style={styles.rowText}>
        <AppText>{label}</AppText>
        {description ? (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <AppText variant="caption">{badge}</AppText>
        </View>
      ) : null}
      {onValueChange ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: colors.brand, false: colors.muted }}
          thumbColor={colors.card}
          accessibilityLabel={label}
        />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      ) : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signOut, signOutAll } = useAuth();
  const { prompt } = useSignInPrompt();
  const { preference, setPreference } = useTheme();
  const { haptics, setHaptics, startUnmuted, setStartUnmuted } = usePreferences();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build = Application.nativeBuildVersion ?? 'development';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxxl }]}
      >
        <AppText variant="title">Appearance</AppText>
        <View style={styles.chips}>
          {(['system', 'light', 'dark'] as ThemePreference[]).map((value) => (
            <Chip
              key={value}
              label={value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark'}
              selected={preference === value}
              onPress={() => setPreference(value)}
            />
          ))}
        </View>
        <Divider />

        <AppText variant="title">Playback</AppText>
        <Row
          icon="flash-outline"
          label="Haptics"
          description="Vibrate on like, follow and long-press"
          value={haptics}
          onValueChange={setHaptics}
        />
        <Row
          icon="volume-high-outline"
          label="Start with sound"
          description="Otherwise videos start muted until you unmute"
          value={startUnmuted}
          onValueChange={setStartUnmuted}
        />
        <Divider />

        <AppText variant="title">Account</AppText>
        <Row
          icon="person-outline"
          label="Edit profile"
          onPress={() => router.push('/edit-profile')}
        />
        <Row
          icon="notifications-outline"
          label="Notifications"
          badge="Phase 7"
          description="Push and in-app notifications"
        />
        <Row
          icon="lock-closed-outline"
          label="Privacy"
          badge="Phase 7"
          description="Comments, downloads and blocked accounts"
        />
        <Divider />

        {user ? (
          <View style={styles.buttons}>
            <Button
              label="Log out"
              variant="secondary"
              onPress={() =>
                Alert.alert('Log out?', 'You can sign back in any time.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
                ])
              }
            />
            <Button
              label="Log out of all devices"
              variant="destructive"
              onPress={() =>
                Alert.alert(
                  'Log out everywhere?',
                  'Every session, including this one, will be signed out.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Log out everywhere',
                      style: 'destructive',
                      onPress: () =>
                        void signOutAll()
                          .then(() => router.replace('/feed'))
                          .catch(() =>
                            Alert.alert('Could not reach the server', 'Try again soon.'),
                          ),
                    },
                  ],
                )
              }
            />
          </View>
        ) : (
          <Button label="Sign in" onPress={() => prompt()} />
        )}

        <View style={styles.meta}>
          <AppText variant="caption" tone="muted">
            Kiddo {version} ({build})
          </AppText>
          <AppText variant="caption" tone="muted">
            Made for short vertical video.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: space.lg, gap: space.md },
  chips: { flexDirection: 'row', gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingVertical: space.xs,
  },
  rowText: { flex: 1, gap: 2 },
  badge: { borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  buttons: { gap: space.sm },
  meta: { alignItems: 'center', gap: 2, marginTop: space.xl },
});
