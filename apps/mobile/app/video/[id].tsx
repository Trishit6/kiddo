import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFeedItem } from '@reel/queries';
import { layout, radius, space } from '@reel/tokens';
import { useAuth } from '@/components/auth-provider';
import { useSignInPrompt } from '@/components/auth-gate';
import { CommentsSheet } from '@/components/feed/comments-sheet';
import { FeedItem } from '@/components/feed/feed-item';
import { MoreFromSheet } from '@/components/more-from-sheet';
import { OptionsSheet } from '@/components/feed/options-sheet';
import { ErrorState, Loading } from '@/components/ui';
import { useTheme } from '@/theme/theme-provider';

function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  return active;
}

export default function VideoScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { status } = useAuth();
  const { prompt } = useSignInPrompt();
  const appActive = useAppActive();
  const query = useFeedItem(id);
  const [paused, setPaused] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const togglePause = useCallback(() => setPaused((value) => !value), []);

  if (query.isPending) return <Loading label="Loading video" />;

  if (query.isError || !query.data) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Video' }} />
        <ErrorState
          message="This video is private, removed, or no longer available."
          onRetry={() => void query.refetch()}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to feed"
          onPress={() => router.replace('/feed')}
          style={styles.backLink}
        >
          <Text style={{ color: colors.brand, fontWeight: '700' }}>Back to feed</Text>
        </Pressable>
      </View>
    );
  }

  const item = query.data.item;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack.Screen options={{ title: 'Video', headerShown: false }} />
      <FeedItem
        item={item}
        index={0}
        isActive
        mountPlayer
        paused={paused}
        playbackEnabled={appActive}
        height={height}
        onTogglePause={togglePause}
        onOpenComments={() => setCommentsOpen(true)}
        onOpenOptions={() => setOptionsOpen(true)}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))}
        hitSlop={10}
        style={[styles.back, { top: insets.top + space.sm }]}
      >
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`More from ${item.author.displayName}`}
        onPress={() => setMoreOpen(true)}
        style={[styles.more, { top: insets.top + space.sm }]}
      >
        <Ionicons name="albums-outline" size={16} color="#fff" />
        <Text style={styles.moreLabel}>More from @{item.author.username}</Text>
      </Pressable>

      {status !== 'authenticated' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          onPress={() => prompt()}
          style={styles.signIn}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Sign in</Text>
        </Pressable>
      ) : null}

      <CommentsSheet
        videoId={commentsOpen ? item.video.id : null}
        onClose={() => setCommentsOpen(false)}
      />
      <OptionsSheet item={optionsOpen ? item : null} onClose={() => setOptionsOpen(false)} />
      <MoreFromSheet
        username={item.author.username}
        excludeId={item.video.id}
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, justifyContent: 'center' },
  backLink: { alignSelf: 'center', padding: space.md },
  back: {
    position: 'absolute',
    left: space.md,
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: {
    position: 'absolute',
    right: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  moreLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  signIn: {
    position: 'absolute',
    bottom: space.xxxl,
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
