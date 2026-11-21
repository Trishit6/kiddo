import { createReadStream } from 'node:fs';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { Client as MinioClient } from 'minio';
import type { Env } from '../env.js';
import type { RenditionPlan } from '../lib/renditions.js';
import {
  hlsMasterKey,
  hlsRenditionPlaylistKey,
  hlsRenditionSegmentKey,
  thumbnailKey,
} from '../lib/storage-keys.js';
import { VideoProcessingError } from '../lib/video-limits.js';
import { runCommand } from './command.js';
import type { ProbeSummary } from './probe.js';

const SEGMENT_SECONDS = 4;
const THREADS = '2';

const CONTENT_TYPES: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.m4s': 'video/mp4',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
};

function contentTypeFor(filename: string): string {
  return CONTENT_TYPES[extname(filename).toLowerCase()] ?? 'application/octet-stream';
}

function cacheControlFor(filename: string): string {
  if (filename.endsWith('.m3u8')) return 'public, max-age=60';
  if (filename.endsWith('.ts') || filename.endsWith('.m4s')) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=86400';
}

export async function transcodeRendition(
  input: string,
  outputDir: string,
  plan: RenditionPlan,
  probe: ProbeSummary,
  config: Env,
  onProgress: (percent: number) => void,
): Promise<string> {
  const playlist = join(outputDir, 'index.m3u8');
  const args = [
    '-hide_banner',
    '-y',
    '-i',
    input,
    '-map',
    '0:v:0',
    ...(probe.hasAudio ? ['-map', '0:a:0?'] : []),
    '-vf',
    `scale=${plan.width}:${plan.height}`,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '21',
    '-maxrate',
    String(plan.maxrate),
    '-bufsize',
    String(plan.bufsize),
    '-force_key_frames',
    `expr:gte(t,n_forced*${SEGMENT_SECONDS})`,
    '-sc_threshold',
    '0',
    '-threads',
    THREADS,
    '-filter_threads',
    THREADS,
    '-map_metadata',
    '-1',
    ...(probe.hasAudio
      ? ['-c:a', 'aac', '-b:a', String(plan.audioBitrate), '-ac', '2', '-ar', '48000']
      : ['-an']),
    // HLS does not use the MP4 moov atom, so +faststart is intentionally not
    // applied here. The playlist and segments are served directly.
    '-f',
    'hls',
    '-hls_time',
    String(SEGMENT_SECONDS),
    '-hls_playlist_type',
    'vod',
    '-hls_list_size',
    '0',
    '-hls_segment_filename',
    join(outputDir, 'segment-%03d.ts'),
    '-progress',
    'pipe:1',
    '-nostats',
    playlist,
  ];

  await runCommand(config.FFMPEG_PATH, args, {
    timeoutMs: 20 * 60 * 1000,
    onStdoutLine(line) {
      const match = /^out_time_(?:us|ms)=(\d+)$/.exec(line);
      if (!match?.[1]) {
        if (line === 'progress=end') onProgress(100);
        return;
      }
      const seconds = Number(match[1]) / 1_000_000;
      if (probe.duration > 0) {
        onProgress(Math.min(100, Math.max(0, (seconds / probe.duration) * 100)));
      }
    },
  });

  try {
    await stat(playlist);
  } catch {
    throw new VideoProcessingError('processing_failed', 'ffmpeg did not create a playlist');
  }
  return playlist;
}

export async function generateThumbnail(
  input: string,
  output: string,
  probe: ProbeSummary,
  config: Env,
): Promise<void> {
  const offset = Math.max(0.1, Math.min(1, probe.duration * 0.1));
  const width = Math.min(720, probe.width);
  const ratio = probe.height / probe.width;
  const height = Math.max(2, Math.round((width * ratio) / 2) * 2);
  await runCommand(
    config.FFMPEG_PATH,
    [
      '-hide_banner',
      '-y',
      '-ss',
      offset.toFixed(3),
      '-i',
      input,
      '-frames:v',
      '1',
      '-vf',
      `scale=${width}:${height}`,
      '-q:v',
      '3',
      '-map_metadata',
      '-1',
      output,
    ],
    { timeoutMs: 60_000 },
  );
}

export async function writeMasterPlaylist(
  path: string,
  plans: RenditionPlan[],
  hasAudio: boolean,
): Promise<void> {
  const codecs = hasAudio ? 'avc1.4d401f,mp4a.40.2' : 'avc1.4d401f';
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    ...plans.flatMap((plan) => [
      `#EXT-X-STREAM-INF:BANDWIDTH=${plan.bandwidth},RESOLUTION=${plan.width}x${plan.height},CODECS="${codecs}"`,
      `${plan.label}/index.m3u8`,
    ]),
    '',
  ];
  await writeFile(path, lines.join('\n'), 'utf8');
}

export interface UploadContext {
  s3: MinioClient;
  bucket: string;
}

async function uploadFile(
  upload: UploadContext,
  localPath: string,
  key: string,
  filename: string,
): Promise<void> {
  const info = await stat(localPath);
  await upload.s3.putObject(upload.bucket, key, createReadStream(localPath), info.size, {
    'Content-Type': contentTypeFor(filename),
    'Cache-Control': cacheControlFor(filename),
  });
}

export async function uploadOutputs(
  upload: UploadContext,
  videoId: string,
  masterPath: string,
  thumbnailPath: string,
  renditionDirs: Array<{ label: string; dir: string }>,
  onProgress: (percent: number) => void,
): Promise<{ storageKey: string; thumbnailKey: string }> {
  const files: Array<{ local: string; key: string; name: string }> = [
    { local: masterPath, key: hlsMasterKey(videoId), name: 'master.m3u8' },
    { local: thumbnailPath, key: thumbnailKey(videoId), name: 'thumb.jpg' },
  ];
  for (const rendition of renditionDirs) {
    const relativeFiles = await readdir(rendition.dir, { recursive: true });
    for (const relative of relativeFiles) {
      const name = relative.split(/[\\/]/).pop() ?? relative;
      files.push({
        local: join(rendition.dir, relative),
        key: hlsRenditionSegmentKey(videoId, rendition.label, relative.replace(/\\/g, '/')),
        name,
      });
    }
  }

  for (const [index, file] of files.entries()) {
    await uploadFile(upload, file.local, file.key, file.name);
    onProgress(Math.round(((index + 1) / files.length) * 100));
  }

  return { storageKey: hlsMasterKey(videoId), thumbnailKey: thumbnailKey(videoId) };
}

export function renditionPlaylistKey(videoId: string, label: string): string {
  return hlsRenditionPlaylistKey(videoId, label);
}
