import type { VideoStatus } from '@reel/shared';
import { AppError } from './errors.js';

const ALLOWED_TRANSITIONS: Record<VideoStatus, VideoStatus[]> = {
  uploading: ['processing'],
  processing: ['ready', 'failed'],
  ready: [],
  failed: ['processing'],
};

export function canTransition(from: VideoStatus, to: VideoStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: VideoStatus, to: VideoStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError(409, 'VIDEO_INVALID_STATE', `Cannot move a video from ${from} to ${to}`);
  }
}
