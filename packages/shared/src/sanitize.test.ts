import { describe, expect, it } from 'vitest';
import { sanitizeUserText } from './sanitize';

const BENGALI = 'আমি বাংলায় গান গাই';
const EMOJI = 'hello 👨‍👩‍👧‍👦 🌍 😀';

describe('sanitizeUserText', () => {
  it('returns an empty string for empty input', () => {
    expect(sanitizeUserText('')).toBe('');
  });

  it('leaves normal text unchanged', () => {
    expect(sanitizeUserText('Hello, world! How are you?')).toBe('Hello, world! How are you?');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeUserText('  hello  \n\t')).toBe('hello');
  });

  it('keeps tabs, line feeds and carriage returns', () => {
    expect(sanitizeUserText('a\tb\nc\rd\r\ne')).toBe('a\tb\nc\rd\r\ne');
  });

  it('strips C0 control characters except tab, newline and carriage return', () => {
    expect(sanitizeUserText('a\u0000b\u0007c\u000bd\u000ce\u001ff')).toBe('abcdef');
  });

  it('strips DEL and the C1 control range', () => {
    expect(sanitizeUserText('a\u007fb\u0085c\u009fd')).toBe('abcd');
  });

  it('strips bidi embedding, override and isolate controls', () => {
    expect(sanitizeUserText('a\u202ab\u202ec\u2066d\u2069e')).toBe('abcde');
  });

  it('preserves multilingual text', () => {
    expect(sanitizeUserText(BENGALI)).toBe(BENGALI);
  });

  it('preserves emoji and supplementary Unicode characters', () => {
    expect(sanitizeUserText(EMOJI)).toBe(EMOJI);
    expect(sanitizeUserText('😀')).toBe('😀');
  });

  it('does not corrupt surrogate pairs', () => {
    const input = 'a😀b𝄞c';
    const result = sanitizeUserText(input);

    expect(result).toBe(input);
    expect(result).not.toMatch(/\uFFFD/);
  });

  it('applies NFC normalization without altering visible text', () => {
    expect(sanitizeUserText('e\u0301')).toBe('\u00e9');
  });

  it('handles a mixture of valid text and control characters', () => {
    expect(sanitizeUserText('  \u0000নমস্কার\u0007 😀 \u202eworld\u0000  ')).toBe('নমস্কার 😀 world');
  });
});
