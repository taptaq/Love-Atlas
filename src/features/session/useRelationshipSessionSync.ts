import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useJourneyStore, useUiStore } from '../../store';
import type { JourneyStoreState } from '../../store/useJourneyStore';
import type { RelationshipSharedState } from '../../types/session';
import { loadRelationshipSharedState, saveRelationshipSharedState } from './sessionService';
import { loadExplorationSharedState } from './spaceService';
import { useSessionStore } from './useSessionStore';
import { useSpaceStore } from './useSpaceStore';

export function selectRelationshipSharedState(state: JourneyStoreState): RelationshipSharedState {
  const ab = state.abAnswers;
  // 未揭晓时，屏蔽双方答案文本，只同步 ready 标识
  // 双方都 ready 后，同步真实答案
  const bothReady = ab.answerAReady && ab.answerBReady;
  const shouldMask = !ab.revealVisible && !bothReady;
  const syncedAbAnswers = shouldMask
    ? { ...ab, answerA: '', answerB: '' }
    : ab;

  return {
    currentStep: state.currentStep,
    relationshipStage: state.relationshipStage,
    goal: state.goal,
    route: state.route,
    mirrorEvent: state.mirrorEvent,
    presentMoment: state.presentMoment,
    abAnswers: syncedAbAnswers,
    abInteraction: syncedAbAnswers,
    worldState: state.worldState,
    mapState: state.worldState,
    summary: state.summary,
    currentQuestionIndex: state.currentQuestionIndex,
    currentQuestion: state.currentQuestion,
    journeyLength: state.journeyLength,
    journeyHistory: state.journeyHistory,
    events: state.events,
    currentEvent: state.currentEvent,
  };
}

function serializeState(state: RelationshipSharedState | null | undefined): string {
  if (!state) return '';
  try {
    return JSON.stringify(state);
  } catch {
    return '';
  }
}

function handleSyncError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (!/Exploration not found|Space not found|Only active space members/i.test(message)) return false;
  useSpaceStore.getState().clearSpace();
  useSessionStore.getState().clearSession();
  useJourneyStore.getState().resetJourney();
  useJourneyStore.getState().goToStep('home');
  return true;
}

