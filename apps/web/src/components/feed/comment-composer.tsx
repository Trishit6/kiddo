import { useState } from 'react';
import { useAddComment } from '@reel/queries';
import type { AuthorSummary, Comment } from '@reel/shared';
import { useAuth } from '@/components/auth-provider';
import { useSignInPrompt } from '@/components/auth-gate';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/errors';

export const MAX_COMMENT_LENGTH = 500;

interface CommentComposerProps {
  videoId: string;
  replyingTo: Comment | null;
  onCancelReply(): void;
}

export function authorSummary(user: {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}): AuthorSummary {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

export function CommentComposer({ videoId, replyingTo, onCancelReply }: CommentComposerProps) {
  const { user, status } = useAuth();
  const requestSignIn = useSignInPrompt();
  const addComment = useAddComment();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const tooLong = text.length > MAX_COMMENT_LENGTH;

  if (status !== 'authenticated' || !user) {
    return (
      <div className="border-t p-4">
        <p className="text-sm text-muted-foreground">Sign in to join the conversation.</p>
        <Button type="button" className="mt-3 w-full" onClick={() => requestSignIn()}>
          Sign in to comment
        </Button>
      </div>
    );
  }

  const parentId = replyingTo ? (replyingTo.parentId ?? replyingTo.id) : undefined;

  const submit = () => {
    if (!trimmed || tooLong) return;
    setError(null);
    addComment.mutate(
      {
        videoId,
        text: trimmed,
        parentId,
        author: authorSummary(user),
      },
      {
        onSuccess: () => {
          setText('');
          onCancelReply();
        },
        onError: (cause) => setError(errorMessage(cause, 'Could not post your comment')),
      },
    );
  };

  return (
    <form
      className="space-y-2 border-t p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {replyingTo ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs">
          <span className="truncate">Replying to @{replyingTo.author?.username ?? 'someone'}</span>
          <button
            type="button"
            onClick={onCancelReply}
            className="font-semibold text-brand hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : null}
      <label htmlFor="comment-text" className="sr-only">
        Add a comment
      </label>
      <Textarea
        id="comment-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={replyingTo ? 'Write a reply…' : 'Add a comment…'}
        rows={2}
        maxLength={MAX_COMMENT_LENGTH}
        aria-describedby="comment-counter"
        className="resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        <span
          id="comment-counter"
          aria-live="polite"
          className={
            tooLong ? 'text-xs font-semibold text-destructive' : 'text-xs text-muted-foreground'
          }
        >
          {text.length}/{MAX_COMMENT_LENGTH}
        </span>
        <Button type="submit" size="sm" disabled={!trimmed || tooLong || addComment.isPending}>
          {addComment.isPending ? 'Posting…' : replyingTo ? 'Reply' : 'Post'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
