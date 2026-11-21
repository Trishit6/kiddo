import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput({ ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} {...props} type={visible ? 'text' : 'password'} className="pr-12" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute inset-y-0 right-0.5 size-11"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    );
  },
);
