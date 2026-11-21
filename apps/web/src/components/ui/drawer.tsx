import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Bottom sheet on small screens and a side sheet from `md` upwards. Built on
 * Radix Dialog so focus trapping, escape handling and aria wiring come for free.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col bg-popover text-popover-foreground shadow-lift',
            'inset-x-0 bottom-0 max-h-[80dvh] rounded-t-2xl border-t',
            'data-[state=open]:animate-slide-up',
            'md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[26rem] md:rounded-none md:border-l md:border-t-0',
            'md:data-[state=open]:animate-slide-right',
            className,
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="space-y-1">
              <DialogPrimitive.Title className="font-display text-title font-semibold">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close panel"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </header>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
