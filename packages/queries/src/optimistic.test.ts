import { QueryClient } from '@tanstack/react-query';
import type { FeedItem } from '@reel/shared';
import { describe, expect, it } from 'vitest';
import { queryKeys } from './keys.js';
import { applyVideoLike, restoreSocialCaches, snapshotSocialCaches } from './optimistic.js';

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

describe('optimistic video likes', () => {
  it('updates every cached feed and rolls back to the snapshot', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.feed('for-you'), {
      pages: [{ items: [item], nextCursor: null }],
      pageParams: [null],
    });
    queryClient.setQueryData(queryKeys.feed('following'), {
      pages: [{ items: [item], nextCursor: null }],
      pageParams: [null],
    });

    const snapshot = snapshotSocialCaches(queryClient);
    applyVideoLike(queryClient, item.video.id, true);

    for (const kind of ['for-you', 'following'] as const) {
      const data = queryClient.getQueryData<{
        pages: Array<{ items: FeedItem[] }>;
      }>(queryKeys.feed(kind));
      expect(data?.pages[0]?.items[0]?.viewerState.liked).toBe(true);
      expect(data?.pages[0]?.items[0]?.counts.likes).toBe(4);
    }

    restoreSocialCaches(queryClient, snapshot);
    const restored = queryClient.getQueryData<{
      pages: Array<{ items: FeedItem[] }>;
    }>(queryKeys.feed('for-you'));
    expect(restored?.pages[0]?.items[0]?.viewerState.liked).toBe(false);
    expect(restored?.pages[0]?.items[0]?.counts.likes).toBe(3);
  });
});
