import {
  useSearchHashtags,
  useSearchSuggestions,
  useSearchUsers,
  useSearchVideos,
} from '@reel/queries';
import { ApiClientError } from '@reel/shared';
import type { SearchUser } from '@reel/shared';
import { Search as SearchIcon, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass';
import { Input } from '@/components/ui/input';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoGrid, VideoGridSkeleton } from '@/components/video-grid';
import { errorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

type SearchTab = 'all' | 'videos' | 'creators' | 'hashtags';

const tabs: Array<{ id: SearchTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'videos', label: 'Videos' },
  { id: 'creators', label: 'Creators' },
  { id: 'hashtags', label: 'Hashtags' },
];

const RECENT_SEARCHES_KEY = 'kiddo-recent-searches';

function readRecentSearches(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string').slice(0, 6);
  } catch {
    return [];
  }
}

function rememberSearch(query: string): string[] {
  const recent = [query, ...readRecentSearches().filter((item) => item !== query)].slice(0, 6);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
  } catch {
    // Recent searches are optional; the current query remains usable.
  }
  return recent;
}

function CreatorResult({ creator }: { creator: SearchUser }) {
  return (
    <li>
      <Link
        to={`/@${creator.username}`}
        className="flex min-h-16 items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-3 transition-colors hover:border-brand/50 hover:bg-accent"
      >
        <Avatar src={creator.avatarUrl} name={creator.displayName} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{creator.displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">@{creator.username}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {creator.followersCount.toLocaleString()} followers
        </span>
      </Link>
    </li>
  );
}

function ResultError({ error, retry }: { error: unknown; retry(): void }) {
  const message =
    error instanceof ApiClientError && error.status === 404
      ? 'Search is not available on this API deployment yet.'
      : errorMessage(error, 'Search is temporarily unavailable.');
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
    >
      <span>{message}</span>
      <Button type="button" size="sm" variant="outline" onClick={retry}>
        Retry
      </Button>
    </div>
  );
}

