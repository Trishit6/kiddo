import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Width = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const widthClasses: Record<Width, string> = {
  sm: 'max-w-xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
};

interface ResponsiveContainerProps extends HTMLAttributes<HTMLDivElement> {
  width?: Width;
  children?: ReactNode;
}

export function ResponsiveContainer({
  width = 'lg',
  className,
  children,
  ...props
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-6 sm:px-6 md:py-8 lg:px-8',
        widthClasses[width],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
