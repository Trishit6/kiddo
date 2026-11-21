import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useFollow } from '@reel/queries';
import { radius, space } from '@reel/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useHaptics } from '@/lib/haptics';

export function FollowButton({
  username,
  following,
  size = 'regular',
}: {
  username: string;
  following: boolean;
  size?: 'regular' | 'compact';
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const follow = useFollow();

  const toggle = () => {
    haptics.medium();
    if (following) {
      Alert.alert(`Unfollow @${username}?`, 'Their videos will stop appearing in Following.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: () => follow.mutate({ username, following: false }),
        },
      ]);
      return;
    }
    follow.mutate({ username, following: true });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={following ? `Unfollow ${username}` : `Follow ${username}`}
      accessibilityState={{ selected: following }}
      onPress={toggle}
      style={({ pressed }) => [
        styles.button,
        size === 'compact' ? styles.compact : null,
        {
          backgroundColor: following ? colors.secondary : colors.brand,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      testID="follow-button"
    >
      <Text
        style={[
          styles.label,
          size === 'compact' ? styles.compactLabel : null,
          { color: following ? colors.foreground : colors.brandForeground },
        ]}
      >
        {following ? 'Following' : 'Follow'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    minWidth: 104,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 32, minWidth: 80, borderRadius: radius.pill },
  label: { fontSize: 14, fontWeight: '700' },
  compactLabel: { fontSize: 12 },
});
