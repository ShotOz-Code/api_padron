import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-amber-300 bg-amber-50/50 rounded-xl">
      <div className="w-12 h-12 rounded-xl bg-amber-200/80 border-2 border-amber-800 flex items-center justify-center text-amber-900 mb-3 shadow-[2px_2px_0px_#78350f]">
        {icon || (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        )}
      </div>
      <h4 className="text-sm font-black text-amber-950 uppercase">{title}</h4>
      {description && <p className="text-xs text-stone-600 mt-1 max-w-sm font-medium">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
