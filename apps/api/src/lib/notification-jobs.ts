import type { Queue } from 'bullmq';
import type { NotificationType } from '@reel/shared';

export interface NotificationJobData {
  type: NotificationType;
  recipientId: string;
  actorId: string | null;
  videoId: string | null;
  commentId: string | null;
  commentText: string | null;
  groupKey: string | null;
  actorUsername: string | null;
}

export interface PushJobData {
  notificationId: string;
  recipientId: string;
  collapseKey: string;
  title: string;
  body: string;
  href: string;
}

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: { count: 5_000 },
} as const;

export async function enqueueNotification(queue: Queue, data: NotificationJobData): Promise<void> {
  const dedupe = data.type === 'like' || data.type === 'comment_like' || data.type === 'follow';
  await queue.add('create-notification', data, {
    ...JOB_OPTIONS,
    ...(dedupe && data.actorId
      ? { jobId: `notify:${data.type}:${data.actorId}:${data.groupKey ?? data.recipientId}` }
      : {}),
  });
}

export async function enqueuePush(queue: Queue, data: PushJobData): Promise<void> {
  await queue.add('send-push', data, {
    ...JOB_OPTIONS,
    jobId: `push:${data.notificationId}`,
  });
}
