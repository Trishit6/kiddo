import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHashtagVideos, useTrending } from '@reel/queries';
import type { FeedItem } from '@reel/shared';
import { layout, radius, space } from '@reel/tokens';
import { VideoGrid, type GridVideo } from '@/components/video-grid';
import { AppText, ErrorState, Skeleton } from '@/components/ui';
import { formatCount } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';

function toGrid(items: FeedItem[]): GridVideo[] {
  return items.map((item) => ({
    id: item.video.id,
    thumbnailUrl: item.video.thumbnailUrl,
    views: item.counts.views,
    status: 'ready',
  }));
}

export default function TagScreen() {
  const { tag = '' } = useLocalSearchParams<{ tag: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const videos = useHashtagVideos(tag);
  const trending = useTrending();
  const items = videos.data?.pages.flatMap((page) => page.items) ?? [];
  const knownCount = trending.data?.hashtags.find((entry) => entry.tag === tag)?.videosCount;
  const count = knownCount ?? items.length;

  if (videos.isPending) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: `#${tag}` }} />
        <View style={styles.skeleton}>
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} width="32%" height={150} rounded={4} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `#${tag}` }} />
      {videos.isError ? (
        <ErrorState message={`#${tag} could not load.`} onRetry={() => void videos.refetch()} />
      ) : (
        <VideoGrid
          videos={toGrid(items)}
          onPress={(index) =>
            router.push({
              pathname: '/pager',
              params: { source: 'hashtag', tag, index: String(index) },
            })
          }
          loading={videos.isFetchingNextPage}
          refreshing={videos.isRefetching && !videos.isFetchingNextPage}
          onRefresh={() => void videos.refetch()}
          onEndReached={() => {
            if (videos.hasNextPage && !videos.isFetchingNextPage) void videos.fetchNextPage();
          }}
          emptyTitle={`No videos for #${tag}`}
          emptyBody="Try another hashtag from Explore."
          header={
            <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
              <View style={styles.titleRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  hitSlop={8}
                  onPress={() => (router.canGoBack() ? router.back() : router.replace('/explore'))}
                  style={styles.back}
                >
                  <Ionicons name="chevron-back" size={24} color={colors.foreground} />
                </Pressable>
                <View>
                  <AppText variant="title">#{tag}</AppText>
                  <AppText variant="caption" tone="muted">
                    {formatCount(count)} videos
                  </AppText>
                </View>
              </View>
            </View>
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingBottom: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, padding: space.xs },
});
