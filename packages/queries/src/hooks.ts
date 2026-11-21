import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useRef } from 'react';
import type {
  ApiClientError,
  AuthorSummary,
  AvatarConfirmRequest,
  AvatarUploadRequest,
  Comment,
  CommentSort,
  CreateVideoUploadRequest,
  FeedItem,
  FeedKind,
  FeedResponse,
  MarkReadRequest,
  NotificationFilter,
  PublicProfileResponse,
  TrendingResponse,
  UpdateProfileRequest,
  VideoStatusResponse,
} from '@reel/shared';
import { useReelQueries } from './context.js';
import { queryKeys } from './keys.js';
import {
  applyCommentLike,
  applyCommentRemoved,
  applyFollow,
  applyNewComment,
  applyVideoLike,
  applyVideoSave,
  applyVideoShare,
  restoreSocialCaches,
  snapshotSocialCaches,
  type CacheSnapshot,
} from './optimistic.js';

type FeedInfiniteData = InfiniteData<FeedResponse, string | null>;
type CommentInfiniteData = InfiniteData<
  { items: Comment[]; nextCursor: string | null },
  string | null
>;

function nextPage(last: { nextCursor: string | null }): string | undefined {
  return last.nextCursor ?? undefined;
}

export function useInfiniteFeed(kind: FeedKind, enabled = true) {
  const { api } = useReelQueries();
  return useInfiniteQuery({
    queryKey: queryKeys.feed(kind),
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.getFeed(kind, { cursor: pageParam ?? undefined, limit: 10 }, signal),
    getNextPageParam: nextPage,
  });
}

export function useProfileVideos(username: string) {
  const { api } = useReelQueries();
  return useInfiniteQuery({
    queryKey: queryKeys.profileVideos(username),
    enabled: username.length > 0,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.getProfileVideos(username, { cursor: pageParam ?? undefined, limit: 10 }, signal),
    getNextPageParam: nextPage,
  });
}

export function useSavedVideos() {
  const { api } = useReelQueries();
  return useInfiniteQuery({
    queryKey: queryKeys.savedVideos(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.getSavedVideos({ cursor: pageParam ?? undefined, limit: 10 }, signal),
    getNextPageParam: nextPage,
  });
}

export function useLikedVideos() {
  const { api } = useReelQueries();
  return useInfiniteQuery({
    queryKey: queryKeys.likedVideos(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.getLikedVideos({ cursor: pageParam ?? undefined, limit: 10 }, signal),
    getNextPageParam: nextPage,
  });
}

export function useHashtagVideos(tag: string) {
  const { api } = useReelQueries();
  return useInfiniteQuery({
    queryKey: queryKeys.hashtagVideos(tag),
    enabled: tag.length > 0,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.getHashtagVideos(tag, { cursor: pageParam ?? undefined, limit: 10 }, signal),
    getNextPageParam: nextPage,
  });
}

export function useTrending() {
  const { api } = useReelQueries();
  return useQuery<TrendingResponse>({
    queryKey: queryKeys.trending(),
    queryFn: ({ signal }) => api.getTrending(signal),
    staleTime: 60_000,
  });
}

export function useNotifications(filter: NotificationFilter = 'all', enabled = true) {
  const { api } = useReelQueries();
  return useInfiniteQuery({
    queryKey: queryKeys.notifications(filter),
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.listNotifications({ type: filter, cursor: pageParam ?? undefined, limit: 20 }, signal),
    getNextPageParam: nextPage,
  });
}

export function useUnreadNotificationCount(enabled = true) {
  const { api } = useReelQueries();
  return useQuery({
    queryKey: queryKeys.unreadNotificationCount(),
    enabled,
    queryFn: () => api.getUnreadCount(),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const { api } = useReelQueries();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkReadRequest) => api.markNotificationsRead(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social', 'notifications'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount() }),
      ]);
    },
  });
}

export function useSearchSuggestions(query: string, enabled = true) {
  const { api } = useReelQueries();
  const normalized = query.trim();
  return useQuery({
    queryKey: queryKeys.searchSuggestions(normalized),
    enabled: enabled && normalized.length >= 2,
    queryFn: ({ signal }) => api.searchSuggest({ q: normalized }, signal),
  });
}

