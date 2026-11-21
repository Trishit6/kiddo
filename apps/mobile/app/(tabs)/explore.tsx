import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrending } from '@reel/queries';
import type { FeedItem } from '@reel/shared';
import { fontFamily, layout, radius, space, type } from '@reel/tokens';
import { VideoGrid, type GridVideo } from '@/components/video-grid';
import { AppText, ErrorState, Skeleton } from '@/components/ui';
import { useTheme } from '@/theme/theme-provider';

function toGrid(items: FeedItem[]): GridVideo[] {
  return items.map((item) => ({
    id: item.video.id,
    thumbnailUrl: item.video.thumbnailUrl,
    views: item.counts.views,
    status: 'ready',
  }));
}

export default function ExploreTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const trending = useTrending();
  const [search, setSearch] = useState('');

  const submitSearch = () => {
    const value = search.trim();
    if (value.length < 2) return;
    if (value.startsWith('#')) {
      const tag = value.replace(/^#+/, '');
      if (tag) router.push({ pathname: '/tag/[tag]', params: { tag } });
      return;
    }
    router.push({ pathname: '/search', params: { q: value } });
  };

  if (trending.isPending) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top + space.md },
        ]}
      >
        <View style={styles.pad}>
          <Skeleton width="55%" height={28} />
          <Skeleton width="100%" height={44} rounded={radius.md} />
        </View>
        <View style={styles.chips}>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} width={90} height={30} rounded={radius.pill} />
          ))}
        </View>
        <View style={styles.gridSkeleton}>
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} width="32%" height={150} rounded={4} />
          ))}
        </View>
      </View>
    );
  }

  if (trending.isError || !trending.data) {
    return <ErrorState message="Explore could not load." onRetry={() => void trending.refetch()} />;
  }

  return (
    <VideoGrid
      videos={toGrid(trending.data.videos)}
      onPress={(index) => {
        const video = trending.data.videos[index];
        if (video) router.push({ pathname: '/video/[id]', params: { id: video.video.id } });
      }}
      emptyTitle="Nothing trending yet"
      emptyBody="Check back after a few videos have been watched."
      header={
        <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
          <AppText variant="display">Explore</AppText>
          <View
            style={[styles.search, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Ionicons name="search" size={19} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={submitSearch}
              returnKeyType="search"
              placeholder="Creators, videos, or #hashtags"
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="Search hashtags"
              style={[
                styles.searchInput,
                { color: colors.foreground, fontFamily: fontFamily.sans },
              ]}
              testID="explore-search"
            />
            {search.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}
                onPress={() => setSearch('')}
              >
                <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.chipRow}>
            <FlatList
              data={trending.data.hashtags}
              horizontal
              keyExtractor={(item) => item.tag}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Hashtag ${item.tag}, ${item.videosCount} videos`}
                  onPress={() => router.push({ pathname: '/tag/[tag]', params: { tag: item.tag } })}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.chipTag, { color: colors.foreground }]}>#{item.tag}</Text>
                  <Text style={[styles.chipCount, { color: colors.mutedForeground }]}>
                    {item.videosCount}
                  </Text>
                </Pressable>
              )}
            />
          </View>

          <AppText variant="heading" style={styles.sectionTitle}>
            Trending now
          </AppText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pad: { paddingHorizontal: space.lg, gap: space.md },
  header: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: layout.minTouchTarget,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
  },
  searchInput: { flex: 1, fontSize: type.body.fontSize, paddingVertical: space.sm },
  chipRow: { marginHorizontal: -space.lg },
  chips: { gap: space.sm, paddingHorizontal: space.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 34,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipTag: { fontSize: 13, fontWeight: '600' },
  chipCount: { fontSize: 11 },
  sectionTitle: { marginTop: space.xs },
  gridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    padding: space.xs,
  },
});
