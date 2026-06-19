import type { ABInsights, MapArea, MirrorSignalBreakdown, RelationshipStage } from '../types';

export function calculateSimilarity(answerA: string, answerB: string): number {
  const wordsA = new Set(answerA.toLowerCase().split(/\s+|，|。|、|,|\./).filter(Boolean));
  const wordsB = new Set(answerB.toLowerCase().split(/\s+|，|。|、|,|\./).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const overlap = Array.from(wordsA).filter((word) => wordsB.has(word)).length;
  return Math.round((overlap / Math.max(wordsA.size, wordsB.size)) * 100);
}

export function generateABInsights(answerA: string, answerB: string, region: MapArea): ABInsights {
  const similarity = calculateSimilarity(answerA, answerB);
  return {
    resonance: similarity >= 45 ? '你们对这个问题有明显重叠的理解。' : '你们的答案之间出现了值得继续看的差异。',
    difference: similarity >= 45 ? '差异不大，更多是表达方式不同。' : '对方真实表达和你的猜测之间存在距离。',
    emotion: region === 'forest' ? '情绪被更明确地看见了。' : '关系地图出现了新的信号。',
    suggestion: similarity >= 45 ? '可以继续追问一个更具体的细节。' : '不要急着解释，先问问对方为什么这样想。',
  };
}

export function getMirrorSignal(input: {
  stage: RelationshipStage | null;
  goal: string | null;
  similarity: number;
  hasMoment: boolean;
}): MirrorSignalBreakdown {
  const stageScore = input.stage === 'long-term' || input.stage === 'long-distance' ? 24 : 16;
  const goalScore = ['deep', 'needs', 'review', 'miss', 'future'].includes(input.goal ?? '') ? 24 : 14;
  const mismatchScore = input.similarity < 35 ? 30 : input.similarity < 55 ? 18 : 8;
  const momentScore = input.hasMoment ? 14 : 6;
  const triggerScore = stageScore + goalScore + mismatchScore + momentScore;
  return {
    trigger: triggerScore >= 68,
    triggerScore,
    probability: Math.min(99, triggerScore),
    stageScore,
    goalScore,
    mismatchScore,
    momentScore,
    stage: input.stage ?? '',
    goal: input.goal ?? '',
    forceTrigger: false,
    reason: triggerScore >= 68 ? 'mirror-unlocked' : 'continue-route',
    nextMemorySeed: input.similarity < 35 ? '你以为的，和对方真实表达之间出现了差异。' : '你们的理解正在接近。',
  };
}
