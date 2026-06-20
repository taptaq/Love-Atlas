import { getGoalOption } from './relationship.config';
import type { JourneyGoal, MapArea, RelationshipStage } from '../../types';

const stageRouteMap: Record<RelationshipStage, MapArea[]> = {
  new: ['valley', 'forest'],
  dating: ['coast', 'garden'],
  'long-term': ['forest', 'valley'],
  'long-distance': ['city', 'coast'],
};

// 每个主要区域对应一个互补区域，确保推荐路线至少有 2 个不同区域
const complementMap: Record<MapArea, MapArea> = {
  valley: 'forest',
  forest: 'coast',
  coast: 'garden',
  garden: 'city',
  city: 'valley',
};

export function getRecommendedRouteAreas(stage: RelationshipStage | null, goal: JourneyGoal | null, extraAreas: MapArea[] = []) {
  const goalOption = getGoalOption(goal);
  const stageAreas = stage ? stageRouteMap[stage] : [];
  const goalArea = goalOption?.primaryArea;
  const goalAreas = goalArea ? [goalArea, complementMap[goalArea]] : [];
  const areas = Array.from(new Set([...stageAreas, ...goalAreas, ...extraAreas]));
  if (areas.length >= 2) return areas;
  // 兜底：如果合并后仍不足两种，加上一个默认互补区域
  const primary = areas[0] ?? 'valley';
  return Array.from(new Set([primary, complementMap[primary]]));
}
