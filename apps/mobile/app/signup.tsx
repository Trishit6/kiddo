import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { signupRequestSchema } from '@reel/shared';
import { useAuth } from '@/components/auth-provider';
import { AppText, Button, Field, Message, Screen } from '@/components/ui';
import { errorMessage, firstIssueMessage } from '@/lib/errors';
import { googleSignInEnabled, requestGoogleIdToken } from '@/lib/google';

interface SignupErrors {
  email?: string;
  password?: string;
  username?: string;
  displayName?: string;
}

export default function SignupScreen() {
  const { signUp, signInWithGoogle: signInWithGoogleToken } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<SignupErrors>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = signupRequestSchema.safeParse({
      email,
      username,
      password,
      ...(displayName.trim() ? { displayName } : {}),
    });
    if (!parsed.success) {
      setErrors({
        email: firstIssueMessage(parsed.error.issues, 'email'),
        password: firstIssueMessage(parsed.error.issues, 'password'),
        username: firstIssueMessage(parsed.error.issues, 'username'),
        displayName: firstIssueMessage(parsed.error.issues, 'displayName'),
      });
      return;
    }
    setErrors({});
    setMessage('');
    setBusy(true);
    try {
      await signUp(parsed.data);
      router.replace('/feed');
    } catch (cause) {
      setMessage(errorMessage(cause, 'Could not create your account'));
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
    <Screen title="Create account" subtitle="Join Reel in a few seconds.">
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
        label="Username"
        value={username}
        onChangeText={setUsername}
        placeholder="your.name"
        autoCapitalize="none"
        error={errors.username}
      />
      <Field
        label="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Optional"
        error={errors.displayName}
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
      <Button label="Sign up" onPress={() => void submit()} loading={busy} />
      {googleSignInEnabled ? (
        <Button
          label="Continue with Google"
          onPress={() => void handleGoogle()}
          disabled={busy}
          variant="secondary"
        />
      ) : null}
      <TouchableOpacity onPress={() => router.push('/login')}>
        <AppText tone="brand" weight="semibold">
          Already have an account? Sign in
        </AppText>
      </TouchableOpacity>
    </Screen>
  );
}
