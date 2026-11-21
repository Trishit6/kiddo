import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_CAPTION_LENGTH, type VideoContentType, type VideoVisibility } from '@reel/shared';
import {
  useCompleteVideoUpload,
  useCreateVideoUpload,
  useDeleteVideo,
  useVideoStatus,
} from '@reel/queries';
import { radius, space, type as typeScale } from '@reel/tokens';
import { AppText, Button, Chip, Message } from '@/components/ui';
import { uploadVideoFile } from '@/lib/video-upload';
import { errorMessage } from '@/lib/errors';
import { useTheme } from '@/theme/theme-provider';

type Phase = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed';

const VISIBILITY: { value: VideoVisibility; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' },
];

export default function UploadFormScreen() {
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
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('public');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [backgrounded, setBackgrounded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const createUpload = useCreateVideoUpload();
  const completeUpload = useCompleteVideoUpload();
  const deleteVideo = useDeleteVideo();
  const status = useVideoStatus(videoId ?? '', phase === 'processing');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setBackgrounded(state !== 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!status.data) return;
    if (status.data.status === 'ready') {
      setProgress(100);
      setPhase('ready');
    } else if (status.data.status === 'failed') {
      setError(status.data.failure?.message ?? 'Processing failed.');
      setPhase('failed');
    } else {
      setProgress(status.data.progress);
    }
  }, [status.data]);

  const uri = params.uri;
  const contentType = (params.contentType ?? 'video/mp4') as VideoContentType;
  const sizeBytes = Number(params.sizeBytes ?? 0);
  const durationSeconds = Number(params.durationSeconds ?? 0);

  const start = async () => {
    if (!uri) return;
    if (videoId) {
      deleteVideo.mutate(videoId);
      setVideoId(null);
    }
    setError('');
    setPhase('uploading');
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const created = await createUpload.mutateAsync({
        filename: params.filename ?? 'video.mp4',
        contentType,
        sizeBytes,
        caption: caption.trim() || undefined,
        visibility,
      });
      setVideoId(created.videoId);
      await uploadVideoFile(
        created.upload,
        { uri, name: params.filename ?? 'video.mp4', mimeType: contentType },
        { onProgress: setProgress, signal: controller.signal },
      );
      await completeUpload.mutateAsync(created.videoId);
      setPhase('processing');
      setProgress(1);
    } catch (cause) {
      if (controller.signal.aborted) {
        setPhase('idle');
        setProgress(0);
        return;
      }
      setError(errorMessage(cause, 'Upload failed. Check your connection and try again.'));
      setPhase('failed');
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    if (videoId) deleteVideo.mutate(videoId);
    setVideoId(null);
    setPhase('idle');
    setProgress(0);
  };

  if (!uri) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Upload' }} />
        <AppText variant="heading">That video is gone</AppText>
        <AppText tone="muted">Pick another clip from your library.</AppText>
        <Button label="Choose a video" onPress={() => router.replace('/upload')} />
      </View>
    );
  }

  const busy = phase === 'uploading' || phase === 'processing';

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'New video' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {phase === 'ready' ? (
          <View style={styles.center}>
            <Ionicons name="checkmark-circle" size={48} color={colors.mint} />
            <AppText variant="title">Posted!</AppText>
            <AppText tone="muted" style={styles.centerText}>
              Your video is live. Share it with the world.
            </AppText>
            {videoId ? (
              <Button
                label="Watch it now"
                onPress={() => router.replace({ pathname: '/video/[id]', params: { id: videoId } })}
              />
            ) : null}
            <Button
              label="Back to profile"
              variant="secondary"
              onPress={() => router.replace('/profile')}
            />
            <Button
              label="Upload another"
              variant="ghost"
              onPress={() => router.replace('/upload')}
            />
          </View>
        ) : phase === 'processing' ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brand} />
            <AppText variant="title">Making it stream-ready</AppText>
            <AppText tone="muted" style={styles.centerText}>
              We are converting your clip to adaptive HLS. This usually takes under a minute.
            </AppText>
            <View style={[styles.track, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.max(4, progress)}%` as `${number}%`,
                    backgroundColor: colors.brand,
                  },
                ]}
              />
            </View>
            <AppText variant="caption" tone="muted">
              {Math.max(1, progress)}%
            </AppText>
            {backgrounded ? (
              <Message
                value="Keep Kiddo open while processing. You can safely retry if it stalls."
                tone="error"
              />
            ) : null}
          </View>
        ) : (
          <>
            <View
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="videocam-outline" size={20} color={colors.brand} />
                <AppText variant="heading" style={styles.flex}>
                  {params.filename ?? 'Your video'}
                </AppText>
              </View>
              <AppText variant="caption" tone="muted">
                {durationSeconds.toFixed(0)}s · {(sizeBytes / (1024 * 1024)).toFixed(1)} MB
              </AppText>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                multiline
                editable={!busy}
                maxLength={MAX_CAPTION_LENGTH}
                placeholder="Write a caption… #hashtags"
                placeholderTextColor={colors.mutedForeground}
                accessibilityLabel="Caption"
                style={[
                  styles.caption,
                  {
                    color: colors.foreground,
                    borderColor: colors.input,
                    backgroundColor: colors.background,
                  },
                ]}
              />
              <View style={styles.counterRow}>
                <AppText variant="caption" tone="muted">
                  Hashtags become links automatically
                </AppText>
                <AppText
                  variant="caption"
                  tone={caption.length > MAX_CAPTION_LENGTH - 100 ? 'danger' : 'muted'}
                >
                  {caption.length}/{MAX_CAPTION_LENGTH}
                </AppText>
              </View>
              <AppText variant="caption" tone="muted">
                Who can watch?
              </AppText>
              <View style={styles.chips}>
                {VISIBILITY.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={visibility === option.value}
                    onPress={() => setVisibility(option.value)}
                  />
                ))}
              </View>
            </View>

            {phase === 'uploading' ? (
              <View style={styles.progressBlock}>
                <View style={styles.counterRow}>
                  <AppText weight="semibold">Uploading</AppText>
                  <AppText tone="brand" weight="semibold">
                    {progress}%
                  </AppText>
                </View>
                <View style={[styles.track, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${progress}%` as `${number}%`, backgroundColor: colors.brand },
                    ]}
                  />
                </View>
                <Button label="Cancel upload" variant="ghost" onPress={cancel} />
              </View>
            ) : null}

            {busy && backgrounded ? (
              <Message
                value="The app went to the background. Uploads may pause — keep Kiddo open, or retry when you return."
                tone="error"
              />
            ) : null}

            {error ? <Message value={error} tone="error" /> : null}

            {phase !== 'uploading' ? (
              <Button
                label={phase === 'failed' ? 'Retry upload' : 'Post video'}
                onPress={() => void start()}
                loading={createUpload.isPending || completeUpload.isPending}
              />
            ) : null}
            <Button
              label="Back to preview"
              variant="ghost"
              onPress={() => router.back()}
              disabled={busy}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.lg },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  caption: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: typeScale.body.fontSize,
    textAlignVertical: 'top',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  progressBlock: { gap: space.sm },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%' },
  center: { alignItems: 'center', gap: space.md, paddingVertical: space.xxxl },
  centerText: { textAlign: 'center' },
  missing: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.md,
    padding: space.xl,
  },
});
