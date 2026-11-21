import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  MeUser,
  SignupRequest,
} from '@reel/shared';
import { api, onSessionCleared } from '@/lib/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: MeUser | null;
  status: AuthStatus;
  signIn(input: LoginRequest): Promise<void>;
  signUp(input: SignupRequest): Promise<void>;
  signInWithGoogle(idToken: string): Promise<void>;
  signOut(): Promise<void>;
  signOutAll(): Promise<void>;
  requestPasswordReset(input: ForgotPasswordRequest): Promise<void>;
  setCurrentUser(user: MeUser): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const clear = useCallback(() => {
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const apply = useCallback((response: AuthResponse) => {
    setUser(response.user);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const tokens = await api.getSessionTokens();
      if (!tokens?.accessToken) {
        if (active) clear();
        return;
      }
      try {
        const response = await api.getMe();
        if (active) {
          setUser(response.user);
          setStatus('authenticated');
        }
      } catch {
        if (active) clear();
      }
    })();
    return () => {
      active = false;
    };
  }, [clear]);

  useEffect(() => onSessionCleared(clear), [clear]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      async signIn(input) {
        apply(await api.login(input));
      },
      async signUp(input) {
        apply(await api.signup(input));
      },
      async signInWithGoogle(idToken) {
        apply(await api.googleSignIn({ idToken }));
      },
      async signOut() {
        try {
          await api.logout();
        } finally {
          clear();
        }
      },
      async signOutAll() {
        try {
          await api.logoutAll();
        } finally {
          clear();
        }
      },
      async requestPasswordReset(input) {
        await api.forgotPassword(input);
      },
      setCurrentUser(nextUser) {
        setUser(nextUser);
      },
    }),
    [apply, clear, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
