import { useFollowing, useTrending } from '@reel/queries';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CreatorStripProps {
  title?: string;
  className?: string;
}

/**
 * Horizontal creator discovery row: followed creators when signed in,
 * otherwise the authors behind the current trending videos.
 */
export function CreatorStrip({ title = 'Creators', className }: CreatorStripProps) {
  const { user } = useAuth();
  const following = useFollowing(user?.username ?? '');
  const trending = useTrending();

  const followed =
    following.data?.pages.flatMap((page) => page.items.map((item) => item.user)) ?? [];
  const trendingAuthors = Array.from(
    new Map((trending.data?.videos ?? []).map((item) => [item.author.id, item.author])).values(),
  );
  const creators = (followed.length > 0 ? followed : trendingAuthors).slice(0, 12);
  const pending = user ? following.isPending : trending.isPending;

  if (!pending && creators.length === 0) return null;

  return (
    <section aria-labelledby="creator-strip-heading" className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="creator-strip-heading" className="font-display text-title font-semibold">
          {title}
        </h2>
        <Link
          to="/explore"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-brand"
        >
          Discover more
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {pending ? (
        <ul className="no-scrollbar flex gap-4 overflow-x-auto pb-1 sm:gap-5" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index} className="flex w-16 shrink-0 flex-col items-center gap-2">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-2.5 w-12" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="no-scrollbar flex gap-4 overflow-x-auto pb-1 sm:gap-5">
          {creators.map((creator) => (
            <li key={creator.id} className="shrink-0">
              <Link
                to={`/@${creator.username}`}
                className="group flex w-[4.5rem] flex-col items-center gap-2 text-center focus-visible:outline-2 focus-visible:outline-offset-4 sm:w-20"
              >
                <span className="rounded-full border border-brand/45 p-[3px] transition-colors group-hover:border-brand">
                  <Avatar
                    src={creator.avatarUrl}
                    name={creator.displayName}
                    size="lg"
                    className="transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                </span>
                <span className="w-full truncate text-[0.72rem] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  {creator.username}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
