import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ApiClient, FeedItem } from '@reel/shared';
import { ReelQueriesProvider, queryKeys } from '@reel/queries';
import { ThemeProvider } from '@/theme/theme-provider';
import { ActionRail } from './action-rail';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ user: null, status: 'unauthenticated' }),
}));

jest.mock('@/theme/preferences-provider', () => ({
  usePreferences: () => ({ muted: true, toggleMuted: jest.fn() }),
}));

jest.mock('@/lib/haptics', () => ({
  useHaptics: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  }),
}));

jest.mock('@/lib/share', () => ({
  shareVideoLink: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@reel/queries', () => {
  const actual = jest.requireActual('@reel/queries');
  return {
    ...actual,
    useFollow: () => ({ mutate: jest.fn() }),
    useSaveVideo: () => ({ mutate: jest.fn() }),
    useShareVideo: () => ({ mutate: jest.fn() }),
  };
});

const item: FeedItem = {
  video: {
    id: '00000000-0000-4000-8000-000000000001',
    caption: 'hello',
    hashtags: [],
    durationSeconds: 5,
    width: 720,
    height: 1280,
    createdAt: '2026-01-01T00:00:00.000Z',
    hlsUrl: 'http://localhost:9000/reel-videos/videos/x/hls/master.m3u8',
    thumbnailUrl: 'http://localhost:9000/reel-videos/videos/x/thumb.jpg',
  },
  author: {
    id: '00000000-0000-4000-8000-000000000002',
    username: 'seeduser1',
    displayName: 'Seed User',
    avatarUrl: null,
  },
  counts: { likes: 3, comments: 1, saves: 0, shares: 0, views: 4 },
  viewerState: { liked: false, saved: false, followingAuthor: false },
};

function RailHarness() {
  const { data } = useQuery({
    queryKey: queryKeys.feed('for-you'),
    queryFn: () =>
      Promise.resolve({ pages: [{ items: [item], nextCursor: null }], pageParams: [null] }),
    initialData: { pages: [{ items: [item], nextCursor: null }], pageParams: [null] },
    staleTime: Infinity,
  });
  const current = data.pages[0]?.items[0] ?? item;
  return <ActionRail item={current} onComments={jest.fn()} />;
}

describe('action rail likes', () => {
  it('optimistically increments the like and rolls back when the API fails', async () => {
    let rejectLike: (error: Error) => void = () => undefined;
    const api = {
      likeVideo: jest.fn(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectLike = reject;
          }),
      ),
      unlikeVideo: jest.fn(() => Promise.resolve()),
    } as unknown as ApiClient;

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });

    await render(
      <QueryClientProvider client={queryClient}>
        <ReelQueriesProvider api={api}>
          <ThemeProvider>
            <RailHarness />
          </ThemeProvider>
        </ReelQueriesProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('3')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('feed-like'));

    await waitFor(() => expect(screen.getByText('4')).toBeTruthy());
    const cached = queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>(
      queryKeys.feed('for-you'),
    );
    expect(cached?.pages[0]?.items[0]?.viewerState.liked).toBe(true);

    rejectLike(new Error('network down'));

    await waitFor(() => expect(screen.getByText('3')).toBeTruthy());
    const rolledBack = queryClient.getQueryData<{ pages: Array<{ items: FeedItem[] }> }>(
      queryKeys.feed('for-you'),
    );
    expect(rolledBack?.pages[0]?.items[0]?.viewerState.liked).toBe(false);
    expect(api.likeVideo).toHaveBeenCalledWith(item.video.id);
  });
});
