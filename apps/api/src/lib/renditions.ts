export interface RenditionPlan {
  label: string;
  width: number;
  height: number;
  videoBitrate: number;
  audioBitrate: number;
  bandwidth: number;
  maxrate: number;
  bufsize: number;
}

interface Target {
  label: string;
  shortSide: number;
  videoBitrate: number;
  audioBitrate: number;
  maxrate: number;
  bufsize: number;
}

const TARGETS: Target[] = [
  {
    label: '720p',
    shortSide: 720,
    videoBitrate: 2_800_000,
    audioBitrate: 128_000,
    maxrate: 3_000_000,
    bufsize: 6_000_000,
  },
  {
    label: '360p',
    shortSide: 360,
    videoBitrate: 800_000,
    audioBitrate: 96_000,
    maxrate: 900_000,
    bufsize: 1_800_000,
  },
];

function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

function scaledDimensions(width: number, height: number, shortSide: number) {
  if (width <= height) {
    return { width: even(shortSide), height: even((height / width) * shortSide) };
  }
  return { width: even((width / height) * shortSide), height: even(shortSide) };
}

/**
 * Picks 720p/360p without upscaling. Sources below 360p get a single source-size
 * rendition so playback still works.
 */
export function planRenditions(width: number, height: number): RenditionPlan[] {
  const short = Math.min(width, height);
  const plans = TARGETS.filter((target) => short >= target.shortSide).map((target) => {
    const size = scaledDimensions(width, height, target.shortSide);
    return {
      label: target.label,
      ...size,
      videoBitrate: target.videoBitrate,
      audioBitrate: target.audioBitrate,
      maxrate: target.maxrate,
      bufsize: target.bufsize,
      bandwidth: target.maxrate + target.audioBitrate + 32_000,
    };
  });
  if (plans.length > 0) return plans;

  const size = { width: even(width), height: even(height) };
  return [
    {
      label: 'source',
      ...size,
      videoBitrate: 600_000,
      audioBitrate: 96_000,
      maxrate: 700_000,
      bufsize: 1_400_000,
      bandwidth: 700_000 + 96_000 + 32_000,
    },
  ];
}
