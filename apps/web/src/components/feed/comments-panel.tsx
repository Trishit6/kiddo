import { useComments, useDeleteComment, useLikeComment, useReplies } from '@reel/queries';
import { Heart, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { Comment, CommentSort } from '@reel/shared';
import { useAuth } from '@/components/auth-provider';
import { CommentComposer } from '@/components/feed/comment-composer';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLoadMore } from '@/hooks/use-load-more';
import { errorMessage } from '@/lib/errors';
import { formatCount, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CommentsPanelProps {
  videoId: string;
  videoAuthorId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Inline renders a docked panel instead of a drawer (video page desktop). */
  variant?: 'drawer' | 'inline';
}

interface CommentRowProps {
  comment: Comment;
  videoId: string;
  videoAuthorId: string;
  replyingTo: Comment | null;
  onReply(comment: Comment | null): void;
  indent?: boolean;
}

function useCanDelete(videoAuthorId: string): (comment: Comment) => boolean {
  const { user } = useAuth();
  return (comment) =>
    Boolean(
      user &&
      (user.id === videoAuthorId || user.id === comment.author?.id || user.role === 'admin'),
    );
}

function CommentRow({
  comment,
  videoId,
  videoAuthorId,
  replyingTo,
  onReply,
  indent = false,
}: CommentRowProps) {
  const like = useLikeComment();
  const remove = useDeleteComment();
  const canDelete = useCanDelete(videoAuthorId);
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const replies = useReplies(expanded ? comment.id : '');
  const replyItems = replies.data?.pages.flatMap((page) => page.items) ?? [];
  const removed = comment.isRemoved || !comment.author;

  return (
    <li
      className={cn(
        'space-y-2 px-4 py-3',
        indent && 'ml-8 border-l border-border pl-3',
        removed && 'opacity-70',
      )}
    >
      <div className="flex gap-3">
        {removed ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <MessageCircle className="size-4" aria-hidden="true" />
          </span>
        ) : (
          <Avatar
            src={comment.author?.avatarUrl}
            name={comment.author?.displayName ?? ''}
            size="sm"
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          {removed ? (
            <p className="text-sm italic text-muted-foreground">Comment removed</p>
          ) : (
            <>
              <p className="text-sm font-semibold">
                @{comment.author?.username}
                {comment.replyToUser ? (
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    → @{comment.replyToUser.username}
                  </span>
                ) : null}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{comment.text}</p>
            </>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
            {!removed ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    like.mutate({ commentId: comment.id, liked: !comment.viewerState.liked })
                  }
                  aria-pressed={comment.viewerState.liked}
                  aria-label={`Like comment by ${comment.author?.displayName}`}
                  className={cn(
                    'inline-flex items-center gap-1 rounded focus-visible:outline-2',
                    comment.viewerState.liked && 'font-semibold text-brand',
                  )}
                >
                  <Heart
                    className={cn('size-3.5', comment.viewerState.liked && 'fill-current')}
                    aria-hidden="true"
                  />
                  {comment.likesCount > 0 ? formatCount(comment.likesCount) : 'Like'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onReply(
                      replyingTo?.id === comment.id
                        ? null
                        : {
                            ...comment,
                            parentId: comment.parentId ?? comment.id,
                          },
                    )
                  }
                  className="rounded font-medium hover:text-foreground focus-visible:outline-2"
                >
                  {replyingTo?.id === comment.id ? 'Cancel reply' : 'Reply'}
                </button>
                {canDelete(comment) ? (
                  confirming ? (
                    <span className="inline-flex items-center gap-2">
                      <span>Delete?</span>
                      <button
                        type="button"
                        onClick={() => {
                          remove.mutate({ commentId: comment.id, videoId });
                          setConfirming(false);
                        }}
                        className="font-semibold text-destructive"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        className="font-semibold"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(true)}
                      aria-label="Delete comment"
                      className="rounded hover:text-destructive focus-visible:outline-2"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  )
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {!indent && comment.replyCount > 0 ? (
        <div className="pl-11">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-xs font-semibold text-brand hover:underline"
            aria-expanded={expanded}
          >
            {expanded
              ? 'Hide replies'
              : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
          </button>
        </div>
      ) : null}

      {expanded && !indent ? (
        <ul className="space-y-1">
          {replies.isPending ? (
            <li className="pl-11">
              <Loader2
                className="size-4 animate-spin text-muted-foreground"
                aria-label="Loading replies"
              />
            </li>
          ) : null}
          {replyItems.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              videoId={videoId}
              videoAuthorId={videoAuthorId}
              replyingTo={replyingTo}
              onReply={onReply}
              indent
            />
          ))}
          {replies.hasNextPage ? (
            <li className="pl-11">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void replies.fetchNextPage()}
                disabled={replies.isFetchingNextPage}
              >
                Load more replies
              </Button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}

export function CommentsPanel({
  videoId,
  videoAuthorId,
  open,
  onOpenChange,
  variant = 'drawer',
}: CommentsPanelProps) {
  const [sort, setSort] = useState<CommentSort>('newest');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const comments = useComments(videoId, sort);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];

  useLoadMore(sentinelRef, {
    enabled: open && Boolean(comments.hasNextPage) && !comments.isFetchingNextPage,
    onLoadMore: () => void comments.fetchNextPage(),
  });

  const body = (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <Tabs value={sort} onValueChange={(value) => setSort(value as CommentSort)}>
          <TabsList aria-label="Sort comments">
            <TabsTrigger value="newest">Newest</TabsTrigger>
            <TabsTrigger value="top">Top</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {comments.isPending ? (
          <ul className="space-y-4 p-4" aria-label="Loading comments">
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {comments.isError ? (
          <div className="space-y-3 p-4 text-center">
            <p className="text-sm text-destructive">
              {errorMessage(comments.error, 'Could not load comments')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void comments.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!comments.isPending && items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No comments yet. Say something nice.
          </p>
        ) : null}

        <ul className="divide-y">
          {items.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              videoId={videoId}
              videoAuthorId={videoAuthorId}
              replyingTo={replyingTo}
              onReply={setReplyingTo}
            />
          ))}
        </ul>
        <div ref={sentinelRef} aria-hidden="true" className="h-4" />
        {comments.isFetchingNextPage ? (
          <div className="grid place-items-center p-3">
            <Loader2
              className="size-5 animate-spin text-muted-foreground"
              aria-label="Loading more comments"
            />
          </div>
        ) : null}
      </div>

      <CommentComposer
        videoId={videoId}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </>
  );

  if (variant === 'inline') {
    return (
      <aside
        aria-label="Comments"
        className="glass-strong hidden h-full w-96 shrink-0 flex-col border-y-0 border-r-0 rounded-none lg:flex"
      >
        <header className="border-b px-4 py-4">
          <h2 className="font-display text-title font-semibold">Comments</h2>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{body}</div>
      </aside>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Comments">
      {body}
    </Drawer>
  );
}
