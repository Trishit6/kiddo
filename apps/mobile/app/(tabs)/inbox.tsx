import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import {
  useMarkNotificationsRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@reel/queries';
import { ApiClientError } from '@reel/shared';
import type { Notification, NotificationFilter } from '@reel/shared';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, radius, space } from '@reel/tokens';
import { useAuth } from '@/components/auth-provider';
import { useSignInPrompt } from '@/components/auth-gate';
import {
  AppText,
  Avatar,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Message,
  Skeleton,
} from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { useTheme } from '@/theme/theme-provider';

const filters: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'likes', label: 'Likes' },
  { value: 'comments', label: 'Comments' },
  { value: 'mentions', label: 'Mentions' },
  { value: 'follows', label: 'Follows' },
];

function notificationMessage(item: Notification): string {
  switch (item.type) {
    case 'like':
      return 'liked your video';
    case 'comment':
      return 'commented on your video';
    case 'reply':
      return 'replied to your comment';
    case 'comment_like':
      return 'liked your comment';
    case 'follow':
      return 'started following you';
    case 'mention':
      return 'mentioned you';
    case 'video_ready':
      return 'Your video is ready to watch';
    case 'video_failed':
      return 'Your video could not be processed';
    case 'moderation':
      return 'There is an update about your content';
  }
}

function notificationActor(item: Notification): string {
  const first = item.actors[0]?.displayName;
  if (!first) return item.actorCount > 1 ? `${item.actorCount} people` : 'Kiddo';
  return item.actorCount > 1 ? `${first} and ${item.actorCount - 1} others` : first;
}

function relativeTime(value: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString();
}

function NotificationCard({ item, onPress }: { item: Notification; onPress(): void }) {
  const { colors } = useTheme();
  const actor = item.actors[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${notificationActor(item)} ${notificationMessage(item)}${item.readAt ? '' : ', unread'}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.notification,
        {
          backgroundColor: item.readAt ? colors.card : `${colors.brand}12`,
          borderColor: item.readAt ? colors.border : `${colors.brand}40`,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.avatarWrap}>
        <Avatar uri={actor?.avatarUrl ?? null} name={actor?.displayName ?? 'Kiddo'} size={42} />
        {!item.readAt ? (
          <View
            style={[
              styles.unreadDot,
              { backgroundColor: colors.brand, borderColor: colors.background },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.notificationCopy}>
        <AppText style={styles.message}>
          <Text style={{ fontFamily: 'Inter_600SemiBold' }}>{notificationActor(item)}</Text>{' '}
          {notificationMessage(item)}
        </AppText>
        {item.commentSnippet ? (
          <AppText tone="muted" numberOfLines={1} style={styles.snippet}>
            “{item.commentSnippet}”
          </AppText>
        ) : null}
        <AppText tone="muted" style={styles.time}>
          {relativeTime(item.createdAt)}
        </AppText>
      </View>
      {item.thumbnailUrl ? (
        <Image
          source={{ uri: item.thumbnailUrl }}
          contentFit="cover"
          accessibilityLabel="Video thumbnail"
          style={[styles.thumbnail, { backgroundColor: colors.muted }]}
        />
      ) : null}
    </Pressable>
  );
}

export default function InboxScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const { prompt } = useSignInPrompt();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const enabled = status === 'authenticated';
  const query = useNotifications(filter, enabled);
  const unread = useUnreadNotificationCount(enabled);
  const markRead = useMarkNotificationsRead();
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const unavailable = query.error instanceof ApiClientError && query.error.status === 404;

  if (status === 'loading') {
    return (
      <View style={[styles.container, styles.loading, { backgroundColor: colors.background }]}>
        <Skeleton height={24} width="45%" />
        <Skeleton height={76} rounded={radius.lg} />
        <Skeleton height={76} rounded={radius.lg} />
      </View>
    );
  }

  if (!enabled) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      >
        <EmptyState
          icon="notifications-outline"
          title="Your activity, all in one place"
          body="Sign in to see likes, comments, follows, and mentions."
          actionLabel="Sign in"
          onAction={() => prompt()}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + space.md,
          paddingBottom: insets.bottom + layout.tabBarHeight,
        },
      ]}
    >
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                <AppText variant="display">Notifications</AppText>
                <AppText tone="muted">
                  {unread.data ? `${unread.data.count} unread` : 'Your recent activity'}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
                disabled={!unread.data?.count || markRead.isPending}
                onPress={() => markRead.mutate({ all: true })}
                style={({ pressed }) => [
                  styles.markAll,
                  {
                    borderColor: colors.border,
                    opacity: !unread.data?.count || markRead.isPending ? 0.45 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="checkmark-done-outline" size={18} color={colors.brand} />
              </Pressable>
            </View>
            <View style={styles.filterRow}>
              {filters.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={filter === option.value}
                  onPress={() => setFilter(option.value)}
                />
              ))}
            </View>
            <Message
              value={
                markRead.isError
                  ? errorMessage(markRead.error, 'Could not update notification status.')
                  : ''
              }
              tone="error"
            />
            {query.isError ? (
              <ErrorState
                message={
                  unavailable
                    ? 'Notifications are not available on this API deployment yet.'
                    : errorMessage(query.error, 'Notifications could not be loaded.')
                }
                onRetry={() => void query.refetch()}
              />
            ) : null}
            {query.isPending ? (
              <View style={styles.loading}>
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} height={76} rounded={radius.lg} />
                ))}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <NotificationCard
            item={item}
            onPress={() => {
              if (!item.readAt) markRead.mutate({ ids: [item.id] });
              router.push(item.href as Href);
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        ListEmptyComponent={
          !query.isPending && !query.isError ? (
            <EmptyState
              icon="notifications-outline"
              title="No activity yet"
              body="Likes, comments, follows, and mentions will show up here."
              actionLabel="Explore videos"
              onAction={() => router.replace('/explore')}
            />
          ) : undefined
        }
        ListFooterComponent={
          query.hasNextPage ? (
            <View style={styles.footer}>
              <Button
                label={query.isFetchingNextPage ? 'Loading…' : 'Load older notifications'}
                variant="secondary"
                disabled={query.isFetchingNextPage}
                onPress={() => void query.fetchNextPage()}
              />
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { gap: space.md, paddingHorizontal: space.lg, paddingTop: space.lg },
  listContent: { paddingHorizontal: space.lg, paddingBottom: space.xl, flexGrow: 1 },
  header: { gap: space.lg, paddingBottom: space.lg },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  titleCopy: { flex: 1, gap: space.xs },
  markAll: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 76,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: space.md,
  },
  avatarWrap: { position: 'relative' },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  notificationCopy: { flex: 1, minWidth: 0, gap: 2 },
  thumbnail: { width: 44, height: 56, borderRadius: radius.sm },
  message: { fontSize: 13, lineHeight: 18 },
  snippet: { fontSize: 12, lineHeight: 16 },
  time: { fontSize: 11 },
  footer: { paddingTop: space.lg },
});
