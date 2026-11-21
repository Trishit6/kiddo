import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { ReelQueriesProvider } from '@reel/queries';
import type { ApiClient, ApiClientError } from '@reel/shared';
import { SignInSheet } from '@/components/sign-in-sheet';
import { useAuth } from '@/components/auth-provider';

interface AuthGateContextValue {
  /** Opens the login sheet and, on success, runs the original action. */
  prompt(retry?: () => void): void;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function useSignInPrompt(): AuthGateContextValue {
  const value = useContext(AuthGateContext);
  if (!value) throw new Error('useSignInPrompt must be used inside AuthGateProvider');
  return value;
}

export function AuthGateProvider({
  api,
  subscribeToBackground,
  children,
}: {
  api: ApiClient;
  subscribeToBackground?: (flush: () => void) => () => void;
  children: ReactNode;
}) {
  const { status } = useAuth();
  const [visible, setVisible] = useState(false);
  const retryRef = useRef<(() => void) | null>(null);

  const prompt = useCallback((retry?: () => void) => {
    retryRef.current = retry ?? null;
    setVisible(true);
  }, []);

  const onAuthRequired = useCallback(
    (_error: ApiClientError, retry?: () => void) => {
      prompt(retry);
    },
    [prompt],
  );

  const onAuthenticated = useCallback(() => {
    const retry = retryRef.current;
    retryRef.current = null;
    setVisible(false);
    if (retry) retry();
  }, []);

  return (
    <AuthGateContext.Provider value={{ prompt }}>
      <ReelQueriesProvider
        api={api}
        subscribeToBackground={subscribeToBackground}
        onAuthRequired={onAuthRequired}
      >
        {children}
        <SignInSheet
          visible={visible && status !== 'authenticated'}
          onClose={() => setVisible(false)}
          onAuthenticated={onAuthenticated}
        />
      </ReelQueriesProvider>
    </AuthGateContext.Provider>
  );
}
