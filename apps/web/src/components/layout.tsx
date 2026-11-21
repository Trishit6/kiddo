import {
  Bookmark,
  Bell,
  Compass,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTrending } from '@reel/queries';
import { useAuth } from '@/components/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GlassCard, GlassNavigation } from '@/components/ui/glass';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

const primaryNav: NavItem[] = [
  { to: '/', label: 'For You', icon: Sparkles, end: true },
  { to: '/following', label: 'Following', icon: Users },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/notifications', label: 'Notifications', icon: Bell },
];

const secondaryNav: NavItem[] = [
  { to: '/upload', label: 'Create', icon: Plus },
  { to: '/profile', label: 'Saved', icon: Bookmark },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const mobileNav: NavItem[] = [
  ...primaryNav.filter(({ to }) => to === '/' || to === '/explore'),
  { to: '/upload', label: 'Create', icon: Plus },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/welcome"
      className="inline-flex items-baseline gap-1 font-display text-2xl font-bold tracking-tight"
      aria-label="Kiddo home"
    >
      {compact ? null : <span>kiddo</span>}
      <span aria-hidden="true" className="size-2 rounded-full bg-brand" />
    </Link>
  );
}

function navClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2',
    isActive
      ? 'bg-brand/12 text-brand shadow-[inset_0_0_0_1px_var(--glass-border)]'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  );
}

function useImmersive(): boolean {
  const { pathname } = useLocation();
  return pathname === '/' || pathname === '/following' || pathname.startsWith('/video/');
}

function DesktopSidebar() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();
  const profileHref = user ? `/@${user.username}` : '/login';

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside className="glass-nav fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-4 px-4 py-5 md:flex">
      <div className="px-2">
        <Logo />
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
        {primaryNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navClass}>
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        {secondaryNav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={navClass}>
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <NavLink to={profileHref} className={navClass}>
          <User className="size-5" aria-hidden="true" />
          Profile
        </NavLink>
      </nav>

      <div className="space-y-2 border-t border-glass-border pt-4">
        <ThemeToggle />
        {status === 'authenticated' && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent"
              >
                <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{user.displayName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{user.username}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="glass-strong w-56">
              <DropdownMenuLabel>Signed in as @{user.username}</DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 h-px bg-border" />
              <DropdownMenuItem asChild>
                <Link to={profileHref}>
                  <User className="size-4" aria-hidden="true" /> View profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="size-4" aria-hidden="true" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void logout()}>
                <LogOut className="size-4" aria-hidden="true" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-col gap-2 px-2">
            <Button asChild size="sm">
              <Link to="/signup">Sign up</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/login">Log in</Link>
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

function DiscoveryRail() {
  const { data } = useTrending();
  const hashtags = data?.hashtags ?? [];
  const creators = Array.from(
    new Map((data?.videos ?? []).map((item) => [item.author.id, item.author])).values(),
  ).slice(0, 3);

  return (
    <aside className="fixed inset-y-0 right-0 z-20 hidden w-72 flex-col gap-4 overflow-y-auto p-4 xl:flex">
      <GlassCard className="p-4">
        <p className="text-label font-semibold uppercase tracking-widest text-brand">Trending</p>
        <ul className="mt-3 space-y-1">
          {hashtags.length ? (
            hashtags.slice(0, 5).map((tag, index) => (
              <li key={tag.tag}>
                <Link
                  to={`/tag/${tag.tag}`}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-accent"
                >
                  <span className="font-medium">#{tag.tag}</span>
                  <span className="text-xs text-muted-foreground">
                    {index + 1} · {tag.videosCount}
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-2 py-2 text-xs text-muted-foreground">No trending tags yet.</li>
          )}
        </ul>
      </GlassCard>
      <GlassCard className="p-4">
        <p className="text-label font-semibold uppercase tracking-widest text-brand">
          Creators to know
        </p>
        <ul className="mt-3 space-y-3">
          {creators.length ? (
            creators.map((creator) => (
              <li key={creator.id}>
                <Link
                  to={`/@${creator.username}`}
                  className="flex items-center gap-3 rounded-lg p-1 hover:bg-accent"
                >
                  <Avatar src={creator.avatarUrl} name={creator.displayName} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {creator.displayName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{creator.username}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="text-xs text-muted-foreground">Trending creators appear here.</li>
          )}
        </ul>
      </GlassCard>
      <p className="px-2 text-[0.7rem] leading-relaxed text-muted-foreground">
        Kiddo · A calmer place for short video.
      </p>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="glass-nav sticky top-0 z-20 flex h-14 items-center justify-between px-4 md:hidden">
      <Logo />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <MobileAccountButton />
      </div>
    </header>
  );
}

function MobileAccountButton() {
  const { user, status } = useAuth();
  if (status !== 'authenticated' || !user) {
    return (
      <Button asChild size="sm" variant="ghost">
        <Link to="/login">Log in</Link>
      </Button>
    );
  }
  return (
    <Link
      to={`/@${user.username}`}
      aria-label="Your profile"
      className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
    </Link>
  );
}

function MobileTabBar() {
  return (
    <GlassNavigation
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex h-16 items-stretch justify-around">
        {mobileNav.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors',
                  isActive ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </GlassNavigation>
  );
}

export function Layout() {
  const immersive = useImmersive();
  return (
    <div className="min-h-dvh bg-background">
      <DesktopSidebar />
      <div className="md:pl-60 xl:pr-72">
        {immersive ? null : <MobileHeader />}
        <main className={immersive ? 'h-dvh' : 'pb-24 md:pb-10'}>
          <Outlet />
        </main>
      </div>
      {immersive ? null : <DiscoveryRail />}
      <MobileTabBar />
    </div>
  );
}
