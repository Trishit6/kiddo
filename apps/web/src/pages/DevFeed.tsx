import { useEffect, useRef, useState } from 'react';
import type { Comment, FeedItem, FeedKind } from '@reel/shared';
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useFollow,
  useInfiniteFeed,
  useLikeComment,
  useLikeVideo,
  useReplies,
  useSaveVideo,
  useViewTracker,
} from '@reel/queries';
import { useAuth } from '@/components/auth-provider';
import { errorMessage } from '@/lib/errors';

function FeedCard({ item }: { item: FeedItem }) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const like = useLikeVideo();
  const save = useSaveVideo();
  const follow = useFollow();
  const { track } = useViewTracker();
  const isOwn = user?.username === item.author.username;

  useEffect(() => {
    const timer = setTimeout(() => track(item.video.id, 3_000), 2_500);
    return () => clearTimeout(timer);
  }, [item.video.id, track]);

  return (
    <article style={{ border: '1px solid #ccc', marginBottom: 16, padding: 12 }}>
      <img src={item.video.thumbnailUrl} alt="" width={160} height={90} />
      <h3>{item.video.caption || '(no caption)'}</h3>
      <p>
        @{item.author.username} · {item.author.displayName}
        {!isOwn && (
          <button
            type="button"
            onClick={() =>
              follow.mutate({
                username: item.author.username,
                following: !item.viewerState.followingAuthor,
              })
            }
            disabled={follow.isPending}
          >
            {item.viewerState.followingAuthor ? 'Unfollow' : 'Follow'}
          </button>
        )}
      </p>
      <p>
        {item.counts.likes} likes · {item.counts.comments} comments · {item.counts.saves} saves ·{' '}
        {item.counts.shares} shares · {item.counts.views} views
      </p>
      <button
        type="button"
        onClick={() => like.mutate({ videoId: item.video.id, liked: !item.viewerState.liked })}
        disabled={like.isPending}
      >
        {item.viewerState.liked ? 'Unlike' : 'Like'}
      </button>
      <button
        type="button"
        onClick={() => save.mutate({ videoId: item.video.id, saved: !item.viewerState.saved })}
        disabled={save.isPending}
      >
        {item.viewerState.saved ? 'Unsave' : 'Save'}
      </button>
      <button type="button" onClick={() => setShowComments((value) => !value)}>
        {showComments ? 'Hide comments' : 'Show comments'}
      </button>
      {like.error && <p style={{ color: 'red' }}>{errorMessage(like.error, 'Like failed')}</p>}
      {save.error && <p style={{ color: 'red' }}>{errorMessage(save.error, 'Save failed')}</p>}
      {follow.error && (
        <p style={{ color: 'red' }}>{errorMessage(follow.error, 'Follow failed')}</p>
      )}
      {showComments && <Comments videoId={item.video.id} />}
    </article>
  );
}

function Comments({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const [sort, setSort] = useState<'newest' | 'top'>('newest');
  const [text, setText] = useState('');
  const comments = useComments(videoId, sort);
  const addComment = useAddComment();
  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];

  const submit = () => {
    const value = text.trim();
    if (!value || !user) return;
    addComment.mutate(
      {
        videoId,
        text: value,
        author: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      },
      { onSuccess: () => setText('') },
    );
  };

  return (
    <section style={{ marginLeft: 16 }}>
      <h4>Comments</h4>
      <button type="button" onClick={() => setSort('newest')}>
        Newest
      </button>
      <button type="button" onClick={() => setSort('top')}>
        Top
      </button>
      <div>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Add a comment"
          maxLength={500}
        />
        <button type="button" onClick={submit} disabled={addComment.isPending || !text.trim()}>
          Post
        </button>
      </div>
      {addComment.error && (
        <p style={{ color: 'red' }}>{errorMessage(addComment.error, 'Comment failed')}</p>
      )}
      {comments.isPending && <p>Loading comments…</p>}
      {comments.isError && (
        <p style={{ color: 'red' }}>{errorMessage(comments.error, 'Could not load comments')}</p>
      )}
      {items.map((comment) => (
        <CommentItem key={comment.id} comment={comment} videoId={videoId} />
      ))}
      {comments.hasNextPage && (
        <button
          type="button"
          onClick={() => void comments.fetchNextPage()}
          disabled={comments.isFetchingNextPage}
        >
          More comments
        </button>
      )}
    </section>
  );
}

