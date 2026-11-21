import * as FileSystem from 'expo-file-system/legacy';
import type { ImagePickerAsset } from 'expo-image-picker';
import {
  DEFAULT_MAX_VIDEO_MB,
  MAX_VIDEO_DURATION_SECONDS,
  MIN_VIDEO_DURATION_SECONDS,
  SUPPORTED_VIDEO_MIME_TYPES,
  type VideoContentType,
} from '@reel/shared';

export interface SelectedVideo {
  uri: string;
  filename: string;
  contentType: VideoContentType;
  sizeBytes: number;
  durationSeconds: number;
}

export type SelectionResult = { video: SelectedVideo } | { error: string };

function contentTypeFromName(name: string, mime?: string | null): VideoContentType | null {
  const normalized = mime?.toLowerCase();
  if (normalized && (SUPPORTED_VIDEO_MIME_TYPES as readonly string[]).includes(normalized)) {
    return normalized as VideoContentType;
  }
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'mp4' || extension === 'm4v') return 'video/mp4';
  if (extension === 'mov' || extension === 'qt') return 'video/quicktime';
  if (extension === 'webm') return 'video/webm';
  return null;
}

async function fileSize(uri: string, known?: number | null): Promise<number | null> {
  if (typeof known === 'number' && known > 0) return known;
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) return null;
  return info.size;
}

export function limitsError(sizeBytes: number, durationSeconds: number): string | null {
  if (durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    return `Videos must be ${MAX_VIDEO_DURATION_SECONDS} seconds or shorter.`;
  }
  if (durationSeconds < MIN_VIDEO_DURATION_SECONDS) {
    return 'That video is too short. Record at least one second.';
  }
  if (sizeBytes > DEFAULT_MAX_VIDEO_MB * 1024 * 1024) {
    return `Videos must be ${DEFAULT_MAX_VIDEO_MB} MB or smaller. Try a shorter clip.`;
  }
  return null;
}

export async function fromPickerAsset(asset: ImagePickerAsset): Promise<SelectionResult> {
  const name = asset.fileName ?? asset.uri;
  const contentType = contentTypeFromName(name, asset.mimeType);
  if (!contentType) return { error: 'Choose an MP4, MOV or WebM video.' };
  const durationSeconds = typeof asset.duration === 'number' ? asset.duration / 1000 : null;
  if (durationSeconds === null) return { error: 'Could not read that video’s duration.' };
  const sizeBytes = await fileSize(asset.uri, asset.fileSize);
  if (sizeBytes === null) return { error: 'Could not read that video.' };
  const limit = limitsError(sizeBytes, durationSeconds);
  if (limit) return { error: limit };
  const extension =
    contentType === 'video/quicktime' ? 'mov' : contentType === 'video/webm' ? 'webm' : 'mp4';
  return {
    video: {
      uri: asset.uri,
      filename: asset.fileName ?? `video-${Date.now()}.${extension}`,
      contentType,
      sizeBytes,
      durationSeconds,
    },
  };
}

export async function fromRecording(
  uri: string,
  durationSeconds: number,
): Promise<SelectionResult> {
  const name = uri.split('/').pop() ?? `recording-${Date.now()}.mp4`;
  const contentType = contentTypeFromName(name, null) ?? 'video/mp4';
  const sizeBytes = await fileSize(uri);
  if (sizeBytes === null) return { error: 'Could not read the recording.' };
  const limit = limitsError(sizeBytes, durationSeconds);
  if (limit) return { error: limit };
  return {
    video: {
      uri,
      filename: name.includes('.') ? name : `${name}.mp4`,
      contentType,
      sizeBytes,
      durationSeconds,
    },
  };
}
