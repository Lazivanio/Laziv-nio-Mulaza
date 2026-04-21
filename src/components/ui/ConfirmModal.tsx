import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  variant = 'primary' 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string,
  variant?: 'danger' | 'primary'
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden relative z-10 p-8 text-center"
        >
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6",
            variant === 'danger' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
          )}>
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-black mb-2">{title}</h3>
          <p className="text-zinc-500 text-sm mb-8">{message}</p>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-4 border border-zinc-200 rounded-2xl font-bold text-sm hover:bg-zinc-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className={cn(
                "flex-1 py-4 text-white rounded-2xl font-bold text-sm transition-all shadow-lg",
                variant === 'danger' ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" : "bg-black hover:bg-zinc-800 shadow-zinc-200"
              )}
            >
              Confirmar
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
