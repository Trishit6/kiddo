/**
 * Code points removed from user-visible text: C0 controls except tab (\u0009),
 * line feed (\u000A) and carriage return (\u000D), DEL plus the C1 controls,
 * and the Unicode bidi embedding/override/isolate controls.
 */
const REMOVED_CODE_POINT_RANGES: ReadonlyArray<readonly [start: number, end: number]> = [
  [0x0000, 0x0008],
  [0x000b, 0x000c],
  [0x000e, 0x001f],
  [0x007f, 0x009f],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
];

function isRemovedCodePoint(codePoint: number): boolean {
  for (const [start, end] of REMOVED_CODE_POINT_RANGES) {
    if (codePoint >= start && codePoint <= end) return true;
  }
  return false;
}

/**
 * Normalize user-visible text and strip control / bidi override characters.
 * Newlines and tabs are kept so multi-line captions and comments still work.
 */
export function sanitizeUserText(value: string): string {
  const normalized = value.normalize('NFC');
  let result = '';
  for (const character of normalized) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || !isRemovedCodePoint(codePoint)) {
      result += character;
    }
  }
  return result.trim();
}
