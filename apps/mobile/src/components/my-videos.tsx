import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Video } from '@reel/shared';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

const STATUS_LABEL: Record<Video['status'], string> = {
  uploading: 'Uploading',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
};

const STATUS_COLOR: Record<Video['status'], string> = {
  uploading: '#64748b',
  processing: '#b45309',
  ready: '#15803d',
  failed: '#b91c1c',
};

export function MyVideos() {
  const router = useRouter();
  const query = useInfiniteQuery({
    queryKey: ['my-videos'],
    queryFn: ({ pageParam, signal }) => api.listMyVideos({ cursor: pageParam, limit: 12 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const videos = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={styles.section}>
      <Text style={styles.title}>My videos</Text>

      {query.isPending ? (
        <View style={styles.inline}>
          <ActivityIndicator color="#6366f1" />
          <Text style={styles.muted}>Loading your videos…</Text>
        </View>
      ) : null}

      {query.isError ? (
        <Text style={styles.error}>{errorMessage(query.error, 'Could not load videos')}</Text>
      ) : null}

      {!query.isPending && videos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>No videos yet. Upload your first one.</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {videos.map((video) => {
          const disabled = video.status !== 'ready';
          return (
            <TouchableOpacity
              key={video.id}
              style={styles.card}
              disabled={disabled}
              onPress={() => router.push(`/video/${video.id}`)}
              accessibilityRole="button"
              accessibilityLabel={disabled ? STATUS_LABEL[video.status] : 'Watch video'}
            >
              <View style={styles.poster}>
                {video.playback ? (
                  <Image
                    source={{ uri: video.playback.thumbnailUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.posterPlaceholder}>
                    {video.status === 'failed' ? (
                      <Text style={styles.posterText}>{video.failure?.message ?? 'Failed'}</Text>
                    ) : (
                      <ActivityIndicator color="#71717a" />
                    )}
                  </View>
                )}
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[video.status] }]}>
                  <Text style={styles.badgeText}>{STATUS_LABEL[video.status]}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.caption} numberOfLines={2}>
                  {video.caption || 'No caption'}
                </Text>
                <Text style={styles.visibility}>{video.visibility}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {query.hasNextPage ? (
        <TouchableOpacity
          style={styles.loadMore}
          disabled={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? (
            <ActivityIndicator color="#18181b" />
          ) : (
            <Text style={styles.loadMoreLabel}>Load more</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#18181b' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muted: { fontSize: 14, color: '#71717a' },
  error: { fontSize: 14, color: '#b91c1c' },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d4d4d8',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  poster: { aspectRatio: 9 / 16, backgroundColor: '#f4f4f5' },
  posterPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
  posterText: { fontSize: 11, color: '#71717a', textAlign: 'center' },
  badge: { position: 'absolute', left: 6, top: 6, borderRadius: 999, paddingHorizontal: 8 },
  badgeText: { color: '#ffffff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  cardBody: { padding: 8, gap: 2 },
  caption: { fontSize: 12, color: '#18181b', minHeight: 32 },
  visibility: { fontSize: 10, color: '#a1a1aa', textTransform: 'uppercase' },
  loadMore: {
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreLabel: { fontSize: 15, fontWeight: '600', color: '#18181b' },
});
