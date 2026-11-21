import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFollowers, useFollowing } from '@reel/queries';
import { space } from '@reel/tokens';
import { useAuth } from '@/components/auth-provider';
import { FollowButton } from '@/components/follow-button';
import { AppText, Avatar, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useTheme } from '@/theme/theme-provider';

export default function FollowsScreen() {
  const { username = '', type = 'followers' } = useLocalSearchParams<{
    username: string;
    type: string;
  }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const followers = useFollowers(username);
  const following = useFollowing(username);
  const query = type === 'following' ? following : followers;
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const title = type === 'following' ? 'Following' : 'Followers';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title }} />
      {query.isPending ? (
        <View style={styles.skeleton}>
          {Array.from({ length: 6 }, (_, index) => (
            <View key={index} style={styles.row}>
              <Skeleton width={48} height={48} rounded={24} />
              <View style={styles.rowText}>
                <Skeleton width="55%" height={14} />
                <Skeleton width="35%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : query.isError && items.length === 0 ? (
        <ErrorState message={`${title} could not load.`} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={styles.content}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={type === 'following' ? 'Not following anyone' : 'No followers yet'}
              body={
                type === 'following'
                  ? 'Find creators on Explore.'
                  : 'Share your videos to grow your audience.'
              }
              actionLabel={type === 'following' ? 'Explore creators' : undefined}
              onAction={type === 'following' ? () => router.replace('/explore') : undefined}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.user.displayName}'s profile`}
              onPress={() =>
                router.push({
                  pathname: '/user/[username]',
                  params: { username: item.user.username },
                })
              }
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={48} />
              <View style={styles.rowText}>
                <AppText numberOfLines={1} style={styles.name}>
                  {item.user.displayName}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  @{item.user.username}
                </AppText>
              </View>
              {user?.username === item.user.username ? null : (
                <FollowButton
                  username={item.user.username}
                  following={item.viewerState.following}
                  size="compact"
                />
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: space.xxxl },
  skeleton: { padding: space.lg, gap: space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    minHeight: 64,
  },
  rowText: { flex: 1, gap: 2 },
  name: { fontWeight: '600' },
});
