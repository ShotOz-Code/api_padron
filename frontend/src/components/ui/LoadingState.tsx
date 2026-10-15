import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Cargando datos...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white/50 rounded-xl border-2 border-stone-200">
      <div className="w-7 h-7 border-4 border-amber-300 border-t-amber-700 rounded-full animate-spin mb-3" />
      <p className="text-xs text-amber-950 font-bold uppercase tracking-wider">{message}</p>
    </div>
  );
}

export default LoadingState;
