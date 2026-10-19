import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-stone-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full bg-white border ${
            error ? 'border-red-500 focus:border-red-600' : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15'
          } rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-all shadow-2xs disabled:bg-stone-50 disabled:opacity-60 ${className}`}
          {...props}
        />
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
