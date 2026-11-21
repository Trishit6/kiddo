import { useLikeVideo, useSaveVideo } from '@reel/queries';
import { Bookmark, Eye, Heart, MessageCircle, Play, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import type { FeedItem } from '@reel/shared';
import { SharePopover } from '@/components/feed/share-popover';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount, formatDuration, formatViews } from '@/lib/format';
import { cn } from '@/lib/utils';

interface VideoGridProps {
  items: FeedItem[];
  emptyMessage: string;
  className?: string;
}

/** Keeps portrait clips tall but not endless, and landscape clips wide. */
function mediaAspect(item: FeedItem): string {
  const ratio = item.video.width / item.video.height;
  return `${Math.min(Math.max(ratio, 0.7), 1.3)}`;
}

function VideoCard({ item }: { item: FeedItem }) {
  const like = useLikeVideo();
  const save = useSaveVideo();
  const href = `/video/${item.video.id}`;
  const captionText = item.video.caption
    .replace(/#[A-Za-z0-9_]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return (
    <article className="glass group relative overflow-hidden rounded-[1.4rem] p-2 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_60px_rgb(6_12_9_/_28%)]">
      <div
        className="relative overflow-hidden rounded-[1.05rem] bg-muted"
        style={{ aspectRatio: mediaAspect(item) }}
      >
        <Link
          to={href}
          className="block size-full"
          aria-label={item.video.caption || 'Watch video'}
        >
          <img
            src={item.video.thumbnailUrl}
            alt={
              item.video.caption
                ? item.video.caption
                : `Thumbnail for a video by ${item.author.displayName}`
            }
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-12 place-items-center rounded-full border border-white/30 bg-black/25 text-white opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
              <Play className="size-5 fill-current" aria-hidden="true" />
            </span>
          </span>
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[0.66rem] font-semibold text-white backdrop-blur-md">
            <Eye className="size-3" aria-hidden="true" />
            {formatViews(item.counts.views)}
          </span>
          <span className="absolute bottom-2.5 right-2.5 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[0.66rem] font-semibold tabular-nums text-white backdrop-blur-md">
            {formatDuration(item.video.durationSeconds)}
          </span>
        </Link>
      </div>

      <div className="space-y-2 px-1 pb-1 pt-2.5">
        <div className="flex items-center gap-2">
          <Link
            to={`/@${item.author.username}`}
            className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Avatar src={item.author.avatarUrl} name={item.author.displayName} size="sm" />
            <span className="truncate">@{item.author.username}</span>
          </Link>
        </div>

        <Link to={href} className="block space-y-1">
          <p className="line-clamp-2 text-[0.82rem] leading-snug text-foreground/90">
            {captionText || 'Untitled clip'}
          </p>
          {item.video.hashtags.length > 0 ? (
            <p className="flex flex-wrap gap-x-1.5 text-[0.72rem] font-medium text-brand">
              {item.video.hashtags.slice(0, 3).map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </p>
          ) : null}
        </Link>

        <div className="grid grid-cols-4 items-center gap-0.5 border-t border-glass-border pt-1.5">
          <button
            type="button"
            onClick={() => like.mutate({ videoId: item.video.id, liked: !item.viewerState.liked })}
            aria-pressed={item.viewerState.liked}
            aria-label={`${item.viewerState.liked ? 'Unlike' : 'Like'}, ${formatCount(item.counts.likes)}`}
            className={cn(
              'inline-flex min-h-8 items-center justify-center gap-1 rounded-full px-1 text-[0.7rem] font-medium tabular-nums transition-colors hover:bg-accent sm:text-xs',
              item.viewerState.liked ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Heart
              className={cn('size-4', item.viewerState.liked && 'fill-current')}
              aria-hidden="true"
            />
            {formatCount(item.counts.likes)}
          </button>

          <Link
            to={href}
            aria-label={`Comments, ${formatCount(item.counts.comments)}`}
            className="inline-flex min-h-8 items-center justify-center gap-1 rounded-full px-1 text-[0.7rem] font-medium tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:text-xs"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {formatCount(item.counts.comments)}
          </Link>

          <button
            type="button"
            onClick={() => save.mutate({ videoId: item.video.id, saved: !item.viewerState.saved })}
            aria-pressed={item.viewerState.saved}
            aria-label={`${item.viewerState.saved ? 'Remove from saved' : 'Save'}, ${formatCount(item.counts.saves)}`}
            className={cn(
              'inline-flex min-h-8 items-center justify-center gap-1 rounded-full px-1 text-[0.7rem] font-medium tabular-nums transition-colors hover:bg-accent',
              item.viewerState.saved ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Bookmark
              className={cn('size-4', item.viewerState.saved && 'fill-current')}
              aria-hidden="true"
            />
          </button>

          <SharePopover videoId={item.video.id} shares={item.counts.shares}>
            <button
              type="button"
              aria-label={`Share, ${formatCount(item.counts.shares)}`}
              className="inline-flex min-h-8 items-center justify-center gap-1 rounded-full px-1 text-[0.7rem] font-medium tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Share2 className="size-4" aria-hidden="true" />
            </button>
          </SharePopover>
        </div>
      </div>
    </article>
  );
}

export function VideoGrid({ items, emptyMessage, className }: VideoGridProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-glass-border bg-glass p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className={cn('columns-2 gap-3 md:gap-4 lg:columns-3 xl:gap-5', className)}>
      {items.map((item, index) => (
        <motion.li
          key={item.video.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.2) }}
          className="mb-3 break-inside-avoid md:mb-4 xl:mb-5"
        >
          <VideoCard item={item} />
        </motion.li>
      ))}
    </ul>
  );
}

export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="columns-2 gap-3 md:gap-4 lg:columns-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className="mb-3 break-inside-avoid md:mb-4">
          <div className="glass rounded-[1.4rem] p-2">
            <Skeleton
              className={cn(
                'w-full rounded-[1.05rem]',
                index % 3 === 1 ? 'aspect-[4/5]' : 'aspect-[3/4]',
              )}
            />
            <div className="flex items-center gap-2 px-1 pt-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="mx-1 mt-2 h-2.5 w-4/5" />
            <Skeleton className="mx-1 mt-1.5 h-2.5 w-2/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}
