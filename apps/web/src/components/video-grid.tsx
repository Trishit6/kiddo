import { Heart, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import type { FeedItem } from '@reel/shared';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount, formatViews } from '@/lib/format';
import { cn } from '@/lib/utils';

interface VideoGridProps {
  items: FeedItem[];
  emptyMessage: string;
  className?: string;
}

export function VideoGrid({ items, emptyMessage, className }: VideoGridProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className={cn('grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-5', className)}>
      {items.map((item, index) => (
        <motion.li
          key={item.video.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.2) }}
        >
          <Link
            to={`/video/${item.video.id}`}
            className="group block overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={`Watch ${item.video.caption || 'video'} by ${item.author.displayName}`}
          >
            <div className="relative aspect-[9/16] overflow-hidden bg-muted">
              <img
                src={item.video.thumbnailUrl}
                alt={item.video.caption || `Thumbnail for a video by ${item.author.displayName}`}
                loading="lazy"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80"
              />
              <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 text-xs font-semibold text-white">
                <Play className="size-3 fill-current" aria-hidden="true" />
                {formatViews(item.counts.views)}
              </span>
              {item.counts.likes > 0 ? (
                <Badge
                  variant="brand"
                  className="absolute right-1.5 top-1.5 gap-0.5 px-1.5 text-[0.6rem]"
                >
                  <Heart className="size-2.5 fill-current" aria-hidden="true" />
                  {formatCount(item.counts.likes)}
                </Badge>
              ) : null}
            </div>
            <p className="line-clamp-2 px-0.5 pt-1.5 text-xs text-muted-foreground">
              {item.video.caption || `@${item.author.username}`}
            </p>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}

export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-5"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <li key={index}>
          <Skeleton className="aspect-[9/16] w-full rounded-xl" />
          <Skeleton className="mt-2 h-2.5 w-3/4" />
        </li>
      ))}
    </ul>
  );
}
