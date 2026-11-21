import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { forgotPasswordRequestSchema } from '@reel/shared';
import { useAuth } from '@/components/auth-provider';
import { AppText, Button, Field, Message, Screen } from '@/components/ui';
import { errorMessage, firstIssueMessage } from '@/lib/errors';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = forgotPasswordRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error.issues, 'email'));
      return;
    }
    setError('');
    setBusy(true);
    try {
      await requestPasswordReset(parsed.data);
      setMessage('If the account exists, a reset link has been sent.');
    } catch (cause) {
      setError(errorMessage(cause, 'Could not request a reset link'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Reset password" subtitle="We’ll email you a one-time link.">
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={error}
      />
      <Message value={message} tone="success" />
      <Button label="Send reset link" onPress={() => void submit()} loading={busy} />
      <TouchableOpacity onPress={() => router.push('/login')}>
        <AppText tone="brand" weight="semibold">
          Back to sign in
        </AppText>
      </TouchableOpacity>
    </Screen>
  );
}
