'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500/40 disabled:bg-primary-500/60',
  secondary:
    'border border-admin-border bg-admin-surface text-admin-fg-muted hover:bg-admin-hover focus-visible:ring-primary-500/25 disabled:bg-admin-muted',
  ghost:
    'bg-transparent text-admin-fg-muted hover:bg-admin-hover hover:text-admin-fg focus-visible:ring-primary-500/20',
  danger:
    'bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-500/35 disabled:bg-danger-600/60',
};

export function Button({
  variant = 'primary',
  children,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-all duration-admin ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-admin-bg disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
