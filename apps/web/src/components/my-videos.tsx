import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Play, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MAX_CAPTION_LENGTH } from '@reel/shared';
import type { Video, VideoVisibility } from '@reel/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

const STATUS_STYLES: Record<Video['status'], string> = {
  uploading: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  processing: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  ready: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  failed: 'bg-destructive/15 text-destructive',
};

export function MyVideos() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Video | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editVisibility, setEditVisibility] = useState<VideoVisibility>('public');

  const query = useInfiniteQuery({
    queryKey: ['my-videos'],
    queryFn: ({ pageParam, signal }) => api.listMyVideos({ cursor: pageParam, limit: 12 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const videos = query.data?.pages.flatMap((page) => page.items) ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['my-videos'] });
  };

  const startEdit = (video: Video) => {
    setEditing(video);
    setEditCaption(video.caption);
    setEditVisibility(video.visibility);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    setError(null);
    try {
      await api.updateVideo(editing.id, {
        caption: editCaption,
        visibility: editVisibility,
      });
      setEditing(null);
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause, 'Could not update video'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (video: Video) => {
    if (!window.confirm('Delete this video? This cannot be undone.')) return;
    setBusyId(video.id);
    setError(null);
    try {
      await api.deleteVideo(video.id);
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause, 'Could not delete video'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My videos</h2>
        <Button asChild variant="outline" size="sm">
          <Link to="/upload">Upload</Link>
        </Button>
      </div>

      {query.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your videos…
        </div>
      ) : null}

      {query.isError ? (
        <p className="text-sm text-destructive">
          {errorMessage(query.error, 'Could not load videos')}
        </p>
      ) : null}

      {!query.isPending && videos.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No videos yet. Upload your first one.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AnimatePresence initial={false}>
          {videos.map((video) => (
            <motion.div
              key={video.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <div className="relative aspect-[9/16] bg-muted">
                {video.playback ? (
                  <Link to={`/videos/${video.id}`} aria-label="Watch video">
                    <img
                      src={video.playback.thumbnailUrl}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors hover:bg-black/20">
                      <Play className="size-8 text-white drop-shadow" />
                    </span>
                  </Link>
                ) : (
                  <div className="grid size-full place-items-center p-2 text-center text-xs text-muted-foreground">
                    {video.status === 'failed' ? 'Processing failed' : 'Processing…'}
                  </div>
                )}
                <span
                  className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLES[video.status]}`}
                >
                  {video.status}
                </span>
              </div>
              <div className="space-y-2 p-2">
                <p className="line-clamp-2 min-h-8 text-xs">{video.caption || 'No caption'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {video.visibility}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Edit video"
                      disabled={busyId === video.id}
                      onClick={() => startEdit(video)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Delete video"
                      disabled={busyId === video.id}
                      onClick={() => void remove(video)}
                    >
                      {busyId === video.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {query.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl border bg-background p-5 shadow-lg">
            <h3 className="text-lg font-semibold">Edit video</h3>
            <div className="space-y-1">
              <label htmlFor="edit-caption" className="text-sm font-medium">
                Caption
              </label>
              <Textarea
                id="edit-caption"
                value={editCaption}
                onChange={(event) => setEditCaption(event.target.value)}
                maxLength={MAX_CAPTION_LENGTH}
              />
              <p className="text-right text-xs text-muted-foreground">
                {editCaption.length}/{MAX_CAPTION_LENGTH}
              </p>
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-visibility" className="text-sm font-medium">
                Visibility
              </label>
              <select
                id="edit-visibility"
                value={editVisibility}
                onChange={(event) => setEditVisibility(event.target.value as VideoVisibility)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted (link only)</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busyId === editing.id}
                onClick={() => void saveEdit()}
              >
                {busyId === editing.id ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