export function useRelationshipSessionSync() {
  const sessionId = useSessionStore((state) => state.session?.id);
  const explorationId = useSpaceStore((state) => state.exploration?.id);
  const isCompanion = useSpaceStore((state) => state.isCompanion);
  const isHydratingRef = useRef(false);
  const lastSyncedRef = useRef<string>('');
  const pendingSaveRef = useRef<RelationshipSharedState | null>(null);
  const savingRef = useRef(false);
  const activityRef = useRef(0); // 活动计数：本地有操作或刚收到远端更新时递增

  useEffect(() => {
    if (!sessionId) return;

    // 虚拟伴侣模式：没有真实对方，不需要持续同步（节省 API 调用和 WebSocket 资源）
    if (isCompanion) {
      useUiStore.getState().setSyncStatus('online');
      return;
    }

    // 0. 页面加载/刷新时立即从服务端拉取最新状态，校准本地
    const initialSync = async () => {
      try {
        const sharedState = explorationId
          ? (await loadExplorationSharedState(explorationId)).sharedState
          : await loadRelationshipSharedState(sessionId);
        if (sharedState) {
          const serialized = serializeState(sharedState);
          lastSyncedRef.current = serialized;
          isHydratingRef.current = true;
          useJourneyStore.getState().hydrateSharedState(sharedState);
          queueMicrotask(() => {
            isHydratingRef.current = false;
          });
          activityRef.current += 1;
        }
      } catch (error) {
        if (!handleSyncError(error)) {
          // 初始同步失败，标记错误状态
          useUiStore.getState().setSyncStatus('error');
        }
      }
    };
    void initialSync();

    // 1. 本地状态变化时放入待保存队列，并立即触发保存
    const unsubscribe = useJourneyStore.subscribe((state) => {
      if (isHydratingRef.current) return;
      const sharedState = selectRelationshipSharedState(state);
      const serialized = serializeState(sharedState);
      if (serialized === lastSyncedRef.current) return;
      pendingSaveRef.current = sharedState;
      activityRef.current += 1; // 标记有活动，加快轮询
      // 立即异步触发保存，不等待下一个 interval
      void flushSave();
    });

    // 立即保存函数
    const flushSave = async () => {
      if (savingRef.current || !pendingSaveRef.current) return;
      const sharedState = pendingSaveRef.current;
      pendingSaveRef.current = null;
      savingRef.current = true;
      useUiStore.getState().setSyncStatus('syncing');
      try {
        await saveRelationshipSharedState(sessionId, sharedState);
        useUiStore.getState().setSyncStatus(navigator.onLine ? 'online' : 'offline');
      } catch {
        if (!pendingSaveRef.current) pendingSaveRef.current = sharedState;
        useUiStore.getState().setSyncStatus('error');
      } finally {
        savingRef.current = false;
      }
    };

    // 防抖保存：80ms 内合并多次状态变化为一次请求（降低保存延迟）
    const saveTimer = window.setInterval(async () => {
      if (savingRef.current || !pendingSaveRef.current) return;
      const sharedState = pendingSaveRef.current;
      pendingSaveRef.current = null;
      savingRef.current = true;
      useUiStore.getState().setSyncStatus('syncing');
      try {
        await saveRelationshipSharedState(sessionId, sharedState);
        useUiStore.getState().setSyncStatus(navigator.onLine ? 'online' : 'offline');
      } catch {
        if (!pendingSaveRef.current) pendingSaveRef.current = sharedState;
        useUiStore.getState().setSyncStatus('error');
      } finally {
        savingRef.current = false;
      }
    }, 80);

    // 2. Supabase realtime 订阅（如果可用）
    const table = explorationId ? 'exploration_state' : 'session_state';
    const filter = explorationId ? `exploration_id=eq.${explorationId}` : `session_id=eq.${sessionId}`;
    const channel = supabase
      ?.channel(`relationship-os-${explorationId ?? sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => {
          const sharedState = (payload.new as { shared_state?: RelationshipSharedState }).shared_state;
          if (!sharedState) return;
          const serialized = serializeState(sharedState);
          if (serialized === lastSyncedRef.current) return;
          lastSyncedRef.current = serialized;
          isHydratingRef.current = true;
          useJourneyStore.getState().hydrateSharedState(sharedState);
          queueMicrotask(() => {
            isHydratingRef.current = false;
          });
        },
      )
      .subscribe();

    // 3. 自适应轮询：有活动时 300ms 快速同步，空闲时 2000ms 省资源
    let pollTimeoutId: number | undefined;
    let nextDelay = 2000;
    const poll = () => {
      pollTimeoutId = window.setTimeout(async () => {
        const wasActive = activityRef.current > 0;
        activityRef.current = 0;
        try {
          const sharedState = explorationId
            ? (await loadExplorationSharedState(explorationId)).sharedState
            : await loadRelationshipSharedState(sessionId);
          if (sharedState) {
            const serialized = serializeState(sharedState);
            if (serialized !== lastSyncedRef.current) {
              lastSyncedRef.current = serialized;
              isHydratingRef.current = true;
              useJourneyStore.getState().hydrateSharedState(sharedState);
              queueMicrotask(() => {
                isHydratingRef.current = false;
              });
              activityRef.current += 1; // 收到远端更新，保持快速轮询
            }
          }
        } catch (error) {
          if (!handleSyncError(error)) {
            // 轮询失败，标记错误状态
            useUiStore.getState().setSyncStatus('error');
          }
        }
        nextDelay = activityRef.current > 0 || wasActive ? 300 : 2000;
        poll();
      }, nextDelay);
    };
    poll();

    // 4. 页面重新可见（如切回标签页）时立即同步一次
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        activityRef.current += 1;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 5. 离线/在线检测 + 重连自动同步
    const handleOnline = async () => {
      useUiStore.getState().setSyncStatus('syncing');
      try {
        // 立即拉取服务端最新状态，处理离线期间的远端变更
        const sharedState = explorationId
          ? (await loadExplorationSharedState(explorationId)).sharedState
          : await loadRelationshipSharedState(sessionId);
        if (sharedState) {
          const serialized = serializeState(sharedState);
          if (serialized !== lastSyncedRef.current) {
            lastSyncedRef.current = serialized;
            isHydratingRef.current = true;
            useJourneyStore.getState().hydrateSharedState(sharedState);
            queueMicrotask(() => {
              isHydratingRef.current = false;
            });
          }
        }
        // flush 离线期间积压的本地变更
        if (pendingSaveRef.current) {
          await flushSave();
        }
        useUiStore.getState().setSyncStatus('reconnected');
      } catch {
        useUiStore.getState().setSyncStatus('error');
      }
    };
    const handleOffline = () => useUiStore.getState().setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.clearInterval(saveTimer);
      if (channel && supabase) void supabase.removeChannel(channel);
      if (pollTimeoutId !== undefined) window.clearTimeout(pollTimeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sessionId, explorationId, isCompanion]);
}