export function useSearchUsers(query: string, enabled = true) {
  const { api } = useReelQueries();
  const normalized = query.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.searchUsers(normalized),
    enabled: enabled && normalized.length >= 2,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.searchUsers({ q: normalized, cursor: pageParam ?? undefined, limit: 12 }, signal),
    getNextPageParam: nextPage,
  });
}

export function useSearchVideos(query: string, enabled = true) {
  const { api } = useReelQueries();
  const normalized = query.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.searchVideos(normalized),
    enabled: enabled && normalized.length >= 2,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.searchVideos({ q: normalized, cursor: pageParam ?? undefined, limit: 12 }, signal),
    getNextPageParam: nextPage,
  });
}

export function useSearchHashtags(query: string, enabled = true) {
  const { api } = useReelQueries();
  const normalized = query.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.searchHashtags(normalized),
    enabled: enabled && normalized.length >= 2,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.searchHashtags({ q: normalized, cursor: pageParam ?? undefined, limit: 12 }, signal),
    getNextPageParam: nextPage,
  });
}

export function useMyVideos() {
  const { api } = useReelQueries();
  return useInfiniteQuery({
    queryKey: queryKeys.myVideos(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => api.listMyVideos({ cursor: pageParam, limit: 12 }, signal),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useFeedItem(videoId: string) {
  const { api } = useReelQueries();
  return useQuery({
    queryKey: queryKeys.feedItem(videoId),
    enabled: videoId.length > 0,
    queryFn: ({ signal }) => api.getFeedItem(videoId, signal),
  });
}

export function useVideo(videoId: string) {
  const { api } = useReelQueries();
  return useQuery({
    queryKey: queryKeys.video(videoId),
    enabled: videoId.length > 0,
    queryFn: ({ signal }) => api.getVideo(videoId, signal),
  });
}

export function useComments(videoId: string, sort: CommentSort = 'newest') {
  const { api } = useReelQueries();
  return useInfiniteQuery({
    queryKey: queryKeys.comments(videoId, sort),
    enabled: videoId.length > 0,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.getComments(videoId, { cursor: pageParam ?? undefined, limit: 10, sort }, signal),
    getNextPageParam: nextPage,
  });
}

export function useReplies(commentId: string) {
  const { api } = useReelQueries();
  return useInfiniteQuery({
    queryKey: queryKeys.replies(commentId),
    enabled: commentId.length > 0,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.getReplies(commentId, { cursor: pageParam ?? undefined, limit: 10 }, signal),
    getNextPageParam: nextPage,
  });
}

export function useFollowers(username: string) {
  const { api } = useReelQueries();
  return useInfiniteQuery({
    queryKey: queryKeys.followers(username),
    enabled: username.length > 0,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.getFollowers(username, { cursor: pageParam ?? undefined, limit: 10 }, signal),
    getNextPageParam: nextPage,
  });
}

export function useFollowing(username: string) {
  const { api } = useReelQueries();
  return useInfiniteQuery({
    queryKey: queryKeys.following(username),
    enabled: username.length > 0,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api.getFollowing(username, { cursor: pageParam ?? undefined, limit: 10 }, signal),
    getNextPageParam: nextPage,
  });
}

function useInteractionErrorHandler() {
  const { onAuthRequired } = useReelQueries();
  return (error: unknown, retry?: () => void) => {
    if (
      onAuthRequired &&
      error instanceof Error &&
      'code' in error &&
      (error as ApiClientError).code === 'AUTH_REQUIRED'
    ) {
      onAuthRequired(error as ApiClientError, retry);
    }
  };
}

function invalidateVideoLists(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.feeds });
  void queryClient.invalidateQueries({ queryKey: ['social', 'profile'] });
  void queryClient.invalidateQueries({ queryKey: ['social', 'hashtag'] });
}

export function useLikeVideo() {
  const { api } = useReelQueries();
  const queryClient = useQueryClient();
  const handleError = useInteractionErrorHandler();
  const retryRef = useRef<(input: { videoId: string; liked: boolean }) => void>(() => undefined);
  const mutation = useMutation({
    mutationFn: (input: { videoId: string; liked: boolean }) =>
      input.liked ? api.likeVideo(input.videoId) : api.unlikeVideo(input.videoId),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.all });
      const snapshot = snapshotSocialCaches(queryClient);
      applyVideoLike(queryClient, input.videoId, input.liked);
      return { snapshot };
    },
    onError: (error, input, context: { snapshot: CacheSnapshot } | undefined) => {
      if (context) restoreSocialCaches(queryClient, context.snapshot);
      handleError(error, () => retryRef.current(input));
    },
    onSettled: () => invalidateVideoLists(queryClient),
  });
  retryRef.current = mutation.mutate;
  return mutation;
}

