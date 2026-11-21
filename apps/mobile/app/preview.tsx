import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '@reel/tokens';
import { AppText, Button, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme/theme-provider';

export default function PreviewScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    uri?: string;
    filename?: string;
    contentType?: string;
    sizeBytes?: string;
    durationSeconds?: string;
  }>();
  const uri = params.uri;
  const player = useVideoPlayer(uri ?? null, (instance) => {
    instance.loop = true;
    instance.muted = false;
    instance.play();
  });

  if (!uri) {
    return <ErrorState message="No video was selected." onRetry={() => router.back()} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <Stack.Screen options={{ title: 'Preview', headerShown: false }} />
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls
        accessibilityLabel="Preview of your video"
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.meta}>
          <AppText variant="heading" style={{ color: colors.onVideo }}>
            Looking good?
          </AppText>
          <AppText variant="caption" style={{ color: colors.onVideoMuted }}>
            {params.durationSeconds ? `${Number(params.durationSeconds).toFixed(0)}s` : ''}
            {params.sizeBytes
              ? ` · ${(Number(params.sizeBytes) / (1024 * 1024)).toFixed(1)} MB`
              : ''}
          </AppText>
        </View>
        <View style={styles.actions}>
          <Button label="Retake" variant="ghost" onPress={() => router.back()} fullWidth={false} />
          <Button
            label="Next"
            onPress={() =>
              router.push({
                pathname: '/upload-form',
                params: {
                  uri,
                  filename: params.filename ?? 'video.mp4',
                  contentType: params.contentType ?? 'video/mp4',
                  sizeBytes: params.sizeBytes ?? '0',
                  durationSeconds: params.durationSeconds ?? '0',
                },
              })
            }
            fullWidth={false}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: space.lg,
    gap: space.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  meta: { gap: 2 },
  actions: { flexDirection: 'row', gap: space.md, justifyContent: 'flex-end' },
});
