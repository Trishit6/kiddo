import { Loader2, Play, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { cn } from '@/lib/utils';

const BUFFER_SPINNER_DELAY_MS = 300;

interface FeedPlayerProps {
  src: string;
  poster: string;
  playing: boolean;
  muted: boolean;
  className?: string;
  onTogglePlay(): void;
  onToggleMute(): void;
  onProgress?(currentTime: number, duration: number): void;
  onEnded?(): void;
}

/**
 * A single HLS video. Only the active slide gets `playing`; neighbours are
 * mounted (so they buffer) but paused. hls.js is imported on demand so it stays
 * out of the initial bundle.
 */
export function FeedPlayer({
  src,
  poster,
  playing,
  muted,
  className,
  onTogglePlay,
  onToggleMute,
  onProgress,
  onEnded,
}: FeedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const spinnerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    setFailed(false);
    setBuffering(true);

    const attachNative = () => {
      video.src = src;
    };

    const nativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== '';
    if (nativeHls) {
      attachNative();
    } else {
      void import('hls.js')
        .then(({ default: HlsPlayer }) => {
          if (cancelled) return;
          if (!HlsPlayer.isSupported()) {
            setFailed(true);
            return;
          }
          const hls = new HlsPlayer({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
          });
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
            if (data.fatal) setFailed(true);
          });
        })
        .catch(() => setFailed(true));
    }

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      const promise = video.play();
      if (promise) {
        void promise.catch(() => {
          // Autoplay can be blocked until the first interaction; the poster and
          // play button stay usable.
          setBuffering(false);
        });
      }
    } else {
      video.pause();
    }
  }, [playing]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === 'hidden') videoRef.current?.pause();
    };
    const pauseOnBlur = () => videoRef.current?.pause();
    const resumeOnFocus = () => {
      if (playing && document.visibilityState === 'visible') {
        void videoRef.current?.play().catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    window.addEventListener('blur', pauseOnBlur);
    window.addEventListener('focus', resumeOnFocus);
    return () => {
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      window.removeEventListener('blur', pauseOnBlur);
      window.removeEventListener('focus', resumeOnFocus);
    };
  }, [playing]);

  useEffect(() => {
    return () => {
      if (spinnerTimer.current) clearTimeout(spinnerTimer.current);
    };
  }, []);

  const showSpinner = useCallback(() => {
    if (spinnerTimer.current) clearTimeout(spinnerTimer.current);
    spinnerTimer.current = setTimeout(() => setBuffering(true), BUFFER_SPINNER_DELAY_MS);
  }, []);

  const hideSpinner = useCallback(() => {
    if (spinnerTimer.current) clearTimeout(spinnerTimer.current);
    setBuffering(false);
  }, []);

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    onProgress?.(video.currentTime, video.duration || 0);
  };

  const seek = (value: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = value;
    setCurrentTime(value);
  };

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div className={cn('group absolute inset-0 overflow-hidden bg-black', className)}>
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover md:object-contain"
      />
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        loop
        muted={muted}
        preload={playing ? 'auto' : 'metadata'}
        onWaiting={showSpinner}
        onStalled={showSpinner}
        onCanPlay={hideSpinner}
        onPlaying={hideSpinner}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onEnded={onEnded}
        onError={() => setFailed(true)}
        aria-label="Video"
        className="relative size-full object-cover md:object-contain"
      />

      {buffering && !failed ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <Loader2 className="size-10 animate-spin text-white drop-shadow" />
        </div>
      ) : null}

      {failed ? (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center text-sm text-white">
          This video could not be played. Try again later.
        </div>
      ) : null}

      {!playing && !failed ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <span className="grid size-16 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
            <Play className="size-8 translate-x-0.5" />
          </span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={playing ? 'Pause video' : 'Play video'}
        className="absolute inset-0 h-full w-full cursor-default focus-visible:outline-none"
      />

      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="rounded-full p-1 text-white/90 transition-colors hover:text-white focus-visible:outline-white"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 0.1)}
          step={0.05}
          value={currentTime}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Video progress"
          className="h-1 flex-1 cursor-pointer appearance-none rounded-pill bg-white/30 accent-white"
          style={{
            background: `linear-gradient(to right, var(--brand) ${progress * 100}%, rgb(255 255 255 / 30%) ${progress * 100}%)`,
          }}
        />
        <span className="w-10 text-right text-[0.65rem] font-semibold tabular-nums text-white/80">
          {formatClock(currentTime)}
        </span>
      </div>
    </div>
  );
}

function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${(whole % 60).toString().padStart(2, '0')}`;
}
