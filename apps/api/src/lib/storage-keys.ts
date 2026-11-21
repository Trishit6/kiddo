interface MediaConfig {
  config: { MEDIA_PUBLIC_BASE_URL: string };
}

export function originalKey(videoId: string): string {
  return `originals/${videoId}/source`;
}

export function hlsMasterKey(videoId: string): string {
  return `videos/${videoId}/hls/master.m3u8`;
}

export function hlsRenditionPlaylistKey(videoId: string, label: string): string {
  return `videos/${videoId}/hls/${label}/index.m3u8`;
}

export function hlsRenditionSegmentKey(videoId: string, label: string, filename: string): string {
  return `videos/${videoId}/hls/${label}/${filename}`;
}

export function thumbnailKey(videoId: string): string {
  return `videos/${videoId}/thumb.jpg`;
}

export function videoStoragePrefixes(videoId: string): string[] {
  return [`originals/${videoId}/`, `videos/${videoId}/`];
}

export function mediaUrl(app: MediaConfig, key: string): string {
  const base = app.config.MEDIA_PUBLIC_BASE_URL.replace(/\/$/, '');
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  return `${base}/${encoded}`;
}
