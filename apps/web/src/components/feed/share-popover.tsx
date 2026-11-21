import { useShareVideo } from '@reel/queries';
import { Check, Link2, Share2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SharePopoverProps {
  videoId: string;
  shares: number;
  children: ReactNode;
}

export function shareUrl(videoId: string): string {
  return new URL(`/s/${videoId}`, window.location.origin).toString();
}

export function SharePopover({ videoId, shares, children }: SharePopoverProps) {
  const [copied, setCopied] = useState(false);
  const share = useShareVideo();
  const url = shareUrl(videoId);

  const registerShare = () => {
    share.mutate(videoId);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      setCopied(false);
    }
    registerShare();
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'Kiddo', url });
      registerShare();
    } catch {
      // The user dismissed the share sheet; do not count it.
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="glass-strong space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Share · {shares} {shares === 1 ? 'share' : 'shares'}
        </p>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start"
          onClick={() => void copy()}
        >
          {copied ? <Check className="text-mint" /> : <Link2 />}
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
        {typeof navigator.share === 'function' ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => void nativeShare()}
          >
            <Share2 /> Share via…
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
