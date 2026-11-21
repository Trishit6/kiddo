import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginRequestSchema, signupRequestSchema } from '@reel/shared';
import { radius, space } from '@reel/tokens';
import { useAuth } from '@/components/auth-provider';
import { AppText, Button, Field, IconButton, Message } from '@/components/ui';
import { errorMessage, firstIssueMessage } from '@/lib/errors';
import { googleSignInEnabled, requestGoogleIdToken } from '@/lib/google';
import { useTheme } from '@/theme/theme-provider';

type Mode = 'signin' | 'signup';

interface FieldErrors {
  email?: string;
  password?: string;
  username?: string;
  displayName?: string;
}

export function SignInSheet({
  visible,
  onClose,
  onAuthenticated,
  initialMode = 'signin',
}: {
  visible: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  initialMode?: Mode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setMode(initialMode);
  }, [initialMode, visible]);

  const submit = async () => {
    setMessage('');
    if (mode === 'signin') {
      const parsed = loginRequestSchema.safeParse({ email, password });
      if (!parsed.success) {
        setErrors({
          email: firstIssueMessage(parsed.error.issues, 'email'),
          password: firstIssueMessage(parsed.error.issues, 'password'),
        });
        return;
      }
      setErrors({});
      setBusy(true);
      try {
        await signIn(parsed.data);
        onAuthenticated();
      } catch (cause) {
        setMessage(errorMessage(cause, 'Could not sign in'));
      } finally {
        setBusy(false);
      }
      return;
    }

    const parsed = signupRequestSchema.safeParse({
      email,
      password,
      username,
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
    setBusy(true);
    try {
      await signUp(parsed.data);
      onAuthenticated();
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
        await signInWithGoogle(idToken);
        onAuthenticated();
      }
    } catch (cause) {
      setMessage(errorMessage(cause, 'Could not sign in with Google'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close sign in"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                paddingBottom: insets.bottom + space.lg,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <IconButton
                icon="close"
                label="Close"
                color={colors.mutedForeground}
                onPress={onClose}
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              <View style={styles.heading}>
                <Ionicons name="flame" size={26} color={colors.brand} />
                <AppText variant="title" weight="bold">
                  {mode === 'signin' ? 'Welcome back' : 'Join Kiddo'}
                </AppText>
                <AppText tone="muted">
                  {mode === 'signin'
                    ? 'Sign in to like, comment and follow.'
                    : 'Create an account to join the fun.'}
                </AppText>
              </View>

              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                testID="auth-email"
              />
              {mode === 'signup' ? (
                <>
                  <Field
                    label="Username"
                    value={username}
                    onChangeText={setUsername}
                    placeholder="your.name"
                    autoCapitalize="none"
                    error={errors.username}
                    testID="auth-username"
                  />
                  <Field
                    label="Display name"
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Optional"
                    error={errors.displayName}
                    testID="auth-display-name"
                  />
                </>
              ) : null}
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                autoCapitalize="none"
                error={errors.password}
                testID="auth-password"
              />
              <Message value={message} tone="error" />
              <Button
                label={mode === 'signin' ? 'Sign in' : 'Create account'}
                onPress={() => void submit()}
                loading={busy}
                testID="auth-submit"
              />
              {googleSignInEnabled ? (
                <Button
                  label="Continue with Google"
                  onPress={() => void handleGoogle()}
                  disabled={busy}
                  variant="secondary"
                />
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMode((current) => (current === 'signin' ? 'signup' : 'signin'));
                  setErrors({});
                  setMessage('');
                }}
                style={styles.switch}
              >
                <AppText tone="muted">
                  {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
                  <AppText tone="brand" weight="semibold">
                    {mode === 'signin' ? 'Create an account' : 'Sign in'}
                  </AppText>
                </AppText>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  keyboardView: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '92%',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    minHeight: 44,
  },
  handle: {
    position: 'absolute',
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  content: { paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.lg },
  heading: { gap: space.xs, alignItems: 'flex-start' },
  switch: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
