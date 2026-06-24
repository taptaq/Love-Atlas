import { useUiStore } from '../../store';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ visible, title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  const language = useUiStore((state) => state.language);
  if (!visible) return null;
  const cn = language === 'cn';

  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`confirm-modal ${danger ? 'confirm-modal-danger' : ''}`}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel-btn" onClick={onCancel}>
            {cancelLabel || (cn ? '取消' : 'Cancel')}
          </button>
          <button type="button" className="confirm-ok-btn" onClick={onConfirm}>
            {confirmLabel || (cn ? '确认' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
