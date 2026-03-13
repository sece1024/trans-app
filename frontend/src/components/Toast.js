import { AnimatePresence, motion } from 'framer-motion';

const icons = { success: '✓', error: '✕', info: 'ℹ' };

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast toast--${t.type}`}
            initial={{ opacity: 0, y: -28, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            onClick={() => onDismiss(t.id)}
          >
            <span className="toast-icon">{icons[t.type]}</span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