export function useSaveVideo() {
  const { api } = useReelQueries();
  const queryClient = useQueryClient();
  const handleError = useInteractionErrorHandler();
  const retryRef = useRef<(input: { videoId: string; saved: boolean }) => void>(() => undefined);
  const mutation = useMutation({
    mutationFn: (input: { videoId: string; saved: boolean }) =>
      input.saved ? api.saveVideo(input.videoId) : api.unsaveVideo(input.videoId),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.all });
      const snapshot = snapshotSocialCaches(queryClient);
      applyVideoSave(queryClient, input.videoId, input.saved);
      return { snapshot };
    },
    onError: (error, input, context: { snapshot: CacheSnapshot } | undefined) => {
      if (context) restoreSocialCaches(queryClient, context.snapshot);
      handleError(error, () => retryRef.current(input));
    },
    onSettled: () => invalidateVideoLists(queryClient),
  });
  retryRef.current = mutation.mutate;
  return mutation;
}

export function useShareVideo() {
  const { api } = useReelQueries();
  const queryClient = useQueryClient();
  const retryRef = useRef<(videoId: string) => void>(() => undefined);
  const handleError = useInteractionErrorHandler();
  const mutation = useMutation({
    mutationFn: (videoId: string) => api.shareVideo(videoId),
    onMutate: async (videoId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.all });
      const snapshot = snapshotSocialCaches(queryClient);
      applyVideoShare(queryClient, videoId);
      return { snapshot };
    },
    onError: (error, videoId, context: { snapshot: CacheSnapshot } | undefined) => {
      if (context) restoreSocialCaches(queryClient, context.snapshot);
      handleError(error, () => retryRef.current(videoId));
    },
    onSettled: () => invalidateVideoLists(queryClient),
  });
  retryRef.current = mutation.mutate;
  return mutation;
}

export function useFollow() {
  const { api } = useReelQueries();
  const queryClient = useQueryClient();
  const handleError = useInteractionErrorHandler();
  const retryRef = useRef<(input: { username: string; following: boolean }) => void>(
    () => undefined,
  );
  const mutation = useMutation({
    mutationFn: (input: { username: string; following: boolean }) =>
      input.following ? api.followUser(input.username) : api.unfollowUser(input.username),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.all });
      const snapshot = snapshotSocialCaches(queryClient);
      applyFollow(queryClient, input.username, input.following);
      return { snapshot };
    },
    onError: (error, input, context: { snapshot: CacheSnapshot } | undefined) => {
      if (context) restoreSocialCaches(queryClient, context.snapshot);
      handleError(error, () => retryRef.current(input));
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile(input.username) });
      invalidateVideoLists(queryClient);
    },
  });
  retryRef.current = mutation.mutate;
  return mutation;
}

function temporaryId(): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface AddCommentInput {
  videoId: string;
  text: string;
  parentId?: string;
  author: AuthorSummary;
}

export function useAddComment() {
  const { api } = useReelQueries();
  const queryClient = useQueryClient();
  const handleError = useInteractionErrorHandler();
  const retryRef = useRef<(input: AddCommentInput) => void>(() => undefined);
  const mutation = useMutation({
    mutationFn: (input: AddCommentInput) =>
      api.createComment(input.videoId, { text: input.text, parentId: input.parentId }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.all });
      const snapshot = snapshotSocialCaches(queryClient);
      const optimistic: Comment = {
        id: temporaryId(),
        videoId: input.videoId,
        parentId: input.parentId ?? null,
        text: input.text,
        isRemoved: false,
        author: input.author,
        replyToUser: null,
        likesCount: 0,
        replyCount: 0,
        createdAt: new Date().toISOString(),
        viewerState: { liked: false },
      };
      applyNewComment(queryClient, input.videoId, optimistic);
      return { snapshot };
    },
    onError: (error, input, context: { snapshot: CacheSnapshot } | undefined) => {
      if (context) restoreSocialCaches(queryClient, context.snapshot);
      handleError(error, () => retryRef.current(input));
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.commentLists(input.videoId) });
      if (input.parentId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.replies(input.parentId) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.feeds });
    },
  });
  retryRef.current = mutation.mutate;
  return mutation;
}

