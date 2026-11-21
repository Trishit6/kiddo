import { describe, expect, it } from 'vitest';
import {
  hlsMasterKey,
  hlsRenditionPlaylistKey,
  hlsRenditionSegmentKey,
  mediaUrl,
  originalKey,
  thumbnailKey,
  videoStoragePrefixes,
} from './storage-keys.js';

describe('storage keys', () => {
  const id = '11111111-1111-4111-8111-111111111111';

  it('uses server-generated paths', () => {
    expect(originalKey(id)).toBe(`originals/${id}/source`);
    expect(hlsMasterKey(id)).toBe(`videos/${id}/hls/master.m3u8`);
    expect(hlsRenditionPlaylistKey(id, '720p')).toBe(`videos/${id}/hls/720p/index.m3u8`);
    expect(hlsRenditionSegmentKey(id, '360p', 'segment-001.ts')).toBe(
      `videos/${id}/hls/360p/segment-001.ts`,
    );
    expect(thumbnailKey(id)).toBe(`videos/${id}/thumb.jpg`);
    expect(videoStoragePrefixes(id)).toEqual([`originals/${id}/`, `videos/${id}/`]);
  });

  it('builds public URLs from MEDIA_PUBLIC_BASE_URL and encodes segments', () => {
    const app = { config: { MEDIA_PUBLIC_BASE_URL: 'https://cdn.example.com/media/' } };
    expect(mediaUrl(app, `videos/${id}/hls/master.m3u8`)).toBe(
      `https://cdn.example.com/media/videos/${id}/hls/master.m3u8`,
    );
  });
});
