import { Bookmark, Heart, MessageCircle, Plus, Share2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useFollow, useLikeVideo, useSaveVideo } from '@reel/queries';
import type { FeedItem } from '@reel/shared';
import { useAuth } from '@/components/auth-provider';
import { SharePopover } from '@/components/feed/share-popover';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ActionRailProps {
  item: FeedItem;
  onOpenComments(): void;
  className?: string;
}

function RailButton({
  label,
  count,
  active,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count === undefined ? label : `${label}, ${formatCount(count)}`}
      aria-pressed={active}
      className="group flex flex-col items-center gap-1 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span
        className={cn(
          'grid size-11 place-items-center rounded-full border border-white/15 bg-black/35 text-white shadow-glass backdrop-blur-xl transition-transform duration-150 group-hover:scale-105 group-active:scale-95',
          active && 'bg-brand text-brand-foreground',
        )}
      >
        {children}
      </span>
      {count === undefined ? null : (
        <span className="text-xs font-semibold tabular-nums text-white drop-shadow-sm">
          {formatCount(count)}
        </span>
      )}
    </button>
  );
}

export function ActionRail({ item, onOpenComments, className }: ActionRailProps) {
  const { user } = useAuth();
  const like = useLikeVideo();
  const save = useSaveVideo();
  const follow = useFollow();
  const isOwn = user?.username === item.author.username;

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <Link
        to={`/@${item.author.username}`}
        aria-label={`View ${item.author.displayName}'s profile`}
        className="relative rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Avatar src={item.author.avatarUrl} name={item.author.displayName} size="md" />
        {!isOwn && !item.viewerState.followingAuthor ? (
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-1/2 grid size-4 -translate-x-1/2 place-items-center rounded-full border-2 border-background bg-brand text-brand-foreground"
          >
            <Plus className="size-3" />
          </span>
        ) : null}
      </Link>

      {!isOwn ? (
        <Button
          type="button"
          size="sm"
          variant={item.viewerState.followingAuthor ? 'outline' : 'default'}
          className="h-7 rounded-pill px-2 text-[0.65rem]"
          aria-label={
            item.viewerState.followingAuthor
              ? `Unfollow ${item.author.displayName}`
              : `Follow ${item.author.displayName}`
          }
          onClick={() =>
            follow.mutate({
              username: item.author.username,
              following: !item.viewerState.followingAuthor,
            })
          }
        >
          {item.viewerState.followingAuthor ? 'Following' : 'Follow'}
        </Button>
      ) : null}

      <RailButton
        label="Like"
        count={item.counts.likes}
        active={item.viewerState.liked}
        onClick={() => like.mutate({ videoId: item.video.id, liked: !item.viewerState.liked })}
      >
        <Heart
          className={cn('size-5', item.viewerState.liked && 'fill-current')}
          aria-hidden="true"
        />
      </RailButton>

      <RailButton label="Comments" count={item.counts.comments} onClick={onOpenComments}>
        <MessageCircle className="size-5" aria-hidden="true" />
      </RailButton>

      <RailButton
        label={item.viewerState.saved ? 'Remove from saved' : 'Save'}
        count={item.counts.saves}
        active={item.viewerState.saved}
        onClick={() => save.mutate({ videoId: item.video.id, saved: !item.viewerState.saved })}
      >
        <Bookmark
          className={cn('size-5', item.viewerState.saved && 'fill-current')}
          aria-hidden="true"
        />
      </RailButton>

      <SharePopover videoId={item.video.id} shares={item.counts.shares}>
        <button
          type="button"
          aria-label={`Share, ${formatCount(item.counts.shares)}`}
          className="group flex flex-col items-center gap-1 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="grid size-11 place-items-center rounded-full border border-white/15 bg-black/35 text-white shadow-glass backdrop-blur-xl transition-transform duration-150 group-hover:scale-105 group-active:scale-95">
            <Share2 className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold tabular-nums text-white drop-shadow-sm">
            {formatCount(item.counts.shares)}
          </span>
        </button>
      </SharePopover>
    </div>
  );
}
