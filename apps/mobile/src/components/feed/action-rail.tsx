import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { FeedItem } from '@reel/shared';
import { useFollow, useLikeVideo, useSaveVideo, useShareVideo } from '@reel/queries';
import { fontFamily, space } from '@reel/tokens';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/ui';
import { formatCount } from '@/lib/format';
import { useHaptics } from '@/lib/haptics';
import { shareVideoLink } from '@/lib/share';
import { useTheme } from '@/theme/theme-provider';
import { usePreferences } from '@/theme/preferences-provider';

function RailButton({
  icon,
  activeIcon,
  label,
  count,
  active = false,
  color,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  label: string;
  count?: number;
  active?: boolean;
  color?: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const tint = active ? colors.brand : (color ?? colors.onVideo);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
      accessibilityState={{ selected: active }}
      testID={testID}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.railButton, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons
        name={active && activeIcon ? activeIcon : icon}
        size={30}
        color={tint}
        style={styles.railIcon}
      />
      {count !== undefined ? (
        <Text style={[styles.count, { color: colors.onVideo }]}>{formatCount(count)}</Text>
      ) : (
        <Text style={[styles.count, { color: colors.onVideo }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export const ActionRail = memo(function ActionRail({
  item,
  onComments,
  testID,
}: {
  item: FeedItem;
  onComments: () => void;
  testID?: string;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const { muted, toggleMuted } = usePreferences();
  const { user } = useAuth();
  const haptics = useHaptics();
  const like = useLikeVideo();
  const save = useSaveVideo();
  const follow = useFollow();
  const share = useShareVideo();
  const isOwner = user?.username === item.author.username;

  const toggleLike = () => {
    haptics.light();
    like.mutate({ videoId: item.video.id, liked: !item.viewerState.liked });
  };

  const toggleSave = () => {
    haptics.light();
    save.mutate({ videoId: item.video.id, saved: !item.viewerState.saved });
  };

  const toggleFollow = () => {
    haptics.medium();
    follow.mutate({
      username: item.author.username,
      following: !item.viewerState.followingAuthor,
    });
  };

  const onShare = async () => {
    const shared = await shareVideoLink(item).catch(() => false);
    if (shared) share.mutate(item.video.id);
  };

  return (
    <View style={styles.rail} testID={testID}>
      <View style={styles.avatarWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.author.username}'s profile`}
          onPress={() => router.push(`/user/${item.author.username}`)}
          hitSlop={6}
        >
          <Avatar
            uri={item.author.avatarUrl}
            name={item.author.displayName}
            size={46}
            accessibilityLabel={`${item.author.displayName} avatar`}
          />
        </Pressable>
        {!isOwner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              item.viewerState.followingAuthor
                ? `Unfollow ${item.author.username}`
                : `Follow ${item.author.username}`
            }
            testID="feed-follow"
            onPress={toggleFollow}
            hitSlop={8}
            style={[
              styles.followBadge,
              {
                backgroundColor: item.viewerState.followingAuthor ? colors.mint : colors.brand,
              },
            ]}
          >
            <Ionicons
              name={item.viewerState.followingAuthor ? 'checkmark' : 'add'}
              size={15}
              color={colors.brandForeground}
            />
          </Pressable>
        ) : null}
      </View>

      <RailButton
        icon={item.viewerState.liked ? 'heart' : 'heart-outline'}
        activeIcon="heart"
        active={item.viewerState.liked}
        label="Like"
        count={item.counts.likes}
        onPress={toggleLike}
        testID="feed-like"
      />
      <RailButton
        icon="chatbubble-ellipses-outline"
        label="Comments"
        count={item.counts.comments}
        onPress={onComments}
        testID="feed-comments"
      />
      <RailButton
        icon={item.viewerState.saved ? 'bookmark' : 'bookmark-outline'}
        activeIcon="bookmark"
        active={item.viewerState.saved}
        label="Save"
        count={item.counts.saves}
        onPress={toggleSave}
        testID="feed-save"
      />
      <RailButton
        icon="arrow-redo-outline"
        label="Share"
        count={item.counts.shares}
        onPress={() => void onShare()}
        testID="feed-share"
      />
      <RailButton
        icon={muted ? 'volume-mute-outline' : 'volume-high-outline'}
        label={muted ? 'Unmute' : 'Mute'}
        onPress={toggleMuted}
        color={colors.onVideoMuted}
        testID="feed-mute"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    right: space.sm,
    bottom: 108,
    alignItems: 'center',
    gap: space.md,
  },
  railButton: { alignItems: 'center', justifyContent: 'center', minWidth: 48, minHeight: 48 },
  railIcon: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 },
  count: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    marginTop: 1,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 4,
  },
  avatarWrap: { alignItems: 'center', marginBottom: space.xs },
  followBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
  },
});
