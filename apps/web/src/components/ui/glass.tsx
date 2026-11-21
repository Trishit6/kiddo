import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
  children?: ReactNode;
}

export function GlassCard({ className, strong = false, ...props }: GlassProps) {
  return (
    <div className={cn(strong ? 'glass-strong' : 'glass', 'rounded-2xl', className)} {...props} />
  );
}

export function GlassPanel({ className, strong = false, ...props }: GlassProps) {
  return (
    <section
      className={cn(strong ? 'glass-strong' : 'glass', 'rounded-3xl p-5 md:p-6', className)}
      {...props}
    />
  );
}

export function GlassNavigation({ className, ...props }: GlassProps) {
  return <nav className={cn('glass-nav rounded-2xl', className)} {...props} />;
}

export function GlassPill({ className, ...props }: GlassProps) {
  return (
    <div
      className={cn('glass rounded-full px-3 py-1.5 text-xs font-medium', className)}
      {...props}
    />
  );
}
