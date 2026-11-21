import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useProfileVideos } from '@reel/queries';
import { radius, space } from '@reel/tokens';
import { AppText, Skeleton } from '@/components/ui';
import { formatCount } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';

export function MoreFromSheet({
  username,
  excludeId,
  visible,
  onClose,
}: {
  username: string;
  excludeId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const ref = useRef<BottomSheetModal>(null);
  const videos = useProfileVideos(username);
  const items = (videos.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (item) => item.video.id !== excludeId,
  );

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const backdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['58%']}
      enablePanDownToClose
      backdropComponent={backdrop}
      onDismiss={onClose}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <View style={styles.header}>
        <AppText variant="heading">More from @{username}</AppText>
      </View>
      {videos.isPending ? (
        <View style={styles.skeletonRow}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} width={120} height={190} rounded={radius.md} />
          ))}
        </View>
      ) : (
        <BottomSheetFlatList
          data={items}
          horizontal
          keyExtractor={(item) => item.video.id}
          contentContainerStyle={styles.list}
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText variant="caption" tone="muted">
                No other videos yet.
              </AppText>
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open video by ${item.author.displayName}`}
              onPress={() => {
                onClose();
                router.push({
                  pathname: '/pager',
                  params: { source: 'profile', username, index: String(index) },
                });
              }}
              style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Image
                source={{ uri: item.video.thumbnailUrl }}
                style={styles.thumb}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={120}
              />
              <View style={styles.captionRow}>
                <Text numberOfLines={2} style={[styles.caption, { color: colors.foreground }]}>
                  {item.video.caption || 'Untitled'}
                </Text>
                <Text style={[styles.views, { color: colors.mutedForeground }]}>
                  {formatCount(item.counts.views)} views
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.md },
  list: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.xxxl },
  skeletonRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg },
  card: { width: 132, gap: space.xs },
  thumb: { width: 132, height: 190, borderRadius: radius.md, backgroundColor: '#000' },
  captionRow: { gap: 2 },
  caption: { fontSize: 12, fontWeight: '600' },
  views: { fontSize: 11 },
  empty: { padding: space.lg },
});
