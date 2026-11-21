import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { resetPasswordRequestSchema } from '@reel/shared';
import { AppText, Button, Field, Message, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage, firstIssueMessage } from '@/lib/errors';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const rawToken = params.token;
  const [token, setToken] = useState(
    Array.isArray(rawToken) ? (rawToken[0] ?? '') : (rawToken ?? ''),
  );
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ token?: string; password?: string }>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = resetPasswordRequestSchema.safeParse({ token, password });
    if (!parsed.success) {
      setErrors({
        token: firstIssueMessage(parsed.error.issues, 'token'),
        password: firstIssueMessage(parsed.error.issues, 'password'),
      });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.resetPassword(parsed.data);
      setMessage('Password updated. You can sign in now.');
    } catch (cause) {
      setMessage(errorMessage(cause, 'Could not reset your password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Choose a new password" subtitle="Reset links are single-use.">
      <Field
        label="Reset token"
        value={token}
        onChangeText={setToken}
        placeholder="Paste the token from your email"
        autoCapitalize="none"
        error={errors.token}
      />
      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        autoCapitalize="none"
        error={errors.password}
      />
      <Message value={message} tone="success" />
      <Button label="Update password" onPress={() => void submit()} loading={busy} />
      <TouchableOpacity onPress={() => router.push('/login')}>
        <AppText tone="brand" weight="semibold">
          Back to sign in
        </AppText>
      </TouchableOpacity>
    </Screen>
  );
}
