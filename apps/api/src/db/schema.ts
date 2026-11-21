import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const videoStatusEnum = pgEnum('video_status', [
  'uploading',
  'processing',
  'ready',
  'failed',
]);
export const visibilityEnum = pgEnum('visibility', ['public', 'unlisted', 'private']);
export const reportReasonEnum = pgEnum('report_reason', [
  'spam',
  'nudity_sexual',
  'violence',
  'hate_harassment',
  'self_harm',
  'minor_safety',
  'illegal',
  'intellectual_property',
  'other',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'like',
  'comment',
  'reply',
  'comment_like',
  'follow',
  'mention',
  'video_ready',
  'video_failed',
  'moderation',
]);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'banned']);
export const commentPermissionEnum = pgEnum('comment_permission', [
  'everyone',
  'followers',
  'nobody',
]);
export const reportTargetTypeEnum = pgEnum('report_target_type', ['video', 'comment', 'user']);
export const reportStatusEnum = pgEnum('report_status', ['pending', 'actioned', 'dismissed']);
export const oauthProviderEnum = pgEnum('oauth_provider', ['google']);
export const emailTokenTypeEnum = pgEnum('email_token_type', ['verify_email', 'reset_password']);

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    username: text('username').notNull(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash'),
    avatarKey: text('avatar_key'),
    bio: text('bio').notNull().default(''),
    followersCount: integer('followers_count').notNull().default(0),
    followingCount: integer('following_count').notNull().default(0),
    isAdmin: boolean('is_admin').notNull().default(false),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    role: userRoleEnum('role').notNull().default('user'),
    status: userStatusEnum('status').notNull().default('active'),
    bannedUntil: timestamp('banned_until', { withTimezone: true }),
    commentPermission: commentPermissionEnum('comment_permission').notNull().default('everyone'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    scheduledPurgeAt: timestamp('scheduled_purge_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    uniqueIndex('users_username_ci_unique').on(sql`lower(${table.username})`),
    index('users_username_trgm_idx').using('gin', sql`lower(${table.username}) gin_trgm_ops`),
    index('users_display_name_trgm_idx').using(
      'gin',
      sql`lower(${table.displayName}) gin_trgm_ops`,
    ),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    familyId: uuid('family_id').notNull().defaultRandom(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedBy: uuid('replaced_by').references((): AnyPgColumn => refreshTokens.id, {
      onDelete: 'set null',
    }),
    userAgent: text('user_agent'),
    ip: text('ip'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('refresh_tokens_hash_unique').on(table.tokenHash),
    index('refresh_tokens_user_idx').on(table.userId),
    index('refresh_tokens_family_idx').on(table.familyId),
  ],
);

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: oauthProviderEnum('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    email: text('email'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('oauth_accounts_provider_account_unique').on(
      table.provider,
      table.providerAccountId,
    ),
    index('oauth_accounts_user_idx').on(table.userId),
  ],
);

export const emailTokens = pgTable(
  'email_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: emailTokenTypeEnum('type').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('email_tokens_hash_unique').on(table.tokenHash),
    index('email_tokens_user_type_idx').on(table.userId, table.type),
  ],
);

export const videos = pgTable(
  'videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    caption: text('caption').notNull().default(''),
    captionSearch: tsvector('caption_search')
      .notNull()
      .generatedAlwaysAs(sql`to_tsvector('english', caption)`),
    status: videoStatusEnum('status').notNull().default('uploading'),
    durationSeconds: integer('duration_seconds'),
    width: integer('width'),
    height: integer('height'),
    originalKey: text('original_key'),
    processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
    originalDeleteAt: timestamp('original_delete_at', { withTimezone: true }),
    storageCleanedAt: timestamp('storage_cleaned_at', { withTimezone: true }),
    failureCode: text('failure_code'),
    failureMessage: text('failure_message'),
    storageKey: text('storage_key'),
    thumbnailKey: text('thumbnail_key'),
    likesCount: integer('likes_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    viewsCount: integer('views_count').notNull().default(0),
    sharesCount: integer('shares_count').notNull().default(0),
    savesCount: integer('saves_count').notNull().default(0),
    hotScore: doublePrecision('hot_score').notNull().default(0),
    visibility: visibilityEnum('visibility').notNull().default('public'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('videos_owner_created_idx').on(table.ownerId, table.createdAt),
    index('videos_status_created_idx').on(table.status, table.createdAt),
    index('videos_public_feed_idx').on(table.status, table.visibility, table.createdAt),
    index('videos_hot_created_idx').on(table.hotScore, table.createdAt),
    index('videos_caption_search_idx').using('gin', table.captionSearch),
  ],
);

export const videoRenditions = pgTable(
  'video_renditions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    storageKey: text('storage_key').notNull(),
    codec: text('codec').notNull().default('h264'),
    bitrate: integer('bitrate'),
    ...timestamps,
  },
  (table) => [uniqueIndex('video_renditions_video_label_unique').on(table.videoId, table.label)],
);

export const likes = pgTable(
  'likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('likes_user_video_unique').on(table.userId, table.videoId),
    index('likes_user_idx').on(table.userId),
    index('likes_video_idx').on(table.videoId),
    index('likes_user_created_idx').on(table.userId, table.createdAt, table.id),
  ],
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, {
      onDelete: 'cascade',
    }),
    body: text('body').notNull(),
    likesCount: integer('likes_count').notNull().default(0),
    replyCount: integer('replies_count').notNull().default(0),
    replyToUserId: uuid('reply_to_user_id').references(() => users.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('comments_video_created_idx').on(table.videoId, table.createdAt),
    index('comments_parent_idx').on(table.parentId),
    index('comments_video_parent_created_idx').on(
      table.videoId,
      table.parentId,
      table.createdAt,
      table.id,
    ),
    index('comments_parent_created_idx').on(table.parentId, table.createdAt, table.id),
    index('comments_video_top_likes_idx').on(
      table.videoId,
      table.parentId,
      table.likesCount,
      table.createdAt,
      table.id,
    ),
  ],
);

