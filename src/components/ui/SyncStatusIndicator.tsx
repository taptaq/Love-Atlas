import { useUiStore } from '../../store';

// 同步状态指示器：显示当前网络/同步状态
export function SyncStatusIndicator() {
  const syncStatus = useUiStore((state) => state.syncStatus);
  const language = useUiStore((state) => state.language);
  const cn = language === 'cn';

  if (syncStatus === 'online') return null; // 在线时不显示

  const config = {
    syncing: { text: cn ? '同步中…' : 'Syncing…', className: 'sync-indicator-syncing' },
    offline: { text: cn ? '网络已断开' : 'Offline', className: 'sync-indicator-offline' },
    error: { text: cn ? '同步失败，正在重试…' : 'Sync error, retrying…', className: 'sync-indicator-error' },
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
