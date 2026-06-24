import { useEffect } from 'react';
import { useAuthStore } from '../auth/useAuthStore';
import { sendSpaceHeartbeat } from './spaceService';
import { useSpaceStore } from './useSpaceStore';

const HEARTBEAT_INTERVAL = 15000; // 15 秒心跳

/**
 * 空间在线心跳：
 * - 页面加载时立即发送一次心跳（重新激活成员状态，支持刷新恢复）
 * - 定期发送心跳更新 lastSeenAt
 * - 适用于临时空间和专属空间
 */
export function useSpacePresenceHeartbeat() {
  const space = useSpaceStore((state) => state?.space ?? null);
  const isCompanion = useSpaceStore((state) => state?.isCompanion ?? false);
  const user = useAuthStore((state) => state?.user ?? null);

  useEffect(() => {
    if (!space) return;
    // 虚拟伴侣模式：没有真实对方，不需要心跳
    if (isCompanion) return;

    let cancelled = false;
    const heartbeat = () => {
      if (!cancelled) void sendSpaceHeartbeat(space.id, user?.id).catch(() => undefined);
    };
    // 页面加载时立即心跳，重新激活成员状态（beforeunload 可能已标记为 left）
    heartbeat();
    const intervalId = window.setInterval(heartbeat, HEARTBEAT_INTERVAL);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [space, user, isCompanion]);
}
