import type {
  AuthResponse,
  ForgotPasswordRequest,
  GoogleSignInRequest,
  LoginRequest,
  MessageResponse,
  RefreshRequest,
  ResetPasswordRequest,
  ResendVerificationRequest,
  SignupRequest,
  VerifyEmailRequest,
} from './schemas/auth';
import { authResponseSchema, messageResponseSchema } from './schemas/auth';
import { errorResponseSchema } from './schemas/health';
import type { HealthResponse } from './schemas/health';
import { healthResponseSchema } from './schemas/health';
import type {
  AccountDeletionResponse,
  BlockedUsersResponse,
  CommentPermissionUpdate,
  CreateReportRequest,
  DeleteAccountRequest,
  MessageAck,
  NotInterestedRequest,
  PushTokenRegister,
  ReportResponse,
} from './schemas/safety';
import {
  accountDeletionResponseSchema,
  blockedUsersResponseSchema,
  messageAckSchema,
  reportResponseSchema,
} from './schemas/safety';
import type {
  MarkReadRequest,
  MarkReadResponse,
  NotificationListQuery,
  NotificationListResponse,
  NotificationPreferenceResponse,
  NotificationPreferenceUpdate,
  UnreadCountResponse,
} from './schemas/notifications';
import {
  markReadResponseSchema,
  notificationListResponseSchema,
  notificationPreferenceResponseSchema,
  unreadCountResponseSchema,
} from './schemas/notifications';
import type {
  SearchQuery,
  SearchUsersResponse,
  SearchVideosResponse,
  SearchHashtagsResponse,
  SuggestQuery,
  SuggestResponse,
} from './schemas/search';
import {
  searchHashtagsResponseSchema,
  searchUsersResponseSchema,
  searchVideosResponseSchema,
  suggestResponseSchema,
} from './schemas/search';
import type {
  AdminActionRequest,
  AdminReportDetail,
  AdminReportListQuery,
  AdminReportListResponse,
  AdminStatsResponse,
  AdminUserListQuery,
  AdminUserListResponse,
  AdminVideoListQuery,
  AdminVideoListResponse,
  AuditLogQuery,
  AuditLogResponse,
  BanUserRequest,
  QueueHealthResponse,
  ResolveReportRequest,
  SetRoleRequest,
} from './schemas/admin';
import {
  adminReportDetailSchema,
  adminReportListResponseSchema,
  adminStatsResponseSchema,
  adminUserListResponseSchema,
  adminVideoListResponseSchema,
  auditLogResponseSchema,
  queueHealthSchema,
} from './schemas/admin';
import type {
  AvatarConfirmRequest,
  AvatarConfirmResponse,
  AvatarUploadRequest,
  AvatarUploadUrlResponse,
  MeResponse,
  PublicProfileResponse,
  UpdateProfileRequest,
} from './schemas/users';
import {
  avatarConfirmResponseSchema,
  avatarUploadUrlResponseSchema,
  meResponseSchema,
  publicProfileResponseSchema,
} from './schemas/users';
import type {
  CreateVideoUploadRequest,
  CreateVideoUploadResponse,
  UpdateVideoRequest,
  VideoListQuery,
  VideoListResponse,
  VideoResponse,
  VideoStatusResponse,
} from './schemas/videos';
import {
  createVideoUploadResponseSchema,
  videoListResponseSchema,
  videoResponseSchema,
  videoStatusResponseSchema,
} from './schemas/videos';
import type {
  CommentLikeResponse,
  CommentListQuery,
  CommentListResponse,
  CommentResponse,
  CreateCommentRequest,
  FeedItemResponse,
  FeedKind,
  FeedResponse,
  FollowListResponse,
  FollowResponse,
  RecordViewRequest,
  RecordViewResponse,
  ShareVideoResponse,
  SocialListQuery,
  TrendingResponse,
  VideoLikeResponse,
  VideoSaveResponse,
} from './schemas/social';
import {
  commentLikeResponseSchema,
  commentListResponseSchema,
  commentResponseSchema,
  feedItemResponseSchema,
  feedResponseSchema,
  followListResponseSchema,
  followResponseSchema,
  recordViewResponseSchema,
  shareVideoResponseSchema,
  trendingResponseSchema,
  videoLikeResponseSchema,
  videoSaveResponseSchema,
} from './schemas/social';

