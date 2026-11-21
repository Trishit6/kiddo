import type { VideoFailure, VideoFailureCode } from '@reel/shared';

export interface VideoLimits {
  maxBytes: number;
  maxSeconds: number;
  minSeconds: number;
  maxDimension: number;
}

interface VideoLimitConfig {
  config: {
    MAX_VIDEO_MB: number;
    MAX_VIDEO_SECONDS: number;
    MIN_VIDEO_SECONDS: number;
    MAX_VIDEO_DIMENSION: number;
  };
}

export function videoLimits(config: VideoLimitConfig): VideoLimits {
  return {
    maxBytes: config.config.MAX_VIDEO_MB * 1024 * 1024,
    maxSeconds: config.config.MAX_VIDEO_SECONDS,
    minSeconds: config.config.MIN_VIDEO_SECONDS,
    maxDimension: config.config.MAX_VIDEO_DIMENSION,
  };
}

const FAILURE_MESSAGES: Record<VideoFailureCode, string> = {
  video_too_long: 'Video is longer than the allowed duration',
  video_too_short: 'Video is too short',
  video_too_large: 'Video is larger than the allowed size',
  unsupported_format: 'Unsupported video format',
  unsupported_codec: 'Unsupported video codec',
  dimensions_too_large: 'Video dimensions are too large',
  corrupt_file: 'Video could not be read',
  no_video_stream: 'The file does not contain a video stream',
  processing_timeout: 'Processing took too long, please try again',
  processing_failed: 'Processing failed, please try again',
};

export function failureMessage(code: VideoFailureCode, maxSeconds?: number): string {
  if (code === 'video_too_long' && maxSeconds) {
    return `Video is longer than ${maxSeconds} seconds`;
  }
  return FAILURE_MESSAGES[code];
}

export function videoFailure(code: VideoFailureCode, maxSeconds?: number): VideoFailure {
  return { code, message: failureMessage(code, maxSeconds) };
}

export class VideoProcessingError extends Error {
  readonly code: VideoFailureCode;

  constructor(code: VideoFailureCode, technicalMessage?: string) {
    super(technicalMessage ?? failureMessage(code));
    this.name = 'VideoProcessingError';
    this.code = code;
  }
}
