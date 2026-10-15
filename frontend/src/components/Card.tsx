import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export default function Card({ children, className = '', title }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 shadow-sm ${className}`}
    >
      {title && (
        <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-900 mb-3">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}
