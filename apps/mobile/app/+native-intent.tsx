import { rewriteDeepLinkPath } from '@/lib/deep-links';

/** Maps https://…/s/:id and https://…/@user into in-app routes. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return rewriteDeepLinkPath(path);
}