export function Search() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);
  const [submitted, setSubmitted] = useState(urlQuery.trim());
  const [tab, setTab] = useState<SearchTab>('all');
  const [recent, setRecent] = useState(readRecentSearches);

  useEffect(() => {
    setQuery(urlQuery);
    setSubmitted(urlQuery.trim());
  }, [urlQuery]);

  const normalized = query.trim();
  const showingSuggestions =
    Boolean(user) && normalized.length >= 2 && normalized.toLowerCase() !== submitted.toLowerCase();
  const suggestions = useSearchSuggestions(normalized, showingSuggestions);
  const searching = Boolean(user) && submitted.length >= 2;
  const showVideos = searching && (tab === 'all' || tab === 'videos');
  const showCreators = searching && (tab === 'all' || tab === 'creators');
  const showHashtags = searching && (tab === 'all' || tab === 'hashtags');
  const videos = useSearchVideos(submitted, showVideos);
  const creators = useSearchUsers(submitted, showCreators);
  const hashtags = useSearchHashtags(submitted, showHashtags);

  const runSearch = (value: string) => {
    const next = value.trim();
    if (next.length < 2) return;
    setQuery(next);
    setSubmitted(next);
    setParams({ q: next });
    setRecent(rememberSearch(next));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch(query);
  };

  const clearRecent = () => {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Recent searches are optional.
    }
  };

  return (
    <ResponsiveContainer width="lg" className="space-y-6">
      <header className="space-y-2">
        <p className="text-label font-semibold uppercase tracking-widest text-brand">
          Find your next favorite
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-display">
          Search Kiddo
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Look for creators, videos, and hashtags.
        </p>
      </header>

      <GlassCard className="space-y-4 p-4 sm:p-5">
        <form onSubmit={submit} role="search" className="flex gap-2">
          <label htmlFor="kiddo-search" className="sr-only">
            Search creators, videos, and hashtags
          </label>
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="kiddo-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try a creator, topic, or hashtag"
              className="min-h-11 pl-9 pr-10"
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('');
                  setSubmitted('');
                  setParams({});
                }}
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <Button type="submit" disabled={normalized.length < 2}>
            Search
          </Button>
        </form>

        {showingSuggestions && suggestions.data ? (
          <div className="grid gap-4 border-t border-border/70 pt-4 sm:grid-cols-2">
            <section aria-label="Creator suggestions">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Creators
              </p>
              <ul className="space-y-1">
                {suggestions.data.users.slice(0, 3).map((creator) => (
                  <li key={creator.id}>
                    <Link
                      to={`/@${creator.username}`}
                      className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-accent"
                    >
                      <Avatar src={creator.avatarUrl} name={creator.displayName} size="sm" />
                      <span className="truncate">{creator.displayName}</span>
                    </Link>
                  </li>
                ))}
                {suggestions.data.users.length === 0 ? (
                  <li className="px-2 text-sm text-muted-foreground">No creator suggestions.</li>
                ) : null}
              </ul>
            </section>
            <section aria-label="Hashtag suggestions">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Hashtags
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.data.hashtags.slice(0, 5).map((hashtag) => (
                  <Link
                    key={hashtag.tag}
                    to={`/tag/${hashtag.tag}`}
                    className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-brand hover:text-brand"
                  >
                    #{hashtag.tag}
                  </Link>
                ))}
                {suggestions.data.hashtags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hashtag suggestions.</p>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </GlassCard>

      {!submitted ? (
        <section aria-labelledby="recent-searches" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="recent-searches" className="font-display text-lg font-semibold">
              Recent searches
            </h2>
            {recent.length > 0 ? (
              <button
                type="button"
                onClick={clearRecent}
                className="min-h-10 rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Clear history
              </button>
            ) : null}
          </div>
          {recent.length ? (
            <ul className="flex flex-wrap gap-2">
              {recent.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => runSearch(item)}
                    className="rounded-full border border-border bg-card/70 px-3 py-2 text-sm hover:border-brand hover:text-brand"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your recent searches will appear here on this device.
            </p>
          )}
        </section>
      ) : (
        <section aria-labelledby="search-results" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="search-results"
              className="min-w-0 truncate font-display text-title font-semibold"
            >
              Results for “{submitted}”
            </h2>
            <div
              role="tablist"
              aria-label="Search result type"
              className="glass flex max-w-full gap-1 overflow-x-auto rounded-full p-1"
            >
              {tabs.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    'min-h-9 shrink-0 rounded-full px-3 text-sm font-medium transition-colors',
                    tab === id
                      ? 'bg-brand text-brand-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!user ? (
            <GlassCard className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in to search creators and videos.
              </p>
              <Button asChild className="mt-4">
                <Link to="/login">Log in</Link>
              </Button>
            </GlassCard>
          ) : null}

          {showVideos ? (
            <section aria-label="Video results" className="space-y-3">
              <h3 className="font-display text-lg font-semibold">Videos</h3>
              {videos.isPending ? <VideoGridSkeleton count={6} /> : null}
              {videos.isError ? (
                <ResultError error={videos.error} retry={() => void videos.refetch()} />
              ) : null}
              {videos.data ? (
                <>
                  <VideoGrid
                    items={videos.data.pages.flatMap((page) => page.items)}
                    emptyMessage="No videos found for this search."
                  />
                  {videos.hasNextPage ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={videos.isFetchingNextPage}
                      onClick={() => void videos.fetchNextPage()}
                    >
                      {videos.isFetchingNextPage ? 'Loading…' : 'Load more videos'}
                    </Button>
                  ) : null}
                </>
              ) : null}
            </section>
          ) : null}

          {showCreators ? (
            <section aria-label="Creator results" className="space-y-3">
              <h3 className="font-display text-lg font-semibold">Creators</h3>
              {creators.isPending ? (
                <div className="space-y-2" aria-label="Loading creators">
                  {[0, 1, 2].map((item) => (
                    <Skeleton key={item} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : null}
              {creators.isError ? (
                <ResultError error={creators.error} retry={() => void creators.refetch()} />
              ) : null}
              {creators.data ? (
                <ul className="space-y-2">
                  {creators.data.pages
                    .flatMap((page) => page.items)
                    .map((creator) => (
                      <CreatorResult key={creator.id} creator={creator} />
                    ))}
                  {creators.data.pages.every((page) => page.items.length === 0) ? (
                    <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No creators found for this search.
                    </li>
                  ) : null}
                  {creators.hasNextPage ? (
                    <li>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={creators.isFetchingNextPage}
                        onClick={() => void creators.fetchNextPage()}
                      >
                        {creators.isFetchingNextPage ? 'Loading…' : 'Load more creators'}
                      </Button>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </section>
          ) : null}

          {showHashtags ? (
            <section aria-label="Hashtag results" className="space-y-3">
              <h3 className="font-display text-lg font-semibold">Hashtags</h3>
              {hashtags.isPending ? (
                <div className="flex flex-wrap gap-2" aria-label="Loading hashtags">
                  {[0, 1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-10 w-28 rounded-full" />
                  ))}
                </div>
              ) : null}
              {hashtags.isError ? (
                <ResultError error={hashtags.error} retry={() => void hashtags.refetch()} />
              ) : null}
              {hashtags.data ? (
                <>
                  <ul className="flex flex-wrap gap-2">
                    {hashtags.data.pages
                      .flatMap((page) => page.items)
                      .map((hashtag) => (
                        <li key={hashtag.tag}>
                          <Link
                            to={`/tag/${hashtag.tag}`}
                            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card/70 px-4 text-sm font-medium hover:border-brand hover:text-brand"
                          >
                            #{hashtag.tag}
                            <span className="text-xs text-muted-foreground">
                              {hashtag.videosCount}
                            </span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                  {hashtags.data.pages.every((page) => page.items.length === 0) ? (
                    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No hashtags found for this search.
                    </p>
                  ) : null}
                  {hashtags.hasNextPage ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={hashtags.isFetchingNextPage}
                      onClick={() => void hashtags.fetchNextPage()}
                    >
                      {hashtags.isFetchingNextPage ? 'Loading…' : 'Load more hashtags'}
                    </Button>
                  ) : null}
                </>
              ) : null}
            </section>
          ) : null}
        </section>
      )}
    </ResponsiveContainer>
  );
}
