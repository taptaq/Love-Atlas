// 旅程引擎共享常量
// 集中管理相似度阈值、进度增量等魔法数字，避免跨文件硬编码不一致

export const SIMILARITY_THRESHOLD = {
  // 相似度 ≥ 55 视为高共鸣
  HIGH: 55,
  // 相似度 ≥ 30 视为中等
  MEDIUM: 30,
} as const;

// 每次完成答题后世界地图的进度增量
export const JOURNEY_PROGRESS_DELTA = 18;
