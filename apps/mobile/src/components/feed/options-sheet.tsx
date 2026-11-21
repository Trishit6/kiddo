import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { FeedItem, FeedResponse } from '@reel/shared';
import { queryKeys, useSaveVideo } from '@reel/queries';
import { fontFamily, radius, space } from '@reel/tokens';
import { useTheme } from '@/theme/theme-provider';
import { videoShareUrl } from '@/lib/share';

function Row({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }]}
    >
      <Ionicons
        name={icon}
        size={21}
        color={destructive ? colors.destructive : colors.foreground}
      />
      <Text
        style={[
          styles.label,
          {
            color: destructive ? colors.destructive : colors.foreground,
            fontFamily: fontFamily.sans,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function OptionsSheet({ item, onClose }: { item: FeedItem | null; onClose: () => void }) {
  const { colors } = useTheme();
  const ref = useRef<BottomSheetModal>(null);
  const save = useSaveVideo();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (item) ref.current?.present();
    else ref.current?.dismiss();
  }, [item]);

  const backdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
  );

  const copyLink = async () => {
    if (!item) return;
    await Clipboard.setStringAsync(videoShareUrl(item.video.id));
    onClose();
    Alert.alert('Link copied', 'Share it anywhere.');
  };

  const notInterested = () => {
    if (!item) return;
    onClose();
    queryClient.setQueryData<InfiniteData<FeedResponse, string | null>>(
      queryKeys.feed('for-you'),
      (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            items: page.items.filter((entry) => entry.video.id !== item.video.id),
          })),
        };
      },
    );
    Alert.alert('Noted', 'We will show you less like this (wiring arrives in Phase 7).');
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['40%']}
      enablePanDownToClose
      backdropComponent={backdrop}
      onDismiss={onClose}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.content}>
        <Row
          icon={item?.viewerState.saved ? 'bookmark' : 'bookmark-outline'}
          label={item?.viewerState.saved ? 'Remove from saved' : 'Save video'}
          onPress={() => {
            if (!item) return;
            save.mutate({ videoId: item.video.id, saved: !item.viewerState.saved });
            onClose();
          }}
        />
        <Row icon="link-outline" label="Copy link" onPress={() => void copyLink()} />
        <Row
          icon="flag-outline"
          label="Report"
          onPress={() => {
            onClose();
            Alert.alert('Report', 'Reporting arrives in Phase 7.');
          }}
        />
        <Row icon="eye-off-outline" label="Not interested" onPress={notInterested} destructive />
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.md, paddingBottom: space.xxl, gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
  },
  label: { fontSize: 15, fontWeight: '500' },
});
