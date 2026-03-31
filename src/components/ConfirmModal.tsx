import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trash2, RotateCcw } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  type = 'danger',
  isLoading = false
}) => {
  const Icon = type === 'danger' ? Trash2 : type === 'warning' ? AlertCircle : RotateCcw;
  const iconColor = type === 'danger' ? 'text-red-600 bg-red-50' : type === 'warning' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50';
  const buttonColor = type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm p-8 bg-white rounded-3xl shadow-2xl text-center"
          >
            <div className={`w-16 h-16 ${iconColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
              <Icon size={32} className={isLoading ? 'animate-spin' : ''} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 mb-8">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 px-6 py-3 ${buttonColor} text-white font-bold rounded-2xl shadow-lg transition-all disabled:opacity-50`}
              >
                {isLoading ? 'جاري...' : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
