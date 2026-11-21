import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-24 text-3xl',
} as const;

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-semibold text-secondary-foreground',
        sizeClasses[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={`${name} avatar`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
