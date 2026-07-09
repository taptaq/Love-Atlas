// 旅程引擎共享常量
// 集中管理相似度阈值、进度增量等魔法数字，避免跨文件硬编码不一致

import type { RelationshipStage } from '../../types';

export const SIMILARITY_THRESHOLD = {
  // 相似度 ≥ 55 视为高共鸣
  HIGH: 55,
  // 相似度 ≥ 30 视为中等
  MEDIUM: 30,
  // 相似度 ≥ 70 视为极高共鸣，触发"深化共鸣"深度对话
  DEEP_RESONANCE: 70,
} as const;

// AB 洞察引擎阈值（abEngine.ts 使用）
// 相似度 ≥ 此值视为"有明显重叠理解"，否则视为"有值得继续看的差异"
export const AB_INSIGHT_THRESHOLD = 45;
// 相似度 < 此值视为"显著差异"
export const AB_MISMATCH_THRESHOLD = 35;

// 每次完成答题后世界地图的进度增量
export const JOURNEY_PROGRESS_DELTA = 18;

/**
 * 深度对话触发阈值（按关系阶段差异化）
 * - new / ambiguous / reconnect：低共鸣阈值放宽到 45（更易触发探索差异）+ 高共鸣 60（更易触发深化）
 *   原因：这些阶段最需要把"有差异但不极端"和"有共鸣但不极高"的中间地带继续深挖，
 *         否则刚认识/暧昧期的人最常落在 30-70 区间，会被直接跳过。
 * - dating / long-term / long-distance：低共鸣 <35、高共鸣 ≥60
 *   收窄原先的 <30 或 ≥70 区间，避免中等共鸣被完全跳过。
 */
const LOOSE_LOW = 45;
const STANDARD_LOW = 35;
const DEEP_HIGH_STANDARD = 60;
const DEEP_HIGH_STRICT = 70;

export function getDeepDialogueThresholds(stage: RelationshipStage | null): { low: number; high: number } {
  if (stage === 'new' || stage === 'ambiguous' || stage === 'reconnect') {
    return { low: LOOSE_LOW, high: DEEP_HIGH_STANDARD };
  }
  return { low: STANDARD_LOW, high: DEEP_HIGH_STANDARD };
}

export function shouldTriggerDeepDialogue(similarity: number, stage: RelationshipStage | null): 'low' | 'high' | null {
  const { low, high } = getDeepDialogueThresholds(stage);
  if (similarity < low) return 'low';
  if (similarity >= high) return 'high';
  return null;
}
