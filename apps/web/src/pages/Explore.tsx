import { useTrending } from '@reel/queries';
import { Compass, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass';
import { Input } from '@/components/ui/input';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoGrid, VideoGridSkeleton } from '@/components/video-grid';
import { errorMessage } from '@/lib/errors';

export function normalizeTag(value: string): string {
  return value
    .trim()
    .replace(/^#/, '')
    .replace(/[^A-Za-z0-9_]/g, '');
}

export function Explore() {
  const trending = useTrending();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const tag = normalizeTag(search);
    if (tag) navigate(`/tag/${tag}`);
  };

  return (
    <ResponsiveContainer width="lg" className="space-y-8">
      <GlassCard className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1">
          <p className="text-label font-semibold uppercase tracking-widest text-brand">Discover</p>
          <h1 className="font-display text-display font-bold tracking-tight">Explore</h1>
          <p className="text-muted-foreground">
            Trending tags and the videos everyone is watching right now.
          </p>
        </div>
        <form onSubmit={submit} className="flex gap-2" role="search">
          <label htmlFor="explore-search" className="sr-only">
            Search hashtags
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="explore-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a hashtag, e.g. dancing"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={normalizeTag(search).length === 0}>
            Search
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Browsing hashtags?{' '}
          <Link to="/search" className="font-medium text-brand hover:underline">
            Search creators and videos
          </Link>
        </p>
      </GlassCard>

      <section aria-labelledby="trending-tags" className="space-y-3">
        <h2 id="trending-tags" className="font-display text-title font-semibold">
          Trending tags
        </h2>
        {trending.isPending ? (
          <div className="flex flex-wrap gap-2" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-pill" />
            ))}
          </div>
        ) : null}
        {trending.isError ? (
          <div className="flex items-center gap-3 text-sm text-destructive">
            {errorMessage(trending.error, 'Could not load trends')}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void trending.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {trending.data && trending.data.hashtags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {trending.data.hashtags.map((hashtag) => (
              <li key={hashtag.tag}>
                <Link
                  to={`/tag/${hashtag.tag}`}
                  className="inline-flex items-center gap-2 rounded-pill border bg-card px-4 py-1.5 text-sm font-semibold transition-colors hover:border-brand hover:text-brand"
                >
                  #{hashtag.tag}
                  <span className="text-xs font-normal text-muted-foreground">
                    {hashtag.videosCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {trending.data && trending.data.hashtags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trends yet — check back soon.</p>
        ) : null}
      </section>

      <section aria-labelledby="hot-videos" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="hot-videos" className="font-display text-title font-semibold">
            Hot right now
          </h2>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
          >
            <Compass className="size-4" aria-hidden="true" /> For You
          </Link>
        </div>
        {trending.isPending ? <VideoGridSkeleton count={10} /> : null}
        {trending.data ? (
          <VideoGrid
            items={trending.data.videos}
            emptyMessage="No videos are trending yet. Be the first to post."
          />
        ) : null}
      </section>
    </ResponsiveContainer>
  );
}
