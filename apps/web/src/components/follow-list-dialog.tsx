import { useFollowers, useFollowing } from '@reel/queries';
import { Loader2 } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FollowButton } from '@/components/follow-button';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useLoadMore } from '@/hooks/use-load-more';
import { errorMessage } from '@/lib/errors';

interface FollowListDialogProps {
  username: string;
  kind: 'followers' | 'following';
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function FollowListDialog({ username, kind, open, onOpenChange }: FollowListDialogProps) {
  const followers = useFollowers(kind === 'followers' ? username : '');
  const following = useFollowing(kind === 'following' ? username : '');
  const query = kind === 'followers' ? followers : following;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  useLoadMore(sentinelRef, {
    enabled: open && Boolean(query.hasNextPage) && !query.isFetchingNextPage,
    onLoadMore: () => void query.fetchNextPage(),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{kind}</DialogTitle>
        </DialogHeader>
        <ul className="-mx-2 mt-4 max-h-[60vh] space-y-1 overflow-y-auto">
          {query.isPending
            ? Array.from({ length: 4 }).map((_, index) => (
                <li key={index} className="flex items-center gap-3 p-2">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </li>
              ))
            : null}

          {query.isError ? (
            <li className="space-y-2 p-2 text-sm text-destructive">
              {errorMessage(query.error, `Could not load ${kind}`)}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void query.refetch()}
              >
                Retry
              </Button>
            </li>
          ) : null}

          {!query.isPending && items.length === 0 ? (
            <li className="p-6 text-center text-sm text-muted-foreground">Nobody here yet.</li>
          ) : null}

          {items.map((entry) => (
            <li
              key={entry.user.id}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/50"
            >
              <Link
                to={`/@${entry.user.username}`}
                onClick={() => onOpenChange(false)}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar src={entry.user.avatarUrl} name={entry.user.displayName} size="md" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {entry.user.displayName}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{entry.user.username}
                  </span>
                </span>
              </Link>
              <FollowButton
                username={entry.user.username}
                displayName={entry.user.displayName}
                following={entry.viewerState.following}
              />
            </li>
          ))}
        </ul>
        <div ref={sentinelRef} aria-hidden="true" className="h-2" />
        {query.isFetchingNextPage ? (
          <div className="flex justify-center pt-2">
            <Loader2
              className="size-5 animate-spin text-muted-foreground"
              aria-label="Loading more"
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
