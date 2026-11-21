import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ListViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FeedItem as FeedItemData } from '@reel/shared';
import { layout, space } from '@reel/tokens';
import { CommentsSheet } from '@/components/feed/comments-sheet';
import { FeedItem } from '@/components/feed/feed-item';
import { OptionsSheet } from '@/components/feed/options-sheet';
import { ErrorState, Loading } from '@/components/ui';
import { shouldMountPlayer } from '@/lib/player-window';
import { useTheme } from '@/theme/theme-provider';

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

export function VideoPager({
  items,
  initialIndex = 0,
  loading = false,
  error = false,
  onRetry,
  hasNextPage = false,
  fetchingNextPage = false,
  onEndReached,
}: {
  items: FeedItemData[];
  initialIndex?: number;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  hasNextPage?: boolean;
  fetchingNextPage?: boolean;
  onEndReached?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [paused, setPaused] = useState(false);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [optionsFor, setOptionsFor] = useState<string | null>(null);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 100,
  }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const focused = viewableItems.find((entry) => entry.isViewable);
    if (typeof focused?.index === 'number') {
      setActiveIndex(focused.index);
      setPaused(false);
    }
  }).current;

  useEffect(() => {
    if (hasNextPage && !fetchingNextPage) onEndReached?.();
  }, [activeIndex, fetchingNextPage, hasNextPage, onEndReached]);

  const togglePause = useCallback(() => setPaused((value) => !value), []);
  const openComments = useCallback((videoId: string) => setCommentsFor(videoId), []);
  const openOptions = useCallback((videoId: string) => setOptionsFor(videoId), []);
  const selectedItem = items.find((entry) => entry.video.id === optionsFor) ?? null;

  if (loading && items.length === 0) return <Loading label="Loading video" />;
  if (error && items.length === 0) {
    return (
      <ErrorState message="This video could not load." onRetry={onRetry ?? (() => undefined)} />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.video.id}
        renderItem={({ item, index }) => (
          <FeedItem
            item={item}
            index={index}
            isActive={index === activeIndex}
            mountPlayer={shouldMountPlayer(index, activeIndex)}
            paused={paused}
            playbackEnabled={isFocused && appActive}
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
        initialScrollIndex={initialIndex < items.length ? initialIndex : undefined}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={4}
        removeClippedSubviews
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          fetchingNextPage ? <View style={{ height, backgroundColor: '#000' }} /> : undefined
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))}
        hitSlop={10}
        style={[styles.back, { top: insets.top + space.sm, backgroundColor: 'rgba(0,0,0,0.35)' }]}
      >
        <Ionicons name="chevron-back" size={24} color={colors.onVideo} />
      </Pressable>

      <CommentsSheet videoId={commentsFor} onClose={() => setCommentsFor(null)} />
      <OptionsSheet item={selectedItem} onClose={() => setOptionsFor(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  back: {
    position: 'absolute',
    left: space.md,
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
