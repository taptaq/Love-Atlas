// 旅程引擎共享常量
// 集中管理相似度阈值、进度增量等魔法数字，避免跨文件硬编码不一致

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
