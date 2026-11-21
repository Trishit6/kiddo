import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { PreferencesProvider, usePreferences } from './preferences-provider';

function Probe() {
  const { muted, haptics, toggleMuted, setHaptics } = usePreferences();
  return (
    <>
      <Text testID="muted">{String(muted)}</Text>
      <Text testID="haptics">{String(haptics)}</Text>
      <Pressable testID="toggle-mute" onPress={toggleMuted}>
        <Text>Mute</Text>
      </Pressable>
      <Pressable testID="toggle-haptics" onPress={() => setHaptics(false)}>
        <Text>Haptics</Text>
      </Pressable>
    </>
  );
}

describe('feed preferences', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('starts muted and persists the mute choice', async () => {
    await render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('muted')).toHaveTextContent('true'));

    await act(async () => {
      await fireEvent.press(screen.getByTestId('toggle-mute'));
    });

    expect(screen.getByTestId('muted')).toHaveTextContent('false');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('kiddo-muted', 'false');

    const stored = await AsyncStorage.getItem('kiddo-muted');
    expect(stored).toBe('false');
  });

  it('restores the muted choice for the session', async () => {
    await AsyncStorage.setItem('kiddo-muted', 'false');

    await render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('muted')).toHaveTextContent('false'));
  });

  it('persists the haptics opt-out', async () => {
    await render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('haptics')).toHaveTextContent('true'));

    await act(async () => {
      await fireEvent.press(screen.getByTestId('toggle-haptics'));
    });

    expect(screen.getByTestId('haptics')).toHaveTextContent('false');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('kiddo-haptics', 'false');
  });
});
