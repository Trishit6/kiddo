import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useLikedVideos,
  useMyVideos,
  useProfileVideos,
  usePublicProfile,
  useSavedVideos,
} from '@reel/queries';
import type { FeedItem, VideoStatus } from '@reel/shared';
import { radius, space, type } from '@reel/tokens';
import { FollowButton } from '@/components/follow-button';
import { VideoGrid, type GridVideo } from '@/components/video-grid';
import { AppText, Avatar, Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { formatCount } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';

type Tab = 'videos' | 'liked' | 'saved';

function toGrid(items: FeedItem[], statuses?: Map<string, VideoStatus>): GridVideo[] {
  return items.map((item) => ({
    id: item.video.id,
    thumbnailUrl: item.video.thumbnailUrl,
    views: item.counts.views,
    status: statuses?.get(item.video.id) ?? 'ready',
  }));
}

function Header({
  username,
  isOwner,
  onEdit,
  onSettings,
}: {
  username: string;
  isOwner: boolean;
  onEdit: () => void;
  onSettings: () => void;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = usePublicProfile(username);

  if (profile.isPending) {
    return (
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={styles.identity}>
          <Skeleton width={84} height={84} rounded={42} />
          <View style={styles.identityText}>
            <Skeleton width="60%" height={20} />
            <Skeleton width="40%" height={14} />
          </View>
        </View>
        <Skeleton width="90%" height={14} />
        <Skeleton width="60%" height={14} />
      </View>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <ErrorState message="This profile could not load." onRetry={() => void profile.refetch()} />
    );
  }

  const { user, viewerState } = profile.data;
  const openFollows = (kind: 'followers' | 'following') =>
    router.push({ pathname: '/follows', params: { username, type: kind } });

  return (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      {isOwner ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={onSettings}
          hitSlop={8}
          style={styles.settings}
        >
          <Ionicons name="settings-outline" size={24} color={colors.foreground} />
        </Pressable>
      ) : null}
      <View style={styles.identity}>
        <Avatar uri={user.avatarUrl} name={user.displayName} size={84} />
        <View style={styles.identityText}>
          <AppText variant="title" numberOfLines={1}>
            {user.displayName}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            @{user.username}
          </AppText>
        </View>
      </View>

      <View style={styles.counts}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${formatCount(user.counts.followers)} followers`}
          style={styles.count}
          onPress={() => openFollows('followers')}
        >
          <Text style={[styles.countValue, { color: colors.foreground }]}>
            {formatCount(user.counts.followers)}
          </Text>
          <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>Followers</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${formatCount(user.counts.following)} following`}
          style={styles.count}
          onPress={() => openFollows('following')}
        >
          <Text style={[styles.countValue, { color: colors.foreground }]}>
            {formatCount(user.counts.following)}
          </Text>
          <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>Following</Text>
        </Pressable>
        <View style={styles.count}>
          <Text style={[styles.countValue, { color: colors.foreground }]}>
            {formatCount(user.counts.videos)}
          </Text>
          <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>Videos</Text>
        </View>
      </View>

      {user.bio ? <AppText style={styles.bio}>{user.bio}</AppText> : null}

      {isOwner ? (
        <Button label="Edit profile" variant="secondary" onPress={onEdit} />
      ) : (
        <FollowButton username={user.username} following={viewerState.following} />
      )}
    </View>
  );
}

