import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Trash2, HelpCircle, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'success' | 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20',
    },
    danger: {
      icon: Trash2,
      iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
      confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20',
    },
    primary: {
      icon: HelpCircle,
      iconBg: 'bg-[#801B2C]/10 border-[#801B2C]/20 text-[#801B2C]',
      confirmBtn: 'bg-[#801B2C] hover:bg-[#681523] text-white shadow-md shadow-[#801B2C]/20',
    },
  };

  const style = variantStyles[variant] || variantStyles.primary;
  const Icon = style.icon;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        dir="rtl"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isLoading) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl shadow-black/15 space-y-5 text-right relative overflow-hidden text-zinc-900"
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-sm ${style.iconBg}`}>
              <Icon className="w-6 h-6" />
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <h3 className="text-base font-black text-zinc-900 leading-tight">
                {title}
              </h3>
              {message && (
                <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed font-medium">
                  {message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Optional custom children */}
          {children && (
            <div className="pt-1">
              {children}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-98 ${style.confirmBtn}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري التنفيذ...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
