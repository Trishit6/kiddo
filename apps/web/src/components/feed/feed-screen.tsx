import { useLikeVideo, useInfiniteFeed } from '@reel/queries';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Keyboard,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FeedKind } from '@reel/shared';
import { useAuth } from '@/components/auth-provider';
import { CommentsPanel } from '@/components/feed/comments-panel';
import { FeedItem } from '@/components/feed/feed-item';
import { usePlaybackSettings } from '@/components/playback-settings';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/errors';
import { feedShortcut, shouldMountPlayer } from '@/lib/feed-shortcuts';
import { cn } from '@/lib/utils';

const NEXT_PAGE_THRESHOLD = 3;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

function indexKey(kind: FeedKind): string {
  return `kiddo-feed-index-${kind}`;
}

function readIndex(kind: FeedKind): number {
  try {
    const raw = sessionStorage.getItem(indexKey(kind));
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function FeedTabs({ kind }: { kind: FeedKind }) {
  return (
    <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/40 p-1 text-sm font-semibold text-white shadow-[0_18px_50px_rgb(3_10_7_/_45%)] backdrop-blur-xl">
      <Link
        to="/"
        aria-current={kind === 'for-you' ? 'page' : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors',
          kind === 'for-you' ? 'bg-brand text-brand-foreground' : 'text-white/80 hover:text-white',
        )}
      >
        <Sparkles className="size-4" aria-hidden="true" /> For You
      </Link>
      <Link
        to="/following"
        aria-current={kind === 'following' ? 'page' : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors',
          kind === 'following'
            ? 'bg-brand text-brand-foreground'
            : 'text-white/80 hover:text-white',
        )}
      >
        <Users className="size-4" aria-hidden="true" /> Following
      </Link>
    </div>
  );
}

function KeyboardHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const shortcuts: Array<[string, string]> = [
    ['↑ / ↓ or k / j', 'Previous or next video'],
    ['Space', 'Play or pause'],
    ['M', 'Mute or unmute'],
    ['L', 'Like the video'],
    ['C', 'Open comments'],
    ['Esc', 'Close panels'],
    ['?', 'Show this help'],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Everything works without a mouse.</DialogDescription>
        </DialogHeader>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {shortcuts.map(([keys, description]) => (
            <div key={keys} className="col-span-2 grid grid-cols-subgrid">
              <dt>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {keys}
                </kbd>
              </dt>
              <dd className="text-muted-foreground">{description}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

function SignedOutFollowing() {
  return (
    <div className="grid h-full place-items-center px-6 pb-16 text-center">
      <div className="max-w-sm space-y-4">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand/15 text-brand">
          <Users className="size-8" aria-hidden="true" />
        </span>
        <h1 className="font-display text-display font-bold">Follow your people</h1>
        <p className="text-muted-foreground">
          Sign in to see a chronological feed of the creators you follow.
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/explore">
              <Compass aria-hidden="true" /> Explore
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FeedScreen({ kind }: { kind: FeedKind }) {
  const { status, user } = useAuth();
  const requireAuth = kind === 'following';
  const enabled = status !== 'loading' && (!requireAuth || Boolean(user));
  const query = useInfiniteFeed(kind, enabled);
  const like = useLikeVideo();
  const { toggleMuted } = usePlaybackSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const restored = useRef(false);

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const activeItem = items[activeIndex];
  const commentItem = items.find((item) => item.video.id === commentsFor);

  useEffect(() => {
    setPlaying(true);
  }, [activeIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;
    const slides = Array.from(container.querySelectorAll<HTMLElement>('[data-feed-slide]'));
    if (slides.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number(entry.target.getAttribute('data-index'));
          if (Number.isInteger(index)) setActiveIndex(index);
        }
      },
      { root: container, threshold: 0.6 },
    );
    for (const slide of slides) observer.observe(slide);
    return () => observer.disconnect();
  }, [enabled, items.length]);

  useEffect(() => {
    if (!enabled || restored.current || items.length === 0) return;
    const container = containerRef.current;
    if (!container) return;
    const target = Math.min(readIndex(kind), items.length - 1);
    if (target > 0) container.scrollTop = target * container.clientHeight;
    setActiveIndex(target);
    restored.current = true;
  }, [enabled, items.length, kind]);

  useEffect(() => {
    try {
      sessionStorage.setItem(indexKey(kind), String(activeIndex));
    } catch {
      // Session storage is optional.
    }
  }, [activeIndex, kind]);

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  useEffect(() => {
    if (!enabled || !hasNextPage || isFetchingNextPage) return;
    if (activeIndex >= items.length - NEXT_PAGE_THRESHOLD) void fetchNextPage();
  }, [activeIndex, enabled, fetchNextPage, hasNextPage, isFetchingNextPage, items.length]);

  const goTo = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;
      const target = Math.max(0, Math.min(index, items.length - 1));
      container.scrollTo({ top: target * container.clientHeight, behavior: 'smooth' });
    },
    [items.length],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (!enabled) return;
      const action = feedShortcut(event.key);
      if (!action) return;
      if (action === 'next' || action === 'previous' || action === 'toggle-play') {
        event.preventDefault();
      }
      switch (action) {
        case 'next':
          goTo(activeIndex + 1);
          break;
        case 'previous':
          goTo(activeIndex - 1);
          break;
        case 'toggle-play':
          setPlaying((value) => !value);
          break;
        case 'toggle-mute':
          toggleMuted();
          break;
        case 'like':
          if (activeItem) {
            like.mutate({ videoId: activeItem.video.id, liked: !activeItem.viewerState.liked });
          }
          break;
        case 'comments':
          if (activeItem) setCommentsFor(activeItem.video.id);
          break;
        case 'close':
          setCommentsFor(null);
          break;
        case 'help':
          setHelpOpen(true);
          break;
        default:
          break;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, activeItem, enabled, goTo, like, toggleMuted]);

  if (requireAuth && status === 'unauthenticated') return <SignedOutFollowing />;

  if (query.isPending || (!enabled && requireAuth)) {
    return (
      <div className="relative h-full w-full bg-black/40 md:flex md:items-center md:justify-center md:p-4">
        <div className="mx-auto h-full w-full bg-muted md:aspect-[9/16] md:h-full md:w-auto md:overflow-hidden md:rounded-[1.5rem]">
          <Skeleton className="h-full w-full bg-white/5 md:rounded-[1.5rem]" />
        </div>
      </div>
    );
  }

  if (query.isError && items.length === 0) {
    return (
      <div className="grid h-full place-items-center px-6 pb-16 text-center">
        <div className="max-w-sm space-y-3">
          <h1 className="font-display text-title font-semibold">The feed is taking a breather</h1>
          <p className="text-sm text-muted-foreground">
            {errorMessage(query.error, 'Could not load the feed')}
          </p>
          <Button type="button" onClick={() => void query.refetch()}>
            <RefreshCw aria-hidden="true" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="grid h-full place-items-center px-6 pb-16 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="font-display text-display font-bold">Nothing here yet</h1>
          <p className="text-muted-foreground">
            {kind === 'following'
              ? 'Follow a few creators and their latest videos will land here.'
              : 'No videos match your feed right now. Try Explore.'}
          </p>
          <Button asChild>
            <Link to="/explore">
              <Compass aria-hidden="true" /> Explore videos
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black md:bg-black/40">
      <p className="sr-only" aria-live="polite">
        Video {activeIndex + 1} of {items.length}
      </p>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center pt-4 md:pt-6">
        <FeedTabs kind={kind} />
      </div>

      <div className="absolute right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 md:flex">
        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous video"
          className="grid size-11 place-items-center rounded-full border border-white/15 bg-black/40 text-white shadow-glass backdrop-blur-xl transition-colors hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronUp className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          disabled={activeIndex >= items.length - 1}
          aria-label="Next video"
          className="grid size-11 place-items-center rounded-full border border-white/15 bg-black/40 text-white shadow-glass backdrop-blur-xl transition-colors hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronDown className="size-5" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        aria-label="Keyboard shortcuts"
        className="absolute bottom-24 right-4 z-30 hidden rounded-full bg-black/40 p-2 text-white/80 backdrop-blur transition-colors hover:text-white md:block"
      >
        <Keyboard className="size-4" aria-hidden="true" />
      </button>

      {query.isError ? (
        <div className="absolute inset-x-0 top-16 z-30 mx-auto flex w-fit items-center gap-3 rounded-pill bg-destructive px-4 py-2 text-xs font-semibold text-white">
          Could not refresh the feed
          <button type="button" className="underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="no-scrollbar feed-snap h-full w-full overflow-y-scroll overscroll-contain"
        tabIndex={-1}
        aria-label={kind === 'for-you' ? 'For You feed' : 'Following feed'}
      >
        {items.map((item, index) => (
          <FeedItem
            key={item.video.id}
            index={index}
            item={item}
            active={index === activeIndex}
            playing={playing}
            preload={shouldMountPlayer(index, activeIndex)}
            onTogglePlay={() => setPlaying((value) => !value)}
            onOpenComments={() => setCommentsFor(item.video.id)}
          />
        ))}

        <div className="feed-slide grid h-full place-items-center bg-background px-6 pb-16 text-center">
          {isFetchingNextPage ? (
            <Spinner label="Fetching more videos" />
          ) : hasNextPage ? (
            <Button type="button" variant="outline" onClick={() => void fetchNextPage()}>
              Load more videos
            </Button>
          ) : (
            <div className="max-w-sm space-y-3">
              <h2 className="font-display text-title font-semibold">You&apos;re all caught up</h2>
              <p className="text-sm text-muted-foreground">
                That is every video for now. New ones show up as creators post.
              </p>
              <Button asChild variant="outline">
                <Link to="/explore">
                  <Compass aria-hidden="true" /> Explore
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {commentItem ? (
        <CommentsPanel
          videoId={commentItem.video.id}
          videoAuthorId={commentItem.author.id}
          open={commentsFor !== null}
          onOpenChange={(open) => {
            if (!open) setCommentsFor(null);
          }}
        />
      ) : null}

      <KeyboardHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
