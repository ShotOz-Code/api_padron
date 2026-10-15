import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children, className = '', ...props }: BadgeProps) {
  const variantClasses = {
    default: 'bg-amber-50 text-amber-900 border-amber-200',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-100 text-amber-900 border-amber-300',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-orange-50 text-orange-900 border-orange-200',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border select-none ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
