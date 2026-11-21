import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import type { Theme } from '@/components/theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const themeOptions: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === 'dark' ? 'light' : 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}

/** Light / Dark / System picker used in the app toolbar. */
export function ThemeMenu() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const CurrentIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Appearance">
          <CurrentIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong w-44">
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
            <Icon className="size-4" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {theme === value ? <Check className="size-4 text-brand" aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeIndicator({ className }: { className?: string }) {
  const { theme, resolvedTheme } = useTheme();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[0.7rem] font-medium capitalize text-muted-foreground',
        className,
      )}
    >
      {theme === 'system' ? (
        <Monitor className="size-3" aria-hidden="true" />
      ) : resolvedTheme === 'dark' ? (
        <Moon className="size-3" aria-hidden="true" />
      ) : (
        <Sun className="size-3" aria-hidden="true" />
      )}
      {theme === 'system' ? `System · ${resolvedTheme}` : theme}
    </span>
  );
}
