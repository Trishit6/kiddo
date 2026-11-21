import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useSearchHashtags,
  useSearchSuggestions,
  useSearchUsers,
  useSearchVideos,
} from '@reel/queries';
import { ApiClientError } from '@reel/shared';
import type { FeedItem } from '@reel/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, radius, space, type } from '@reel/tokens';
import { useAuth } from '@/components/auth-provider';
import { useSignInPrompt } from '@/components/auth-gate';
import { VideoGrid, type GridVideo } from '@/components/video-grid';
import { AppText, Avatar, Button, Chip, EmptyState, Message, Skeleton } from '@/components/ui';
import { useTheme } from '@/theme/theme-provider';

type SearchTab = 'all' | 'videos' | 'creators' | 'hashtags';
const RECENT_SEARCHES_KEY = 'kiddo-recent-searches';

const filters: Array<{ value: SearchTab; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'videos', label: 'Videos' },
  { value: 'creators', label: 'Creators' },
  { value: 'hashtags', label: 'Hashtags' },
];

function toGrid(items: FeedItem[]): GridVideo[] {
  return items.map((item) => ({
    id: item.video.id,
    thumbnailUrl: item.video.thumbnailUrl,
    views: item.counts.views,
    status: 'ready',
  }));
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const { prompt } = useSignInPrompt();
  const [query, setQuery] = useState(typeof params.q === 'string' ? params.q : '');
  const [submitted, setSubmitted] = useState(typeof params.q === 'string' ? params.q.trim() : '');
  const [debounced, setDebounced] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [tab, setTab] = useState<SearchTab>('all');

  useEffect(() => {
    if (typeof params.q !== 'string') return;
    setQuery(params.q);
    setSubmitted(params.q.trim());
  }, [params.q]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((value) => {
        if (!active || !value) return;
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) {
          setRecent(
            parsed.filter((entry): entry is string => typeof entry === 'string').slice(0, 6),
          );
        }
      })
      .catch(() => {
        if (active) setHistoryError('Recent searches could not be loaded from this device.');
      });
    return () => {
      active = false;
    };
  }, []);

  const authenticated = status === 'authenticated';
  const suggestions = useSearchSuggestions(
    debounced,
    authenticated && debounced.length >= 2 && debounced.toLowerCase() !== submitted.toLowerCase(),
  );
  const searching = authenticated && submitted.length >= 2;
  const showVideos = searching && (tab === 'all' || tab === 'videos');
  const showCreators = searching && (tab === 'all' || tab === 'creators');
  const showHashtags = searching && (tab === 'all' || tab === 'hashtags');
  const videos = useSearchVideos(submitted, showVideos);
  const creators = useSearchUsers(submitted, showCreators);
  const hashtags = useSearchHashtags(submitted, showHashtags);

  const updateRecent = (value: string) => {
    const next = [value, ...recent.filter((entry) => entry !== value)].slice(0, 6);
    setRecent(next);
    setHistoryError('');
    void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {
      setHistoryError('Recent searches could not be saved on this device.');
    });
  };

  const runSearch = (value: string) => {
    const next = value.trim();
    if (next.length < 2) return;
    if (!authenticated) {
      prompt(() => runSearch(next));
      return;
    }
    setQuery(next);
    setSubmitted(next);
    setTab('all');
    router.setParams({ q: next });
    updateRecent(next);
  };

  const clearRecent = () => {
    setRecent([]);
    setHistoryError('');
    void AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {
      setHistoryError('Recent searches could not be cleared.');
    });
  };

  const resultItems = videos.data?.pages.flatMap((page) => page.items) ?? [];
  const searchUnavailable = (error: unknown) =>
    error instanceof ApiClientError && error.status === 404
      ? 'Search is not available on this API deployment yet.'
      : 'Search is temporarily unavailable.';
  const emptyResults =
    (tab === 'videos' && videos.data && resultItems.length === 0) ||
    (tab === 'creators' && creators.data?.pages.every((page) => page.items.length === 0)) ||
    (tab === 'hashtags' && hashtags.data?.pages.every((page) => page.items.length === 0));

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <AppText tone="brand" variant="label" weight="semibold">
            DISCOVER
          </AppText>
          <AppText variant="display">Search Kiddo</AppText>
          <AppText tone="muted">Find creators, videos, and hashtags.</AppText>
        </View>

        <View
          style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="search" size={19} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => runSearch(query)}
            returnKeyType="search"
            placeholder="Creator, video, or hashtag"
            placeholderTextColor={colors.mutedForeground}
            accessibilityLabel="Search creators, videos, and hashtags"
            autoCapitalize="none"
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
              onPress={() => {
                setQuery('');
                setSubmitted('');
                router.setParams({ q: '' });
              }}
            >
              <Ionicons name="close-circle" size={19} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        <Button
          label="Search"
          icon="search"
          disabled={query.trim().length < 2}
          onPress={() => runSearch(query)}
        />
        <Message value={historyError} tone="error" />

        {suggestions.data && !submitted ? (
          <View style={styles.suggestions}>
            {suggestions.data.users.length > 0 ? (
              <View style={styles.suggestionGroup}>
                <AppText variant="label" tone="muted" weight="semibold">
                  CREATORS
                </AppText>
                {suggestions.data.users.slice(0, 4).map((creator) => (
                  <Pressable
                    key={creator.id}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: '/user/[username]',
                        params: { username: creator.username },
                      })
                    }
                    style={styles.creatorRow}
                  >
                    <Avatar uri={creator.avatarUrl} name={creator.displayName} size={38} />
                    <View style={styles.flex}>
                      <AppText weight="semibold" numberOfLines={1}>
                        {creator.displayName}
                      </AppText>
                      <AppText tone="muted" numberOfLines={1}>
                        @{creator.username}
                      </AppText>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {suggestions.data.hashtags.length > 0 ? (
              <View style={styles.suggestionGroup}>
                <AppText variant="label" tone="muted" weight="semibold">
                  HASHTAGS
                </AppText>
                <View style={styles.chipRow}>
                  {suggestions.data.hashtags.slice(0, 6).map((item) => (
                    <Chip
                      key={item.tag}
                      label={`#${item.tag}`}
                      onPress={() =>
                        router.push({ pathname: '/tag/[tag]', params: { tag: item.tag } })
                      }
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {!submitted ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <AppText variant="heading" weight="semibold">
                Recent searches
              </AppText>
              {recent.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear recent searches"
                  onPress={clearRecent}
                  style={styles.clearButton}
                >
                  <AppText tone="muted">Clear</AppText>
                </Pressable>
              ) : null}
            </View>
            {recent.length ? (
              <View style={styles.chipRow}>
                {recent.map((item) => (
                  <Chip key={item} label={item} onPress={() => runSearch(item)} />
                ))}
              </View>
            ) : (
              <AppText tone="muted">Your searches will appear here on this device.</AppText>
            )}
          </View>
        ) : (
          <View style={styles.results}>
            <AppText variant="heading" weight="semibold" numberOfLines={2}>
              Results for “{submitted}”
            </AppText>
            <View style={styles.chipRow}>
              {filters.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={tab === option.value}
                  onPress={() => setTab(option.value)}
                />
              ))}
            </View>

            {!authenticated ? (
              <EmptyState
                icon="lock-closed-outline"
                title="Sign in to search"
                body="Search results are available after you sign in."
                actionLabel="Sign in"
                onAction={() => prompt(() => runSearch(submitted))}
              />
            ) : null}

            {showVideos ? (
              <View style={styles.resultGroup}>
                <AppText variant="heading" weight="semibold">
                  Videos
                </AppText>
                {videos.isPending ? (
                  <View style={styles.gridSkeleton}>
                    {[0, 1, 2, 3, 4, 5].map((item) => (
                      <Skeleton key={item} width="31%" height={150} rounded={radius.md} />
                    ))}
                  </View>
                ) : null}
                {videos.isError ? (
                  <View style={styles.errorRow}>
                    <Message value={searchUnavailable(videos.error)} tone="error" />
                    <Button
                      label="Retry"
                      variant="secondary"
                      fullWidth={false}
                      onPress={() => void videos.refetch()}
                    />
                  </View>
                ) : null}
                {videos.data ? (
                  <VideoGrid
                    videos={toGrid(resultItems)}
                    onPress={(index) => {
                      const item = resultItems[index];
                      if (item)
                        router.push({ pathname: '/video/[id]', params: { id: item.video.id } });
                    }}
                    emptyTitle="No videos found"
                    emptyBody="Try a different search."
                  />
                ) : null}
              </View>
            ) : null}

            {showCreators ? (
              <View style={styles.resultGroup}>
                <AppText variant="heading" weight="semibold">
                  Creators
                </AppText>
                {creators.isPending ? (
                  <View style={styles.loadingList}>
                    <Skeleton height={58} rounded={radius.md} />
                    <Skeleton height={58} rounded={radius.md} />
                  </View>
                ) : null}
                {creators.isError ? (
                  <View style={styles.errorRow}>
                    <Message value={searchUnavailable(creators.error)} tone="error" />
                    <Button
                      label="Retry"
                      variant="secondary"
                      fullWidth={false}
                      onPress={() => void creators.refetch()}
                    />
                  </View>
                ) : null}
                {creators.data?.pages
                  .flatMap((page) => page.items)
                  .map((creator) => (
                    <Pressable
                      key={creator.id}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/user/[username]',
                          params: { username: creator.username },
                        })
                      }
                      style={[
                        styles.creatorRow,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <Avatar uri={creator.avatarUrl} name={creator.displayName} size={42} />
                      <View style={styles.flex}>
                        <AppText weight="semibold" numberOfLines={1}>
                          {creator.displayName}
                        </AppText>
                        <AppText tone="muted" numberOfLines={1}>
                          @{creator.username}
                        </AppText>
                      </View>
                      <AppText tone="muted">{creator.followersCount.toLocaleString()}</AppText>
                    </Pressable>
                  ))}
              </View>
            ) : null}

            {showHashtags ? (
              <View style={styles.resultGroup}>
                <AppText variant="heading" weight="semibold">
                  Hashtags
                </AppText>
                {hashtags.isPending ? (
                  <View style={styles.chipRow}>
                    {[0, 1, 2].map((item) => (
                      <Skeleton key={item} width={90} height={34} rounded={radius.pill} />
                    ))}
                  </View>
                ) : null}
                {hashtags.isError ? (
                  <View style={styles.errorRow}>
                    <Message value={searchUnavailable(hashtags.error)} tone="error" />
                    <Button
                      label="Retry"
                      variant="secondary"
                      fullWidth={false}
                      onPress={() => void hashtags.refetch()}
                    />
                  </View>
                ) : null}
                <View style={styles.chipRow}>
                  {hashtags.data?.pages
                    .flatMap((page) => page.items)
                    .map((item) => (
                      <Chip
                        key={item.tag}
                        label={`#${item.tag} · ${item.videosCount}`}
                        onPress={() =>
                          router.push({ pathname: '/tag/[tag]', params: { tag: item.tag } })
                        }
                      />
                    ))}
                </View>
                {emptyResults && !videos.isError && !creators.isError && !hashtags.isError ? (
                  <AppText tone="muted">No results found. Try another search.</AppText>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  heading: { gap: space.xs },
  searchBox: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: space.sm, fontSize: type.body.fontSize },
  suggestions: { gap: space.lg },
  suggestionGroup: { gap: space.sm },
  creatorRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  recentSection: { gap: space.md },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearButton: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  results: { gap: space.lg },
  resultGroup: { gap: space.md },
  gridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  loadingList: { gap: space.sm },
  errorRow: { gap: space.sm },
});
