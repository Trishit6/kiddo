import { useFeedItem, useProfileVideos, useVideo, useLikeVideo } from '@reel/queries';
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ActionRail } from '@/components/feed/action-rail';
import { CommentsPanel } from '@/components/feed/comments-panel';
import { FeedPlayer } from '@/components/feed/feed-player';
import { usePlaybackSettings } from '@/components/playback-settings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount } from '@/lib/format';
import { errorMessage } from '@/lib/errors';

export function VideoDetail() {
  const { id = '' } = useParams();
  const video = useVideo(id);
  const feedItem = useFeedItem(id);
  const { muted, toggleMuted } = usePlaybackSettings();
  const like = useLikeVideo();
  const [playing, setPlaying] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const item = feedItem.data?.item;
  const more = useProfileVideos(item?.author.username ?? '');
  const moreItems =
    more.data?.pages.flatMap((page) => page.items).filter((entry) => entry.video.id !== id) ?? [];

  if (video.isPending) {
    return (
      <div className="grid h-full place-items-center bg-black">
        <Skeleton className="h-full w-full max-w-sm bg-white/5 md:h-[calc(100dvh-2rem)] md:w-[calc((100dvh-2rem)*9/16)] md:rounded-2xl" />
      </div>
    );
  }

  if (video.isError || !video.data) {
    return (
      <div className="grid h-full place-items-center px-6 pb-16 text-center">
        <GlassCard strong className="max-w-sm space-y-4 p-6">
          <h1 className="font-display text-display font-bold">Video unavailable</h1>
          <p className="text-muted-foreground">
            {errorMessage(video.error, 'This video is private, removed, or does not exist.')}
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild>
              <Link to="/">
                <ArrowLeft aria-hidden="true" /> Back to feed
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/explore">Explore</Link>
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const status = video.data.video.status;
  if (status !== 'ready') {
    const failed = status === 'failed';
    return (
      <div className="grid h-full place-items-center px-6 pb-16 text-center">
        <GlassCard strong className="max-w-sm space-y-4 p-6">
          <Badge variant={failed ? 'destructive' : 'outline'} className="uppercase">
            {status}
          </Badge>
          <h1 className="font-display text-display font-bold">
            {failed ? 'Processing failed' : 'Still cooking'}
          </h1>
          <p className="text-muted-foreground">
            {failed
              ? (video.data.video.failure?.message ?? 'Try uploading the video again.')
              : 'This video is being processed. Check back in a moment.'}
          </p>
          <Button asChild variant="outline">
            <Link to="/settings">Manage my videos</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  if (feedItem.isError || (!feedItem.isPending && !item)) {
    return (
      <div className="grid h-full place-items-center px-6 pb-16 text-center">
        <GlassCard strong className="max-w-sm space-y-3 p-6">
          <h1 className="font-display text-title font-semibold">Video unavailable</h1>
          <p className="text-sm text-muted-foreground">
            {errorMessage(feedItem.error, 'This video is not available right now.')}
          </p>
          <Button asChild>
            <Link to="/">Back to feed</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="grid h-full place-items-center bg-black">
        <Loader2 className="size-8 animate-spin text-white" aria-label="Loading video" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-2 text-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Feed
          </Link>
          <Link
            to={`/@${item.author.username}`}
            className="font-semibold text-brand hover:underline"
          >
            @{item.author.username}
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center bg-black/90 p-0 md:p-4">
          <div className="relative h-full w-full md:h-[calc(100dvh-5rem)] md:w-[calc((100dvh-5rem)*9/16)] md:max-w-full md:rounded-2xl md:shadow-lift">
            <FeedPlayer
              src={item.video.hlsUrl}
              poster={item.video.thumbnailUrl}
              playing={playing}
              muted={muted}
              onTogglePlay={() => setPlaying((value) => !value)}
              onToggleMute={toggleMuted}
              className="md:rounded-2xl"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />
            <div
              className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-4 pb-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="min-w-0 space-y-1 text-white">
                <p className="line-clamp-3 text-sm">{item.video.caption || 'No caption'}</p>
                {item.video.hashtags.length > 0 ? (
                  <p className="flex flex-wrap gap-x-2 text-sm font-semibold">
                    {item.video.hashtags.map((tag) => (
                      <Link key={tag} to={`/tag/${tag}`} className="hover:underline">
                        #{tag}
                      </Link>
                    ))}
                  </p>
                ) : null}
                <p className="text-xs text-white/70">{formatCount(item.counts.views)} views</p>
              </div>
              <ActionRail item={item} onOpenComments={() => setCommentsOpen(true)} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-4 py-2 lg:hidden">
          <Button type="button" variant="ghost" size="sm" onClick={() => setCommentsOpen(true)}>
            <MessageCircle aria-hidden="true" /> {formatCount(item.counts.comments)} comments
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => like.mutate({ videoId: item.video.id, liked: !item.viewerState.liked })}
          >
            {formatCount(item.counts.likes)} likes
          </Button>
        </div>

        {moreItems.length > 0 ? (
          <section aria-labelledby="more-from-creator" className="space-y-2 px-4 py-4">
            <h2 id="more-from-creator" className="font-display text-lg font-semibold">
              More from @{item.author.username}
            </h2>
            <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
              {moreItems.map((entry) => (
                <li key={entry.video.id} className="w-24 shrink-0">
                  <Link to={`/video/${entry.video.id}`} className="group block space-y-1">
                    <img
                      src={entry.video.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="aspect-[9/16] w-full rounded-lg object-cover"
                    />
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {entry.video.caption || 'Untitled'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <CommentsPanel
        videoId={item.video.id}
        videoAuthorId={item.author.id}
        open
        onOpenChange={() => undefined}
        variant="inline"
      />
      <CommentsPanel
        videoId={item.video.id}
        videoAuthorId={item.author.id}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </div>
  );
}
