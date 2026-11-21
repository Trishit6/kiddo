import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Comment } from '@reel/shared';
import type * as QueriesModule from '@reel/queries';
import { CommentComposer } from '@/components/feed/comment-composer';

const authState = vi.hoisted(() => ({
  status: 'authenticated' as 'authenticated' | 'unauthenticated',
  user: {
    id: '33333333-3333-4333-8333-333333333333',
    username: 'writer',
    displayName: 'Writer',
    avatarUrl: null,
  },
}));

const addComment = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
const requestSignIn = vi.hoisted(() => vi.fn());

vi.mock('@/components/auth-provider', () => ({
  useAuth: () => authState,
}));

vi.mock('@/components/auth-gate', () => ({
  useSignInPrompt: () => requestSignIn,
}));

vi.mock('@reel/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof QueriesModule>();
  return { ...actual, useAddComment: () => addComment };
});

const parent: Comment = {
  id: '44444444-4444-4444-8444-444444444444',
  videoId: '55555555-5555-4555-8555-555555555555',
  parentId: null,
  text: 'Original comment',
  isRemoved: false,
  author: {
    id: '66666666-6666-4666-8666-666666666666',
    username: 'author',
    displayName: 'Author',
    avatarUrl: null,
  },
  replyToUser: null,
  likesCount: 0,
  replyCount: 0,
  createdAt: new Date().toISOString(),
  viewerState: { liked: false },
};

describe('comment composer', () => {
  beforeEach(() => {
    addComment.mutate.mockClear();
    requestSignIn.mockClear();
    authState.status = 'authenticated';
  });

  it('asks logged-out viewers to sign in instead of showing a composer', async () => {
    authState.status = 'unauthenticated';
    const user = userEvent.setup();

    render(
      <CommentComposer
        videoId={parent.videoId}
        replyingTo={null}
        onCancelReply={() => undefined}
      />,
    );

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign in to comment' }));

    expect(requestSignIn).toHaveBeenCalledTimes(1);
  });

  it('enforces the 500 character limit and disables empty submissions', () => {
    render(
      <CommentComposer
        videoId={parent.videoId}
        replyingTo={null}
        onCancelReply={() => undefined}
      />,
    );

    const textbox = screen.getByLabelText('Add a comment');

    expect(textbox).toHaveAttribute('maxlength', '500');
    expect(screen.getByRole('button', { name: 'Post' })).toBeDisabled();
    expect(screen.getByText('0/500')).toBeInTheDocument();
  });

  it('shows the reply target and posts against the top-level parent', async () => {
    const user = userEvent.setup();

    render(
      <CommentComposer
        videoId={parent.videoId}
        replyingTo={{ ...parent, parentId: parent.id }}
        onCancelReply={() => undefined}
      />,
    );

    expect(screen.getByText('Replying to @author')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Add a comment'), 'Nice one');
    await user.click(screen.getByRole('button', { name: 'Reply' }));

    expect(addComment.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        videoId: parent.videoId,
        text: 'Nice one',
        parentId: parent.id,
        author: expect.objectContaining({ username: 'writer' }),
      }),
      expect.anything(),
    );
  });

  it('lets the writer cancel a reply', async () => {
    const cancel = vi.fn();
    const user = userEvent.setup();

    render(<CommentComposer videoId={parent.videoId} replyingTo={parent} onCancelReply={cancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
