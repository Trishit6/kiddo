export interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
  tags?: { rotate?: string; [key: string]: string | undefined };
  side_data_list?: Array<{ rotation?: number | string; [key: string]: unknown }>;
}

export interface ProbeResult {
  streams?: ProbeStream[];
  format?: { duration?: string; format_name?: string };
}

const SUPPORTED_VIDEO_CODECS = new Set(['h264', 'hevc', 'vp8', 'vp9', 'av1', 'mpeg4']);

export function parseProbeJson(raw: string): ProbeResult {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as ProbeResult;
  } catch {
    return {};
  }
}

export function rotationFor(stream: ProbeStream): number {
  const sideRotation = stream.side_data_list?.find((item) => item.rotation !== undefined)?.rotation;
  const raw = Number(sideRotation ?? stream.tags?.rotate ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return ((Math.round(raw) % 360) + 360) % 360;
}

export function displayDimensions(stream: ProbeStream): { width: number; height: number } | null {
  if (!stream.width || !stream.height) return null;
  const rotation = rotationFor(stream);
  return rotation === 90 || rotation === 270
    ? { width: stream.height, height: stream.width }
    : { width: stream.width, height: stream.height };
}

export function durationOf(probe: ProbeResult): number {
  const formatDuration = Number(probe.format?.duration);
  if (Number.isFinite(formatDuration) && formatDuration > 0) return formatDuration;
  for (const stream of probe.streams ?? []) {
    const streamDuration = Number(stream.duration);
    if (Number.isFinite(streamDuration) && streamDuration > 0) return streamDuration;
  }
  return 0;
}

export function videoStreamOf(probe: ProbeResult): ProbeStream | null {
  return probe.streams?.find((stream) => stream.codec_type === 'video') ?? null;
}

export function hasAudioStream(probe: ProbeResult): boolean {
  return (probe.streams ?? []).some((stream) => stream.codec_type === 'audio');
}

export function isSupportedCodec(codec: string | undefined): boolean {
  return codec !== undefined && SUPPORTED_VIDEO_CODECS.has(codec);
}
