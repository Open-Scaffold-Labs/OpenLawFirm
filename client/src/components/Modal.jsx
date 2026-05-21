import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable modal dialog.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {string} [props.size] - 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]
 */
export default function Modal({ open, onClose, title, size = 'md', children, footer }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <header className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <footer className="px-5 py-3 border-t bg-gray-50 rounded-b-xl">{footer}</footer>}
      </div>
    </div>
  );
}
