import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FeedItem as FeedItemData } from '@reel/shared';
import { useLikeVideo, useViewTracker } from '@reel/queries';
import { fontFamily, layout, space } from '@reel/tokens';
import { ActionRail } from '@/components/feed/action-rail';
import { FeedPlayer } from '@/components/feed/feed-player';
import { usePreferences } from '@/theme/preferences-provider';
import { useTheme } from '@/theme/theme-provider';
import { useHaptics } from '@/lib/haptics';

const CAPTION_COLLAPSED_LINES = 2;

function Caption({ caption }: { caption: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const segments = caption.split(/(#[A-Za-z0-9_]+)/g).filter((segment) => segment.length > 0);
  const canExpand = caption.length > 90;

  return (
    <View style={styles.captionWrap}>
      <Text
        style={[styles.caption, { color: colors.onVideo }]}
        numberOfLines={expanded || !canExpand ? undefined : CAPTION_COLLAPSED_LINES}
      >
        {segments.map((segment, index) =>
          segment.startsWith('#') ? (
            <Text
              key={`${segment}-${index}`}
              accessibilityRole="link"
              accessibilityLabel={`Open hashtag ${segment.slice(1)}`}
              onPress={() => router.push(`/tag/${segment.slice(1)}`)}
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {segment}
            </Text>
          ) : (
            segment
          ),
        )}
      </Text>
      {canExpand ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show less caption' : 'Show more caption'}
          onPress={() => setExpanded((value) => !value)}
          hitSlop={8}
        >
          <Text style={[styles.more, { color: colors.onVideoMuted }]}>
            {expanded ? 'less' : 'more'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const HeartBurst = memo(function HeartBurst({
  x,
  y,
  progress,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: x.value - 44 },
      { translateY: y.value - 44 },
      { scale: 0.5 + progress.value * 0.9 },
      { rotate: '-12deg' },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.heart, style]}>
      <Ionicons name="heart" size={88} color="#ff3b5c" />
    </Animated.View>
  );
});

export const FeedItem = memo(function FeedItem({
  item,
  index,
  isActive,
  mountPlayer,
  paused,
  playbackEnabled,
  height,
  onTogglePause,
  onOpenComments,
  onOpenOptions,
}: {
  item: FeedItemData;
  index: number;
  isActive: boolean;
  mountPlayer: boolean;
  paused: boolean;
  playbackEnabled: boolean;
  height: number;
  onTogglePause: () => void;
  onOpenComments: (videoId: string) => void;
  onOpenOptions: (videoId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { muted } = usePreferences();
  const haptics = useHaptics();
  const like = useLikeVideo();
  const router = useRouter();
  const { track } = useViewTracker();
  const reducedMotion = useReducedMotion();
  const [flash, setFlash] = useState<'play' | 'pause' | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playStartedAt = useRef<number | null>(null);
  const watchedMs = useRef(0);

  const shouldPlay = isActive && playbackEnabled && !paused;

  const heartX = useSharedValue(0);
  const heartY = useSharedValue(0);
  const heartProgress = useSharedValue(0);

  useEffect(() => {
    if (!isActive) return;
    return () => {
      if (playStartedAt.current !== null) {
        watchedMs.current += Date.now() - playStartedAt.current;
        playStartedAt.current = null;
      }
      track(item.video.id, watchedMs.current, false);
    };
  }, [isActive, item.video.id, track]);

  useEffect(() => {
    if (isActive && shouldPlay) {
      playStartedAt.current = Date.now();
    } else if (playStartedAt.current !== null) {
      watchedMs.current += Date.now() - playStartedAt.current;
      playStartedAt.current = null;
      const completed = watchedMs.current >= item.video.durationSeconds * 900;
      track(item.video.id, watchedMs.current, completed);
    }
  }, [isActive, item.video.durationSeconds, item.video.id, shouldPlay, track]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const showFlash = useCallback((kind: 'play' | 'pause') => {
    setFlash(kind);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 480);
  }, []);

  const togglePause = useCallback(() => {
    showFlash(paused ? 'play' : 'pause');
    onTogglePause();
  }, [onTogglePause, paused, showFlash]);

  const likeFromDoubleTap = useCallback(() => {
    haptics.medium();
    if (!item.viewerState.liked) {
      like.mutate({ videoId: item.video.id, liked: true });
    }
  }, [haptics, item.video.id, item.viewerState.liked, like]);

  const burst = useCallback(
    (x: number, y: number) => {
      likeFromDoubleTap();
      if (reducedMotion) return;
      heartX.value = x;
      heartY.value = y;
      heartProgress.value = 0;
      heartProgress.value = withSequence(
        withTiming(1, { duration: 140 }),
        withTiming(0, { duration: 340 }),
      );
    },
    [heartProgress, heartX, heartY, likeFromDoubleTap, reducedMotion],
  );

  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(togglePause)();
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(260)
    .onEnd((event) => {
      runOnJS(burst)(event.x, event.y);
    });
  const longPress = Gesture.LongPress()
    .minDuration(420)
    .onStart(() => {
      runOnJS(haptics.medium)();
      runOnJS(onOpenOptions)(item.video.id);
    });
  const gesture = Gesture.Race(Gesture.Exclusive(doubleTap, singleTap), longPress);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: heartProgress.value > 0 ? 0 : 1,
  }));

  return (
    <View style={[styles.item, { height, backgroundColor: '#000' }]} testID={`feed-item-${index}`}>
      {mountPlayer ? (
        <FeedPlayer
          video={item.video}
          shouldPlay={shouldPlay}
          muted={muted}
          active={isActive}
          progressBottom={layout.tabBarHeight + insets.bottom + space.xs}
        />
      ) : null}

      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(0,0,0,0.72)']}
        locations={[0.55, 1]}
        style={styles.scrim}
      />

      <GestureDetector gesture={gesture}>
        <View
          style={[StyleSheet.absoluteFill, { bottom: 26 }]}
          accessibilityLabel="Video. Double tap to like."
        />
      </GestureDetector>

      <ActionRail
        item={item}
        onComments={() => onOpenComments(item.video.id)}
        testID="action-rail"
      />

      <View
        pointerEvents="box-none"
        style={[
          styles.meta,
          { bottom: layout.tabBarHeight + insets.bottom + space.lg, paddingRight: 76 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.author.username}'s profile`}
          onPress={() => router.push(`/user/${item.author.username}`)}
          hitSlop={6}
        >
          <Text style={[styles.author, { color: colors.onVideo }]}>@{item.author.username}</Text>
        </Pressable>
        {item.video.caption ? <Caption caption={item.video.caption} /> : null}
        <View style={styles.soundRow}>
          <Ionicons
            name={muted ? 'volume-mute' : 'musical-notes'}
            size={13}
            color={colors.onVideo}
          />
          <Text style={[styles.sound, { color: colors.onVideo }]} numberOfLines={1}>
            {item.author.displayName} · original sound
          </Text>
        </View>
      </View>

      <HeartBurst x={heartX} y={heartY} progress={heartProgress} />

      {flash ? (
        <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]}>
          <Ionicons name={flash === 'pause' ? 'play' : 'pause'} size={72} color={colors.onVideo} />
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  item: { width: '100%', overflow: 'hidden' },
  scrim: { position: 'absolute', right: 0, bottom: 0, left: 0, top: '45%' },
  meta: { position: 'absolute', left: space.lg, right: space.lg, gap: space.xs },
  author: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 17 },
  captionWrap: { gap: 2 },
  caption: { fontFamily: fontFamily.sans, fontSize: 14, lineHeight: 20 },
  more: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  sound: { fontFamily: fontFamily.sans, fontSize: 12, opacity: 0.9, flexShrink: 1 },
  heart: { position: 'absolute', left: 0, top: 0 },
  flash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
