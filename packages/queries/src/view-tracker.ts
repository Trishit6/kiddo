import { useCallback, useEffect, useRef } from 'react';
import type { ApiClient } from '@reel/shared';
import { useReelQueries } from './context.js';

const FLUSH_DELAY_MS = 1_200;

interface PendingView {
  watchedMs: number;
  completed: boolean;
}

export interface ViewTracker {
  track(videoId: string, watchedMs: number, completed?: boolean): void;
  flush(): void;
}

export function useViewTracker(): ViewTracker {
  const { api, subscribeToBackground } = useReelQueries();
  const pending = useRef(new Map<string, PendingView>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiRef = useRef<ApiClient>(api);
  apiRef.current = api;

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current.size === 0) return;
    const batch = [...pending.current.entries()];
    pending.current.clear();
    for (const [videoId, view] of batch) {
      void apiRef.current
        .recordView(videoId, { watchedMs: view.watchedMs, completed: view.completed })
        .catch(() => undefined);
    }
  }, []);

  const track = useCallback(
    (videoId: string, watchedMs: number, completed = false) => {
      const existing = pending.current.get(videoId);
      pending.current.set(videoId, {
        watchedMs: Math.max(existing?.watchedMs ?? 0, Math.round(watchedMs)),
        completed: completed || (existing?.completed ?? false),
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, FLUSH_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    const unsubscribe = subscribeToBackground?.(flush);
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flush();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribe?.();
      flush();
    };
  }, [flush, subscribeToBackground]);

  return { track, flush };
}