export const commentLikes = pgTable(
  'comment_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('comment_likes_user_comment_unique').on(table.userId, table.commentId),
    index('comment_likes_comment_idx').on(table.commentId),
  ],
);

export const follows = pgTable(
  'follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('follows_pair_unique').on(table.followerId, table.followingId),
    index('follows_follower_idx').on(table.followerId),
    index('follows_following_idx').on(table.followingId),
    index('follows_follower_created_idx').on(table.followerId, table.createdAt, table.id),
    index('follows_following_created_idx').on(table.followingId, table.createdAt, table.id),
  ],
);

export const saves = pgTable(
  'saves',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('saves_user_video_unique').on(table.userId, table.videoId),
    index('saves_user_idx').on(table.userId),
    index('saves_user_created_idx').on(table.userId, table.createdAt, table.id),
  ],
);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    videoId: uuid('video_id').references(() => videos.id, { onDelete: 'cascade' }),
    targetType: reportTargetTypeEnum('target_type').notNull().default('video'),
    targetId: uuid('target_id').notNull(),
    reason: reportReasonEnum('reason').notNull(),
    details: text('details'),
    status: reportStatusEnum('status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    resolution: text('resolution'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('reports_reporter_target_unique').on(
      table.reporterId,
      table.targetType,
      table.targetId,
    ),
    index('reports_target_idx').on(table.targetType, table.targetId),
    index('reports_status_created_idx').on(table.status, table.createdAt),
  ],
);

export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('blocks_pair_unique').on(table.blockerId, table.blockedId),
    index('blocks_blocked_idx').on(table.blockedId),
  ],
);

export const notInterested = pgTable(
  'not_interested',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessFromAuthor: boolean('less_from_author').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('not_interested_user_video_unique').on(table.userId, table.videoId),
    index('not_interested_author_idx').on(table.userId, table.authorId),
  ],
);

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    platform: text('platform').notNull(),
    deviceId: text('device_id').notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('push_tokens_token_unique').on(table.token),
    uniqueIndex('push_tokens_user_device_unique').on(table.userId, table.deviceId),
    index('push_tokens_user_idx').on(table.userId),
  ],
);

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  likePush: boolean('like_push').notNull().default(true),
  likeInApp: boolean('like_in_app').notNull().default(true),
  commentPush: boolean('comment_push').notNull().default(true),
  commentInApp: boolean('comment_in_app').notNull().default(true),
  replyPush: boolean('reply_push').notNull().default(true),
  replyInApp: boolean('reply_in_app').notNull().default(true),
  commentLikePush: boolean('comment_like_push').notNull().default(true),
  commentLikeInApp: boolean('comment_like_in_app').notNull().default(true),
  followPush: boolean('follow_push').notNull().default(true),
  followInApp: boolean('follow_in_app').notNull().default(true),
  mentionPush: boolean('mention_push').notNull().default(true),
  mentionInApp: boolean('mention_in_app').notNull().default(true),
  videoReadyPush: boolean('video_ready_push').notNull().default(true),
  videoReadyInApp: boolean('video_ready_in_app').notNull().default(true),
  videoFailedPush: boolean('video_failed_push').notNull().default(true),
  videoFailedInApp: boolean('video_failed_in_app').notNull().default(true),
  moderationPush: boolean('moderation_push').notNull().default(true),
  moderationInApp: boolean('moderation_in_app').notNull().default(true),
  ...timestamps,
});

export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    reason: text('reason'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('admin_audit_actor_created_idx').on(table.actorId, table.createdAt),
    index('admin_audit_target_idx').on(table.targetType, table.targetId),
    index('admin_audit_created_idx').on(table.createdAt),
  ],
);

export const videoViews = pgTable(
  'video_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    userId: uuid('viewer_id').references(() => users.id, { onDelete: 'set null' }),
    anonId: text('anon_id'),
    watchedMs: integer('watched_ms').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index('video_views_video_created_idx').on(table.videoId, table.createdAt),
    index('video_views_user_created_idx').on(table.userId, table.createdAt),
    index('video_views_anon_created_idx').on(table.anonId, table.createdAt),
  ],
);

export const hashtags = pgTable(
  'hashtags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('hashtags_name_unique').on(table.name),
    index('hashtags_name_prefix_idx').on(sql`${table.name} text_pattern_ops`),
  ],
);

export const videoHashtags = pgTable(
  'video_hashtags',
  {
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    hashtagId: uuid('hashtag_id')
      .notNull()
      .references(() => hashtags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.videoId, table.hashtagId] }),
    index('video_hashtags_hashtag_video_idx').on(table.hashtagId, table.videoId),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorIds: jsonb('actor_ids').$type<string[]>().notNull().default([]),
    actorCount: integer('actor_count').notNull().default(1),
    type: notificationTypeEnum('type').notNull(),
    videoId: uuid('video_id').references(() => videos.id, { onDelete: 'cascade' }),
    commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
    groupKey: text('group_key'),
    payload: jsonb('payload').$type<Record<string, string>>().notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('notifications_user_created_idx').on(table.userId, table.createdAt),
    index('notifications_user_read_idx').on(table.userId, table.readAt),
    uniqueIndex('notifications_unread_group_unique')
      .on(table.userId, table.groupKey)
      .where(sql`${table.readAt} is null`),
  ],
);