export interface SessionTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number;
}

export interface TokenStorage {
  get(): Promise<SessionTokens | null> | SessionTokens | null;
  set(tokens: SessionTokens): Promise<void> | void;
  clear(): Promise<void> | void;
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchFn?: typeof fetch;
  tokenStorage?: TokenStorage;
  sessionTransport?: 'cookie' | 'token';
  onSessionCleared?: () => void | Promise<void>;
  getAnonId?: () => string | null | Promise<string | null>;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly details: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    requestId: string | null,
    details: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export interface ApiClient {
  getHealth(signal?: AbortSignal): Promise<HealthResponse>;
  signup(input: SignupRequest): Promise<AuthResponse>;
  login(input: LoginRequest): Promise<AuthResponse>;
  googleSignIn(input: GoogleSignInRequest): Promise<AuthResponse>;
  refresh(input?: RefreshRequest): Promise<AuthResponse>;
  logout(input?: RefreshRequest): Promise<MessageResponse>;
  logoutAll(input?: RefreshRequest): Promise<MessageResponse>;
  getMe(): Promise<MeResponse>;
  verifyEmail(input: VerifyEmailRequest): Promise<MessageResponse>;
  resendVerification(input: ResendVerificationRequest): Promise<MessageResponse>;
  forgotPassword(input: ForgotPasswordRequest): Promise<MessageResponse>;
  resetPassword(input: ResetPasswordRequest): Promise<MessageResponse>;
  getPublicProfile(username: string, signal?: AbortSignal): Promise<PublicProfileResponse>;
  updateProfile(input: UpdateProfileRequest): Promise<MeResponse>;
  createAvatarUpload(input: AvatarUploadRequest): Promise<AvatarUploadUrlResponse>;
  confirmAvatarUpload(input: AvatarConfirmRequest): Promise<AvatarConfirmResponse>;
  createVideoUpload(input: CreateVideoUploadRequest): Promise<CreateVideoUploadResponse>;
  completeVideoUpload(videoId: string): Promise<VideoResponse>;
  getVideo(videoId: string, signal?: AbortSignal): Promise<VideoResponse>;
  getVideoStatus(videoId: string, signal?: AbortSignal): Promise<VideoStatusResponse>;
  listMyVideos(query?: Partial<VideoListQuery>, signal?: AbortSignal): Promise<VideoListResponse>;
  updateVideo(videoId: string, input: UpdateVideoRequest): Promise<VideoResponse>;
  deleteVideo(videoId: string): Promise<MessageResponse>;
  getFeed(
    kind: FeedKind,
    query?: Partial<SocialListQuery>,
    signal?: AbortSignal,
  ): Promise<FeedResponse>;
  getFeedItem(videoId: string, signal?: AbortSignal): Promise<FeedItemResponse>;
  getProfileVideos(
    username: string,
    query?: Partial<SocialListQuery>,
    signal?: AbortSignal,
  ): Promise<FeedResponse>;
  getSavedVideos(query?: Partial<SocialListQuery>, signal?: AbortSignal): Promise<FeedResponse>;
  getLikedVideos(query?: Partial<SocialListQuery>, signal?: AbortSignal): Promise<FeedResponse>;
  getHashtagVideos(
    tag: string,
    query?: Partial<SocialListQuery>,
    signal?: AbortSignal,
  ): Promise<FeedResponse>;
  getTrending(signal?: AbortSignal): Promise<TrendingResponse>;
  likeVideo(videoId: string): Promise<VideoLikeResponse>;
  unlikeVideo(videoId: string): Promise<VideoLikeResponse>;
  saveVideo(videoId: string): Promise<VideoSaveResponse>;
  unsaveVideo(videoId: string): Promise<VideoSaveResponse>;
  followUser(username: string): Promise<FollowResponse>;
  unfollowUser(username: string): Promise<FollowResponse>;
  getFollowers(
    username: string,
    query?: Partial<SocialListQuery>,
    signal?: AbortSignal,
  ): Promise<FollowListResponse>;
  getFollowing(
    username: string,
    query?: Partial<SocialListQuery>,
    signal?: AbortSignal,
  ): Promise<FollowListResponse>;
  recordView(videoId: string, input: RecordViewRequest): Promise<RecordViewResponse>;
  shareVideo(videoId: string): Promise<ShareVideoResponse>;
  getComments(
    videoId: string,
    query?: Partial<CommentListQuery>,
    signal?: AbortSignal,
  ): Promise<CommentListResponse>;
  getReplies(
    commentId: string,
    query?: Partial<SocialListQuery>,
    signal?: AbortSignal,
  ): Promise<CommentListResponse>;
  createComment(videoId: string, input: CreateCommentRequest): Promise<CommentResponse>;
  deleteComment(commentId: string): Promise<MessageResponse>;
  likeComment(commentId: string): Promise<CommentLikeResponse>;
  unlikeComment(commentId: string): Promise<CommentLikeResponse>;
  listNotifications(
    query?: Partial<NotificationListQuery>,
    signal?: AbortSignal,
  ): Promise<NotificationListResponse>;
  getUnreadCount(): Promise<UnreadCountResponse>;
  markNotificationsRead(input: MarkReadRequest): Promise<MarkReadResponse>;
  getNotificationPreferences(): Promise<NotificationPreferenceResponse>;
  updateNotificationPreferences(
    input: NotificationPreferenceUpdate,
  ): Promise<NotificationPreferenceResponse>;
  registerPushToken(input: PushTokenRegister): Promise<MessageAck>;
  removePushToken(): Promise<MessageAck>;
  searchSuggest(query: SuggestQuery, signal?: AbortSignal): Promise<SuggestResponse>;
  searchUsers(query: SearchQuery, signal?: AbortSignal): Promise<SearchUsersResponse>;
  searchVideos(query: SearchQuery, signal?: AbortSignal): Promise<SearchVideosResponse>;
  searchHashtags(query: SearchQuery, signal?: AbortSignal): Promise<SearchHashtagsResponse>;
  blockUser(username: string): Promise<FollowResponse>;
  unblockUser(username: string): Promise<FollowResponse>;
  listBlockedUsers(): Promise<BlockedUsersResponse>;
  createReport(input: CreateReportRequest): Promise<ReportResponse>;
  markNotInterested(videoId: string, input: NotInterestedRequest): Promise<MessageAck>;
  setCommentPermission(input: CommentPermissionUpdate): Promise<MeResponse>;
  deleteAccount(input: DeleteAccountRequest): Promise<AccountDeletionResponse>;
  exportData(): Promise<Blob>;
  getAdminStats(): Promise<AdminStatsResponse>;
  listAdminReports(query?: Partial<AdminReportListQuery>): Promise<AdminReportListResponse>;
  getAdminReport(id: string): Promise<AdminReportDetail>;
  resolveAdminReport(id: string, input: ResolveReportRequest): Promise<MessageResponse>;
  listAdminUsers(query?: Partial<AdminUserListQuery>): Promise<AdminUserListResponse>;
  banAdminUser(id: string, input: BanUserRequest): Promise<MessageResponse>;
  unbanAdminUser(id: string): Promise<MessageResponse>;
  forceLogoutAdminUser(id: string): Promise<MessageResponse>;
  setAdminUserRole(id: string, input: SetRoleRequest): Promise<MessageResponse>;
  listAdminVideos(query?: Partial<AdminVideoListQuery>): Promise<AdminVideoListResponse>;
  removeAdminVideo(id: string, input: AdminActionRequest): Promise<MessageResponse>;
  restoreAdminVideo(id: string, input: AdminActionRequest): Promise<MessageResponse>;
  reprocessAdminVideo(id: string): Promise<MessageResponse>;
  removeAdminComment(id: string, input: AdminActionRequest): Promise<MessageResponse>;
  getAdminAuditLog(query?: Partial<AuditLogQuery>): Promise<AuditLogResponse>;
  getAdminQueueHealth(): Promise<QueueHealthResponse>;
  getSessionTokens(): Promise<SessionTokens | null>;
  clearSession(): Promise<void>;
}

interface RequestSpec<T> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  schema: { parse(value: unknown): T };
  body?: unknown;
  signal?: AbortSignal;
  authenticated?: boolean;
  skipRefresh?: boolean;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const fetchFn = options.fetchFn ?? fetch;
  const storage = options.tokenStorage;
  const transport = options.sessionTransport ?? 'cookie';
  let refreshInFlight: Promise<AuthResponse> | null = null;

