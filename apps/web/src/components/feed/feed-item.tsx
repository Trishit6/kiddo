import { useLikeVideo, useViewTracker } from '@reel/queries';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Link } from 'react-router-dom';
import type { FeedItem as FeedItemData } from '@reel/shared';
import { ActionRail } from '@/components/feed/action-rail';
import { FeedPlayer } from '@/components/feed/feed-player';
import { usePlaybackSettings } from '@/components/playback-settings';
import { cn } from '@/lib/utils';

interface Burst {
  id: number;
  x: number;
  y: number;
}

interface FeedItemProps {
  item: FeedItemData;
  index: number;
  active: boolean;
  playing: boolean;
  preload: boolean;
  onTogglePlay(): void;
  onOpenComments(): void;
}

const DOUBLE_CLICK_WINDOW_MS = 240;

export function FeedItem({
  item,
  index,
  active,
  playing,
  preload,
  onTogglePlay,
  onOpenComments,
}: FeedItemProps) {
  const { muted, toggleMuted } = usePlaybackSettings();
  const like = useLikeVideo();
  const { track } = useViewTracker();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const captionText = item.video.caption
    .replace(/#[A-Za-z0-9_]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watched = useRef({ max: 0, completed: false });
  const likedRef = useRef(item.viewerState.liked);
  likedRef.current = item.viewerState.liked;

  useEffect(() => {
    return () => {
      if (watched.current.max > 0) {
        track(item.video.id, watched.current.max, watched.current.completed);
      }
    };
  }, [item.video.id, track]);

  useEffect(() => {
    if (active) return;
    if (watched.current.max > 0) {
      track(item.video.id, watched.current.max, watched.current.completed);
      watched.current = { max: 0, completed: false };
    }
  }, [active, item.video.id, track]);

  useEffect(() => {
    return () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, []);

  const onProgress = (currentTime: number, duration: number) => {
    watched.current.max = Math.max(watched.current.max, currentTime * 1000);
    if (duration > 0 && currentTime / duration >= 0.95) watched.current.completed = true;
  };

  const likeAt = (x: number, y: number) => {
    const id = Date.now();
    setBursts((current) => [...current, { id, x, y }]);
    window.setTimeout(() => {
      setBursts((current) => current.filter((burst) => burst.id !== id));
    }, 800);
    if (!likedRef.current) like.mutate({ videoId: item.video.id, liked: true });
  };

  const onAreaClick = () => {
    if (clickTimer.current) return;
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      onTogglePlay();
    }, DOUBLE_CLICK_WINDOW_MS);
  };

  const onDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    likeAt(event.clientX - rect.left, event.clientY - rect.top);
  };

  const showTogglePlay = useCallback(() => onTogglePlay(), [onTogglePlay]);
  const player = preload ? (
    <FeedPlayer
      key={item.video.id}
      src={item.video.hlsUrl}
      poster={item.video.thumbnailUrl}
      playing={active && playing}
      muted={muted}
      onTogglePlay={showTogglePlay}
      onToggleMute={toggleMuted}
      onProgress={onProgress}
      onEnded={() => {
        watched.current.completed = true;
      }}
    />
  ) : (
    <img
      src={item.video.thumbnailUrl}
      alt=""
      loading="lazy"
      className="absolute inset-0 size-full object-cover md:object-contain"
    />
  );

  return (
    <section
      data-feed-slide
      data-index={index}
      aria-label={`Video by ${item.author.displayName}`}
      className="feed-slide relative flex h-full w-full snap-center items-center justify-center overflow-hidden bg-black/60 md:py-4"
    >
      {item.video.thumbnailUrl ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden scale-110 bg-cover bg-center opacity-30 blur-3xl md:block"
          style={{ backgroundImage: `url(${item.video.thumbnailUrl})` }}
        />
      ) : null}
      <div
        className="relative h-full w-full overflow-hidden bg-black md:aspect-[9/16] md:h-full md:w-auto md:max-w-full md:rounded-[1.5rem] md:shadow-lift"
        onDoubleClick={onDoubleClick}
        onClick={onAreaClick}
        role="presentation"
      >
        {item.video.thumbnailUrl ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-2xl md:hidden"
            style={{ backgroundImage: `url(${item.video.thumbnailUrl})` }}
          />
        ) : null}

        {player}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
        />

        {bursts.map((burst) => (
          <motion.span
            key={burst.id}
            aria-hidden="true"
            initial={{ opacity: 1, scale: 0.4 }}
            animate={{ opacity: 0, scale: 1.8, y: -30 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ left: burst.x, top: burst.y }}
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 text-brand drop-shadow-[0_6px_18px_rgb(3_10_7_/_45%)]"
          >
            <Heart className="size-20 fill-current" />
          </motion.span>
        ))}

        <div
          className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-4 pb-16 md:pb-14"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="min-w-0 flex-1 space-y-1.5 text-white">
            <Link
              to={`/@${item.author.username}`}
              className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
            >
              @{item.author.username}
            </Link>
            {captionText ? (
              <div className="text-sm leading-snug">
                <p
                  className={cn(
                    'whitespace-pre-wrap break-words drop-shadow-sm',
                    !captionExpanded && 'line-clamp-2',
                  )}
                >
                  {captionText}
                </p>
                {captionText.length > 110 ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setCaptionExpanded((value) => !value);
                    }}
                    className="mt-1 text-xs font-semibold text-white/80 hover:text-white"
                    aria-expanded={captionExpanded}
                  >
                    {captionExpanded ? 'Show less' : 'More'}
                  </button>
                ) : null}
              </div>
            ) : null}
            {item.video.hashtags.length > 0 ? (
              <p className="flex flex-wrap gap-x-2 text-sm font-semibold text-white/90">
                {item.video.hashtags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/tag/${tag}`}
                    onClick={(event) => event.stopPropagation()}
                    className="hover:underline"
                  >
                    #{tag}
                  </Link>
                ))}
              </p>
            ) : null}
          </div>

          <ActionRail item={item} onOpenComments={onOpenComments} className="shrink-0" />
        </div>

        <div className="absolute inset-x-0 top-0 z-20 flex justify-end px-3 pt-16 md:hidden">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleMuted();
            }}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
          >
            {muted ? 'Sound off' : 'Sound on'}
          </button>
        </div>
      </div>
    </section>
  );
}
