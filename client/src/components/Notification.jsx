import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Notification({ type = 'info', message, onClose }) {
  if (!message) return null;

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    info: 'bg-brand-50 border-brand-200 text-brand-800'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-brand-600 flex-shrink-0" />
  };

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm transition ${styles[type] || styles.info}`}>
      {icons[type] || icons.info}
      <div className="flex-1 text-sm font-medium">{message}</div>
      {onClose && (
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
