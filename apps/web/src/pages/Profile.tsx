import {
  useLikedVideos,
  useMyVideos,
  useProfileVideos,
  usePublicProfile,
  useSavedVideos,
} from '@reel/queries';
import type { FeedResponse } from '@reel/shared';
import { CalendarDays, Loader2, Pencil, Settings2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/components/auth-provider';
import { FollowButton } from '@/components/follow-button';
import { FollowListDialog } from '@/components/follow-list-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VideoGrid, VideoGridSkeleton } from '@/components/video-grid';
import { useLoadMore } from '@/hooks/use-load-more';
import { errorMessage } from '@/lib/errors';
import { formatCount } from '@/lib/format';

interface PagedFeed {
  data?: { pages: FeedResponse[] };
  isPending: boolean;
  isError: boolean;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage(): Promise<unknown>;
  refetch(): Promise<unknown>;
}

function PagedFeedGrid({ query, emptyMessage }: { query: PagedFeed; emptyMessage: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  useLoadMore(sentinelRef, {
    enabled: Boolean(query.hasNextPage) && !query.isFetchingNextPage,
    onLoadMore: () => void query.fetchNextPage(),
  });

  if (query.isPending) return <VideoGridSkeleton />;

  if (query.isError) {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {errorMessage(query.error, 'Could not load videos')}
        </p>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <VideoGrid items={items} emptyMessage={emptyMessage} />
      <div ref={sentinelRef} aria-hidden="true" className="h-6" />
      {query.isFetchingNextPage ? (
        <div className="flex justify-center">
          <Loader2
            className="size-5 animate-spin text-muted-foreground"
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
    </div>
  );
}

function LikedGrid() {
  return (
    <PagedFeedGrid query={useLikedVideos()} emptyMessage="Videos you like will show up here." />
  );
}

function SavedGrid() {
  return (
    <PagedFeedGrid
      query={useSavedVideos()}
      emptyMessage="Save videos to watch them later. Only you can see this tab."
    />
  );
}

function OwnerUploads() {
  const query = useMyVideos();
  const pending = (query.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (video) => video.status !== 'ready' || video.visibility !== 'public',
  );

  if (pending.length === 0) return null;

  return (
    <section aria-labelledby="owner-uploads" className="space-y-2">
      <h2 id="owner-uploads" className="font-display text-lg font-semibold">
        In progress &amp; hidden
      </h2>
      <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
        {pending.map((video) => (
          <li key={video.id} className="w-28 shrink-0">
            <Link
              to={`/video/${video.id}`}
              className="group block overflow-hidden rounded-xl border bg-card"
            >
              <div className="relative aspect-[9/16] bg-muted">
                {video.playback ? (
                  <img
                    src={video.playback.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center px-2 text-center text-[0.65rem] text-muted-foreground">
                    {video.status}
                  </span>
                )}
                <Badge
                  variant={video.status === 'failed' ? 'destructive' : 'outline'}
                  className="absolute left-1 top-1 px-1.5 text-[0.55rem] uppercase"
                >
                  {video.status}
                </Badge>
              </div>
              <p className="line-clamp-2 px-1.5 py-1 text-[0.65rem] text-muted-foreground">
                {video.caption || 'Untitled'} · {video.visibility}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Profile() {
  const { handle = '' } = useParams();
  const username = handle.startsWith('@') ? handle.slice(1) : handle;
  const { user: viewer } = useAuth();
  const profile = usePublicProfile(username);
  const videos = useProfileVideos(username);
  const [listKind, setListKind] = useState<'followers' | 'following' | null>(null);
  const isOwner = viewer?.username === profile.data?.user.username;

  if (profile.isPending) {
    return (
      <ResponsiveContainer width="lg" className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <VideoGridSkeleton />
      </ResponsiveContainer>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <ResponsiveContainer width="sm" className="space-y-4 text-center">
        <GlassCard strong className="space-y-4 p-8">
          <h1 className="font-display text-display font-bold">Creator not found</h1>
          <p className="text-muted-foreground">
            {errorMessage(profile.error, `@${username} does not exist or is unavailable.`)}
          </p>
          <Button asChild>
            <Link to="/explore">Explore creators</Link>
          </Button>
        </GlassCard>
      </ResponsiveContainer>
    );
  }

  const { user, viewerState } = profile.data;
  const joined = new Date(user.createdAt).toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <ResponsiveContainer width="lg" className="space-y-6">
      <GlassCard className="p-5 sm:p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar src={user.avatarUrl} name={user.displayName} size="xl" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="min-w-0">
                <h1 className="truncate font-display text-4xl font-bold leading-none sm:text-display">
                  {user.displayName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">@{user.username}</p>
              </div>
              <div className="flex w-full shrink-0 gap-2 sm:ml-auto sm:w-auto">
                {isOwner ? (
                  <>
                    <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <Link to="/settings">
                        <Pencil aria-hidden="true" /> Edit profile
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1 sm:flex-none">
                      <Link to="/upload">Upload</Link>
                    </Button>
                  </>
                ) : (
                  <FollowButton
                    username={user.username}
                    displayName={user.displayName}
                    following={viewerState.following}
                    size="default"
                    className="w-full sm:w-auto"
                  />
                )}
              </div>
            </div>

            {user.bio ? <p className="max-w-prose text-sm leading-relaxed">{user.bio}</p> : null}

            <dl className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <dt className="sr-only">Videos</dt>
                <dd className="font-semibold">{formatCount(user.counts.videos)} videos</dd>
              </div>
              <div>
                <dt className="sr-only">Followers</dt>
                <dd>
                  <button
                    type="button"
                    onClick={() => setListKind('followers')}
                    className="font-semibold hover:text-brand focus-visible:outline-2"
                  >
                    {formatCount(user.counts.followers)} followers
                  </button>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Following</dt>
                <dd>
                  <button
                    type="button"
                    onClick={() => setListKind('following')}
                    className="font-semibold hover:text-brand focus-visible:outline-2"
                  >
                    {formatCount(user.counts.following)} following
                  </button>
                </dd>
              </div>
              <div className="inline-flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                <span>Joined {joined}</span>
              </div>
              {isOwner ? (
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-brand"
                >
                  <Settings2 className="size-3.5" aria-hidden="true" /> Settings
                </Link>
              ) : null}
            </dl>
          </div>
        </header>
      </GlassCard>

      {isOwner ? <OwnerUploads /> : null}

      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList aria-label="Profile sections">
          <TabsTrigger value="videos">Videos</TabsTrigger>
          {isOwner ? <TabsTrigger value="liked">Liked</TabsTrigger> : null}
          {isOwner ? <TabsTrigger value="saved">Saved</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="videos">
          <PagedFeedGrid
            query={videos}
            emptyMessage={
              isOwner ? 'Upload your first video to kick things off.' : 'No public videos yet.'
            }
          />
        </TabsContent>
        {isOwner ? (
          <TabsContent value="liked">
            <LikedGrid />
          </TabsContent>
        ) : null}
        {isOwner ? (
          <TabsContent value="saved">
            <SavedGrid />
          </TabsContent>
        ) : null}
      </Tabs>

      <FollowListDialog
        username={user.username}
        kind={listKind ?? 'followers'}
        open={listKind !== null}
        onOpenChange={(open) => {
          if (!open) setListKind(null);
        }}
      />
    </ResponsiveContainer>
  );
}
