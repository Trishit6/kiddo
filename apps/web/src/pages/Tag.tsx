import { useHashtagVideos } from '@reel/queries';
import { Hash, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlassCard, GlassPill } from '@/components/ui/glass';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { VideoGrid, VideoGridSkeleton } from '@/components/video-grid';
import { useLoadMore } from '@/hooks/use-load-more';
import { errorMessage } from '@/lib/errors';

export function Tag() {
  const { tag = '' } = useParams();
  const query = useHashtagVideos(tag);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  useLoadMore(sentinelRef, {
    enabled: Boolean(query.hasNextPage) && !query.isFetchingNextPage,
    onLoadMore: () => void query.fetchNextPage(),
  });

  return (
    <ResponsiveContainer width="lg" className="space-y-6">
      <GlassCard className="space-y-2 p-5 sm:p-6">
        <GlassPill className="inline-flex items-center gap-1 text-brand">
          <Hash className="size-3.5" aria-hidden="true" /> Hashtag
        </GlassPill>
        <h1 className="font-display text-display font-bold tracking-tight">#{tag}</h1>
        <p className="text-sm text-muted-foreground">
          {items.length > 0
            ? `Showing ${items.length} ${items.length === 1 ? 'video' : 'videos'} so far`
            : 'Videos tagged with this hashtag.'}
        </p>
      </GlassCard>

      {query.isPending ? <VideoGridSkeleton /> : null}

      {query.isError ? (
        <GlassCard className="space-y-3 border border-destructive/30 p-6">
          <p className="text-sm text-destructive">
            {errorMessage(query.error, 'Could not load this hashtag')}
          </p>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </GlassCard>
      ) : null}

      {query.data ? (
        <VideoGrid
          items={items}
          emptyMessage={`No videos use #${tag} yet. Try another tag from Explore.`}
        />
      ) : null}

      <div ref={sentinelRef} aria-hidden="true" className="h-8" />
      {query.isFetchingNextPage ? (
        <div className="flex justify-center">
          <Loader2
            className="size-6 animate-spin text-muted-foreground"
            aria-label="Loading more videos"
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
