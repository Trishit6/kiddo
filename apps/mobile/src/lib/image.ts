const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const AVATAR_CONTENT_TYPE = 'image/jpeg';

export function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const withoutPrefix = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  const normalized = withoutPrefix.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array(Math.max(0, Math.floor((normalized.length * 3) / 4) - padding));
  let buffer = 0;
  let bits = 0;
  let offset = 0;

  for (const character of normalized) {
    if (character === '=') break;
    const position = BASE64_ALPHABET.indexOf(character);
    if (position < 0) continue;
    buffer = ((buffer << 6) | position) & 0xffff;
    bits += 6;
    if (bits >= 8 && offset < bytes.length) {
      bits -= 8;
      bytes[offset] = (buffer >>> bits) & 0xff;
      offset += 1;
    }
  }

  return bytes;
}
