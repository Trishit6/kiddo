import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { loginRequestSchema } from '@reel/shared';
import { useAuth } from '@/components/auth-provider';
import { AppText, Button, Field, Message, Screen } from '@/components/ui';
import { errorMessage, firstIssueMessage } from '@/lib/errors';
import { googleSignInEnabled, requestGoogleIdToken } from '@/lib/google';

export default function LoginScreen() {
  const { signIn, signInWithGoogle: signInWithGoogleToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors({
        email: firstIssueMessage(parsed.error.issues, 'email'),
        password: firstIssueMessage(parsed.error.issues, 'password'),
      });
      return;
    }
    setErrors({});
    setMessage('');
    setBusy(true);
    try {
      await signIn(parsed.data);
      router.replace('/feed');
    } catch (cause) {
      setMessage(errorMessage(cause, 'Could not sign in'));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setMessage('');
    setBusy(true);
    try {
      const idToken = await requestGoogleIdToken();
      if (idToken) {
        await signInWithGoogleToken(idToken);
        router.replace('/feed');
      }
    } catch (cause) {
      setMessage(errorMessage(cause, 'Could not sign in with Google'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Welcome back" subtitle="Sign in to your Reel account.">
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        autoCapitalize="none"
        error={errors.password}
      />
      <Message value={message} tone="error" />
      <Button label="Sign in" onPress={() => void submit()} loading={busy} />
      {googleSignInEnabled ? (
        <Button
          label="Continue with Google"
          onPress={() => void handleGoogle()}
          disabled={busy}
          variant="secondary"
        />
      ) : null}
      <View style={styles.row}>
        <TouchableOpacity onPress={() => router.push('/forgot-password')}>
          <AppText tone="brand" weight="semibold">
            Forgot password?
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <AppText tone="brand" weight="semibold">
            Create account
          </AppText>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
