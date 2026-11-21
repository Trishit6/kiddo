import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { MAX_VIDEO_DURATION_SECONDS } from '@reel/shared';
import { layout, radius, space } from '@reel/tokens';
import { AppText, Button } from '@/components/ui';
import { fromRecording } from '@/lib/selected-video';
import { useTheme } from '@/theme/theme-provider';

const RING_SIZE = 72;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function CameraScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => {
      const seconds = (Date.now() - startedAt.current) / 1000;
      elapsedRef.current = seconds;
      setElapsed(seconds);
      if (seconds >= MAX_VIDEO_DURATION_SECONDS) cameraRef.current?.stopRecording();
    }, 100);
    return () => clearInterval(interval);
  }, [recording]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && recording) {
        cameraRef.current?.stopRecording();
        setElapsed(0);
        elapsedRef.current = 0;
        Alert.alert('Recording stopped', 'Recording pauses when the app leaves the foreground.');
      }
    });
    return () => subscription.remove();
  }, [recording]);

  const startRecording = async () => {
    if (!cameraRef.current || recording) return;
    if (timerEnabled) {
      for (const value of [3, 2, 1]) {
        setCountdown(value);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setCountdown(null);
    }
    startedAt.current = Date.now();
    elapsedRef.current = 0;
    setElapsed(0);
    setRecording(true);
    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: MAX_VIDEO_DURATION_SECONDS,
      });
      const duration = Math.max(
        0.5,
        startedAt.current ? (Date.now() - startedAt.current) / 1000 : elapsedRef.current,
      );
      if (!result?.uri) return;
      setBusy(true);
      const selection = await fromRecording(result.uri, duration);
      if ('error' in selection) {
        Alert.alert('Cannot use that clip', selection.error);
        return;
      }
      const { video } = selection;
      router.push({
        pathname: '/preview',
        params: {
          uri: video.uri,
          filename: video.filename,
          contentType: video.contentType,
          sizeBytes: String(video.sizeBytes),
          durationSeconds: String(video.durationSeconds),
        },
      });
    } catch {
      Alert.alert('Recording failed', 'Try again, or check that the camera is not in use.');
    } finally {
      setRecording(false);
      setBusy(false);
      setElapsed(0);
    }
  };

  const toggleRecording = () => {
    if (recording) {
      cameraRef.current?.stopRecording();
      return;
    }
    void startRecording();
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: '#000' }]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.permissionIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name="videocam-outline" size={30} color={colors.brand} />
        </View>
        <AppText variant="title" style={styles.centerText}>
          Camera access
        </AppText>
        <AppText tone="muted" style={styles.centerText}>
          Kiddo uses your camera only while you record a video. Clips stay on your phone until you
          upload them.
        </AppText>
        <Button label="Allow camera" onPress={() => void requestPermission()} />
        <Button
          label="Open settings"
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const progress = Math.min(1, elapsed / MAX_VIDEO_DURATION_SECONDS);
  const remaining = Math.max(0, Math.ceil(MAX_VIDEO_DURATION_SECONDS - elapsed));

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        mode="video"
        videoQuality="720p"
      />
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close camera"
          onPress={() => router.back()}
          style={styles.round}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <View style={[styles.pill, recording ? styles.pillRecording : null]}>
          <View style={styles.dot} />
          <Text style={styles.pillText}>
            {recording ? `0:${String(remaining).padStart(2, '0')}` : 'Camera'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Flash ${flash === 'off' ? 'on' : 'off'}`}
          onPress={() => setFlash((value) => (value === 'off' ? 'on' : 'off'))}
          style={styles.round}
        >
          <Ionicons name={flash === 'off' ? 'flash-off' : 'flash'} size={22} color="#fff" />
        </Pressable>
      </View>

      {countdown !== null ? (
        <View pointerEvents="none" style={styles.countdown}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      ) : null}

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.xl }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={timerEnabled ? 'Disable 3 second timer' : 'Enable 3 second timer'}
          onPress={() => setTimerEnabled((value) => !value)}
          style={[styles.side, timerEnabled ? styles.sideActive : null]}
        >
          <Ionicons name="timer-outline" size={22} color="#fff" />
          <Text style={styles.sideLabel}>{timerEnabled ? '3s' : 'Timer'}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
          accessibilityState={{ busy }}
          onPress={toggleRecording}
          disabled={busy || countdown !== null}
          style={styles.record}
        >
          <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={colors.brand}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={[styles.recordInner, recording ? styles.recordStop : null]} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Flip camera"
          onPress={() => setFacing((value) => (value === 'back' ? 'front' : 'back'))}
          disabled={recording}
          style={[styles.side, recording ? { opacity: 0.4 } : null]}
        >
          <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          <Text style={styles.sideLabel}>Flip</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        {recording ? 'Tap to stop' : `Up to ${MAX_VIDEO_DURATION_SECONDS} seconds · 720p`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
    gap: space.md,
  },
  centerText: { textAlign: 'center' },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  round: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    minHeight: 30,
  },
  pillRecording: { backgroundColor: 'rgba(211,62,37,0.9)' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  pillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  countdown: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: { color: '#fff', fontSize: 96, fontWeight: '800' },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xxl,
  },
  side: {
    alignItems: 'center',
    gap: 2,
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
  },
  sideActive: { backgroundColor: 'rgba(255,255,255,0.16)' },
  sideLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
  record: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInner: {
    width: RING_SIZE - 16,
    height: RING_SIZE - 16,
    borderRadius: (RING_SIZE - 16) / 2,
    backgroundColor: '#fff',
  },
  recordStop: { borderRadius: radius.md, width: RING_SIZE - 22, height: RING_SIZE - 22 },
  hint: {
    position: 'absolute',
    bottom: 132,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
});
