import { parseDeepLink, rewriteDeepLinkPath, routeForTarget } from './deep-links';

const VIDEO_ID = '3f0f9e2a-4b3c-4d5e-8f90-123456789abc';

describe('deep links', () => {
  it('parses the kiddo:// scheme and https share links', () => {
    expect(parseDeepLink(`kiddo://video/${VIDEO_ID}`)).toEqual({ type: 'video', id: VIDEO_ID });
    expect(parseDeepLink(`https://kiddo.app/s/${VIDEO_ID}`)).toEqual({
      type: 'video',
      id: VIDEO_ID,
    });
    expect(parseDeepLink(`https://kiddo.app/s/${VIDEO_ID}?ref=share`)).toEqual({
      type: 'video',
      id: VIDEO_ID,
    });
  });

  it('parses profile links in both forms', () => {
    expect(parseDeepLink('kiddo://user/seeduser1')).toEqual({
      type: 'user',
      username: 'seeduser1',
    });
    expect(parseDeepLink('https://kiddo.app/@seeduser1')).toEqual({
      type: 'user',
      username: 'seeduser1',
    });
    expect(parseDeepLink('kiddo://user/seed.user')).toEqual({
      type: 'user',
      username: 'seed.user',
    });
  });

  it('rejects malformed and unknown links', () => {
    expect(parseDeepLink('not a url')).toBeNull();
    expect(parseDeepLink('https://kiddo.app/s/not-a-video-id')).toBeNull();
    expect(parseDeepLink('https://kiddo.app/')).toBeNull();
    expect(parseDeepLink('https://kiddo.app/wat')).toBeNull();
    expect(parseDeepLink('kiddo://')).toBeNull();
  });

  it('rewrites native intent paths to router routes', () => {
    expect(rewriteDeepLinkPath(`/s/${VIDEO_ID}`)).toBe(`/video/${VIDEO_ID}`);
    expect(rewriteDeepLinkPath('/@seeduser1')).toBe('/user/seeduser1');
    expect(rewriteDeepLinkPath('/tag/coffee')).toBe('/tag/coffee');
    expect(rewriteDeepLinkPath('/profile')).toBe('/profile');
  });

  it('maps targets to routes', () => {
    expect(routeForTarget({ type: 'video', id: VIDEO_ID })).toBe(`/video/${VIDEO_ID}`);
    expect(routeForTarget({ type: 'user', username: 'seeduser1' })).toBe('/user/seeduser1');
    expect(routeForTarget({ type: 'tag', tag: 'coffee' })).toBe('/tag/coffee');
  });
});
