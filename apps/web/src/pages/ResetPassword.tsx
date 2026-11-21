import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordRequestSchema } from '@reel/shared';
import type { ResetPasswordRequest } from '@reel/shared';
import { AuthFooter, AuthShell } from '@/components/auth-shell';
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
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ResetPasswordRequest>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: { token: params.get('token') ?? '', password: '' },
  });

  const submit = form.handleSubmit(async (input) => {
    setError(null);
    try {
      await api.resetPassword(input);
      await api.clearSession();
      navigate('/login', { replace: true });
    } catch (cause) {
      setError(errorMessage(cause, 'Could not reset your password'));
    }
  });

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Reset links are single-use and expire after 30 minutes."
      footer={
        <AuthFooter prompt="Need to start over?" to="/forgot-password" label="Request a new link" />
      }
    >
      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reset token</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>New password</FormLabel>
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
            Reset password
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
