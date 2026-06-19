import { getGoalOption } from './relationship.config';
import type { JourneyGoal, MapArea, RelationshipStage } from '../../types';

const stageRouteMap: Record<RelationshipStage, MapArea[]> = {
  new: ['valley'],
  dating: ['coast'],
  'long-term': ['forest'],
  'long-distance': ['city'],
};

export function getRecommendedRouteAreas(stage: RelationshipStage | null, goal: JourneyGoal | null, extraAreas: MapArea[] = []) {
  const goalOption = getGoalOption(goal);
  const stageAreas = stage ? stageRouteMap[stage] : [];
  const goalAreas = goalOption ? [goalOption.primaryArea] : [];
  return Array.from(new Set([...stageAreas, ...goalAreas, ...extraAreas]));
}
