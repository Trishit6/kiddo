import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import type { Theme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="glass inline-flex items-center gap-1 rounded-full p-1"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors',
            theme === value
              ? 'bg-brand text-brand-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
