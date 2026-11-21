import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout';
import { GlassCard } from '@/components/ui/glass';
import { ThemeToggle } from '@/components/theme-toggle';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute left-[12%] top-[8%] size-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute bottom-[6%] right-[10%] size-80 rounded-full bg-accent-pink/15 blur-3xl" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <GlassCard strong className="p-6 shadow-lift sm:p-8">
          <div className="mb-6 flex items-center gap-2 text-brand">
            <Sparkles className="size-5" aria-hidden="true" />
            <span className="text-label font-semibold uppercase tracking-widest">
              Welcome to Kiddo
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </GlassCard>
        {footer ? (
          <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}

export function AuthFooter({ prompt, to, label }: { prompt: string; to: string; label: string }) {
  return (
    <span>
      {prompt}{' '}
      <Link to={to} className="font-semibold text-brand underline-offset-4 hover:underline">
        {label}
      </Link>
    </span>
  );
}
