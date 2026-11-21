import type { Env } from '../env.js';
import {
  displayDimensions,
  durationOf,
  hasAudioStream,
  isSupportedCodec,
  parseProbeJson,
  videoStreamOf,
} from '../lib/ffprobe.js';
import { VideoProcessingError } from '../lib/video-limits.js';
import { runCommand } from './command.js';

export interface ProbeSummary {
  duration: number;
  width: number;
  height: number;
  codec: string;
  hasAudio: boolean;
}

export async function probeVideo(file: string, config: Env): Promise<ProbeSummary> {
  let stdout: string;
  try {
    const result = await runCommand(
      config.FFPROBE_PATH,
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file],
      { timeoutMs: 60_000 },
    );
    stdout = result.stdout;
  } catch {
    throw new VideoProcessingError('corrupt_file', 'ffprobe could not read the uploaded file');
  }

  const probe = parseProbeJson(stdout);
  const stream = videoStreamOf(probe);
  if (!stream) throw new VideoProcessingError('no_video_stream');
  if (!isSupportedCodec(stream.codec_name)) {
    throw new VideoProcessingError(
      'unsupported_codec',
      `Unsupported video codec: ${stream.codec_name ?? 'unknown'}`,
    );
  }

  const duration = durationOf(probe);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new VideoProcessingError('corrupt_file', 'Could not determine video duration');
  }
  if (duration < config.MIN_VIDEO_SECONDS) throw new VideoProcessingError('video_too_short');
  if (duration > config.MAX_VIDEO_SECONDS) throw new VideoProcessingError('video_too_long');

  const dimensions = displayDimensions(stream);
  if (!dimensions) throw new VideoProcessingError('corrupt_file', 'Video has no dimensions');
  if (
    dimensions.width > config.MAX_VIDEO_DIMENSION ||
    dimensions.height > config.MAX_VIDEO_DIMENSION
  ) {
    throw new VideoProcessingError('dimensions_too_large');
  }

  return {
    duration,
    width: dimensions.width,
    height: dimensions.height,
    codec: stream.codec_name ?? 'unknown',
    hasAudio: hasAudioStream(probe),
  };
}
