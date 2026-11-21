import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import type { ApiClient } from '@reel/shared';
import { AuthGateProvider, useSignInPrompt } from './auth-gate';

jest.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ status: 'unauthenticated', user: null }),
}));

jest.mock('@/components/sign-in-sheet', () => {
  const { Pressable: MockPressable, Text: MockText, View } = require('react-native');
  return {
    SignInSheet: ({
      visible,
      onAuthenticated,
    }: {
      visible: boolean;
      onAuthenticated: () => void;
    }) =>
      visible ? (
        <View>
          <MockPressable testID="mock-signed-in" onPress={onAuthenticated}>
            <MockText>Signed in</MockText>
          </MockPressable>
        </View>
      ) : null,
  };
});

const api = {} as unknown as ApiClient;

function Probe({ retry }: { retry: () => void }) {
  const { prompt } = useSignInPrompt();
  return (
    <Pressable testID="require-auth" onPress={() => prompt(retry)}>
      <Text>Like</Text>
    </Pressable>
  );
}

describe('auth gate', () => {
  it('opens the sign-in sheet and retries the original action after success', async () => {
    const retry = jest.fn();
    await render(
      <AuthGateProvider api={api}>
        <Probe retry={retry} />
      </AuthGateProvider>,
    );

    expect(screen.queryByTestId('mock-signed-in')).toBeNull();
    await fireEvent.press(screen.getByTestId('require-auth'));
    expect(await screen.findByTestId('mock-signed-in')).toBeTruthy();
    expect(retry).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('mock-signed-in'));
    expect(retry).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByTestId('mock-signed-in')).toBeNull());
  });

  it('does not retry when the sheet is dismissed', async () => {
    const retry = jest.fn();
    await render(
      <AuthGateProvider api={api}>
        <Probe retry={retry} />
      </AuthGateProvider>,
    );

    await fireEvent.press(screen.getByTestId('require-auth'));
    expect(await screen.findByTestId('mock-signed-in')).toBeTruthy();
    expect(retry).not.toHaveBeenCalled();
  });
});
