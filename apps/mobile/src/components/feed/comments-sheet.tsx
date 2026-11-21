import {
  BottomSheetBackdrop,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { CommentsPanel } from '@/components/feed/comments-panel';
import { useTheme } from '@/theme/theme-provider';

export function CommentsSheet({
  videoId,
  onClose,
}: {
  videoId: string | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (videoId) ref.current?.present();
    else ref.current?.dismiss();
  }, [videoId]);

  const backdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} />
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['70%', '92%']}
      enablePanDownToClose
      backdropComponent={backdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onDismiss={onClose}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <View style={styles.content}>
        {videoId ? <CommentsPanel videoId={videoId} variant="sheet" onClose={onClose} /> : null}
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
});