export function useDeleteComment() {
  const { api } = useReelQueries();
  const queryClient = useQueryClient();
  const handleError = useInteractionErrorHandler();
  const retryRef = useRef<(input: { commentId: string; videoId: string }) => void>(() => undefined);
  const mutation = useMutation({
    mutationFn: (input: { commentId: string; videoId: string }) =>
      api.deleteComment(input.commentId),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.all });
      const snapshot = snapshotSocialCaches(queryClient);
      applyCommentRemoved(queryClient, input.commentId);
      return { snapshot };
    },
    onError: (error, input, context: { snapshot: CacheSnapshot } | undefined) => {
      if (context) restoreSocialCaches(queryClient, context.snapshot);
      handleError(error, () => retryRef.current(input));
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.commentLists(input.videoId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feeds });
    },
  });
  retryRef.current = mutation.mutate;
  return mutation;
}

export function useLikeComment() {
  const { api } = useReelQueries();
  const queryClient = useQueryClient();
  const handleError = useInteractionErrorHandler();
  const retryRef = useRef<(input: { commentId: string; liked: boolean }) => void>(() => undefined);
  const mutation = useMutation({
    mutationFn: (input: { commentId: string; liked: boolean }) =>
      input.liked ? api.likeComment(input.commentId) : api.unlikeComment(input.commentId),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.all });
      const snapshot = snapshotSocialCaches(queryClient);
      applyCommentLike(queryClient, input.commentId, input.liked);
      return { snapshot };
    },
    onError: (error, input, context: { snapshot: CacheSnapshot } | undefined) => {
      if (context) restoreSocialCaches(queryClient, context.snapshot);
      handleError(error, () => retryRef.current(input));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['social', 'comments'] });
      void queryClient.invalidateQueries({ queryKey: ['social', 'replies'] });
    },
  });
  retryRef.current = mutation.mutate;
  return mutation;
}

export function usePublicProfile(username: string) {
  const { api } = useReelQueries();
  return useQuery<PublicProfileResponse>({
    queryKey: queryKeys.profile(username),
    enabled: username.length > 0,
    queryFn: ({ signal }) => api.getPublicProfile(username, signal),
  });
}

export function useVideoStatus(videoId: string, enabled = true) {
  const { api } = useReelQueries();
  return useQuery<VideoStatusResponse>({
    queryKey: queryKeys.videoStatus(videoId),
    enabled: enabled && videoId.length > 0,
    queryFn: ({ signal }) => api.getVideoStatus(videoId, signal),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'processing' || status === 'uploading' ? 1_500 : false;
    },
  });
}

export function useCreateVideoUpload() {
  const { api } = useReelQueries();
  return useMutation({
    mutationFn: (input: CreateVideoUploadRequest) => api.createVideoUpload(input),
  });
}

export function useCompleteVideoUpload() {
  const { api } = useReelQueries();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) => api.completeVideoUpload(videoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myVideos() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feeds });
    },
  });
}

export function useDeleteVideo() {
  const { api } = useReelQueries();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) => api.deleteVideo(videoId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myVideos() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feeds });
    },
  });
}

export function useUpdateProfile() {
  const { api } = useReelQueries();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileRequest) => api.updateProfile(input),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile(response.user.username) });
    },
  });
}

export function useCreateAvatarUpload() {
  const { api } = useReelQueries();
  return useMutation({
    mutationFn: (input: AvatarUploadRequest) => api.createAvatarUpload(input),
  });
}

export function useConfirmAvatarUpload() {
  const { api } = useReelQueries();
  return useMutation({
    mutationFn: (input: AvatarConfirmRequest) => api.confirmAvatarUpload(input),
  });
}

export type { CommentInfiniteData, FeedInfiniteData, FeedItem };
