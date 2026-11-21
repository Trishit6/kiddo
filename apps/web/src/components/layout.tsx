import {
  Bell,
  Bookmark,
  Compass,
  Home,
  LogIn,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth-provider';
import { ThemeMenu } from '@/components/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
  { to: '/saved', label: 'Saved', icon: Bookmark },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const mobileNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/upload', label: 'Create', icon: Plus },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
];

export function Logo({ compact = false, to = '/welcome' }: { compact?: boolean; to?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-1.5 font-display text-2xl font-bold tracking-[-0.045em]"
      aria-label="Kiddo home"
    >
      {compact ? (
        <span className="grid size-9 place-items-center rounded-xl bg-brand/14 font-display text-lg font-bold text-brand ring-1 ring-inset ring-brand/25">
          k
        </span>
      ) : (
        <span>kiddo</span>
      )}
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-brand shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_18%,transparent)]"
      />
    </Link>
  );
}

function navClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'group flex min-h-11 items-center justify-center gap-3 rounded-xl px-0 py-2.5 text-sm font-medium transition-colors lg:justify-start lg:px-3',
    '[&_svg]:size-[18px] [&_svg]:stroke-[1.7]',
    isActive
      ? 'bg-brand/14 text-brand ring-1 ring-inset ring-brand/25'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  );
}

function useImmersive(): boolean {
  const { pathname } = useLocation();
  return pathname === '/' || pathname === '/following' || pathname.startsWith('/video/');
}

function SidebarProfile() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="space-y-3 px-1">
        <div className="size-14 rounded-full bg-muted" />
        <div className="h-3 w-28 rounded-full bg-muted" />
        <div className="h-2.5 w-20 rounded-full bg-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-glass-border bg-glass p-3.5">
        <p className="font-display text-base font-semibold">Find your people</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          A calmer place for short video.
        </p>
        <div className="mt-3 flex gap-2">
          <Button asChild size="sm" className="flex-1 rounded-full">
            <Link to="/signup">Sign up</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1 rounded-full">
            <Link to="/login">Log in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-1">
        <Avatar src={user.avatarUrl} name={user.displayName} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-1 rounded-2xl border border-glass-border bg-glass px-1 py-2.5 text-center">
        {[
          ['Posts', user.counts.videos],
          ['Followers', user.counts.followers],
          ['Following', user.counts.following],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="sr-only">{label}</dt>
            <dd>
              <span className="block text-sm font-semibold tabular-nums">{value}</span>
              <span className="block truncate text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DesktopSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const profileHref = user ? `/@${user.username}` : '/login';

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside className="glass hidden w-[var(--sidebar-compact-width)] shrink-0 flex-col overflow-y-auto rounded-[1.75rem] px-2 py-5 md:flex lg:w-[var(--sidebar-width)] lg:px-4">
      <div className="flex justify-center lg:justify-start lg:px-2.5">
        <span className="lg:hidden">
          <Logo compact to="/" />
        </span>
        <span className="hidden lg:inline-flex">
          <Logo to="/" />
        </span>
      </div>

      <div className="mt-5 hidden lg:block">
        <SidebarProfile />
      </div>
      <div className="mt-5 flex justify-center lg:hidden">
        {user ? (
          <Link
            to={profileHref}
            aria-label={`${user.displayName} profile`}
            title="Profile"
            className="rounded-full ring-1 ring-glass-border transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Avatar src={user.avatarUrl} name={user.displayName} size="md" />
          </Link>
        ) : (
          <Link
            to="/login"
            aria-label="Log in"
            title="Log in"
            className="grid size-11 place-items-center rounded-full bg-brand/14 text-brand ring-1 ring-inset ring-brand/25 transition-colors hover:bg-brand/20"
          >
            <LogIn className="size-5" aria-hidden="true" />
          </Link>
        )}
      </div>

      <nav aria-label="Primary" className="mt-5 flex flex-1 flex-col gap-0.5">
        <p className="hidden px-3 pb-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80 lg:block">
          Discover
        </p>
        {primaryNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} aria-label={label} title={label} className={navClass}>
            <Icon aria-hidden="true" />
            <span className="hidden lg:inline">{label}</span>
          </NavLink>
        ))}

        <p className="hidden px-3 pb-1.5 pt-4 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80 lg:block">
          Your space
        </p>
        {secondaryNav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} aria-label={label} title={label} className={navClass}>
            <Icon aria-hidden="true" />
            <span className="hidden lg:inline">{label}</span>
          </NavLink>
        ))}
        <NavLink to={profileHref} aria-label="Profile" title="Profile" className={navClass}>
          <User aria-hidden="true" />
          <span className="hidden lg:inline">Profile</span>
        </NavLink>
      </nav>

      <div className="mt-4 border-t border-glass-border pt-3">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                title="Account"
                className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl px-0 py-2 text-left transition-colors hover:bg-accent lg:justify-start lg:px-2"
              >
                <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
                <span className="hidden min-w-0 flex-1 lg:block">
                  <span className="block truncate text-xs font-semibold">{user.displayName}</span>
                  <span className="block truncate text-[0.7rem] text-muted-foreground">
                    @{user.username}
                  </span>
                </span>
                <LogOut
                  className="hidden size-4 text-muted-foreground lg:block"
                  aria-hidden="true"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="glass-strong w-56">
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
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-center px-0 lg:justify-start lg:px-3"
          >
            <Link to="/login" aria-label="Log in" title="Log in">
              <LogIn aria-hidden="true" />
              <span className="hidden lg:inline">Log in</span>
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}

