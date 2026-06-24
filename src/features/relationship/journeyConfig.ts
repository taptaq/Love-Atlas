// 旅程引擎共享常量
// 集中管理相似度阈值、进度增量等魔法数字，避免跨文件硬编码不一致

export const SIMILARITY_THRESHOLD = {
  // 相似度 ≥ 55 视为高共鸣
  HIGH: 55,
  // 相似度 ≥ 30 视为中等
  MEDIUM: 30,
} as const;

// AB 洞察引擎阈值（abEngine.ts 使用）
// 相似度 ≥ 此值视为"有明显重叠理解"，否则视为"有值得继续看的差异"
export const AB_INSIGHT_THRESHOLD = 45;
// 相似度 < 此值视为"显著差异"（影响 mirrorSignal 的 mismatchScore）
export const AB_MISMATCH_THRESHOLD = 35;

// 事件引擎阈值（eventEngine.ts 使用）
// 镜像问题相似度 < 此值时触发镜像事件
export const MIRROR_TRIGGER_SIMILARITY = 42;
// 相似度 > 此值视为高共鸣，不触发事件
export const HIGH_RESONANCE_SIMILARITY = 72;
// 森林区域镜像事件触发阈值
export const FOREST_MIRROR_THRESHOLD = 55;

// 镜像信号评分阈值（getMirrorSignal 的 triggerScore 需 ≥ 此值才触发镜像）
export const MIRROR_SIGNAL_TRIGGER_SCORE = 68;

// 每次完成答题后世界地图的进度增量
export const JOURNEY_PROGRESS_DELTA = 18;
