import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, type ApiClient, type FeedItem, type FeedResponse } from '@reel/shared';
import { ReelQueriesProvider, queryKeys } from '@reel/queries';
import { ActionRail } from '@/components/feed/action-rail';

const auth = vi.hoisted(() => ({
  user: { id: 'viewer-1', username: 'viewer', displayName: 'Viewer', avatarUrl: null },
}));

vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ user: auth.user, status: 'authenticated' }),
}));

const item: FeedItem = {
  video: {
    id: '11111111-1111-4111-8111-111111111111',
    caption: 'A test clip',
    hashtags: [],
    durationSeconds: 10,
    width: 720,
    height: 1280,
    createdAt: new Date().toISOString(),
    hlsUrl: 'http://localhost:9000/videos/master.m3u8',
    thumbnailUrl: 'http://localhost:9000/videos/thumb.jpg',
  },
  author: {
    id: '22222222-2222-4222-8222-222222222222',
    username: 'creator',
    displayName: 'Creator',
    avatarUrl: null,
  },
  counts: { likes: 1, comments: 0, saves: 0, shares: 0, views: 0 },
  viewerState: { liked: false, saved: false, followingAuthor: false },
};

function cacheLikes(queryClient: QueryClient): number | undefined {
  const data = queryClient.getQueryData<InfiniteData<FeedResponse, string | null>>(
    queryKeys.feed('for-you'),
  );
  return data?.pages[0]?.items[0]?.counts.likes;
}

function cacheSaveState(queryClient: QueryClient): boolean | undefined {
  const data = queryClient.getQueryData<InfiniteData<FeedResponse, string | null>>(
    queryKeys.feed('for-you'),
  );
  return data?.pages[0]?.items[0]?.viewerState.saved;
}

function cacheFollowState(queryClient: QueryClient): boolean | undefined {
  const data = queryClient.getQueryData<InfiniteData<FeedResponse, string | null>>(
    queryKeys.feed('for-you'),
  );
  return data?.pages[0]?.items[0]?.viewerState.followingAuthor;
}

describe('action rail like', () => {
  let queryClient: QueryClient;
  let rejectLike: (error: Error) => void;
  let api: ApiClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.feed('for-you'), {
      pages: [{ items: [item], nextCursor: null }],
      pageParams: [null],
    });
    rejectLike = () => undefined;
    api = {
      likeVideo: vi.fn(
        () =>
          new Promise((_resolve, reject) => {
            rejectLike = reject;
          }),
      ),
      unlikeVideo: vi.fn(),
      saveVideo: vi.fn(),
      unsaveVideo: vi.fn(),
      followUser: vi.fn(),
      unfollowUser: vi.fn(),
      shareVideo: vi.fn(),
    } as unknown as ApiClient;
  });

  function renderRail() {
    return render(
      <QueryClientProvider client={queryClient}>
        <ReelQueriesProvider api={api}>
          <MemoryRouter>
            <ActionRail item={item} onOpenComments={() => undefined} />
          </MemoryRouter>
        </ReelQueriesProvider>
      </QueryClientProvider>,
    );
  }

  it('applies the like optimistically and rolls back when the request fails', async () => {
    const user = userEvent.setup();
    renderRail();

    expect(cacheLikes(queryClient)).toBe(1);
    await user.click(screen.getByRole('button', { name: /^Like, 1$/ }));

    await waitFor(() => expect(cacheLikes(queryClient)).toBe(2));

    rejectLike(new ApiClientError(500, 'INTERNAL_ERROR', 'Boom', null, null));
    await waitFor(() => expect(cacheLikes(queryClient)).toBe(1));
  });

  it('removes an existing like optimistically', async () => {
    const alreadyLiked: FeedItem = {
      ...item,
      counts: { ...item.counts, likes: 5 },
      viewerState: { ...item.viewerState, liked: true },
    };
    queryClient.setQueryData(queryKeys.feed('for-you'), {
      pages: [{ items: [alreadyLiked], nextCursor: null }],
      pageParams: [null],
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ReelQueriesProvider api={api}>
          <MemoryRouter>
            <ActionRail item={alreadyLiked} onOpenComments={() => undefined} />
          </MemoryRouter>
        </ReelQueriesProvider>
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^Like, 5$/ }));
    await waitFor(() => expect(cacheLikes(queryClient)).toBe(4));
  });

  it('saves the video optimistically', async () => {
    const user = userEvent.setup();
    renderRail();

    await user.click(screen.getByRole('button', { name: /^Save, 0$/ }));
    await waitFor(() => expect(cacheSaveState(queryClient)).toBe(true));
  });

  it('follows the creator optimistically', async () => {
    const user = userEvent.setup();
    renderRail();

    await user.click(screen.getByRole('button', { name: 'Follow Creator' }));
    await waitFor(() => expect(cacheFollowState(queryClient)).toBe(true));
  });
});
