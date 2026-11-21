import {
  DEFAULT_MAX_VIDEO_MB,
  MAX_CAPTION_LENGTH,
  MAX_VIDEO_DURATION_SECONDS,
  MIN_VIDEO_DURATION_SECONDS,
  SUPPORTED_VIDEO_MIME_TYPES,
} from '@reel/shared';
import type { VideoContentType, VideoFailure, VideoVisibility } from '@reel/shared';
import { Film, Loader2, UploadCloud, X } from 'lucide-react';
import { motion } from 'motion/react';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { readVideoDuration, uploadVideoFile, videoContentType } from '@/lib/video-upload';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed';

function highlightCaption(caption: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(^|\s)(#[A-Za-z0-9_]+)/g;
  let lastIndex = 0;
  for (const match of caption.matchAll(pattern)) {
    const index = match.index ?? 0;
    const prefix = match[1] ?? '';
    const tag = match[2] ?? '';
    nodes.push(caption.slice(lastIndex, index + prefix.length));
    nodes.push(
      <span key={`${index}-${tag}`} className="font-semibold text-brand">
        {tag}
      </span>,
    );
    lastIndex = index + prefix.length + tag.length;
  }
  nodes.push(caption.slice(lastIndex));
  return nodes;
}

export function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<VideoContentType | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('public');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [failure, setFailure] = useState<VideoFailure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (phase !== 'uploading' && phase !== 'processing') return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'processing' || !videoId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 1_000;

    const poll = async () => {
      try {
        const status = await api.getVideoStatus(videoId);
        if (cancelled) return;
        setProgress(status.progress);
        if (status.status === 'ready') {
          setProgress(100);
          setPhase('ready');
          return;
        }
        if (status.status === 'failed') {
          setFailure(status.failure);
          setPhase('failed');
          return;
        }
      } catch {
        // Transient network errors are retried with backoff.
      }
      delay = Math.min(Math.round(delay * 1.5), 10_000);
      timer = setTimeout(poll, delay);
    };

    timer = setTimeout(poll, delay);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [phase, videoId]);

  const reset = () => {
    setPhase('idle');
    setProgress(0);
    setVideoId(null);
    setFailure(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const chooseFile = async (selected: File | undefined) => {
    if (!selected) return;
    setError(null);
    setFailure(null);
    setPhase('idle');
    setVideoId(null);
    setProgress(0);

    const type = videoContentType(selected);
    if (!type || !(SUPPORTED_VIDEO_MIME_TYPES as readonly string[]).includes(type)) {
      setError('Choose an MP4, MOV or WebM video');
      return;
    }
    const supportedType = type as VideoContentType;
    if (selected.size > DEFAULT_MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Video must be ${DEFAULT_MAX_VIDEO_MB} MB or smaller`);
      return;
    }

    try {
      const seconds = await readVideoDuration(selected);
      if (seconds > MAX_VIDEO_DURATION_SECONDS) {
        setError(`Video must be ${MAX_VIDEO_DURATION_SECONDS} seconds or shorter`);
        return;
      }
      if (seconds < MIN_VIDEO_DURATION_SECONDS) {
        setError('Video is too short');
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(selected));
      setFile(selected);
      setContentType(supportedType);
      setDuration(seconds);
    } catch (cause) {
      setError(errorMessage(cause, 'Could not read this video'));
    }
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    void chooseFile(event.target.files?.[0]);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void chooseFile(event.dataTransfer.files[0]);
  };

  const startUpload = async () => {
    if (!file || !contentType || !duration) return;
    setError(null);
    setFailure(null);
    setPhase('uploading');
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    let createdId: string | null = null;

    try {
      const created = await api.createVideoUpload({
        filename: file.name,
        contentType,
        sizeBytes: file.size,
        caption: caption.trim() || undefined,
        visibility,
      });
      createdId = created.videoId;
      setVideoId(created.videoId);
      await uploadVideoFile(
        created.upload,
        { file, filename: file.name, contentType },
        { onProgress: setProgress, signal: controller.signal },
      );
      await api.completeVideoUpload(created.videoId);
      setPhase('processing');
    } catch (cause) {
      const aborted = cause instanceof DOMException && cause.name === 'AbortError';
      if (createdId) {
        await api.deleteVideo(createdId).catch(() => undefined);
      }
      if (aborted) {
        setPhase('idle');
        setProgress(0);
        setVideoId(null);
        return;
      }
      setError(errorMessage(cause, 'Upload failed'));
      setPhase('failed');
    } finally {
      abortRef.current = null;
    }
  };

  const remove = async () => {
    if (videoId) await api.deleteVideo(videoId).catch(() => undefined);
    reset();
  };

  const busy = phase === 'uploading' || phase === 'processing';

  return (
    <ResponsiveContainer width="lg" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-bold sm:text-display">Upload a video</h1>
          <p className="text-muted-foreground">
            Vertical videos up to {MAX_VIDEO_DURATION_SECONDS} seconds and {DEFAULT_MAX_VIDEO_MB}{' '}
            MB.
          </p>
        </header>

        {phase === 'ready' && videoId ? (
          <GlassCard strong className="space-y-3 p-8 text-center">
            <Film className="mx-auto size-10 text-success" aria-hidden="true" />
            <h2 className="font-display text-title font-semibold">Your video is live</h2>
            <p className="text-sm text-muted-foreground">It is now on your profile and in feeds.</p>
            <div className="flex justify-center gap-2">
              <Button asChild>
                <Link to={`/video/${videoId}`}>Watch video</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/profile">My profile</Link>
              </Button>
            </div>
          </GlassCard>
        ) : null}

        {phase === 'processing' ? (
          <GlassCard className="space-y-4 p-8 text-center">
            <Loader2 className="mx-auto size-10 animate-spin text-brand" aria-hidden="true" />
            <h2 className="font-display text-title font-semibold">Processing your video</h2>
            <p className="text-sm text-muted-foreground">
              We are converting it to adaptive HLS. Keep this tab open.
            </p>
            <div className="mx-auto h-2 max-w-sm overflow-hidden rounded-pill bg-muted">
              <motion.div
                className="h-full bg-brand"
                animate={{ width: `${Math.max(4, progress)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{progress}%</p>
          </GlassCard>
        ) : null}

        {phase === 'failed' ? (
          <GlassCard className="space-y-3 border border-destructive/40 p-6">
            <h2 className="font-display text-title font-semibold text-destructive">
              Upload did not finish
            </h2>
            <p className="text-sm text-destructive/90">
              {failure?.message ?? error ?? 'Something went wrong'}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => void remove()}>
                {videoId ? 'Delete' : 'Start over'}
              </Button>
              <Button type="button" onClick={() => void remove()}>
                Try again
              </Button>
            </div>
          </GlassCard>
        ) : null}

        {phase === 'idle' || phase === 'uploading' ? (
          <GlassCard className="space-y-4 p-4 sm:p-5">
            {!file ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  'grid place-items-center rounded-xl border-2 border-dashed p-10 text-center transition-colors',
                  dragging ? 'border-brand bg-brand/5' : 'border-border',
                )}
              >
                <UploadCloud className="mb-3 size-10 text-muted-foreground" aria-hidden="true" />
                <p className="font-display text-lg font-semibold">Drag a video here</p>
                <p className="mb-4 text-sm text-muted-foreground">MP4, MOV or WebM</p>
                <Button type="button" variant="brand" onClick={() => inputRef.current?.click()}>
                  Choose file
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Pick a video from your gallery or camera.
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept={SUPPORTED_VIDEO_MIME_TYPES.join(',')}
                  onChange={onInput}
                  className="sr-only"
                />
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4 lg:hidden">
                  <video
                    src={previewUrl ?? undefined}
                    controls
                    playsInline
                    className="h-40 w-24 shrink-0 rounded-lg bg-black object-contain"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="break-words font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                      {duration ? ` · ${duration.toFixed(0)}s` : ''}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      disabled={busy}
                      onClick={() => {
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setFile(null);
                        setPreviewUrl(null);
                        setDuration(null);
                        if (inputRef.current) inputRef.current.value = '';
                      }}
                    >
                      <X aria-hidden="true" /> Remove
                    </Button>
                  </div>
                </div>

                <div className="hidden items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm lg:flex">
                  <span className="truncate font-medium">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setFile(null);
                      setPreviewUrl(null);
                      setDuration(null);
                      if (inputRef.current) inputRef.current.value = '';
                    }}
                  >
                    <X aria-hidden="true" /> Remove
                  </Button>
                </div>

                <div className="space-y-1">
                  <label htmlFor="caption" className="text-sm font-medium">
                    Caption
                  </label>
                  <Textarea
                    id="caption"
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    maxLength={MAX_CAPTION_LENGTH}
                    rows={3}
                    placeholder="Say something… #hashtags"
                    disabled={busy}
                  />
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="line-clamp-1">
                      {caption ? highlightCaption(caption) : ' '}
                    </span>
                    <span>
                      {caption.length}/{MAX_CAPTION_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="visibility" className="text-sm font-medium">
                    Visibility
                  </label>
                  <select
                    id="visibility"
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value as VideoVisibility)}
                    disabled={busy}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <option value="public">Public — anyone can watch</option>
                    <option value="unlisted">Unlisted — link only</option>
                    <option value="private">Private — only me</option>
                  </select>
                </div>

                {phase === 'uploading' ? (
                  <div className="space-y-2">
                    <div className="h-2 overflow-hidden rounded-pill bg-muted">
                      <motion.div
                        className="h-full bg-brand"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{progress}% uploaded</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => abortRef.current?.abort()}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="brand"
                    onClick={() => void startUpload()}
                    disabled={!duration}
                    className="w-full sm:w-auto"
                  >
                    Upload video
                  </Button>
                )}
              </>
            )}

            {error && phase === 'idle' ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </GlassCard>
        ) : null}
      </section>

      <aside className="hidden lg:block">
        <div className="sticky top-6 mx-auto w-full max-w-[19rem]">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-label text-muted-foreground">
            Preview
          </p>
          <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] border-8 border-glass-border bg-black shadow-lift">
            {previewUrl ? (
              <video
                src={previewUrl}
                controls
                playsInline
                muted
                className="size-full object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center p-6 text-center text-sm text-white/60">
                Your video preview appears here
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-white">
              <p className="text-sm font-semibold">@{'you'}</p>
              <p className="line-clamp-3 text-sm">
                {caption ? highlightCaption(caption) : 'Your caption will show here.'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </ResponsiveContainer>
  );
}
