import { useEffect } from 'react';
import { useAuthStore } from '../auth/useAuthStore';
import { sendSpaceHeartbeat } from './spaceService';
import { useSpaceStore } from './useSpaceStore';

export function useSpacePresenceHeartbeat() {
  const space = useSpaceStore((state) => state.space);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!space || space.type !== 'persistent' || !user) return;
    let cancelled = false;
    const heartbeat = () => {
      if (!cancelled) void sendSpaceHeartbeat(space.id, user.id).catch(() => undefined);
    };
    heartbeat();
    const intervalId = window.setInterval(heartbeat, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [space, user]);
}
