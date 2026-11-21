import { describe, expect, it } from 'vitest';
import { MAX_HASHTAGS_PER_VIDEO, parseHashtags } from '@reel/shared';

describe('parseHashtags', () => {
  it('normalizes, deduplicates and ignores invalid tags', () => {
    expect(parseHashtags('Hello #Travel #travel #food_2026 #bad-tag #under_score')).toEqual([
      'travel',
      'food_2026',
      'bad',
      'under_score',
    ]);
  });

  it('ignores url fragments and empty hashes', () => {
    expect(parseHashtags('see https://example.com/#section and #')).toEqual([]);
  });

  it('caps the number of hashtags', () => {
    const caption = Array.from({ length: 40 }, (_, index) => `#tag${index}`).join(' ');
    expect(parseHashtags(caption)).toHaveLength(MAX_HASHTAGS_PER_VIDEO);
  });
});
