import Ionicons from '@expo/vector-icons/Ionicons';
import { useEvent } from 'expo';
import { setAudioModeAsync } from 'expo-audio';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { FeedVideo } from '@reel/shared';
import { fontFamily, radius, space } from '@reel/tokens';
import { useTheme } from '@/theme/theme-provider';

const BUFFER_SPINNER_DELAY_MS = 300;

export function FeedPlayer({
  video,
  shouldPlay,
  muted,
  active,
  progressBottom,
}: {
  video: FeedVideo;
  shouldPlay: boolean;
  muted: boolean;
  active: boolean;
  progressBottom: number;
}) {
  const { colors } = useTheme();
  const [showSpinner, setShowSpinner] = useState(false);
  const [failed, setFailed] = useState(false);

  const player = useVideoPlayer(video.hlsUrl, (instance) => {
    instance.loop = true;
    instance.muted = muted;
    instance.audioMixingMode = 'doNotMix';
    instance.timeUpdateEventInterval = 0.25;
    instance.bufferOptions = { preferredForwardBufferDuration: 6, minBufferForPlayback: 1.5 };
  });

  const status = useEvent(player, 'statusChange', { status: player.status });
  const isReady = status.status === 'readyToPlay';
  const isLoading = status.status === 'loading' || status.status === 'idle';

  useEffect(() => {
    player.muted = muted;
    if (!muted) {
      void setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'doNotMix',
      }).catch(() => undefined);
    }
  }, [muted, player]);

  useEffect(() => {
    if (shouldPlay && !failed) player.play();
    else player.pause();
  }, [failed, player, shouldPlay]);

  useEffect(() => {
    if (!shouldPlay || !isLoading) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), BUFFER_SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLoading, shouldPlay]);

  useEffect(() => {
    if (status.status === 'error') setFailed(true);
    if (status.status === 'readyToPlay') setFailed(false);
  }, [status.status]);

  const retry = () => {
    setFailed(false);
    player.replace(video.hlsUrl);
    if (shouldPlay) player.play();
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image
        source={{ uri: video.thumbnailUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={120}
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
      />
      {failed ? null : (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          surfaceType="textureView"
          accessibilityLabel="Video player"
        />
      )}
      {!isReady && !failed ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        </View>
      ) : null}
      {showSpinner ? (
        <View pointerEvents="none" style={styles.spinner}>
          <ActivityIndicator color={colors.onVideo} />
        </View>
      ) : null}
      <FeedProgress player={player} active={active} bottom={progressBottom} />
      {failed ? (
        <View style={styles.error}>
          <Ionicons name="warning-outline" size={28} color={colors.onVideo} />
          <Text style={[styles.errorText, { color: colors.onVideo }]}>
            Could not play this video
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry video"
            onPress={retry}
            style={[styles.retry, { backgroundColor: colors.brand }]}
          >
            <Text style={[styles.retryLabel, { color: colors.brandForeground }]}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function FeedProgress({
  player,
  active,
  bottom,
}: {
  player: VideoPlayer;
  active: boolean;
  bottom: number;
}) {
  const { colors } = useTheme();
  const time = useEvent(player, 'timeUpdate');
  const progress = useSharedValue(0);
  const [width, setWidth] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubFraction, setScrubFraction] = useState(0);

  useEffect(() => {
    if (scrubbing) return;
    const duration = player.duration;
    const currentTime = time?.currentTime ?? 0;
    progress.value = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  }, [player, progress, scrubbing, time?.currentTime]);

  const seekTo = (fraction: number) => {
    const duration = player.duration;
    if (duration > 0) player.currentTime = fraction * duration;
    setScrubbing(false);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      runOnJS(setScrubbing)(true);
    })
    .onUpdate((event) => {
      if (width <= 0) return;
      const fraction = Math.min(1, Math.max(0, event.x / width));
      progress.value = fraction;
      runOnJS(setScrubFraction)(fraction);
    })
    .onEnd(() => {
      runOnJS(seekTo)(progress.value);
    });

  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  if (!active) return null;

  return (
    <View
      style={[styles.progressHit, { bottom }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityLabel={
        scrubbing ? `Seeking ${Math.round(scrubFraction * 100)} percent` : 'Video progress'
      }
    >
      <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
        <Animated.View
          style={[styles.progressFill, { backgroundColor: colors.onVideo, width: '100%' }, fill]}
        />
      </View>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill} />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  errorText: { fontFamily: fontFamily.sans, fontSize: 14 },
  retry: {
    marginTop: space.xs,
    paddingHorizontal: space.lg,
    minHeight: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  progressHit: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    height: 26,
    justifyContent: 'flex-end',
  },
  progressTrack: {
    height: 2.5,
    borderRadius: 2,
    overflow: 'hidden',
    transform: [{ scaleX: 1 }],
  },
  progressFill: {
    height: '100%',
    transformOrigin: 'left',
  },
});
