import { ArrowRight, Heart, Sparkles, UploadCloud } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTrending } from '@reel/queries';
import { Logo } from '@/components/layout';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GlassCard, GlassPill } from '@/components/ui/glass';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { Skeleton } from '@/components/ui/skeleton';

const benefits = [
  {
    icon: Sparkles,
    title: 'A feed that learns',
    copy: 'For You and Following, tuned to what you actually watch.',
  },
  {
    icon: Heart,
    title: 'Real connections',
    copy: 'Follow creators, react, save and join the conversation.',
  },
  {
    icon: UploadCloud,
    title: 'Create anywhere',
    copy: 'Record on Android or upload from desktop with live processing status.',
  },
];

export function Landing() {
  const { data, isLoading, isError } = useTrending();
  const videos = data?.videos ?? [];

  return (
    <div className="min-h-dvh">
      <header className="glass-nav sticky top-0 z-30 flex h-16 items-center justify-between border-x-0 border-t-0 px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 md:pt-24">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/20 via-background to-background"
          />
          <ResponsiveContainer
            width="xl"
            className="grid items-center gap-12 py-0 lg:grid-cols-[1.05fr_0.95fr]"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassPill className="inline-flex items-center gap-2 text-brand">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Short video, long connections
              </GlassPill>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.04] tracking-[-0.035em] sm:text-6xl">
                Make every moment <span className="text-brand">worth replaying.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Kiddo is a calm, creative corner of the internet. Discover creators you love, share
                your own clips and keep the good stuff close.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/signup">
                    Create your account <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/">Explore the feed</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                No noise. No clutter. Just people and videos.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="relative mx-auto w-full max-w-sm"
            >
              <GlassCard
                strong
                className="relative aspect-[9/16] overflow-hidden rounded-[1.6rem] p-0 shadow-lift"
              >
                {videos[0] ? (
                  <Link to={`/video/${videos[0].video.id}`} className="block h-full w-full">
                    <img
                      src={videos[0].video.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/40" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-5">
                      <Avatar
                        src={videos[0].author.avatarUrl}
                        name={videos[0].author.displayName}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          @{videos[0].author.username}
                        </p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {videos[0].video.caption}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="tabular-nums text-sm font-medium">
                          {videos[0].counts.views.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : isLoading ? (
                  <Skeleton className="h-full w-full rounded-2xl" />
                ) : (
                  <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                    {isError
                      ? 'Trending videos are unavailable right now.'
                      : 'Be the first to share a moment.'}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </ResponsiveContainer>
        </section>

        <section className="border-y border-glass-border bg-glass px-4 py-14 backdrop-blur-md sm:px-6">
          <ResponsiveContainer width="xl" className="py-0">
            <div className="grid gap-4 sm:grid-cols-3">
              {benefits.map(({ icon: Icon, title, copy }) => (
                <GlassCard key={title} className="p-6">
                  <Icon className="size-6 text-brand" aria-hidden="true" />
                  <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
                </GlassCard>
              ))}
            </div>
          </ResponsiveContainer>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <ResponsiveContainer width="xl" className="py-0">
            <div className="mb-6 flex items-end justify-between gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-2xl sm:text-3xl">Trending on Kiddo</h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/explore">See all</Link>
              </Button>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="aspect-[9/16] rounded-2xl" />
                ))}
              </div>
            ) : videos.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {videos.slice(0, 8).map((item) => (
                  <Link
                    key={item.video.id}
                    to={`/video/${item.video.id}`}
                    className="group relative aspect-[9/16] overflow-hidden rounded-xl border border-muted bg-muted"
                  >
                    <img
                      src={item.video.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-80"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 to-transparent px-3 py-2 text-xs">
                      <span className="truncate font-medium">@{item.author.username}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="tabular-nums text-foreground">
                          {item.counts.likes.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <GlassCard className="p-8 text-center text-sm text-muted-foreground">
                Nothing is trending yet.{' '}
                <Link className="text-brand underline" to="/upload">
                  Upload the first video.
                </Link>
              </GlassCard>
            )}
          </ResponsiveContainer>
        </section>
      </main>

      <footer className="border-t border-glass-border px-4 py-8 sm:px-6">
        <ResponsiveContainer
          width="xl"
          className="flex flex-col items-center justify-between gap-4 py-0 sm:flex-row"
        >
          <Logo />
          <p className="text-xs text-muted-foreground">A better place to share short moments.</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link to="/signup" className="hover:text-foreground">
              Sign up
            </Link>
          </div>
        </ResponsiveContainer>
      </footer>
    </div>
  );
}
