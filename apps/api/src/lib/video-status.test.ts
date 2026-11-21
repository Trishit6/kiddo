import { describe, expect, it } from 'vitest';
import { canTransition } from './video-status.js';

describe('video status transitions', () => {
  it('allows only the processing lifecycle', () => {
    expect(canTransition('uploading', 'processing')).toBe(true);
    expect(canTransition('processing', 'ready')).toBe(true);
    expect(canTransition('processing', 'failed')).toBe(true);
    expect(canTransition('ready', 'processing')).toBe(false);
    expect(canTransition('failed', 'ready')).toBe(false);
    expect(canTransition('uploading', 'ready')).toBe(false);
  });
});
