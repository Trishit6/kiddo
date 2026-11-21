import { useLocalSearchParams } from 'expo-router';
import { VideoPager } from '@/components/video-pager';
import { useHashtagVideos, useLikedVideos, useProfileVideos, useSavedVideos } from '@reel/queries';
import { ErrorState } from '@/components/ui';

type Source = 'profile' | 'liked' | 'saved' | 'hashtag';

export default function PagerRoute() {
  const params = useLocalSearchParams<{
    source?: string;
    username?: string;
    tag?: string;
    index?: string;
  }>();
  const source = (params.source as Source | undefined) ?? 'profile';
  const initialIndex = Math.max(0, Number(params.index ?? 0));

  if (source === 'hashtag')
    return <HashtagPager tag={params.tag ?? ''} initialIndex={initialIndex} />;
  if (source === 'liked') return <LikedPager initialIndex={initialIndex} />;
  if (source === 'saved') return <SavedPager initialIndex={initialIndex} />;
  return <ProfilePager username={params.username ?? ''} initialIndex={initialIndex} />;
}

function ProfilePager({ username, initialIndex }: { username: string; initialIndex: number }) {
  const query = useProfileVideos(username);
  if (!username) return <ErrorState message="Creator not found." onRetry={() => undefined} />;
  return (
    <VideoPager
      items={query.data?.pages.flatMap((page) => page.items) ?? []}
      initialIndex={initialIndex}
      loading={query.isPending}
      error={query.isError}
      onRetry={() => void query.refetch()}
      hasNextPage={query.hasNextPage}
      fetchingNextPage={query.isFetchingNextPage}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
    />
  );
}

function LikedPager({ initialIndex }: { initialIndex: number }) {
  const query = useLikedVideos();
  return (
    <VideoPager
      items={query.data?.pages.flatMap((page) => page.items) ?? []}
      initialIndex={initialIndex}
      loading={query.isPending}
      error={query.isError}
      onRetry={() => void query.refetch()}
      hasNextPage={query.hasNextPage}
      fetchingNextPage={query.isFetchingNextPage}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
    />
  );
}

function SavedPager({ initialIndex }: { initialIndex: number }) {
  const query = useSavedVideos();
  return (
    <VideoPager
      items={query.data?.pages.flatMap((page) => page.items) ?? []}
      initialIndex={initialIndex}
      loading={query.isPending}
      error={query.isError}
      onRetry={() => void query.refetch()}
      hasNextPage={query.hasNextPage}
      fetchingNextPage={query.isFetchingNextPage}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
    />
  );
}

function HashtagPager({ tag, initialIndex }: { tag: string; initialIndex: number }) {
  const query = useHashtagVideos(tag);
  return (
    <VideoPager
      items={query.data?.pages.flatMap((page) => page.items) ?? []}
      initialIndex={initialIndex}
      loading={query.isPending}
      error={query.isError}
      onRetry={() => void query.refetch()}
      hasNextPage={query.hasNextPage}
      fetchingNextPage={query.isFetchingNextPage}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
    />
  );
}
