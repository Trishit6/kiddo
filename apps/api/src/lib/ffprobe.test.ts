import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  displayDimensions,
  durationOf,
  hasAudioStream,
  isSupportedCodec,
  parseProbeJson,
  rotationFor,
  videoStreamOf,
} from './ffprobe.js';

function fixture(name: string): string {
  return readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url), 'utf8');
}

describe('ffprobe result validation', () => {
  it('reads a valid mp4 probe', () => {
    const probe = parseProbeJson(fixture('probe-valid.json'));
    expect(durationOf(probe)).toBeCloseTo(12.5);
    expect(videoStreamOf(probe)?.codec_name).toBe('h264');
    expect(displayDimensions(videoStreamOf(probe)!)).toEqual({ width: 1080, height: 1920 });
    expect(hasAudioStream(probe)).toBe(true);
    expect(isSupportedCodec('h264')).toBe(true);
  });

  it('applies rotation metadata to display dimensions', () => {
    const probe = parseProbeJson(fixture('probe-rotated.json'));
    const stream = videoStreamOf(probe);
    expect(stream).not.toBeNull();
    expect(rotationFor(stream!)).toBe(270);
    expect(displayDimensions(stream!)).toEqual({ width: 1080, height: 1920 });
    expect(isSupportedCodec(stream?.codec_name)).toBe(true);
  });

  it('detects audio-only files and rejects unsupported codecs', () => {
    const probe = parseProbeJson(fixture('probe-audio-only.json'));
    expect(videoStreamOf(probe)).toBeNull();
    expect(hasAudioStream(probe)).toBe(true);
    expect(isSupportedCodec('prores')).toBe(false);
  });

  it('treats malformed JSON as an empty probe', () => {
    expect(parseProbeJson('not json')).toEqual({});
    expect(parseProbeJson('null')).toEqual({});
  });
});
