import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, description, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-overlay-enter">
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Dialog box */}
      <div
        className={`relative w-full ${maxWidth} bg-white border border-stone-200 rounded-2xl shadow-2xl shadow-stone-900/15 p-6 text-stone-900 animate-modal-enter max-h-[92vh] flex flex-col z-10`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3.5 border-b border-stone-100 mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {title}
            </h3>
            {description && <p className="text-xs text-stone-500 mt-1 font-normal">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 hover:bg-stone-100 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto pr-1 flex-1">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