  async function baseHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (transport === 'token') headers['x-client'] = 'mobile';
    const anonId = await options.getAnonId?.();
    if (anonId) headers['x-anon-id'] = anonId;
    return headers;
  }

  async function requestHeaders(authenticated: boolean): Promise<Record<string, string>> {
    const headers = await baseHeaders();
    if (!authenticated) return headers;
    const tokens = (await storage?.get()) ?? null;
    if (tokens?.accessToken) headers.authorization = `Bearer ${tokens.accessToken}`;
    return headers;
  }

  function requestInit(spec: RequestSpec<unknown>, headers: Record<string, string>): RequestInit {
    const init: RequestInit = {
      method: spec.method,
      headers,
      signal: spec.signal,
      ...(transport === 'cookie' ? { credentials: 'include' as const } : {}),
    };
    if (spec.body !== undefined) {
      init.body = JSON.stringify(spec.body);
      headers['content-type'] = 'application/json';
    }
    return init;
  }

  async function parseResponse(response: Response): Promise<unknown> {
    const text = await response.text();
    if (text.length === 0) return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return undefined;
    }
  }

  function toApiError(response: Response, body: unknown): ApiClientError {
    const parsed = errorResponseSchema.safeParse(body);
    if (parsed.success) {
      const { code, message, requestId, details } = parsed.data.error;
      return new ApiClientError(response.status, code, message, requestId, details);
    }
    return new ApiClientError(
      response.status,
      'REQUEST_ERROR',
      `Request failed (${response.status})`,
      null,
      body,
    );
  }

  async function clearSession(): Promise<void> {
    await storage?.clear();
    await options.onSessionCleared?.();
  }

  async function sendOnce<T>(spec: RequestSpec<T>): Promise<{ response: Response; body: unknown }> {
    const headers = await requestHeaders(spec.authenticated ?? false);
    const response = await fetchFn(`${baseUrl}${spec.path}`, requestInit(spec, headers));
    return { response, body: await parseResponse(response) };
  }

  async function request<T>(spec: RequestSpec<T>): Promise<T> {
    let attempt = await sendOnce(spec);
    if (
      attempt.response.status === 401 &&
      spec.authenticated &&
      !spec.skipRefresh &&
      spec.path !== '/auth/refresh'
    ) {
      try {
        await refresh();
      } catch {
        // Keep the original 401 so callers see AUTH_REQUIRED rather than the
        // refresh endpoint's error. The session has already been cleared.
      }
      attempt = await sendOnce(spec);
    }

    if (!attempt.response.ok) throw toApiError(attempt.response, attempt.body);
    return spec.schema.parse(attempt.body);
  }

  async function refresh(input: RefreshRequest = {}): Promise<AuthResponse> {
    const stored = (await storage?.get()) ?? null;
    const refreshToken = input.refreshToken ?? stored?.refreshToken ?? undefined;
    const body = transport === 'token' && refreshToken ? { refreshToken } : {};

    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const response = await fetchFn(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { ...(await baseHeaders()), 'content-type': 'application/json' },
          body: JSON.stringify(body),
          ...(transport === 'cookie' ? { credentials: 'include' as const } : {}),
        });
        const responseBody = await parseResponse(response);
        if (!response.ok) {
          const error = toApiError(response, responseBody);
          await clearSession();
          throw error;
        }
        const parsed = authResponseSchema.parse(responseBody);
        await storage?.set({
          accessToken: parsed.tokens.accessToken,
          refreshToken: parsed.tokens.refreshToken,
          expiresIn: parsed.tokens.expiresIn,
        });
        return parsed;
      })().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  async function authMutation(path: string, body: unknown): Promise<AuthResponse> {
    const response = await fetchFn(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { ...(await baseHeaders()), 'content-type': 'application/json' },
      body: JSON.stringify(body),
      ...(transport === 'cookie' ? { credentials: 'include' as const } : {}),
    });
    const responseBody = await parseResponse(response);
    if (!response.ok) throw toApiError(response, responseBody);
    return authResponseSchema.parse(responseBody);
  }

  async function logoutRequest(path: string, input: RefreshRequest = {}): Promise<MessageResponse> {
    const stored = (await storage?.get()) ?? null;
    const refreshToken = input.refreshToken ?? stored?.refreshToken ?? undefined;
    const body = transport === 'token' && refreshToken ? { refreshToken } : {};
    const response = await fetchFn(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { ...(await baseHeaders()), 'content-type': 'application/json' },
      body: JSON.stringify(body),
      ...(transport === 'cookie' ? { credentials: 'include' as const } : {}),
    });
    const responseBody = await parseResponse(response);
    if (!response.ok) throw toApiError(response, responseBody);
    const parsed = messageResponseSchema.parse(responseBody);
    await clearSession();
    return parsed;
  }

  function listPath(path: string, query?: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) params.set(key, String(value));
    }
    const suffix = params.toString();
    return suffix ? `${path}?${suffix}` : path;
  }

  return {
    async getHealth(signal) {
      return request({ method: 'GET', path: '/health', schema: healthResponseSchema, signal });
    },
    async signup(input) {
      return authMutation('/auth/signup', input);
    },
    async login(input) {
      return authMutation('/auth/login', input);
    },
    async googleSignIn(input) {
      return authMutation('/auth/google', input);
    },
    refresh,
    async logout(input) {
      return logoutRequest('/auth/logout', input);
    },
    async logoutAll(input) {
      return logoutRequest('/auth/logout-all', input);
    },
    async getMe() {
      return request({
        method: 'GET',
        path: '/auth/me',
        schema: meResponseSchema,
        authenticated: true,
      });
    },
    async verifyEmail(input) {
      return request({
        method: 'POST',
        path: '/auth/verify-email',
        schema: messageResponseSchema,
        body: input,
        skipRefresh: true,
      });
    },
    async resendVerification(input) {
      return request({
        method: 'POST',
        path: '/auth/resend-verification',
        schema: messageResponseSchema,
        body: input,
        skipRefresh: true,
      });
    },
    async forgotPassword(input) {
      return request({
        method: 'POST',
        path: '/auth/forgot-password',
        schema: messageResponseSchema,
        body: input,
        skipRefresh: true,
      });
    },
    async resetPassword(input) {
      return request({
        method: 'POST',
        path: '/auth/reset-password',
        schema: messageResponseSchema,
        body: input,
        skipRefresh: true,
      });
    },
    async getPublicProfile(username, signal) {
      return request({
        method: 'GET',
        path: `/users/${encodeURIComponent(username)}`,
        schema: publicProfileResponseSchema,
        signal,
      });
    },
    async updateProfile(input) {
      return request({
        method: 'PATCH',
        path: '/users/me',
        schema: meResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async createAvatarUpload(input) {
      return request({
        method: 'POST',
        path: '/users/me/avatar-url',
        schema: avatarUploadUrlResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async confirmAvatarUpload(input) {
      return request({
        method: 'POST',
        path: '/users/me/avatar',
        schema: avatarConfirmResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async createVideoUpload(input) {
      return request({
        method: 'POST',
        path: '/videos/uploads',
        schema: createVideoUploadResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async completeVideoUpload(videoId) {
      return request({
        method: 'POST',
        path: `/videos/${encodeURIComponent(videoId)}/complete`,
        schema: videoResponseSchema,
        authenticated: true,
      });
    },
    async getVideo(videoId, signal) {
      return request({
        method: 'GET',
        path: `/videos/${encodeURIComponent(videoId)}`,
        schema: videoResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async getVideoStatus(videoId, signal) {
      return request({
        method: 'GET',
        path: `/videos/${encodeURIComponent(videoId)}/status`,
        schema: videoStatusResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async listMyVideos(query = {}, signal) {
      const params = new URLSearchParams();
      if (query.cursor) params.set('cursor', query.cursor);
      if (query.limit) params.set('limit', String(query.limit));
      const suffix = params.size > 0 ? `?${params.toString()}` : '';
      return request({
        method: 'GET',
        path: `/users/me/videos${suffix}`,
        schema: videoListResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async updateVideo(videoId, input) {
      return request({
        method: 'PATCH',
        path: `/videos/${encodeURIComponent(videoId)}`,
        schema: videoResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async deleteVideo(videoId) {
      return request({
        method: 'DELETE',
        path: `/videos/${encodeURIComponent(videoId)}`,
        schema: messageResponseSchema,
        authenticated: true,
      });
    },
    async getFeed(kind, query = {}, signal) {
      return request({
        method: 'GET',
        path: listPath(`/feed/${kind}`, {
          cursor: query.cursor,
          limit: query.limit,
        }),
        schema: feedResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async getFeedItem(videoId, signal) {
      return request({
        method: 'GET',
        path: `/videos/${encodeURIComponent(videoId)}/feed-item`,
        schema: feedItemResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async getProfileVideos(username, query = {}, signal) {
      return request({
        method: 'GET',
        path: listPath(`/users/${encodeURIComponent(username)}/videos`, {
          cursor: query.cursor,
          limit: query.limit,
        }),
        schema: feedResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async getSavedVideos(query = {}, signal) {
      return request({
        method: 'GET',
        path: listPath('/users/me/saved', { cursor: query.cursor, limit: query.limit }),
        schema: feedResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async getLikedVideos(query = {}, signal) {
      return request({
        method: 'GET',
        path: listPath('/users/me/liked', { cursor: query.cursor, limit: query.limit }),
        schema: feedResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async getHashtagVideos(tag, query = {}, signal) {
      return request({
        method: 'GET',
        path: listPath(`/hashtags/${encodeURIComponent(tag.replace(/^#/, ''))}/videos`, {
          cursor: query.cursor,
          limit: query.limit,
        }),
        schema: feedResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async getTrending(signal) {
      return request({
        method: 'GET',
        path: '/explore/trending',
        schema: trendingResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async likeVideo(videoId) {
      return request({
        method: 'POST',
        path: `/videos/${encodeURIComponent(videoId)}/like`,
        schema: videoLikeResponseSchema,
        authenticated: true,
      });
    },
    async unlikeVideo(videoId) {
      return request({
        method: 'DELETE',
        path: `/videos/${encodeURIComponent(videoId)}/like`,
        schema: videoLikeResponseSchema,
        authenticated: true,
      });
    },
    async saveVideo(videoId) {
      return request({
        method: 'POST',
        path: `/videos/${encodeURIComponent(videoId)}/save`,
        schema: videoSaveResponseSchema,
        authenticated: true,
      });
    },
    async unsaveVideo(videoId) {
      return request({
        method: 'DELETE',
        path: `/videos/${encodeURIComponent(videoId)}/save`,
        schema: videoSaveResponseSchema,
        authenticated: true,
      });
    },
    async followUser(username) {
      return request({
        method: 'POST',
        path: `/users/${encodeURIComponent(username)}/follow`,
        schema: followResponseSchema,
        authenticated: true,
      });
    },
    async unfollowUser(username) {
      return request({
        method: 'DELETE',
        path: `/users/${encodeURIComponent(username)}/follow`,
        schema: followResponseSchema,
        authenticated: true,
      });
    },
    async getFollowers(username, query = {}, signal) {
      return request({
        method: 'GET',
        path: listPath(`/users/${encodeURIComponent(username)}/followers`, {
          cursor: query.cursor,
          limit: query.limit,
        }),
        schema: followListResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async getFollowing(username, query = {}, signal) {
      return request({
        method: 'GET',
        path: listPath(`/users/${encodeURIComponent(username)}/following`, {
          cursor: query.cursor,
          limit: query.limit,
        }),
        schema: followListResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async recordView(videoId, input) {
      return request({
        method: 'POST',
        path: `/videos/${encodeURIComponent(videoId)}/view`,
        schema: recordViewResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async shareVideo(videoId) {
      return request({
        method: 'POST',
        path: `/videos/${encodeURIComponent(videoId)}/share`,
        schema: shareVideoResponseSchema,
        authenticated: true,
      });
    },
    async getComments(videoId, query = {}, signal) {
      return request({
        method: 'GET',
        path: listPath(`/videos/${encodeURIComponent(videoId)}/comments`, {
          cursor: query.cursor,
          limit: query.limit,
          sort: query.sort,
        }),
        schema: commentListResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async getReplies(commentId, query = {}, signal) {
      return request({
        method: 'GET',
        path: listPath(`/comments/${encodeURIComponent(commentId)}/replies`, {
          cursor: query.cursor,
          limit: query.limit,
        }),
        schema: commentListResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async createComment(videoId, input) {
      return request({
        method: 'POST',
        path: `/videos/${encodeURIComponent(videoId)}/comments`,
        schema: commentResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async deleteComment(commentId) {
      return request({
        method: 'DELETE',
        path: `/comments/${encodeURIComponent(commentId)}`,
        schema: messageResponseSchema,
        authenticated: true,
      });
    },
    async likeComment(commentId) {
      return request({
        method: 'POST',
        path: `/comments/${encodeURIComponent(commentId)}/like`,
        schema: commentLikeResponseSchema,
        authenticated: true,
      });
    },
    async unlikeComment(commentId) {
      return request({
        method: 'DELETE',
        path: `/comments/${encodeURIComponent(commentId)}/like`,
        schema: commentLikeResponseSchema,
        authenticated: true,
      });
    },
    async listNotifications(query = {}, signal) {
      return request({
        method: 'GET',
        path: listPath('/notifications', {
          cursor: query.cursor,
          limit: query.limit,
          type: query.type,
        }),
        schema: notificationListResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async getUnreadCount() {
      return request({
        method: 'GET',
        path: '/notifications/unread-count',
        schema: unreadCountResponseSchema,
        authenticated: true,
      });
    },
    async markNotificationsRead(input) {
      return request({
        method: 'POST',
        path: '/notifications/read',
        schema: markReadResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async getNotificationPreferences() {
      return request({
        method: 'GET',
        path: '/notifications/preferences',
        schema: notificationPreferenceResponseSchema,
        authenticated: true,
      });
    },
    async updateNotificationPreferences(input) {
      return request({
        method: 'PUT',
        path: '/notifications/preferences',
        schema: notificationPreferenceResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async registerPushToken(input) {
      return request({
        method: 'POST',
        path: '/push-tokens',
        schema: messageAckSchema,
        body: input,
        authenticated: true,
      });
    },
    async removePushToken() {
      return request({
        method: 'DELETE',
        path: '/push-tokens',
        schema: messageAckSchema,
        authenticated: true,
      });
    },
    async searchSuggest(query, signal) {
      return request({
        method: 'GET',
        path: listPath('/search/suggest', { q: query.q }),
        schema: suggestResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async searchUsers(query, signal) {
      return request({
        method: 'GET',
        path: listPath('/search/users', { q: query.q, cursor: query.cursor, limit: query.limit }),
        schema: searchUsersResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async searchVideos(query, signal) {
      return request({
        method: 'GET',
        path: listPath('/search/videos', { q: query.q, cursor: query.cursor, limit: query.limit }),
        schema: searchVideosResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async searchHashtags(query, signal) {
      return request({
        method: 'GET',
        path: listPath('/search/hashtags', {
          q: query.q,
          cursor: query.cursor,
          limit: query.limit,
        }),
        schema: searchHashtagsResponseSchema,
        authenticated: true,
        signal,
      });
    },
    async blockUser(username) {
      return request({
        method: 'POST',
        path: `/users/${encodeURIComponent(username)}/block`,
        schema: followResponseSchema,
        authenticated: true,
      });
    },
    async unblockUser(username) {
      return request({
        method: 'DELETE',
        path: `/users/${encodeURIComponent(username)}/block`,
        schema: followResponseSchema,
        authenticated: true,
      });
    },
    async listBlockedUsers() {
      return request({
        method: 'GET',
        path: '/users/me/blocked',
        schema: blockedUsersResponseSchema,
        authenticated: true,
      });
    },
    async createReport(input) {
      return request({
        method: 'POST',
        path: '/reports',
        schema: reportResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async markNotInterested(videoId, input) {
      return request({
        method: 'POST',
        path: `/videos/${encodeURIComponent(videoId)}/not-interested`,
        schema: messageAckSchema,
        body: input,
        authenticated: true,
      });
    },
    async setCommentPermission(input) {
      return request({
        method: 'PATCH',
        path: '/users/me/comment-permission',
        schema: meResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async deleteAccount(input) {
      return request({
        method: 'DELETE',
        path: '/users/me',
        schema: accountDeletionResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async exportData() {
      const headers = await requestHeaders(true);
      const response = await fetchFn(`${baseUrl}/users/me/export`, { method: 'GET', headers });
      if (!response.ok) throw toApiError(response, await parseResponse(response));
      return response.blob();
    },
    async getAdminStats() {
      return request({
        method: 'GET',
        path: '/admin/stats',
        schema: adminStatsResponseSchema,
        authenticated: true,
      });
    },
    async listAdminReports(query = {}) {
      return request({
        method: 'GET',
        path: listPath('/admin/reports', {
          cursor: query.cursor,
          limit: query.limit,
          status: query.status,
          reason: query.reason,
          targetType: query.targetType,
        }),
        schema: adminReportListResponseSchema,
        authenticated: true,
      });
    },
    async getAdminReport(id) {
      return request({
        method: 'GET',
        path: `/admin/reports/${encodeURIComponent(id)}`,
        schema: adminReportDetailSchema,
        authenticated: true,
      });
    },
    async resolveAdminReport(id, input) {
      return request({
        method: 'POST',
        path: `/admin/reports/${encodeURIComponent(id)}/resolve`,
        schema: messageResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async listAdminUsers(query = {}) {
      return request({
        method: 'GET',
        path: listPath('/admin/users', { q: query.q, cursor: query.cursor, limit: query.limit }),
        schema: adminUserListResponseSchema,
        authenticated: true,
      });
    },
    async banAdminUser(id, input) {
      return request({
        method: 'POST',
        path: `/admin/users/${encodeURIComponent(id)}/ban`,
        schema: messageResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async unbanAdminUser(id) {
      return request({
        method: 'POST',
        path: `/admin/users/${encodeURIComponent(id)}/unban`,
        schema: messageResponseSchema,
        authenticated: true,
      });
    },
    async forceLogoutAdminUser(id) {
      return request({
        method: 'POST',
        path: `/admin/users/${encodeURIComponent(id)}/force-logout`,
        schema: messageResponseSchema,
        authenticated: true,
      });
    },
    async setAdminUserRole(id, input) {
      return request({
        method: 'POST',
        path: `/admin/users/${encodeURIComponent(id)}/set-role`,
        schema: messageResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async listAdminVideos(query = {}) {
      return request({
        method: 'GET',
        path: listPath('/admin/videos', {
          q: query.q,
          status: query.status,
          cursor: query.cursor,
          limit: query.limit,
        }),
        schema: adminVideoListResponseSchema,
        authenticated: true,
      });
    },
    async removeAdminVideo(id, input) {
      return request({
        method: 'POST',
        path: `/admin/videos/${encodeURIComponent(id)}/remove`,
        schema: messageResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async restoreAdminVideo(id, input) {
      return request({
        method: 'POST',
        path: `/admin/videos/${encodeURIComponent(id)}/restore`,
        schema: messageResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async reprocessAdminVideo(id) {
      return request({
        method: 'POST',
        path: `/admin/videos/${encodeURIComponent(id)}/reprocess`,
        schema: messageResponseSchema,
        authenticated: true,
      });
    },
    async removeAdminComment(id, input) {
      return request({
        method: 'POST',
        path: `/admin/comments/${encodeURIComponent(id)}/remove`,
        schema: messageResponseSchema,
        body: input,
        authenticated: true,
      });
    },
    async getAdminAuditLog(query = {}) {
      return request({
        method: 'GET',
        path: listPath('/admin/audit-log', {
          actor: query.actor,
          action: query.action,
          target: query.target,
          cursor: query.cursor,
          limit: query.limit,
        }),
        schema: auditLogResponseSchema,
        authenticated: true,
      });
    },
    async getAdminQueueHealth() {
      return request({
        method: 'GET',
        path: '/admin/queue-health',
        schema: queueHealthSchema,
        authenticated: true,
      });
    },
    async getSessionTokens() {
      return (await storage?.get()) ?? null;
    },
    clearSession,
  };
}
