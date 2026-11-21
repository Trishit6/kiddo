export type DeepLinkTarget =
  { type: 'video'; id: string } | { type: 'user'; username: string } | { type: 'tag'; tag: string };

const VIDEO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parses kiddo://, https://…/s/:id and /@username links into app routes. */
export function parseDeepLink(raw: string): DeepLinkTarget | null {
  const trimmed = raw.trim();
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)/i.exec(trimmed);
  let protocol: string | null = null;
  let segments: string[];
  if (match) {
    protocol = match[1]?.toLowerCase() ?? null;
    const host = match[2] ?? '';
    const path = match[3] ?? '';
    segments =
      protocol === 'http' || protocol === 'https'
        ? path.split('/').filter(Boolean)
        : [host, ...path.split('/')].filter(Boolean);
  } else if (trimmed.startsWith('/')) {
    segments = trimmed.split('?')[0]?.split('/').filter(Boolean) ?? [];
  } else {
    return null;
  }

  if (protocol === 'kiddo') {
    if (segments[0] === 'video' && segments[1] && VIDEO_ID.test(segments[1])) {
      return { type: 'video', id: segments[1] };
    }
    if (segments[0] === 'user' && segments[1]) {
      return { type: 'user', username: decodeURIComponent(segments[1]) };
    }
    if (segments[0] === 'tag' && segments[1]) {
      return { type: 'tag', tag: decodeURIComponent(segments[1]) };
    }
    return null;
  }

  if (protocol && protocol !== 'https' && protocol !== 'http') return null;

  if (segments[0] === 's' && segments[1] && VIDEO_ID.test(segments[1])) {
    return { type: 'video', id: segments[1] };
  }
  if (segments[0]?.startsWith('@')) {
    const username = decodeURIComponent(segments[0].slice(1));
    return username ? { type: 'user', username } : null;
  }
  if (segments[0] === 'tag' && segments[1]) {
    return { type: 'tag', tag: decodeURIComponent(segments[1]) };
  }
  return null;
}

/** Path rewrite used by expo-router's +native-intent hook. */
export function rewriteDeepLinkPath(path: string): string {
  const withoutQuery = path.split('?')[0] ?? path;
  const segments = withoutQuery.split('/').filter(Boolean);
  if (segments[0] === 's' && segments[1]) return `/video/${segments[1]}`;
  if (segments[0]?.startsWith('@')) return `/user/${segments[0].slice(1)}`;
  if (segments[0] === 'tag' && segments[1]) return `/tag/${segments[1]}`;
  return path;
}

export function routeForTarget(target: DeepLinkTarget): string {
  switch (target.type) {
    case 'video':
      return `/video/${target.id}`;
    case 'user':
      return `/user/${target.username}`;
    case 'tag':
      return `/tag/${target.tag}`;
  }
}
