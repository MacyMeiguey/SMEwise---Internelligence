/**
 * Toast — slide-in notification system.
 * Usage: import { toast } from './Toast' then call toast.success('Message')
 */

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, message: string, duration = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastNotification key={t.id} toast={t} onDismiss={() => onRemove(t.id)} />
      ))}
    </div>
  );
}

function ToastNotification({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), toast.duration - 300);
    const removeTimer = setTimeout(onDismiss, toast.duration);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.duration, onDismiss]);

  const Icon = toast.type === 'success' ? Check : toast.type === 'error' ? AlertCircle : Info;
  const colors = toast.type === 'success'
    ? 'bg-emerald-600 border-emerald-500/50'
    : toast.type === 'error'
    ? 'bg-red-600 border-red-500/50'
    : 'bg-primary-600 border-primary-500/50';

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-white text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-300 ${colors} ${
        leaving ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0 animate-slide-up'
      }`}
    >
      <Icon size={16} className="shrink-0" />
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-0.5 rounded hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
