import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { resendVerificationRequestSchema, verifyEmailRequestSchema } from '@reel/shared';
import type { ResendVerificationRequest, VerifyEmailRequest } from '@reel/shared';
import { AuthShell } from '@/components/auth-shell';
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

export function VerifyEmail() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';

  const verifyForm = useForm<VerifyEmailRequest>({
    resolver: zodResolver(verifyEmailRequestSchema),
    defaultValues: { token },
  });
  const resendForm = useForm<ResendVerificationRequest>({
    resolver: zodResolver(resendVerificationRequestSchema),
    defaultValues: { email },
  });

  const verify = verifyForm.handleSubmit(async (input) => {
    setError(null);
    setMessage(null);
    try {
      const result = await api.verifyEmail(input);
      setMessage(result.message);
    } catch (cause) {
      setError(errorMessage(cause, 'Could not verify your email'));
    }
  });

  const resend = resendForm.handleSubmit(async (input) => {
    setError(null);
    setMessage(null);
    try {
      const result = await api.resendVerification(input);
      setMessage(result.message);
    } catch (cause) {
      setError(errorMessage(cause, 'Could not resend the verification email'));
    }
  });

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Open the link from your inbox, or paste its one-time token below."
      footer={
        <Link className="font-semibold text-brand hover:underline" to="/">
          Back to the feed
        </Link>
      }
    >
      <Form {...verifyForm}>
        <form onSubmit={verify} className="space-y-4" noValidate>
          <FormField
            control={verifyForm.control}
            name="token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification token</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={verifyForm.formState.isSubmitting}>
            Verify email
          </Button>
        </form>
      </Form>

      <div className="my-6 h-px bg-border" />

      <Form {...resendForm}>
        <form onSubmit={resend} className="space-y-4" noValidate>
          <FormField
            control={resendForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Send a new link</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={resendForm.formState.isSubmitting}
          >
            Resend verification
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
