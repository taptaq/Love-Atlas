import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useJourneyStore } from '../../store';
import type { JourneyStoreState } from '../../store/useJourneyStore';
import type { RelationshipSharedState } from '../../types/session';
import { saveRelationshipSharedState } from './sessionService';
import { useSessionStore } from './useSessionStore';
import { useSpaceStore } from './useSpaceStore';

export function selectRelationshipSharedState(state: JourneyStoreState): RelationshipSharedState {
  return {
    currentStep: state.currentStep,
    relationshipStage: state.relationshipStage,
    goal: state.goal,
    route: state.route,
    mirrorEvent: state.mirrorEvent,
    presentMoment: state.presentMoment,
    abAnswers: state.abAnswers,
    abInteraction: state.abAnswers,
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

export function useRelationshipSessionSync() {
  const sessionId = useSessionStore((state) => state.session?.id);
  const explorationId = useSpaceStore((state) => state.exploration?.id);
  const isHydratingRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = useJourneyStore.subscribe((state) => {
      if (isHydratingRef.current) return;
      void saveRelationshipSharedState(sessionId, selectRelationshipSharedState(state));
    });

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
          isHydratingRef.current = true;
          useJourneyStore.getState().hydrateSharedState(sharedState);
          queueMicrotask(() => {
            isHydratingRef.current = false;
          });
        },
      )
      .subscribe();

    return () => {
      unsubscribe();
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [sessionId, explorationId]);
}
