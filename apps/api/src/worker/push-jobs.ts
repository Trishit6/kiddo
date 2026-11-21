import { eq, inArray } from 'drizzle-orm';
import { Expo } from 'expo-server-sdk';
import type { PushJobData } from '../lib/notification-jobs.js';
import { pushTokens } from '../db/schema.js';
import type { WorkerContext } from './context.js';

const COLLAPSE_SECONDS = 15 * 60;
const CHUNK_SIZE = 100;

function createExpo(): Expo {
  const token = process.env.EXPO_ACCESS_TOKEN;
  return token ? new Expo({ accessToken: token }) : new Expo();
}

export async function runPushJob(context: WorkerContext, data: PushJobData): Promise<void> {
  const collapseKey = `kiddo:push-collapse:${data.collapseKey}`;
  const first = await context.redis.set(collapseKey, '1', 'EX', COLLAPSE_SECONDS, 'NX');
  if (first !== 'OK') return;

  const rows = await context.db
    .select({ id: pushTokens.id, token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.userId, data.recipientId));

  const valid = rows.filter((row) => Expo.isExpoPushToken(row.token));
  if (valid.length === 0) return;

  const expo = createExpo();
  const message = {
    to: valid.map((row) => row.token),
    title: data.title,
    body: data.body,
    sound: 'default' as const,
    data: { href: data.href, notificationId: data.notificationId },
    channelId: data.href.startsWith('/video/') ? 'activity' : 'default',
  };

  const tickets: { status: string; id?: string; details?: { error?: string } }[] = [];
  for (let index = 0; index < message.to.length; index += CHUNK_SIZE) {
    const chunk = message.to.slice(index, index + CHUNK_SIZE);
    const result = await expo.sendPushNotificationsAsync(chunk.map((to) => ({ ...message, to })));
    tickets.push(...result);
  }

  const receiptIds = tickets
    .filter((ticket) => ticket.status === 'ok' && ticket.id)
    .map((ticket) => ticket.id as string);
  const invalid = tickets.filter((ticket) => {
    const error = ticket.details?.error;
    return error === 'DeviceNotRegistered';
  });
  if (invalid.length > 0) {
    const invalidTokens = new Set(
      valid
        .slice(0, tickets.length)
        .filter((_, index) => invalid.includes(tickets[index]!))
        .map((row) => row.token),
    );
    if (invalidTokens.size > 0) {
      await context.db.delete(pushTokens).where(inArray(pushTokens.token, [...invalidTokens]));
    }
  }

  for (let index = 0; index < receiptIds.length; index += CHUNK_SIZE) {
    const chunk = receiptIds.slice(index, index + CHUNK_SIZE);
    const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
    for (const [id, receipt] of Object.entries(receipts)) {
      if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
        const ticketIndex = tickets.findIndex((ticket) => ticket.id === id);
        const token = ticketIndex >= 0 ? valid[ticketIndex]?.token : undefined;
        if (token) await context.db.delete(pushTokens).where(eq(pushTokens.token, token));
      }
    }
  }
}
