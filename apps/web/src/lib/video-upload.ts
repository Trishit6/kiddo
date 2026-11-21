import type { VideoUploadProgress, VideoUploadTarget } from '@reel/shared';

export interface WebVideoFile {
  file: File;
  filename: string;
  contentType: string;
}

/**
 * fetch() cannot report upload progress, so presigned POST uploads use XHR.
 * S3 requires the file part to be the last multipart field.
 */
export function uploadVideoFile(
  target: VideoUploadTarget,
  input: WebVideoFile,
  options: VideoUploadProgress = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(target.fields)) form.append(key, value);
    form.append('file', input.file, input.filename);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', target.url);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      options.onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () =>
      reject(new Error('Upload failed. Check your network and storage CORS settings.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));

    const abort = () => xhr.abort();
    if (options.signal?.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }
    options.signal?.addEventListener('abort', abort, { once: true });
    xhr.onloadend = () => options.signal?.removeEventListener('abort', abort);
    xhr.send(form);
  });
}

export function videoContentType(file: File): string | null {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'mp4' || extension === 'm4v') return 'video/mp4';
  if (extension === 'mov' || extension === 'qt') return 'video/quicktime';
  if (extension === 'webm') return 'video/webm';
  return null;
}

export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      let duration = video.duration;
      // Some fragmented MP4/MOV files report Infinity until a seek.
      if (!Number.isFinite(duration)) {
        video.currentTime = Number.MAX_SAFE_INTEGER;
        duration = video.duration;
      }
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Could not read the video duration'));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This browser could not read the video. Try MP4 (H.264).'));
    };
    video.src = url;
  });
}
