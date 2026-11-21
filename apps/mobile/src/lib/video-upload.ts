import type { VideoUploadProgress, VideoUploadTarget } from '@reel/shared';
import * as FileSystem from 'expo-file-system/legacy';

export interface MobileVideoFile {
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * S3 presigned POST requires the file part to be last. expo-file-system's
 * multipart upload appends `parameters` first and the file last on both
 * platforms, so the presigned fields can be passed as `parameters`.
 */
export async function uploadVideoFile(
  target: VideoUploadTarget,
  file: MobileVideoFile,
  options: VideoUploadProgress = {},
): Promise<void> {
  const task = FileSystem.createUploadTask(
    target.url,
    file.uri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: file.mimeType,
      parameters: target.fields,
    },
    (progress) => {
      if (progress.totalBytesExpectedToSend <= 0) return;
      options.onProgress?.(
        Math.round((progress.totalBytesSent / progress.totalBytesExpectedToSend) * 100),
      );
    },
  );

  const abort = () => {
    void task.cancelAsync();
  };
  if (options.signal?.aborted) {
    await task.cancelAsync();
    throw new Error('Upload cancelled');
  }
  options.signal?.addEventListener('abort', abort, { once: true });

  try {
    const result = await task.uploadAsync();
    if (options.signal?.aborted) throw new Error('Upload cancelled');
    if (!result) throw new Error('Upload was cancelled');
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Upload failed with status ${result.status}`);
    }
    options.onProgress?.(100);
  } finally {
    options.signal?.removeEventListener('abort', abort);
  }
}