export function TopToolbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] hidden h-[var(--toolbar-height)] shrink-0 items-center gap-3 border-b border-glass-border bg-background/25 px-5 backdrop-blur-xl md:flex lg:px-7">
      <form
        role="search"
        className="relative hidden w-full max-w-sm lg:block"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = query.trim();
          navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
        }}
      >
        <label htmlFor="toolbar-search" className="sr-only">
          Search Kiddo
        </label>
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="toolbar-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search creators, videos, tags"
          autoComplete="off"
          className="h-10 rounded-full border-glass-border bg-glass pl-10 text-sm placeholder:text-muted-foreground/80"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" asChild className="lg:hidden">
          <Link to="/search" aria-label="Search">
            <Search />
          </Link>
        </Button>
        <ThemeMenu />
        <Button variant="ghost" size="icon" asChild>
          <Link to="/notifications" aria-label="Notifications">
            <Bell />
          </Link>
        </Button>
        <Button
          asChild
          className="h-9 rounded-full bg-brand px-4 text-brand-foreground shadow-[0_8px_24px_color-mix(in_oklab,var(--brand)_28%,transparent)]"
        >
          <Link to="/upload">
            <Plus aria-hidden="true" /> Create
          </Link>
        </Button>
        {user ? (
          <Link
            to={`/@${user.username}`}
            aria-label="Your profile"
            className="ml-1 grid size-11 place-items-center rounded-full ring-1 ring-glass-border transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
          </Link>
        ) : (
          <Button asChild variant="ghost" size="sm" className="ml-1 rounded-full">
            <Link to="/login">Log in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

export function MobileHeader() {
  const { user, status } = useAuth();
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-[calc(var(--mobile-header-height)+env(safe-area-inset-top))] items-center justify-between border-b border-glass-border bg-background/70 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
      <Logo to="/" />
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/search" aria-label="Search">
            <Search />
          </Link>
        </Button>
        <ThemeMenu />
        {status === 'authenticated' && user ? (
          <Link
            to={`/@${user.username}`}
            aria-label="Your profile"
            className="ml-1 grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Avatar src={user.avatarUrl} name={user.displayName} size="sm" />
          </Link>
        ) : (
          <Button asChild size="sm" variant="ghost">
            <Link to="/login">Log in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

export function MobileBottomNavigation() {
  return (
    <nav
      aria-label="Primary"
      className="glass-nav fixed inset-x-0 bottom-0 z-[var(--z-nav)] rounded-t-[1.4rem] border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_40px_rgb(3_10_7_/_22%)] md:hidden"
    >
      <ul className="flex h-[var(--mobile-nav-height)] items-stretch justify-around px-1">
        {mobileNav.map(({ to, label, icon: Icon, end }) => {
          const isCreate = to === '/upload';
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex h-full flex-col items-center justify-center gap-1 text-[0.66rem] font-medium transition-[color,transform] duration-200',
                    isCreate
                      ? 'text-brand'
                      : isActive
                        ? 'text-brand'
                        : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {({ isActive }) =>
                  isCreate ? (
                    <>
                      <span
                        className={cn(
                          '-mt-3 grid size-11 place-items-center rounded-full bg-brand text-brand-foreground shadow-[0_10px_28px_rgb(6_12_9_/_38%)] ring-4 ring-background transition-transform duration-200',
                          isActive &&
                            'scale-105 outline outline-2 outline-offset-2 outline-brand/50',
                        )}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="max-w-full truncate px-0.5 text-[0.62rem] leading-none">
                        {label}
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        className={cn(
                          'grid size-8 place-items-center rounded-full transition-all duration-200',
                          isActive && '-translate-y-0.5 scale-105 bg-brand/14',
                        )}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="max-w-full truncate px-0.5">{label}</span>
                    </>
                  )
                }
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell() {
  const immersive = useImmersive();
  return (
    <div className="relative min-h-dvh">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-40 size-[46rem] rounded-full bg-brand/[0.12] blur-[140px]" />
        <div className="absolute -bottom-56 -right-40 size-[50rem] rounded-full bg-brand-secondary/[0.14] blur-[150px]" />
        <div className="absolute left-[38%] top-[18%] size-[28rem] rounded-full bg-brand/[0.06] blur-[120px]" />
      </div>
      <div
        className={cn(
          'relative z-[var(--z-raised)] mx-auto flex w-full max-w-[var(--shell-max-width)] flex-col md:h-dvh md:min-h-0 md:flex-row md:gap-[var(--shell-gutter)] md:p-[var(--shell-gutter)] xl:gap-[var(--shell-gutter-xl)] xl:p-[var(--shell-gutter-xl)]',
          immersive ? 'h-dvh' : 'min-h-dvh',
        )}
      >
        <DesktopSidebar />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden md:app-surface md:rounded-[2rem]">
          <TopToolbar />
          {immersive ? null : <MobileHeader />}
          <main
            className={cn(
              'min-h-0 flex-1',
              immersive
                ? 'h-full overflow-hidden pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] md:pb-0'
                : 'pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] md:overflow-y-auto md:pb-0',
            )}
          >
            <Outlet />
          </main>
        </div>
      </div>
      <MobileBottomNavigation />
    </div>
  );
}
