import {
  useMarkNotificationsRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@reel/queries';
import { ApiClientError } from '@reel/shared';
import type { Notification, NotificationFilter } from '@reel/shared';
import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

const filters: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'likes', label: 'Likes' },
  { value: 'comments', label: 'Comments' },
  { value: 'mentions', label: 'Mentions' },
  { value: 'follows', label: 'Follows' },
];

function notificationMessage(item: Notification): string {
  switch (item.type) {
    case 'like':
      return 'liked your video';
    case 'comment':
      return 'commented on your video';
    case 'reply':
      return 'replied to your comment';
    case 'comment_like':
      return 'liked your comment';
    case 'follow':
      return 'started following you';
    case 'mention':
      return 'mentioned you';
    case 'video_ready':
      return 'Your video is ready to watch';
    case 'video_failed':
      return 'Your video could not be processed';
    case 'moderation':
      return 'There is an update about your content';
  }
}

function notificationActor(item: Notification): string {
  const first = item.actors[0]?.displayName;
  if (!first) return item.actorCount > 1 ? `${item.actorCount} people` : 'Kiddo';
  return item.actorCount > 1 ? `${first} and ${item.actorCount - 1} others` : first;
}

function relativeTime(value: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(value),
  );
}

function NotificationRow({ item, onRead }: { item: Notification; onRead(): void }) {
  const actor = item.actors[0];
  return (
    <Link
      to={item.href}
      onClick={onRead}
      className={cn(
        'flex min-h-20 items-center gap-3 rounded-2xl border p-3 transition-colors sm:gap-4 sm:p-4',
        item.readAt
          ? 'border-border/60 bg-card/60 hover:bg-accent/70'
          : 'border-brand/20 bg-brand/5 hover:bg-brand/10',
      )}
    >
      <div className="relative shrink-0">
        <Avatar src={actor?.avatarUrl} name={actor?.displayName ?? 'Kiddo'} size="md" />
        {!item.readAt ? (
          <span
            aria-label="Unread"
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-brand"
          />
        ) : null}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug">
          <span className="font-semibold">{notificationActor(item)}</span>{' '}
          {notificationMessage(item)}
        </span>
        {item.commentSnippet ? (
          <span className="mt-1 block truncate text-sm text-muted-foreground">
            “{item.commentSnippet}”
          </span>
        ) : null}
        <time dateTime={item.createdAt} className="mt-1 block text-xs text-muted-foreground">
          {relativeTime(item.createdAt)}
        </time>
      </span>
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt=""
          loading="lazy"
          className="size-12 shrink-0 rounded-lg bg-muted object-cover sm:size-14"
        />
      ) : null}
    </Link>
  );
}

export function Notifications() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const notifications = useNotifications(filter);
  const unread = useUnreadNotificationCount();
  const markRead = useMarkNotificationsRead();
  const items = notifications.data?.pages.flatMap((page) => page.items) ?? [];
  const unavailable =
    notifications.error instanceof ApiClientError && notifications.error.status === 404;

  return (
    <ResponsiveContainer width="md" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-label font-semibold uppercase tracking-widest text-brand">
            Your activity
          </p>
          <h1 className="flex items-center gap-3 font-display text-display font-bold tracking-tight">
            <Bell className="size-7 text-brand" aria-hidden="true" />
            Notifications
          </h1>
          {unread.data ? (
            <p className="text-sm text-muted-foreground">
              {unread.data.count === 0
                ? 'You’re all caught up.'
                : `${unread.data.count} unread ${unread.data.count === 1 ? 'notification' : 'notifications'}`}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!unread.data?.count || markRead.isPending}
          onClick={() => markRead.mutate({ all: true })}
        >
          <CheckCheck aria-hidden="true" />
          {markRead.isPending ? 'Marking…' : 'Mark all read'}
        </Button>
      </header>

      <div
        role="tablist"
        aria-label="Filter notifications"
        className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
      >
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              'min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors',
              filter === value
                ? 'border-brand bg-brand text-brand-foreground'
                : 'border-border bg-card/70 text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {markRead.isError ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {errorMessage(markRead.error, 'Could not update notification status.')}
        </p>
      ) : null}
      {notifications.isError ? (
        <GlassCard className="space-y-3 p-6 text-center">
          <h2 className="font-display text-lg font-semibold">Activity is unavailable</h2>
          <p role="alert" className="text-sm text-muted-foreground">
            {unavailable
              ? 'Notifications are not available on this API deployment yet.'
              : errorMessage(notifications.error, 'Could not load notifications.')}
          </p>
          <Button type="button" variant="outline" onClick={() => void notifications.refetch()}>
            Try again
          </Button>
        </GlassCard>
      ) : null}
      {notifications.isPending ? (
        <div className="space-y-2" aria-label="Loading notifications">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : null}
      {notifications.data && items.length === 0 ? (
        <GlassCard className="space-y-2 p-8 text-center">
          <Bell className="mx-auto size-8 text-brand" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold">No activity yet</h2>
          <p className="text-sm text-muted-foreground">
            Likes, comments, follows, and mentions will show up here.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link to="/explore">Explore videos</Link>
          </Button>
        </GlassCard>
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <NotificationRow
                item={item}
                onRead={() => {
                  if (!item.readAt) markRead.mutate({ ids: [item.id] });
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {notifications.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          disabled={notifications.isFetchingNextPage}
          onClick={() => void notifications.fetchNextPage()}
        >
          {notifications.isFetchingNextPage ? 'Loading…' : 'Load older notifications'}
        </Button>
      ) : null}
    </ResponsiveContainer>
  );
}
