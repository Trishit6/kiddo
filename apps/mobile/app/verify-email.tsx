import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { verifyEmailRequestSchema } from '@reel/shared';
import { AppText, Button, Field, Message, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage, firstIssueMessage } from '@/lib/errors';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const rawToken = params.token;
  const [token, setToken] = useState(
    Array.isArray(rawToken) ? (rawToken[0] ?? '') : (rawToken ?? ''),
  );
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = verifyEmailRequestSchema.safeParse({ token });
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error.issues, 'token'));
      return;
    }
    setError('');
    setBusy(true);
    try {
      await api.verifyEmail(parsed.data);
      setMessage('Email verified. You can continue.');
    } catch (cause) {
      setMessage(errorMessage(cause, 'Could not verify your email'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Verify email" subtitle="Enter the token from your verification email.">
      <Field
        label="Verification token"
        value={token}
        onChangeText={setToken}
        placeholder="Paste your token"
        autoCapitalize="none"
        error={error}
      />
      <Message value={message} tone="success" />
      <Button label="Verify email" onPress={() => void submit()} loading={busy} />
      <TouchableOpacity onPress={() => router.push('/feed')}>
        <AppText tone="brand" weight="semibold">
          Continue to the feed
        </AppText>
      </TouchableOpacity>
    </Screen>
  );
}
