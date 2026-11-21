import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@reel/shared';
import { useReelQueries } from '@reel/queries';
import { AuthGateProvider } from '@/components/auth-gate';

const signIn = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ signIn, user: null, status: 'unauthenticated' }),
}));

function Trigger({ retry }: { retry: () => void }) {
  const { onAuthRequired } = useReelQueries();
  return (
    <button
      type="button"
      onClick={() =>
        onAuthRequired?.(
          new ApiClientError(401, 'AUTH_REQUIRED', 'Authentication required', null, null),
          retry,
        )
      }
    >
      like
    </button>
  );
}

describe('auth gate', () => {
  it('opens sign in for AUTH_REQUIRED and replays the action afterwards', async () => {
    const retry = vi.fn();
    render(
      <MemoryRouter>
        <AuthGateProvider>
          <Trigger retry={retry} />
        </AuthGateProvider>
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'like' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'viewer@example.com');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Passphrase');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
  });
});
