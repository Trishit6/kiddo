import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FeedItem as FeedItemData, FeedKind } from '@reel/shared';
import { useInfiniteFeed } from '@reel/queries';
import { layout, space } from '@reel/tokens';
import { useAuth } from '@/components/auth-provider';
import { useSignInPrompt } from '@/components/auth-gate';
import { CommentsSheet } from '@/components/feed/comments-sheet';
import { FeedItem } from '@/components/feed/feed-item';
import { OptionsSheet } from '@/components/feed/options-sheet';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { shouldMountPlayer } from '@/lib/player-window';
import { useTheme } from '@/theme/theme-provider';

const savedPositions: Record<FeedKind, number> = { 'for-you': 0, following: 0 };

function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  return active;
}

function FeedSkeleton({ height }: { height: number }) {
  return (
    <View style={[styles.skeleton, { height }]}>
      <View style={styles.skeletonRail}>
        <Skeleton width={46} height={46} rounded={23} />
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} width={30} height={30} rounded={15} />
        ))}
      </View>
      <View style={styles.skeletonMeta}>
        <Skeleton width="45%" height={14} />
        <Skeleton width="70%" height={12} />
      </View>
    </View>
  );
}

export function FeedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { status } = useAuth();
  const { prompt } = useSignInPrompt();
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const [kind, setKind] = useState<FeedKind>('for-you');
  const [activeIndex, setActiveIndex] = useState(savedPositions['for-you']);
  const [paused, setPaused] = useState(false);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [optionsFor, setOptionsFor] = useState<string | null>(null);
  const listRef = useRef<FlatList<FeedItemData>>(null);

  const feed = useInfiniteFeed(kind, kind === 'for-you' || status === 'authenticated');
  const items = useMemo(() => feed.data?.pages.flatMap((page) => page.items) ?? [], [feed.data]);

  const playbackEnabled = appActive && isFocused;

  useEffect(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage && activeIndex >= items.length - 3) {
      void feed.fetchNextPage();
    }
  }, [activeIndex, feed, items.length]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 120,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const focused = viewableItems.find((entry) => entry.isViewable);
    if (typeof focused?.index === 'number') {
      setActiveIndex(focused.index);
      setPaused(false);
      savedPositions[kind] = focused.index;
    }
  }).current;

  const togglePause = useCallback(() => setPaused((value) => !value), []);
  const openComments = useCallback((videoId: string) => setCommentsFor(videoId), []);
  const openOptions = useCallback((videoId: string) => setOptionsFor(videoId), []);
  const openExplore = useCallback(() => router.replace('/explore'), [router]);

  const selectedItem = items.find((entry) => entry.video.id === optionsFor) ?? null;

  const switchKind = (next: FeedKind) => {
    if (next === 'following' && status !== 'authenticated') {
      prompt(() => setKind('following'));
      return;
    }
    if (next === kind) return;
    savedPositions[kind] = activeIndex;
    setKind(next);
    setActiveIndex(savedPositions[next]);
    setPaused(false);
  };

  const empty = !feed.isPending && !feed.isError && items.length === 0;
  const listKey = `${kind}-${Math.round(height)}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {feed.isPending ? (
        <>
          <FeedSkeleton height={height} />
          <FeedSkeleton height={height} />
        </>
      ) : null}

      {feed.isError && items.length === 0 ? (
        <ErrorState message="The feed did not load." onRetry={() => void feed.refetch()} />
      ) : null}

      {empty ? (
        kind === 'following' ? (
          <EmptyState
            icon="people-outline"
            title={status === 'authenticated' ? 'Follow your people' : 'Sign in to see your feed'}
            body={
              status === 'authenticated'
                ? 'Videos from creators you follow will show up here.'
                : 'Follow creators and their newest videos land here.'
            }
            actionLabel={status === 'authenticated' ? 'Explore videos' : 'Sign in'}
            onAction={() => (status === 'authenticated' ? openExplore() : prompt())}
          />
        ) : (
          <EmptyState
            icon="sparkles-outline"
            title="No videos yet"
            body="Pull to refresh or be the first to upload."
            actionLabel="Upload a video"
            onAction={() => router.push('/upload')}
          />
        )
      ) : null}

      {items.length > 0 ? (
        <FlatList
          key={listKey}
          ref={listRef}
          data={items}
          keyExtractor={(item) => item.video.id}
          renderItem={({ item, index }) => (
            <FeedItem
              item={item}
              index={index}
              isActive={index === activeIndex}
              mountPlayer={shouldMountPlayer(index, activeIndex)}
              paused={paused}
              playbackEnabled={playbackEnabled}
              height={height}
              onTogglePause={togglePause}
              onOpenComments={openComments}
              onOpenOptions={openOptions}
            />
          )}
          pagingEnabled
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          initialScrollIndex={
            savedPositions[kind] > 0 && savedPositions[kind] < items.length
              ? savedPositions[kind]
              : undefined
          }
          initialNumToRender={Math.min(3 + savedPositions[kind], 8)}
          maxToRenderPerBatch={3}
          windowSize={4}
          removeClippedSubviews
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
          }}
          ListFooterComponent={
            feed.isFetchingNextPage ? (
              <View style={{ height }} accessibilityLabel="Loading more videos">
                <FeedSkeleton height={height} />
              </View>
            ) : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={feed.isRefetching && !feed.isFetchingNextPage}
              onRefresh={() => {
                savedPositions[kind] = 0;
                setActiveIndex(0);
                void feed.refetch();
              }}
              tintColor={colors.onVideo}
            />
          }
        />
      ) : null}

      <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.topTabs}>
          {(['for-you', 'following'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: kind === value }}
              accessibilityLabel={value === 'for-you' ? 'For You' : 'Following'}
              onPress={() => switchKind(value)}
              style={styles.topTab}
              testID={`feed-tab-${value}`}
            >
              <Text
                style={[
                  styles.topTabLabel,
                  {
                    color: kind === value ? '#ffffff' : 'rgba(255,255,255,0.65)',
                    fontFamily: kind === value ? 'Inter_700Bold' : 'Inter_500Medium',
                  },
                ]}
              >
                {value === 'for-you' ? 'For You' : 'Following'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search Kiddo"
          onPress={() => router.push('/search')}
          hitSlop={8}
          style={styles.search}
        >
          <Ionicons name="search" size={22} color="#ffffff" />
        </Pressable>
      </View>

      <CommentsSheet videoId={commentsFor} onClose={() => setCommentsFor(null)} />
      <OptionsSheet item={selectedItem} onClose={() => setOptionsFor(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: space.sm,
    paddingHorizontal: space.lg,
  },
  topTabs: { flexDirection: 'row', gap: space.xl },
  topTab: { minHeight: 44, justifyContent: 'center' },
  topTabLabel: { fontSize: 16, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 6 },
  search: {
    position: 'absolute',
    right: space.lg,
    top: 0,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: { backgroundColor: '#0d0b12', justifyContent: 'flex-end' },
  skeletonRail: {
    position: 'absolute',
    right: space.md,
    bottom: 140,
    gap: space.md,
    alignItems: 'center',
  },
  skeletonMeta: { padding: space.lg, gap: space.sm, paddingBottom: layout.tabBarHeight + space.xl },
});
