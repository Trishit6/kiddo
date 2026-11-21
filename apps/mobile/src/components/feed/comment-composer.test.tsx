import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Comment } from '@reel/shared';
import { ThemeProvider } from '@/theme/theme-provider';
import { CommentComposer, MAX_COMMENT_LENGTH } from './comment-composer';

const mockMutate = jest.fn();

jest.mock('@gorhom/bottom-sheet', () => {
  const { TextInput } = require('react-native');
  return { BottomSheetTextInput: TextInput };
});

jest.mock('@reel/queries', () => ({
  useAddComment: () => ({ mutate: mockMutate, isPending: false, isError: false }),
}));

jest.mock('@/components/auth-provider', () => ({
  useAuth: () => ({
    user: {
      id: '00000000-0000-4000-8000-000000000002',
      username: 'me',
      displayName: 'Me',
      avatarUrl: null,
    },
  }),
}));

jest.mock('@/components/auth-gate', () => ({
  useSignInPrompt: () => ({ prompt: jest.fn() }),
}));

const comment: Comment = {
  id: '00000000-0000-4000-8000-000000000010',
  videoId: '00000000-0000-4000-8000-000000000001',
  parentId: null,
  text: 'Parent',
  isRemoved: false,
  author: {
    id: '00000000-0000-4000-8000-000000000003',
    username: 'alice',
    displayName: 'Alice',
    avatarUrl: null,
  },
  replyToUser: null,
  likesCount: 0,
  replyCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  viewerState: { liked: false },
};

async function renderComposer(replyingTo: Comment | null = null) {
  return render(
    <ThemeProvider>
      <CommentComposer
        videoId={comment.videoId}
        replyingTo={replyingTo}
        onCancelReply={jest.fn()}
      />
    </ThemeProvider>,
  );
}

describe('comment composer', () => {
  beforeEach(() => mockMutate.mockClear());

  it('disables posting until the comment has content', async () => {
    await renderComposer();
    expect(await screen.findByLabelText('Post comment')).toBeDisabled();

    await fireEvent.changeText(await screen.findByLabelText('Add a comment'), '   ');
    expect(screen.getByLabelText('Post comment')).toBeDisabled();

    await fireEvent.changeText(await screen.findByLabelText('Add a comment'), 'Nice one');
    expect(screen.getByLabelText('Post comment')).toBeEnabled();
  });

  it('shows a live character counter and caps input at 500', async () => {
    await renderComposer();
    const input = await screen.findByLabelText('Add a comment');
    expect(input.props.maxLength).toBe(MAX_COMMENT_LENGTH);
    expect(screen.getByText(`0/${MAX_COMMENT_LENGTH}`)).toBeTruthy();

    await fireEvent.changeText(input, 'hello');
    expect(screen.getByText(`5/${MAX_COMMENT_LENGTH}`)).toBeTruthy();
  });

  it('submits trimmed text for a top-level comment', async () => {
    await renderComposer();
    await fireEvent.changeText(await screen.findByLabelText('Add a comment'), '  hello there  ');
    await fireEvent.press(screen.getByLabelText('Post comment'));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        videoId: comment.videoId,
        text: 'hello there',
        parentId: undefined,
        author: {
          id: '00000000-0000-4000-8000-000000000002',
          username: 'me',
          displayName: 'Me',
          avatarUrl: null,
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('shows reply mode and threads the reply under the parent', async () => {
    const onCancelReply = jest.fn();
    await render(
      <ThemeProvider>
        <CommentComposer
          videoId={comment.videoId}
          replyingTo={comment}
          onCancelReply={onCancelReply}
        />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Replying to @alice')).toBeTruthy();
    await fireEvent.changeText(await screen.findByLabelText('Add a comment'), 'a reply');
    await fireEvent.press(screen.getByLabelText('Post reply'));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        videoId: comment.videoId,
        text: 'a reply',
        parentId: comment.id,
        author: {
          id: '00000000-0000-4000-8000-000000000002',
          username: 'me',
          displayName: 'Me',
          avatarUrl: null,
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    await fireEvent.press(screen.getByLabelText('Cancel reply'));
    expect(onCancelReply).toHaveBeenCalled();
  });
});
