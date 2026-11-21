import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from '@/components/ui/glass';
import { ResponsiveContainer } from '@/components/ui/responsive-container';

export function NotFound() {
  return (
    <ResponsiveContainer width="sm" className="grid min-h-[70dvh] place-items-center">
      <GlassCard strong className="w-full p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand/15 text-brand">
          <Compass className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-5 text-label font-semibold uppercase tracking-widest text-brand">404</p>
        <h1 className="mt-2 font-display text-3xl font-bold">This page wandered off</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may be old, or the video is no longer available.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground"
        >
          Back to the feed
        </Link>
      </GlassCard>
    </ResponsiveContainer>
  );
}
