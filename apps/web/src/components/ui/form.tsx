import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldValues,
} from 'react-hook-form';
import { createContext, useContext, useId } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

const Form = FormProvider;

interface FormFieldStateValue {
  name: string;
}

interface FormItemStateValue {
  id: string;
}

const FormFieldState = createContext<FormFieldStateValue | null>(null);
const FormItemState = createContext<FormItemStateValue | null>(null);

export function FormField<TFieldValues extends FieldValues>(props: ControllerProps<TFieldValues>) {
  return (
    <FormFieldState.Provider value={{ name: String(props.name) }}>
      <Controller {...props} />
    </FormFieldState.Provider>
  );
}

export function FormItem({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  const id = useId();
  return (
    <FormItemState.Provider value={{ id }}>
      <div className={cn('space-y-2', className)} {...props}>
        {children}
      </div>
    </FormItemState.Provider>
  );
}

function useFormFieldState() {
  const field = useContext(FormFieldState);
  const item = useContext(FormItemState);
  const form = useFormContext();
  if (!field || !item) throw new Error('FormField and FormItem must be used together');
  const errors: unknown = form.formState.errors;
  const errorMap = errors as Record<string, { message?: string } | undefined>;
  return { id: item.id, name: field.name, error: errorMap[field.name] };
}

export function FormLabel({ className, ...props }: HTMLAttributes<HTMLLabelElement>) {
  const { id, error } = useFormFieldState();
  return <Label htmlFor={id} className={cn(error && 'text-destructive', className)} {...props} />;
}

export function FormControl({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { id, error } = useFormFieldState();
  return (
    <Slot
      id={id}
      aria-invalid={Boolean(error)}
      aria-describedby={`${id}-message`}
      className={className}
      {...props}
    />
  );
}

export function FormMessage({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const { id, error } = useFormFieldState();
  if (!error?.message) return null;
  return (
    <p
      id={`${id}-message`}
      role="alert"
      className={cn('text-sm text-destructive', className)}
      {...props}
    >
      {error.message}
    </p>
  );
}

export { Form };
