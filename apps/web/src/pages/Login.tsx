import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginRequestSchema } from '@reel/shared';
import type { LoginRequest } from '@reel/shared';
import { AuthFooter, AuthShell } from '@/components/auth-shell';
import { useAuth } from '@/components/auth-provider';
import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { errorMessage } from '@/lib/errors';
import { redirectPathFromState } from '@/lib/navigation';

export function Login() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });
  const destination = redirectPathFromState(location.state);

  const submit = form.handleSubmit(async (input) => {
    setError(null);
    try {
      await signIn(input);
      navigate(destination, { replace: true });
    } catch (cause) {
      setError(errorMessage(cause, 'Could not log in'));
    }
  });

  const google = async (credential: string) => {
    setError(null);
    try {
      await signInWithGoogle({ idToken: credential });
      navigate(destination, { replace: true });
    } catch (cause) {
      setError(errorMessage(cause, 'Google sign-in failed'));
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
      footer={<AuthFooter prompt="New to Kiddo?" to="/signup" label="Create an account" />}
    >
      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
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
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    className="text-xs font-medium text-brand hover:underline"
                    to="/forgot-password"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error ? (
            <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </Form>
      <div className="mt-6">
        <GoogleSignInButton onCredential={google} />
      </div>
    </AuthShell>
  );
}
