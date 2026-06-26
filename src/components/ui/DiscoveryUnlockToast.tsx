import { useEffect, useCallback, useRef } from 'react';
import { useUiStore } from '../../store';
import { useDiscoveryStore } from '../../store/useDiscoveryStore';
import type { DiscoveryRarity } from '../../types';

const RARITY_LABEL: Record<DiscoveryRarity, { cn: string; en: string; class: string }> = {
  common: { cn: '常见', en: 'Common', class: 'discovery-toast-rarity-common' },
  rare: { cn: '稀有', en: 'Rare', class: 'discovery-toast-rarity-rare' },
  hidden: { cn: '传说', en: 'Legendary', class: 'discovery-toast-rarity-hidden' },
};

const AUTO_CLOSE_MS = 2000;

export function DiscoveryUnlockToast() {
  const language = useUiStore((state) => state.language);
  const pending = useDiscoveryStore((state) => state.pendingUnlocks);
  const acknowledge = useDiscoveryStore((state) => state.acknowledgeUnlock);
  const cn = language === 'cn';

  const current = pending[0] ?? null;
  const timerRef = useRef<number | null>(null);

  const close = useCallback(() => {
    if (!current) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    acknowledge(current.id);
  }, [current, acknowledge]);

  // 显示后 2 秒自动关闭
  useEffect(() => {
    if (!current) return;
    timerRef.current = window.setTimeout(close, AUTO_CLOSE_MS);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [current, close]);

  if (!current) return null;

  const rarity = RARITY_LABEL[current.rarity];

  return (
    <div className="discovery-toast-stack" role="status" aria-live="polite">
      <div
        className={`discovery-toast-card rarity-${current.rarity}`}
        onClick={close}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') close();
        }}
      >
        <div className="discovery-toast-glow" aria-hidden="true" />
        <div className="discovery-toast-icon">{current.icon}</div>
        <div className="discovery-toast-content">
          <div className="discovery-toast-head">
            <span className="discovery-toast-eyebrow">{cn ? '新发现' : 'New discovery'}</span>
            <span className={`discovery-toast-rarity ${rarity.class}`}>{cn ? rarity.cn : rarity.en}</span>
          </div>
          <h3 className="discovery-toast-title">{current.title}</h3>
          <p className="discovery-toast-message">{current.message}</p>
        </div>
      </div>
    </div>
  );
}
