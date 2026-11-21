import Ionicons from '@expo/vector-icons/Ionicons';
import { useEvent } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface VideoPlayerProps {
  source: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
  contentType?: 'auto' | 'hls';
}

export function VideoPlayer({
  source,
  poster,
  autoPlay = true,
  loop = true,
  style,
  contentType = 'hls',
}: VideoPlayerProps) {
  const player = useVideoPlayer({ uri: source, contentType }, (instance) => {
    instance.loop = loop;
    instance.muted = true;
    instance.timeUpdateEventInterval = 1;
  });
  const status = useEvent(player, 'statusChange', { status: player.status });
  const muted = useEvent(player, 'mutedChange', { muted: player.muted });

  useFocusEffect(
    useCallback(() => {
      if (autoPlay) player.play();
      return () => player.pause();
    }, [autoPlay, player]),
  );

  const ready = status.status === 'readyToPlay';

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls
      />
      {poster && !ready ? (
        <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="contain" />
      ) : null}
      {status.status === 'loading' || status.status === 'idle' ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color="#ffffff" size="large" />
        </View>
      ) : null}
      {status.status === 'error' ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>
            {status.error?.message ?? 'This video could not be played'}
          </Text>
        </View>
      ) : null}
      <TouchableOpacity
        style={styles.mute}
        onPress={() => {
          player.muted = !player.muted;
        }}
        accessibilityRole="button"
        accessibilityLabel={muted.muted ? 'Unmute video' : 'Mute video'}
      >
        <Ionicons name={muted.muted ? 'volume-mute' : 'volume-high'} size={18} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#000000' },
  center: {
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
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  errorText: { color: '#ffffff', textAlign: 'center' },
  mute: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 18,
    padding: 8,
  },
});
