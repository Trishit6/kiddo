import { describe, expect, it } from 'vitest';
import { failureMessage } from './video-limits.js';
import { planRenditions } from './renditions.js';

describe('video limits', () => {
  it('produces user-safe failure messages', () => {
    expect(failureMessage('video_too_long', 60)).toBe('Video is longer than 60 seconds');
    expect(failureMessage('unsupported_format')).toBe('Unsupported video format');
    expect(failureMessage('processing_failed')).toBe('Processing failed, please try again');
  });
});

describe('rendition planning', () => {
  it('creates 720p and 360p for a vertical 1080x1920 source', () => {
    expect(planRenditions(1080, 1920).map((plan) => [plan.label, plan.width, plan.height])).toEqual(
      [
        ['720p', 720, 1280],
        ['360p', 360, 640],
      ],
    );
  });

  it('never upscales and keeps landscape aspect ratio', () => {
    expect(planRenditions(1920, 1080).map((plan) => [plan.label, plan.width, plan.height])).toEqual(
      [
        ['720p', 1280, 720],
        ['360p', 640, 360],
      ],
    );
    expect(planRenditions(640, 360).map((plan) => plan.label)).toEqual(['360p']);
  });

  it('falls back to source size below 360p', () => {
    expect(planRenditions(320, 240).map((plan) => [plan.label, plan.width, plan.height])).toEqual([
      ['source', 320, 240],
    ]);
  });
});
