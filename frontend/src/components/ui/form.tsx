import React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

interface FormItemProps {
  children: React.ReactNode;
  className?: string;
}

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  error?: boolean;
}

interface FormControlProps {
  children: React.ReactNode;
  className?: string;
}

interface FormMessageProps {
  children?: React.ReactNode;
  className?: string;
  error?: boolean;
}

export function FormField({ children, className }: FormFieldProps) {
  return <div className={cn('space-y-2', className)}>{children}</div>;
}

export function FormItem({ children, className }: FormItemProps) {
  return <div className={cn('space-y-2', className)}>{children}</div>;
}

export function FormLabel({ className, error, ...props }: FormLabelProps) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        error && 'text-destructive',
        className
      )}
      {...props}
    />
  );
}

export function FormControl({ children, className }: FormControlProps) {
  return <div className={cn(className)}>{children}</div>;
}

export function FormMessage({ children, className, error }: FormMessageProps) {
  if (!children) return null;

  return (
    <p
      className={cn(
        'text-sm',
        error ? 'text-destructive' : 'text-muted-foreground',
        className
      )}
    >
      {children}
    </p>
  );
}
