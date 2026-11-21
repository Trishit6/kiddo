import { Share } from 'react-native';
import type { FeedItem } from '@reel/shared';

const webBaseUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

export function videoShareUrl(videoId: string): string {
  return `${webBaseUrl}/s/${videoId}`;
}

export function profileShareUrl(username: string): string {
  return `${webBaseUrl}/@${username}`;
}

/**
 * Opens the native share sheet. Android always reports "shared"; iOS reports
 * "dismissed" when the sheet is cancelled, which must not count as a share.
 */
export async function shareVideoLink(item: FeedItem): Promise<boolean> {
  const url = videoShareUrl(item.video.id);
  const result = await Share.share(
    {
      title: item.video.caption || `@${item.author.username} on Kiddo`,
      message: item.video.caption ? `${item.video.caption}\n${url}` : url,
      url,
    },
    { dialogTitle: 'Share this video' },
  );
  return result.action !== Share.dismissedAction;
}
