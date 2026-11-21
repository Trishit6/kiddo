import { useFollow } from '@reel/queries';
import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  username: string;
  displayName?: string;
  following: boolean;
  size?: ButtonProps['size'];
  className?: string;
}

/**
 * To prevent accidental unfollows the button asks for confirmation the first
 * time a followed author is clicked.
 */
export function FollowButton({
  username,
  displayName,
  following,
  size = 'sm',
  className,
}: FollowButtonProps) {
  const follow = useFollow();
  const [confirming, setConfirming] = useState(false);
  const label = displayName ?? `@${username}`;

  if (following && confirming) {
    return (
      <span className={cn('inline-flex items-center gap-2 text-xs', className)}>
        <span className="text-muted-foreground">Unfollow?</span>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => {
            follow.mutate({ username, following: false });
            setConfirming(false);
          }}
        >
          Yes
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          No
        </Button>
      </span>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant={following ? 'outline' : 'default'}
      className={className}
      aria-label={following ? `Unfollow ${label}` : `Follow ${label}`}
      disabled={follow.isPending}
      onClick={() => {
        if (following) setConfirming(true);
        else follow.mutate({ username, following: true });
      }}
    >
      {following ? 'Following' : 'Follow'}
    </Button>
  );
}
