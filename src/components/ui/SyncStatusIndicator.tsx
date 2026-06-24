import { useEffect } from 'react';
import { useUiStore } from '../../store';

// 同步状态指示器：显示当前网络/同步状态
export function SyncStatusIndicator() {
  const syncStatus = useUiStore((state) => state.syncStatus);
  const setSyncStatus = useUiStore((state) => state.setSyncStatus);
  const language = useUiStore((state) => state.language);
  const cn = language === 'cn';

  // reconnected 状态 3 秒后自动消失
  useEffect(() => {
    if (syncStatus !== 'reconnected') return;
    const timer = window.setTimeout(() => setSyncStatus('online'), 3000);
    return () => window.clearTimeout(timer);
  }, [syncStatus, setSyncStatus]);

  if (syncStatus === 'online') return null; // 在线时不显示

  const config = {
    syncing: { text: cn ? '同步中…' : 'Syncing…', className: 'sync-indicator-syncing' },
    offline: { text: cn ? '网络已断开' : 'Offline', className: 'sync-indicator-offline' },
    error: { text: cn ? '同步失败，正在重试…' : 'Sync error, retrying…', className: 'sync-indicator-error' },
    reconnected: { text: cn ? '✓ 已重新连接，状态已同步' : '✓ Reconnected', className: 'sync-indicator-reconnected' },
    online: null,
  } as const;

  const item = config[syncStatus];
  if (!item) return null;

  return (
    <div className={`sync-status-indicator ${item.className}`} role="status" aria-live="polite">
      <span className="sync-indicator-dot" />
      <span>{item.text}</span>
    </div>
  );
}
