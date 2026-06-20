import { useUiStore } from '../../store';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

// 全屏加载遮罩：阻止加载期间的二次操作
export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  if (!visible) return null;
  const language = useUiStore.getState().language;
  const cn = language === 'cn';
  const text = message ?? (cn ? '加载中…' : 'Loading…');
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-overlay-content">
        <div className="loading-orbit" />
        <p>{text}</p>
      </div>
    </div>
  );
}
