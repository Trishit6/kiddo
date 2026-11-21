import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/glass';
import { ThemeToggle } from '@/components/theme-toggle';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main
      className={cn(
        'relative min-h-dvh flex items-center justify-center overflow-hidden bg-background px-4 py-10',
        'dark:bg-background-deep',
      )}
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute left-[12%] top-[8%] size-[calc(4rem+var(--spacing))] rounded-full bg-glass-bg/20 blur-3xl" />
        <div className="absolute bottom-[6%] right-[10%] size-[calc(3rem+var(--spacing))] rounded-full bg-glass-bg-strong/30 blur-3xl" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <GlassPanel
          strong
          className={cn(
            'rounded-[1.6rem] p-6 shadow-lift sm:p-8',
            'dark:bg-glass-bg-strong',
            'light:bg-card',
          )}
        >
          <div className="mb-6 flex items-center gap-2 text-brand">
            <Sparkles className="size-5" aria-hidden="true" />
            <span className="text-label font-semibold uppercase tracking-widest">
              Welcome to Kiddo
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </GlassPanel>
        {footer ? (
          <div
            className={cn(
              'mt-5 text-center text-sm',
              'dark:text-muted-foreground',
              'light:text-muted-foreground',
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  );
}

export function AuthFooter({ prompt, to, label }: { prompt: string; to: string; label: string }) {
  return (
    <span>
      {prompt}{' '}
      <Link
        to={to}
        className={cn(
          'font-semibold text-brand underline-offset-4 hover:underline',
          'dark:text-brand-foreground',
          'light:text-brand',
        )}
      >
        {' '}
        {label}
      </Link>
    </span>
  );
}
