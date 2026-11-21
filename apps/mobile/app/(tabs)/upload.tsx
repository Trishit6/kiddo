import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_MAX_VIDEO_MB, MAX_VIDEO_DURATION_SECONDS } from '@reel/shared';
import { layout, radius, space } from '@reel/tokens';
import { AppText, Button, Message } from '@/components/ui';
import { fromPickerAsset } from '@/lib/selected-video';
import { useTheme } from '@/theme/theme-provider';

export default function UploadTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo library access to choose a video, or change it in Settings.');
      return;
    }
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const selection = await fromPickerAsset(asset);
      if ('error' in selection) {
        setError(selection.error);
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + space.xl,
          paddingBottom: insets.bottom + layout.tabBarHeight + space.xl,
        },
      ]}
    >
      <AppText variant="display">Create</AppText>
      <AppText tone="muted">
        Record something new or share a clip from your library. Vertical videos look best.
      </AppText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Record a video"
        onPress={() => router.push('/camera')}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: colors.brand, opacity: pressed ? 0.88 : 1 },
        ]}
      >
        <View style={[styles.primaryIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Ionicons name="videocam" size={30} color={colors.brandForeground} />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading" style={{ color: colors.brandForeground }}>
            Record a video
          </AppText>
          <AppText variant="caption" style={{ color: colors.brandForeground, opacity: 0.85 }}>
            Up to {MAX_VIDEO_DURATION_SECONDS}s · timer · flip · flash
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.brandForeground} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose from library"
        onPress={() => void pick()}
        disabled={busy}
        style={({ pressed }) => [
          styles.secondary,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed || busy ? 0.75 : 1,
          },
        ]}
      >
        <View style={[styles.secondaryIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name="images-outline" size={26} color={colors.brand} />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading">Choose from library</AppText>
          <AppText variant="caption" tone="muted">
            MP4, MOV or WebM · up to {DEFAULT_MAX_VIDEO_MB} MB
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
      </Pressable>

      {error ? <Message value={error} tone="error" /> : null}
      {error && error.includes('Settings') ? (
        <Button
          label="Open settings"
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}

      <View style={[styles.tips, { borderColor: colors.border }]}>
        <AppText variant="caption" weight="semibold">
          Tips for a great clip
        </AppText>
        {[
          'Shoot vertical (9:16) in good light.',
          'Keep it under 60 seconds for the For You feed.',
          'Add a caption with a couple of #hashtags so people find it.',
        ].map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <Ionicons name="sparkles-outline" size={14} color={colors.brand} />
            <AppText variant="caption" tone="muted" style={styles.flex}>
              {tip}
            </AppText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, gap: space.md },
  flex: { flex: 1, gap: 2 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    minHeight: 88,
  },
  primaryIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 80,
  },
  secondaryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tips: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.md,
    gap: space.sm,
    marginTop: space.sm,
  },
  tipRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
});
