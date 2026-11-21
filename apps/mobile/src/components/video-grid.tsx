import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { ReactElement } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { VideoStatus } from '@reel/shared';
import { space } from '@reel/tokens';
import { AppText, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { formatCount } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';

export interface GridVideo {
  id: string;
  thumbnailUrl: string | null;
  views: number;
  status: VideoStatus;
  failureMessage?: string | null;
}

export function VideoGrid({
  videos,
  onPress,
  onEndReached,
  loading,
  refreshing = false,
  onRefresh,
  error,
  onRetry,
  emptyTitle,
  emptyBody,
  emptyActionLabel,
  onEmptyAction,
  isOwner = false,
  header,
}: {
  videos: GridVideo[];
  onPress: (index: number) => void;
  onEndReached?: () => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  error?: boolean;
  onRetry?: () => void;
  emptyTitle: string;
  emptyBody?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  isOwner?: boolean;
  header?: ReactElement;
}) {
  const { colors } = useTheme();

  if (loading && videos.length === 0) {
    return (
      <View style={styles.skeletonGrid}>
        {Array.from({ length: 9 }, (_, index) => (
          <Skeleton key={index} width="32%" height={160} rounded={4} style={styles.skeletonCell} />
        ))}
      </View>
    );
  }

  if (error && videos.length === 0) {
    return <ErrorState message="Videos could not load." onRetry={onRetry ?? (() => undefined)} />;
  }

  return (
    <FlatList
      data={videos}
      keyExtractor={(item) => item.id}
      numColumns={3}
      ListHeaderComponent={header}
      contentContainerStyle={styles.content}
      columnWrapperStyle={styles.row}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        ) : undefined
      }
      ListEmptyComponent={
        <EmptyState
          icon="videocam-outline"
          title={emptyTitle}
          body={emptyBody}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      }
      ListFooterComponent={
        loading && videos.length > 0 ? (
          <View style={styles.footer}>
            <Skeleton width={60} height={12} />
          </View>
        ) : undefined
      }
      renderItem={({ item, index }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open video${item.status !== 'ready' ? `, ${item.status}` : ''}, ${formatCount(item.views)} views`}
          style={({ pressed }) => [
            styles.cell,
            { backgroundColor: colors.placeholder, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => onPress(index)}
          testID={`grid-video-${index}`}
        >
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={100}
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
          ) : null}
          <View style={styles.views}>
            <Ionicons name="play" size={11} color="#fff" />
            <Text style={styles.viewsLabel}>{formatCount(item.views)}</Text>
          </View>
          {isOwner && item.status !== 'ready' ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    item.status === 'failed' ? colors.destructive : 'rgba(0,0,0,0.65)',
                },
              ]}
            >
              <AppText variant="caption" style={styles.badgeLabel}>
                {item.status === 'failed'
                  ? 'Failed'
                  : item.status === 'processing'
                    ? 'Processing'
                    : 'Uploading'}
              </AppText>
            </View>
          ) : null}
          {isOwner && item.status === 'failed' && item.failureMessage ? (
            <View style={styles.failure}>
              <AppText variant="caption" numberOfLines={2} style={styles.badgeLabel}>
                {item.failureMessage}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxxl },
  row: { gap: 2, marginBottom: 2 },
  cell: { flex: 1, aspectRatio: 9 / 14, overflow: 'hidden' },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    padding: space.xs,
  },
  skeletonCell: { aspectRatio: 9 / 14 },
  views: {
    position: 'absolute',
    left: space.xs,
    bottom: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewsLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 3,
  },
  badge: {
    position: 'absolute',
    top: space.xs,
    left: space.xs,
    borderRadius: 999,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
  badgeLabel: { color: '#fff', fontSize: 10 },
  failure: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 3,
  },
  footer: { paddingVertical: space.lg, alignItems: 'center' },
});
