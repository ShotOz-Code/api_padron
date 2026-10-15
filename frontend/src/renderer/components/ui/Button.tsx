import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition-all select-none outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
    md: 'text-xs px-3.5 py-2 gap-2 rounded-lg',
    lg: 'text-sm px-4 py-2.5 gap-2.5 rounded-xl',
  }[size];

  const variantClasses = {
    primary:
      'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-stone-950 shadow-xs hover:shadow-sm border border-amber-600/30',
    secondary:
      'bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-800 border border-stone-200 shadow-xs',
    outline:
      'bg-transparent hover:bg-amber-50 text-amber-900 border border-amber-800/30',
    danger:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs',
    ghost:
      'text-stone-700 hover:bg-amber-100/60 hover:text-amber-950',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

export default Button;
