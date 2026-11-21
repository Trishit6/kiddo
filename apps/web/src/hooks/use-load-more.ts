import { useEffect, type RefObject } from 'react';

interface LoadMoreOptions {
  enabled: boolean;
  onLoadMore(): void;
}

/** Calls `onLoadMore` when the sentinel scrolls into view. */
export function useLoadMore(
  sentinelRef: RefObject<Element | null>,
  { enabled, onLoadMore }: LoadMoreOptions,
): void {
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, onLoadMore, sentinelRef]);
}
