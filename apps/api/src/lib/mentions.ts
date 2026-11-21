const USERNAME = /^[A-Za-z0-9._]{3,24}$/;
const EMAIL_DOMAIN = /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Extracts mentioned usernames from user text. Emails and mid-word @ signs are
 * ignored, duplicates are removed (case-insensitively) and at most 10 names
 * are returned.
 */
export function parseMentions(text: string): string[] {
  const mentions: string[] = [];
  const seen = new Set<string>();
  const pattern = /(^|[\s(])@([A-Za-z0-9._]{1,24})/g;
  for (const match of text.matchAll(pattern)) {
    const candidate = match[2];
    if (!candidate) continue;
    const cleaned = candidate.replace(/[.,!?;:'")]+$/, '');
    if (!USERNAME.test(cleaned)) continue;
    const next = text.slice((match.index ?? 0) + match[0].length);
    if (EMAIL_DOMAIN.test(next.split(/\s/)[0] ?? '')) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    mentions.push(cleaned);
    if (mentions.length >= 10) break;
  }
  return mentions;
}
