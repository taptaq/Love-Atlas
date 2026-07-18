import { useEffect, useRef } from 'react';

const AUTO_CLOSE_MS = 3500;

export function ErrorToast({
  message,
  onClose,
  variant = 'error',
}: {
  message: string;
  onClose: () => void;
  variant?: 'error' | 'info';
}) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!message) {
      onClose();
      return;
    }
    timerRef.current = window.setTimeout(() => {
      onClose();
    }, AUTO_CLOSE_MS);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className={`toast-stack ${variant}-toast-stack`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <div className={`toast-card ${variant}-toast-card`}>
        <span className="toast-icon" aria-hidden="true">
          {variant === 'error' ? '⚠️' : '💡'}
        </span>
        <p className={`toast-message ${variant}-toast-message`}>{message}</p>
      </div>
    </div>
  );
}
