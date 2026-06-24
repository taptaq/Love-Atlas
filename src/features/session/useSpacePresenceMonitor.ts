import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../auth/useAuthStore';
import { useJourneyStore } from '../../store';
import { createParticipantId } from './sessionService';
import { loadSpaceManagement } from './spaceService';
import { useSessionStore } from './useSessionStore';
import { useSpaceStore } from './useSpaceStore';

const POLL_INTERVAL = 5000; // 5 秒轮询成员状态
const STALE_THRESHOLD = 45000; // 45 秒无心跳视为离线（3 倍心跳间隔）

/**
 * 全局空间在线状态监控：
 * 1. 轮询空间成员状态，当检测到对方离开（活跃成员从 ≥2 降到 <2）时自动回到空间首页
 * 2. 通过心跳 staleness 检测对方关闭页面/断网（lastSeenAt 超过阈值）
 * 3. 空间被销毁（unbound/archived）时清理本地状态并回到首页
 * 返回当前活跃成员数，供页面展示（避免重复轮询）
 */
export function useSpacePresenceMonitor() {
  const space = useSpaceStore((state) => state?.space ?? null);
  const isCompanion = useSpaceStore((state) => state?.isCompanion ?? false);
  const user = useAuthStore((state) => state?.user ?? null);
  const prevMemberCountRef = useRef(0);
  const [memberCount, setMemberCount] = useState(0);
  // 记录是否已触发过对方离线导航，避免重复触发
  const partnerLeftHandledRef = useRef(false);

  useEffect(() => {
    // 空间变化时重置标记
    partnerLeftHandledRef.current = false;
    setMemberCount(0);
  }, [space?.id]);

  // 1. 轮询成员状态，检测对方离开或空间销毁
  useEffect(() => {
    if (!space) {
      prevMemberCountRef.current = 0;
      setMemberCount(0);
      return;
    }

    // 虚拟伴侣模式：没有真实对方，不需要轮询成员状态
    if (isCompanion) {
      setMemberCount(2);
      return;
    }

    const localParticipantId = createParticipantId();
    const localUserId = user?.id;

    const checkMembers = async () => {
      try {
        const detail = await loadSpaceManagement(space.id);
        const spaceStatus = detail.space.status;
        const activeMembers = detail.members.filter((m) => m.status === 'active');
        const activeCount = activeMembers.length;
        const prev = prevMemberCountRef.current;
        prevMemberCountRef.current = activeCount;
        setMemberCount(activeCount);

        // 空间已被销毁（对方解绑等），清理本地状态并回到首页
        if (spaceStatus === 'unbound' || spaceStatus === 'archived') {
          useSpaceStore.getState().clearSpace();
          useSessionStore.getState().clearSession();
          useJourneyStore.getState().resetJourney();
          useJourneyStore.getState().goToStep('home');
          return;
        }

        // 对方显式离开：活跃成员从 ≥2 降到 <2，回到空间首页
        if (prev >= 2 && activeCount < 2) {
          if (!partnerLeftHandledRef.current) {
            partnerLeftHandledRef.current = true;
            useJourneyStore.getState().goToStep('home');
          }
          return;
        }

        // 通过心跳 staleness 检测对方关闭页面/断网
        // 只检查非本地成员的 lastSeenAt
        if (activeCount >= 2 && !partnerLeftHandledRef.current) {
          const now = Date.now();
          const partnerStale = activeMembers.some((m) => {
            // 排除本地用户
            if (localParticipantId && m.participant_id === localParticipantId) return false;
            if (localUserId && m.user_id === localUserId) return false;
            // 检查 lastSeenAt 是否过期
            if (!m.last_seen_at) return true; // 无心跳记录视为离线
            return now - new Date(m.last_seen_at).getTime() > STALE_THRESHOLD;
          });
          if (partnerStale) {
            partnerLeftHandledRef.current = true;
            useJourneyStore.getState().goToStep('home');
          }
        }

        // 对方重新上线时重置标记（从 <2 恢复到 ≥2）
        if (prev < 2 && activeCount >= 2) {
          partnerLeftHandledRef.current = false;
        }
      } catch (error) {
        // 对方解绑后本方成员状态也变为 left，无法再读取空间信息
        const message = error instanceof Error ? error.message : '';
        if (/only active space members|space not found/i.test(message)) {
          useSpaceStore.getState().clearSpace();
          useSessionStore.getState().clearSession();
          useJourneyStore.getState().resetJourney();
          useJourneyStore.getState().goToStep('home');
        }
        // 其他错误忽略，保持上次状态
      }
    };

    void checkMembers();
    const timer = window.setInterval(checkMembers, POLL_INTERVAL);
    return () => window.clearInterval(timer);
  }, [space?.id, user?.id, isCompanion]);

  return memberCount;
}
