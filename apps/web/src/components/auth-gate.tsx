import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyhole } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { loginRequestSchema } from '@reel/shared';
import type { ApiClientError, LoginRequest } from '@reel/shared';
import { ReelQueriesProvider } from '@reel/queries';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

const SignInPromptContext = createContext<((retry?: () => void) => void) | null>(null);

/** Opens the sign-in dialog from anywhere (for example a disabled composer). */
export function useSignInPrompt(): (retry?: () => void) => void {
  const value = useContext(SignInPromptContext);
  if (!value) throw new Error('useSignInPrompt must be used inside AuthGateProvider');
  return value;
}

/**
 * Wires the shared queries package to the app: any interaction that comes back
 * as AUTH_REQUIRED opens a sign-in dialog and replays the action afterwards.
 */
export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { signIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRetry = useRef<(() => void) | null>(null);
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  const requestSignIn = useCallback((retry?: () => void) => {
    pendingRetry.current = retry ?? null;
    setError(null);
    setOpen(true);
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) pendingRetry.current = null;
  }, []);

  const submit = form.handleSubmit(async (input) => {
    setError(null);
    try {
      await signIn(input);
      setOpen(false);
      form.reset();
      const retry = pendingRetry.current;
      pendingRetry.current = null;
      if (retry) retry();
    } catch (cause) {
      setError(errorMessage(cause, 'Could not sign you in'));
    }
  });

  const subscribeToBackground = useCallback((flush: () => void) => {
    const onHide = () => flush();
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, []);

  const value = useMemo(
    () => ({
      api,
      subscribeToBackground,
      onAuthRequired: (authError: ApiClientError, retry?: () => void) => {
        if (authError.code === 'AUTH_REQUIRED') requestSignIn(retry);
      },
    }),
    [requestSignIn, subscribeToBackground],
  );

  return (
    <ReelQueriesProvider {...value}>
      <SignInPromptContext.Provider value={requestSignIn}>{children}</SignInPromptContext.Provider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <span className="mb-2 grid size-11 place-items-center rounded-full bg-brand text-brand-foreground">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>Join the fun</DialogTitle>
            <DialogDescription>
              Sign in to like, comment, save and follow creators. Kiddo stays free.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link
              to="/signup"
              className="font-semibold text-brand underline underline-offset-4"
              onClick={() => onOpenChange(false)}
            >
              Create an account
            </Link>
          </p>
        </DialogContent>
      </Dialog>
    </ReelQueriesProvider>
  );
}
