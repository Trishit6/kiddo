import { useTrending } from '@reel/queries';
import {
  ArrowUpRight,
  Compass,
  Flame,
  Hash,
  Heart,
  MessageCircle,
  Play,
  Search,
  Sparkles,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreatorStrip } from '@/components/creator-strip';
import { FollowButton } from '@/components/follow-button';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass';
import { Input } from '@/components/ui/input';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoGrid, VideoGridSkeleton } from '@/components/video-grid';
import { errorMessage } from '@/lib/errors';
import { formatCount, formatDuration } from '@/lib/format';

export function normalizeTag(value: string): string {
  return value
    .trim()
    .replace(/^#/, '')
    .replace(/[^A-Za-z0-9_]/g, '');
}

function FeaturedVideo() {
  const trending = useTrending();
  const featured = trending.data?.videos[0];

  if (trending.isPending) {
    return <Skeleton className="h-[22rem] w-full rounded-[1.75rem] sm:h-[26rem]" />;
  }
  if (!featured) return null;

  return (
    <section aria-labelledby="featured-video">
      <div className="glass overflow-hidden rounded-[1.75rem] p-2">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Link
            to={`/video/${featured.video.id}`}
            className="group relative block aspect-[16/11] overflow-hidden rounded-[1.35rem] bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <img
              src={featured.video.thumbnailUrl}
              alt=""
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent"
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
              <Sparkles className="size-3" aria-hidden="true" /> Featured
            </span>
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-14 place-items-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-md transition-transform duration-200 group-hover:scale-105">
                <Play className="size-6 fill-current" aria-hidden="true" />
              </span>
            </span>
            <span className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-md">
              {formatDuration(featured.video.durationSeconds)}
            </span>
          </Link>

          <div className="flex flex-col justify-center gap-4 px-3 pb-4 pt-2 lg:pr-6 lg:py-6">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand">
              Trending today
            </p>
            <h2
              id="featured-video"
              className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl"
            >
              {featured.video.caption || 'A moment worth replaying'}
            </h2>
            <Link
              to={`/@${featured.author.username}`}
              className="inline-flex w-fit items-center gap-3 rounded-full transition-colors hover:text-brand"
            >
              <Avatar
                src={featured.author.avatarUrl}
                name={featured.author.displayName}
                size="md"
              />
              <span>
                <span className="block text-sm font-semibold">{featured.author.displayName}</span>
                <span className="block text-xs text-muted-foreground">
                  @{featured.author.username}
                </span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Heart className="size-3.5" aria-hidden="true" />{' '}
                {formatCount(featured.counts.likes)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="size-3.5" aria-hidden="true" />{' '}
                {formatCount(featured.counts.comments)}
              </span>
              {featured.video.hashtags.slice(0, 2).map((tag) => (
                <Link
                  key={tag}
                  to={`/tag/${tag}`}
                  className="font-medium text-brand hover:underline"
                >
                  #{tag}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild className="rounded-full">
                <Link to={`/video/${featured.video.id}`}>
                  <Play aria-hidden="true" /> Watch now
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to={`/@${featured.author.username}`}>View creator</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
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

  const creators = Array.from(
    new Map(
      (trending.data?.videos ?? []).map((item) => [
        item.author.id,
        { author: item.author, following: item.viewerState.followingAuthor },
      ]),
    ).values(),
  ).slice(0, 5);

  const hashtags = trending.data?.hashtags ?? [];

  return (
    <ResponsiveContainer width="xl" className="space-y-8 pb-8 pt-6 md:py-8">
      <header className="space-y-5">
        <div className="space-y-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-brand">
            Discover
          </p>
          <h1 className="font-display text-4xl font-bold tracking-[-0.035em] sm:text-5xl">
            Explore
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            A curated corner of Kiddo — trending clips, new voices and the tags everyone is
            following.
          </p>
        </div>

        <form onSubmit={submit} className="flex max-w-xl gap-2" role="search">
          <label htmlFor="explore-search" className="sr-only">
            Search hashtags
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="explore-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a hashtag, e.g. dancing"
              className="h-11 rounded-full border-glass-border bg-glass pl-10"
            />
          </div>
          <Button
            type="submit"
            className="rounded-full"
            disabled={normalizeTag(search).length === 0}
          >
            Search
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Looking for people or videos?{' '}
          <Link to="/search" className="font-medium text-brand hover:underline">
            Open full search
          </Link>
        </p>
      </header>

      <CreatorStrip title="Creators" />

      <FeaturedVideo />

      <section aria-labelledby="trending-tags" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="trending-tags"
            className="inline-flex items-center gap-2 font-display text-title font-semibold"
          >
            <Flame className="size-4 text-brand" aria-hidden="true" /> Trending tags
          </h2>
          {trending.isError ? (
            <button
              type="button"
              onClick={() => void trending.refetch()}
              className="text-xs font-medium text-brand hover:underline"
            >
              Retry
            </button>
          ) : null}
        </div>
        {trending.isPending ? (
          <div className="flex flex-wrap gap-2" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        ) : null}
        {trending.isError ? (
          <p className="text-sm text-destructive">
            {errorMessage(trending.error, 'Could not load trends')}
          </p>
        ) : null}
        {trending.data && hashtags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {hashtags.map((hashtag) => (
              <li key={hashtag.tag}>
                <Link
                  to={`/tag/${hashtag.tag}`}
                  className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-1.5 text-sm font-semibold transition-colors hover:border-brand/40 hover:text-brand"
                >
                  <Hash className="size-3.5 text-brand" aria-hidden="true" />
                  {hashtag.tag}
                  <span className="text-xs font-normal text-muted-foreground">
                    {hashtag.videosCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {trending.data && hashtags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trends yet — check back soon.</p>
        ) : null}
      </section>

      <section aria-labelledby="hot-videos" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="hot-videos" className="font-display text-title font-semibold">
              Hot right now
            </h2>
            <p className="text-sm text-muted-foreground">A masonry of what’s landing today.</p>
          </div>
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline"
          >
            <Compass className="size-4" aria-hidden="true" /> For You
          </Link>
        </div>
        {trending.isPending ? <VideoGridSkeleton count={9} /> : null}
        {trending.data ? (
          <VideoGrid
            items={trending.data.videos}
            emptyMessage="No videos are trending yet. Be the first to post."
          />
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel aria-labelledby="trending-creators" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="trending-creators"
              className="inline-flex items-center gap-2 font-display text-title font-semibold"
            >
              <Sparkles className="size-4 text-brand" aria-hidden="true" /> Trending creators
            </h2>
            <Link
              to="/search"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-brand"
            >
              See all <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
          {trending.isPending ? (
            <div className="space-y-3" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : null}
          {creators.length > 0 ? (
            <ul className="divide-y divide-glass-border">
              {creators.map(({ author, following }) => (
                <li key={author.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <Link to={`/@${author.username}`} className="shrink-0">
                    <Avatar src={author.avatarUrl} name={author.displayName} size="md" />
                  </Link>
                  <Link to={`/@${author.username}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {author.displayName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{author.username}
                    </span>
                  </Link>
                  <FollowButton
                    username={author.username}
                    displayName={author.displayName}
                    following={following}
                    className="shrink-0 rounded-full"
                  />
                </li>
              ))}
            </ul>
          ) : trending.isPending ? null : (
            <p className="text-sm text-muted-foreground">
              Creators appear here once videos start trending.
            </p>
          )}
        </GlassPanel>

        <GlassPanel aria-labelledby="trending-topics" className="space-y-4">
          <h2
            id="trending-topics"
            className="inline-flex items-center gap-2 font-display text-title font-semibold"
          >
            <Hash className="size-4 text-brand" aria-hidden="true" /> Trending hashtags
          </h2>
          {hashtags.length > 0 ? (
            <ol className="space-y-1">
              {hashtags.slice(0, 6).map((hashtag, index) => (
                <li key={hashtag.tag}>
                  <Link
                    to={`/tag/${hashtag.tag}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent"
                  >
                    <span className="w-5 text-xs font-semibold tabular-nums text-muted-foreground/70">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">#{hashtag.tag}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCount(hashtag.videosCount)} videos
                    </span>
                    <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              Hashtags will show up as the community posts.
            </p>
          )}
        </GlassPanel>
      </div>
    </ResponsiveContainer>
  );
}
