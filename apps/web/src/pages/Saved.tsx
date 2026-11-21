import { useSavedVideos } from '@reel/queries';
import { Bookmark, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { VideoGrid, VideoGridSkeleton } from '@/components/video-grid';
import { useLoadMore } from '@/hooks/use-load-more';
import { errorMessage } from '@/lib/errors';

export function Saved() {
  const query = useSavedVideos();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  useLoadMore(sentinelRef, {
    enabled: Boolean(query.hasNextPage) && !query.isFetchingNextPage,
    onLoadMore: () => void query.fetchNextPage(),
  });

  return (
    <ResponsiveContainer width="xl" className="space-y-6 pb-8 pt-6 md:py-8">
      <header className="space-y-2">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-brand">
          Your space
        </p>
        <h1 className="inline-flex items-center gap-3 font-display text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
          <Bookmark className="size-6 shrink-0 text-brand sm:size-7" aria-hidden="true" />
          Saved
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          The clips you kept for later, gathered in one quiet place.
        </p>
      </header>

      {query.isPending ? <VideoGridSkeleton count={6} /> : null}

      {query.isError ? (
        <GlassCard className="space-y-3 p-6">
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(query.error, 'Could not load your saved videos')}
          </p>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </GlassCard>
      ) : null}

      {query.data ? (
        <VideoGrid
          items={items}
          emptyMessage="Nothing saved yet. Tap the bookmark on any video to keep it here."
        />
      ) : null}

      {query.data && items.length === 0 ? (
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/explore">Explore videos</Link>
        </Button>
      ) : null}

      <div ref={sentinelRef} aria-hidden="true" className="h-8" />
      {query.isFetchingNextPage ? (
        <div className="flex justify-center">
          <Loader2
            className="size-6 animate-spin text-muted-foreground"
            aria-label="Loading more saved videos"
          />
        </div>
      ) : null}
      {query.hasNextPage && !query.isFetchingNextPage ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={() => void query.fetchNextPage()}>
            Load more
          </Button>
        </div>
      ) : null}
    </ResponsiveContainer>
  );
}
