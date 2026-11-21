import { and, eq, isNull } from 'drizzle-orm';
import type { Queue } from 'bullmq';
import type { NotificationPreference, NotificationType } from '@reel/shared';
import { notifications, notificationPreferences } from '../db/schema.js';
import { isBlockedPair } from '../lib/blocks.js';
import { enqueuePush, type NotificationJobData } from '../lib/notification-jobs.js';
import type { WorkerContext } from './context.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const PREFERENCE_KEYS: Record<
  NotificationType,
  { inApp: keyof NotificationPreference; push: keyof NotificationPreference }
> = {
  like: { inApp: 'likeInApp', push: 'likePush' },
  comment: { inApp: 'commentInApp', push: 'commentPush' },
  reply: { inApp: 'replyInApp', push: 'replyPush' },
  comment_like: { inApp: 'commentLikeInApp', push: 'commentLikePush' },
  follow: { inApp: 'followInApp', push: 'followPush' },
  mention: { inApp: 'mentionInApp', push: 'mentionPush' },
  video_ready: { inApp: 'videoReadyInApp', push: 'videoReadyPush' },
  video_failed: { inApp: 'videoFailedInApp', push: 'videoFailedPush' },
  moderation: { inApp: 'moderationInApp', push: 'moderationPush' },
};

function defaultPreferences(): NotificationPreference {
  return {
    likePush: true,
    likeInApp: true,
    commentPush: true,
    commentInApp: true,
    replyPush: true,
    replyInApp: true,
    commentLikePush: true,
    commentLikeInApp: true,
    followPush: true,
    followInApp: true,
    mentionPush: true,
    mentionInApp: true,
    videoReadyPush: true,
    videoReadyInApp: true,
    videoFailedPush: true,
    videoFailedInApp: true,
    moderationPush: true,
    moderationInApp: true,
  };
}

export function notificationText(
  type: NotificationType,
  actorUsername: string | null,
  actorCount: number,
): { title: string; body: string } {
  const name = actorUsername ?? 'Someone';
  switch (type) {
    case 'like':
      return {
        title: 'New like',
        body:
          actorCount > 1
            ? `${name} and ${actorCount - 1} others liked your video`
            : `${name} liked your video`,
      };
    case 'comment':
      return { title: 'New comment', body: `${name} commented on your video` };
    case 'reply':
      return { title: 'New reply', body: `${name} replied to your comment` };
    case 'comment_like':
      return {
        title: 'New comment like',
        body:
          actorCount > 1
            ? `${name} and ${actorCount - 1} others liked your comment`
            : `${name} liked your comment`,
      };
    case 'follow':
      return {
        title: 'New follower',
        body:
          actorCount > 1
            ? `${name} and ${actorCount - 1} others followed you`
            : `${name} followed you`,
      };
    case 'mention':
      return { title: 'You were mentioned', body: `${name} mentioned you` };
    case 'video_ready':
      return { title: 'Your video is ready', body: 'Your video has been published.' };
    case 'video_failed':
      return {
        title: 'Video processing failed',
        body: 'We could not process your video. Try again.',
      };
    case 'moderation':
      return { title: 'Kiddo moderation', body: 'An update about your content.' };
  }
}

export async function runNotificationJob(
  context: WorkerContext,
  pushQueue: Queue,
  data: NotificationJobData,
): Promise<void> {
  if (data.actorId && data.actorId === data.recipientId) return;
  if (data.actorId && (await isBlockedPair(context.db, data.actorId, data.recipientId))) return;

  const prefRows = await context.db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, data.recipientId))
    .limit(1);
  const preferences = (prefRows[0] as NotificationPreference | undefined) ?? defaultPreferences();
  const keys = PREFERENCE_KEYS[data.type];
  if (!preferences[keys.inApp]) return;

  const groupKey = data.groupKey ?? `${data.type}:${data.videoId ?? ''}:${data.commentId ?? ''}`;
  const existingRows = await context.db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, data.recipientId),
        eq(notifications.groupKey, groupKey),
        isNull(notifications.readAt),
      ),
    )
    .limit(1);
  const existing = existingRows[0];

  let notificationId: string;
  let actorCount = 1;
  if (existing) {
    if (
      data.actorId &&
      existing.actorIds.includes(data.actorId) &&
      Date.now() - existing.createdAt.getTime() < DAY_MS
    ) {
      return;
    }
    notificationId = existing.id;
    actorCount = existing.actorCount + 1;
    await context.db
      .update(notifications)
      .set({
        actorIds: data.actorId
          ? [data.actorId, ...existing.actorIds.filter((id) => id !== data.actorId)].slice(0, 3)
          : existing.actorIds,
        actorCount,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, existing.id));
  } else {
    const inserted = await context.db
      .insert(notifications)
      .values({
        userId: data.recipientId,
        actorId: data.actorId,
        actorIds: data.actorId ? [data.actorId] : [],
        actorCount: 1,
        type: data.type,
        videoId: data.videoId,
        commentId: data.commentId,
        groupKey,
        payload: {
          commentSnippet: data.commentText ?? '',
          actorUsername: data.actorUsername ?? '',
        },
      })
      .returning({ id: notifications.id });
    const row = inserted[0];
    if (!row) return;
    notificationId = row.id;
  }

  const { title, body } = notificationText(data.type, data.actorUsername, actorCount);
  const unread = await context.db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, data.recipientId), isNull(notifications.readAt)));
  await context.redis.publish(
    `kiddo:notifications:${data.recipientId}`,
    JSON.stringify({ type: 'unread-count', count: unread.length }),
  );

  if (preferences[keys.push]) {
    await enqueuePush(pushQueue, {
      notificationId,
      recipientId: data.recipientId,
      collapseKey: groupKey,
      title,
      body,
      href: data.videoId ? `/video/${data.videoId}` : '/inbox',
    });
  }
}