function TabBar({ tab, tabs, onChange }: { tab: Tab; tabs: Tab[]; onChange: (tab: Tab) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
      {tabs.map((value) => {
        const active = tab === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              value === 'videos' ? 'Videos' : value === 'liked' ? 'Liked' : 'Saved'
            }
            onPress={() => onChange(value)}
            style={styles.tab}
            testID={`profile-tab-${value}`}
          >
            <Ionicons
              name={
                value === 'videos'
                  ? active
                    ? 'grid'
                    : 'grid-outline'
                  : value === 'liked'
                    ? active
                      ? 'heart'
                      : 'heart-outline'
                    : active
                      ? 'bookmark'
                      : 'bookmark-outline'
              }
              size={22}
              color={active ? colors.foreground : colors.mutedForeground}
            />
            <View
              style={[
                styles.tabUnderline,
                { backgroundColor: active ? colors.foreground : 'transparent' },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function OwnerTabs({ username, header }: { username: string; header: React.ReactElement }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('videos');
  const videos = useProfileVideos(username);
  const liked = useLikedVideos();
  const saved = useSavedVideos();
  const mine = useMyVideos();
  const statuses = new Map(
    (mine.data?.pages.flatMap((page) => page.items) ?? []).map((video) => [video.id, video.status]),
  );

  const query = tab === 'videos' ? videos : tab === 'liked' ? liked : saved;
  const profileItems = videos.data?.pages.flatMap((page) => page.items) ?? [];
  const entries: GridVideo[] =
    tab === 'videos'
      ? toGrid(profileItems, statuses)
      : toGrid(query.data?.pages.flatMap((page) => page.items) ?? []);

  return (
    <>
      <VideoGrid
        key={tab}
        videos={entries}
        isOwner
        header={
          <View>
            {header}
            <TabBar tab={tab} tabs={['videos', 'liked', 'saved']} onChange={setTab} />
          </View>
        }
        loading={query.isPending}
        error={query.isError}
        onRetry={() => void query.refetch()}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => void query.refetch()}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onPress={(index) => {
          const entry = entries[index];
          const profileIndex = profileItems.findIndex((item) => item.video.id === entry?.id);
          if (tab === 'videos' && entry && entry.status !== 'ready' && profileIndex < 0) {
            router.push({ pathname: '/video/[id]', params: { id: entry.id } });
            return;
          }
          router.push({
            pathname: '/pager',
            params: {
              source: tab === 'videos' ? 'profile' : tab,
              username,
              index: String(profileIndex >= 0 ? profileIndex : index),
            },
          });
        }}
        emptyTitle={
          tab === 'videos'
            ? 'No videos yet'
            : tab === 'liked'
              ? 'No liked videos'
              : 'Nothing saved yet'
        }
        emptyBody={
          tab === 'videos'
            ? 'Videos you upload will appear here.'
            : tab === 'liked'
              ? 'Videos you like will appear here.'
              : 'Saved videos are private to you.'
        }
        emptyActionLabel={tab === 'videos' ? 'Upload a video' : undefined}
        onEmptyAction={tab === 'videos' ? () => router.push('/upload') : undefined}
      />
    </>
  );
}

function PublicTabs({ username, header }: { username: string; header: React.ReactElement }) {
  const router = useRouter();
  const videos = useProfileVideos(username);
  return (
    <>
      <VideoGrid
        videos={toGrid(videos.data?.pages.flatMap((page) => page.items) ?? [])}
        header={
          <View>
            {header}
            <TabBar tab="videos" tabs={['videos']} onChange={() => undefined} />
          </View>
        }
        loading={videos.isPending}
        error={videos.isError}
        onRetry={() => void videos.refetch()}
        refreshing={videos.isRefetching && !videos.isFetchingNextPage}
        onRefresh={() => void videos.refetch()}
        onEndReached={() => {
          if (videos.hasNextPage && !videos.isFetchingNextPage) void videos.fetchNextPage();
        }}
        onPress={(index) =>
          router.push({
            pathname: '/pager',
            params: { source: 'profile', username, index: String(index) },
          })
        }
        emptyTitle="No videos yet"
        emptyBody={`@${username} has not posted a video.`}
      />
    </>
  );
}

export function ProfileView({ username, isOwner }: { username: string; isOwner: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();
  const header = (
    <Header
      username={username}
      isOwner={isOwner}
      onEdit={() => router.push('/edit-profile')}
      onSettings={() => router.push('/settings')}
    />
  );
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isOwner ? (
        <OwnerTabs username={username} header={header} />
      ) : (
        <PublicTabs username={username} header={header} />
      )}
    </View>
  );
}

export function SignedOutProfile({ onSignIn }: { onSignIn: () => void }) {
  return (
    <View style={styles.signedOut}>
      <EmptyState
        icon="person-circle-outline"
        title="Your profile"
        body="Sign in to see your videos, likes and saved clips."
        actionLabel="Sign in"
        onAction={onSignIn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: space.xxxl },
  header: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.md },
  settings: {
    position: 'absolute',
    right: space.lg,
    zIndex: 2,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  identityText: { flex: 1, gap: 2 },
  counts: { flexDirection: 'row', gap: space.xl },
  count: { alignItems: 'flex-start' },
  countValue: { fontSize: type.heading.fontSize, fontWeight: '700' },
  countLabel: { fontSize: 12 },
  bio: { fontSize: type.body.fontSize, lineHeight: type.body.lineHeight },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: 2,
    paddingTop: space.xs,
  },
  tabUnderline: { height: 2, width: '45%', borderRadius: radius.pill },
  signedOut: { flex: 1, justifyContent: 'center' },
});
