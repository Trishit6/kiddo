import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { signupRequestSchema } from '@reel/shared';
import type { SignupRequest } from '@reel/shared';
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

export function Signup() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignupRequest>({
    resolver: zodResolver(signupRequestSchema),
    defaultValues: { email: '', username: '', displayName: '', password: '' },
  });

  const submit = form.handleSubmit(async (input) => {
    setError(null);
    try {
      await signUp(input);
      navigate(`/verify-email?email=${encodeURIComponent(input.email)}`, { replace: true });
    } catch (cause) {
      setError(errorMessage(cause, 'Could not create your account'));
    }
  });

  const google = async (credential: string) => {
    setError(null);
    try {
      await signInWithGoogle({ idToken: credential });
      navigate('/', { replace: true });
    } catch (cause) {
      setError(errorMessage(cause, 'Google sign-in failed'));
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Pick a username and start sharing in seconds."
      footer={<AuthFooter prompt="Already have an account?" to="/login" label="Log in" />}
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
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input autoComplete="username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
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
                  <PasswordInput autoComplete="new-password" {...field} />
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
            {form.formState.isSubmitting ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>
      </Form>
      <div className="mt-6">
        <GoogleSignInButton onCredential={google} />
      </div>
    </AuthShell>
  );
}
