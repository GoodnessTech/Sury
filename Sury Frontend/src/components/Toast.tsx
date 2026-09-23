import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, ExternalLink, X } from 'lucide-react';
import { botChain } from '@/config';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  txHash?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, txHash, duration = 6000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, txHash, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Floating Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
              t.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-800 text-emerald-100'
                : t.type === 'error'
                ? 'bg-red-950/95 border-red-800 text-red-100'
                : t.type === 'warning'
                ? 'bg-amber-950/95 border-amber-800 text-amber-100'
                : 'bg-sury-slate/95 border-slate-700 text-slate-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400" />}
              {t.type === 'error' && <XCircle size={18} className="text-red-400" />}
              {t.type === 'warning' && <AlertTriangle size={18} className="text-amber-400" />}
              {t.type === 'info' && <Info size={18} className="text-sury-primary" />}
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <p className="font-semibold text-sm leading-tight text-white mb-0.5">{t.title}</p>
              {t.message && <p className="opacity-90 leading-relaxed break-words">{t.message}</p>}
              {t.txHash && (
                <a
                  href={`${botChain.explorerUrl}/tx/${t.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 font-mono text-[11px] underline opacity-90 hover:opacity-100"
                >
                  View on Explorer <ExternalLink size={11} />
                </a>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 opacity-60 hover:opacity-100 text-white rounded transition"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
