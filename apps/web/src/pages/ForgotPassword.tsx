import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { forgotPasswordRequestSchema } from '@reel/shared';
import type { ForgotPasswordRequest } from '@reel/shared';
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
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export function ForgotPassword() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    defaultValues: { email: '' },
  });

  const submit = form.handleSubmit(async (input) => {
    setError(null);
    setMessage(null);
    try {
      const result = await api.forgotPassword(input);
      setMessage(result.message);
    } catch (cause) {
      setError(errorMessage(cause, 'Could not request a reset link'));
    }
  });

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We’ll email you a one-time reset link."
      footer={<AuthFooter prompt="Remembered it?" to="/login" label="Back to login" />}
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
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            Send reset link
          </Button>
        </form>
      </Form>
      {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </AuthShell>
  );
}