function CommentItem({ comment, videoId }: { comment: Comment; videoId: string }) {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [reply, setReply] = useState('');
  const like = useLikeComment();
  const remove = useDeleteComment();
  const addReply = useAddComment();
  const replies = useReplies(showReplies ? comment.id : '');
  const replyItems = replies.data?.pages.flatMap((page) => page.items) ?? [];

  const submitReply = () => {
    const value = reply.trim();
    if (!value || !user) return;
    addReply.mutate(
      {
        videoId,
        text: value,
        parentId: comment.id,
        author: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      },
      { onSuccess: () => setReply('') },
    );
  };

  return (
    <div style={{ marginLeft: 12, marginTop: 8 }}>
      {comment.isRemoved ? (
        <p>[removed]</p>
      ) : (
        <>
          <p>
            <strong>@{comment.author?.username ?? 'unknown'}</strong> {comment.text}
          </p>
          <p>
            {comment.likesCount} likes · {comment.replyCount} replies
          </p>
          <button
            type="button"
            onClick={() =>
              like.mutate({ commentId: comment.id, liked: !comment.viewerState.liked })
            }
            disabled={like.isPending}
          >
            {comment.viewerState.liked ? 'Unlike comment' : 'Like comment'}
          </button>
          <button type="button" onClick={() => setShowReplies((value) => !value)}>
            Replies
          </button>
          {comment.author?.id === user?.id && (
            <button
              type="button"
              onClick={() => remove.mutate({ commentId: comment.id, videoId })}
              disabled={remove.isPending}
            >
              Delete
            </button>
          )}
          <div>
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Reply"
              maxLength={500}
            />
            <button
              type="button"
              onClick={submitReply}
              disabled={addReply.isPending || !reply.trim()}
            >
              Reply
            </button>
          </div>
        </>
      )}
      {showReplies &&
        replyItems.map((item) => (
          <div key={item.id} style={{ marginLeft: 24 }}>
            {item.isRemoved ? (
              <p>[removed]</p>
            ) : (
              <p>
                <strong>@{item.author?.username ?? 'unknown'}</strong>
                {item.replyToUser ? ` → @${item.replyToUser.username}` : ''} {item.text}
              </p>
            )}
          </div>
        ))}
      {showReplies && replies.hasNextPage && (
        <button type="button" onClick={() => void replies.fetchNextPage()}>
          More replies
        </button>
      )}
    </div>
  );
}

export function DevFeed() {
  const { status } = useAuth();
  const [kind, setKind] = useState<FeedKind>('for-you');
  const feed = useInfiniteFeed(kind);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && feed.hasNextPage && !feed.isFetchingNextPage) {
        void feed.fetchNextPage();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [feed.hasNextPage, feed.isFetchingNextPage, feed.fetchNextPage]);

  return (
    <main>
      <h1>Dev feed</h1>
      <p>Plain proof screen for the shared queries package. Real UI lands in Phase 5.</p>
      <button type="button" onClick={() => setKind('for-you')} disabled={kind === 'for-you'}>
        For You
      </button>
      <button type="button" onClick={() => setKind('following')} disabled={kind === 'following'}>
        Following
      </button>
      {kind === 'following' && status !== 'authenticated' && (
        <p>Sign in to see your Following feed.</p>
      )}
      {feed.isPending && <p>Loading feed…</p>}
      {feed.isError && (
        <p style={{ color: 'red' }}>{errorMessage(feed.error, 'Could not load feed')}</p>
      )}
      {items.map((item) => (
        <FeedCard key={`${kind}:${item.video.id}`} item={item} />
      ))}
      {feed.hasNextPage && (
        <button
          type="button"
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
        >
          {feed.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
      <div ref={sentinel} style={{ height: 1 }} />
    </main>
  );
}
