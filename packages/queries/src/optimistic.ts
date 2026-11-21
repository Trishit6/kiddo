import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';
import type { Comment, CommentListResponse, FeedItem, FeedResponse } from '@reel/shared';
import { queryKeys } from './keys.js';

export type SocialPage = FeedResponse | CommentListResponse;
export type SocialInfiniteData = InfiniteData<SocialPage, string | null>;

export type CacheSnapshot = Array<[QueryKey, unknown]>;

export function snapshotSocialCaches(queryClient: QueryClient): CacheSnapshot {
  return queryClient.getQueriesData({ queryKey: queryKeys.all });
}

export function restoreSocialCaches(queryClient: QueryClient, snapshot: CacheSnapshot): void {
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFeedItem(value: unknown): value is FeedItem {
  return (
    isRecord(value) &&
    isRecord(value.video) &&
    isRecord(value.author) &&
    isRecord(value.counts) &&
    isRecord(value.viewerState)
  );
}

function isComment(value: unknown): value is Comment {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.videoId === 'string' &&
    isRecord(value.viewerState)
  );
}

function isInfiniteData(value: unknown): value is SocialInfiniteData {
  return (
    isRecord(value) &&
    Array.isArray(value.pages) &&
    value.pages.every((page) => isRecord(page) && Array.isArray(page.items) && 'nextCursor' in page)
  );
}

function patchInfiniteItems(
  data: unknown,
  predicate: (item: unknown) => boolean,
  updater: (item: unknown) => unknown,
): unknown {
  if (!isInfiniteData(data)) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (predicate(item) ? updater(item) : item)),
    })),
  };
}

function patchFeedCaches(queryClient: QueryClient, update: (item: FeedItem) => FeedItem): void {
  queryClient.setQueriesData<unknown>(
    {
      queryKey: queryKeys.all,
      predicate: (query) =>
        isInfiniteData(query.state.data) &&
        query.queryKey[1] !== 'comments' &&
        query.queryKey[1] !== 'replies',
    },
    (data: unknown) => patchInfiniteItems(data, isFeedItem, (item) => update(item as FeedItem)),
  );
}

function patchCommentCaches(queryClient: QueryClient, update: (item: Comment) => Comment): void {
  queryClient.setQueriesData<unknown>(
    {
      queryKey: queryKeys.all,
      predicate: (query) =>
        (query.queryKey[1] === 'comments' || query.queryKey[1] === 'replies') &&
        isInfiniteData(query.state.data),
    },
    (data: unknown) => patchInfiniteItems(data, isComment, (item) => update(item as Comment)),
  );
}

export function applyVideoLike(queryClient: QueryClient, videoId: string, liked: boolean): void {
  patchFeedCaches(queryClient, (item) => {
    if (item.video.id !== videoId) return item;
    const wasLiked = item.viewerState.liked;
    const delta = liked === wasLiked ? 0 : liked ? 1 : -1;
    return {
      ...item,
      counts: { ...item.counts, likes: Math.max(0, item.counts.likes + delta) },
      viewerState: { ...item.viewerState, liked },
    };
  });
}

export function applyVideoSave(queryClient: QueryClient, videoId: string, saved: boolean): void {
  patchFeedCaches(queryClient, (item) => {
    if (item.video.id !== videoId) return item;
    const wasSaved = item.viewerState.saved;
    const delta = saved === wasSaved ? 0 : saved ? 1 : -1;
    return {
      ...item,
      counts: { ...item.counts, saves: Math.max(0, item.counts.saves + delta) },
      viewerState: { ...item.viewerState, saved },
    };
  });
}

export function applyVideoShare(queryClient: QueryClient, videoId: string): void {
  patchFeedCaches(queryClient, (item) =>
    item.video.id === videoId
      ? { ...item, counts: { ...item.counts, shares: item.counts.shares + 1 } }
      : item,
  );
}

export function applyFollow(queryClient: QueryClient, username: string, following: boolean): void {
  patchFeedCaches(queryClient, (item) =>
    item.author.username === username
      ? { ...item, viewerState: { ...item.viewerState, followingAuthor: following } }
      : item,
  );
  queryClient.setQueriesData<unknown>(
    { queryKey: queryKeys.profile(username) },
    (data: unknown) => {
      if (
        !isRecord(data) ||
        !isRecord(data.user) ||
        data.user.username !== username ||
        !isRecord(data.viewerState)
      ) {
        return data;
      }
      return { ...data, viewerState: { ...data.viewerState, following } };
    },
  );
}

export function applyCommentLike(
  queryClient: QueryClient,
  commentId: string,
  liked: boolean,
): void {
  patchCommentCaches(queryClient, (item) => {
    if (item.id !== commentId) return item;
    const wasLiked = item.viewerState.liked;
    const delta = liked === wasLiked ? 0 : liked ? 1 : -1;
    return {
      ...item,
      likesCount: Math.max(0, item.likesCount + delta),
      viewerState: { ...item.viewerState, liked },
    };
  });
}

export function applyCommentRemoved(queryClient: QueryClient, commentId: string): void {
  patchCommentCaches(queryClient, (item) =>
    item.id === commentId ? { ...item, isRemoved: true, text: '', author: null } : item,
  );
}

export function applyNewComment(queryClient: QueryClient, videoId: string, comment: Comment): void {
  if (comment.parentId) {
    queryClient.setQueriesData<unknown>(
      { queryKey: queryKeys.replies(comment.parentId) },
      (data: unknown) => prependComment(data, comment),
    );
  } else {
    queryClient.setQueriesData<unknown>(
      { queryKey: queryKeys.commentLists(videoId) },
      (data: unknown) => prependComment(data, comment),
    );
  }
  patchFeedCaches(queryClient, (item) =>
    item.video.id === videoId
      ? { ...item, counts: { ...item.counts, comments: item.counts.comments + 1 } }
      : item,
  );
}

function prependComment(data: unknown, comment: Comment): unknown {
  if (!isInfiniteData(data) || data.pages.length === 0) return data;
  const first = data.pages[0];
  if (!first || !Array.isArray(first.items)) return data;
  return {
    ...data,
    pages: [{ ...first, items: [comment, ...first.items] }, ...data.pages.slice(1)],
  };
}
