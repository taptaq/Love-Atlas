import type { JourneyGoal, JourneyLength, Language, MapArea, RelationshipStage } from '../../types';

export interface RelationshipStageOption {
  id: RelationshipStage;
  icon: string;
  label: Record<Language, string>;
  description: Record<Language, string>;
  recommendedGoals: JourneyGoal[];
}

export interface JourneyLengthOption {
  id: JourneyLength;
  icon: string;
  label: Record<Language, string>;
  description: Record<Language, string>;
  questionCount: number;
}

export interface JourneyGoalOption {
  id: JourneyGoal;
  icon: string;
  label: Record<Language, string>;
  description: Record<Language, string>;
  primaryArea: MapArea;
  routeReason: Record<Language, string>;
}

export const relationshipStages: RelationshipStageOption[] = [
  {
    id: 'new',
    icon: '🌱',
    label: { cn: '刚刚开始', en: 'Just Beginning' },
    description: { cn: '还在慢慢了解彼此，需要轻柔地靠近。', en: 'You are still getting to know each other and need a gentle way in.' },
    recommendedGoals: ['know', 'icebreak', 'common'],
  },
  {
    id: 'dating',
    icon: '💞',
    label: { cn: '稳定交往', en: 'Dating' },
    description: { cn: '已经有亲密感，也适合发现新的连接。', en: 'There is closeness already, and room to discover fresh connection.' },
    recommendedGoals: ['connect', 'fresh', 'deep'],
  },
  {
    id: 'long-term',
    icon: '🏡',
    label: { cn: '长期关系', en: 'Long-term' },
    description: { cn: '熟悉里也需要重新看见彼此。', en: 'Familiarity still needs moments of rediscovery.' },
    recommendedGoals: ['habit', 'needs', 'review'],
  },
  {
    id: 'long-distance',
    icon: '🌙',
    label: { cn: '异地关系', en: 'Long-distance' },
    description: { cn: '距离让同步更重要，也让想念需要被表达。', en: 'Distance makes synchronization and expression more important.' },
    recommendedGoals: ['sync', 'miss', 'future'],
  },
];

export const journeyGoals: JourneyGoalOption[] = [
  { id: 'know', icon: '🔍', label: { cn: '更了解彼此', en: 'Know Each Other' }, description: { cn: '从轻松的问题开始重新认识。', en: 'Start with lighter questions and rediscover each other.' }, primaryArea: 'forest', routeReason: { cn: '从情绪森林出发，先理解此刻感受。', en: 'Begin from Emotion Forest to understand current feelings.' } },
  { id: 'icebreak', icon: '🧊', label: { cn: '轻松破冰', en: 'Icebreak' }, description: { cn: '降低压力，让对话自然开始。', en: 'Lower the pressure and let conversation begin naturally.' }, primaryArea: 'valley', routeReason: { cn: '日常山谷适合轻松进入关系话题。', en: 'Life Valley is a gentle entry into relationship topics.' } },
  { id: 'common', icon: '✨', label: { cn: '寻找共同点', en: 'Find Common Ground' }, description: { cn: '发现你们相似的地方。', en: 'Notice where your inner worlds overlap.' }, primaryArea: 'coast', routeReason: { cn: '回忆海岸会帮助你们看见共同经历。', en: 'Memory Coast helps reveal shared experiences.' } },
  { id: 'connect', icon: '🪢', label: { cn: '加深连接', en: 'Deepen Connection' }, description: { cn: '把已经存在的亲密再推进一点。', en: 'Move existing closeness one step deeper.' }, primaryArea: 'forest', routeReason: { cn: '情绪森林适合表达更真实的需要。', en: 'Emotion Forest supports more honest emotional expression.' } },
  { id: 'fresh', icon: '🌈', label: { cn: '制造新鲜感', en: 'Create Freshness' }, description: { cn: '给熟悉关系一点新的角度。', en: 'Bring a new angle into familiar connection.' }, primaryArea: 'garden', routeReason: { cn: '边界花园能带来新的视角和探索感。', en: 'Boundary Garden introduces new angles and playful exploration.' } },
  { id: 'deep', icon: '💫', label: { cn: '聊深一点', en: 'Go Deeper' }, description: { cn: '进入更认真、更靠近的对话。', en: 'Enter a more intentional and intimate conversation.' }, primaryArea: 'forest', routeReason: { cn: '深度对话从情绪森林开始最自然。', en: 'Deep conversations naturally begin in Emotion Forest.' } },
  { id: 'habit', icon: '🏡', label: { cn: '看见日常', en: 'Notice Daily Life' }, description: { cn: '把平凡的陪伴重新看见。', en: 'See ordinary companionship again.' }, primaryArea: 'valley', routeReason: { cn: '日常山谷承载你们生活里的微小连接。', en: 'Life Valley carries the small connections of daily life.' } },
  { id: 'needs', icon: '🫶', label: { cn: '表达需要', en: 'Express Needs' }, description: { cn: '把没说清楚的需求温柔说出来。', en: 'Name unspoken needs with care.' }, primaryArea: 'garden', routeReason: { cn: '边界花园适合讨论需要、界限和期待。', en: 'Boundary Garden is suited for needs, boundaries, and expectations.' } },
  { id: 'review', icon: '🌊', label: { cn: '回顾关系', en: 'Review the Relationship' }, description: { cn: '从过去看见现在的变化。', en: 'Look at today through what you have lived together.' }, primaryArea: 'coast', routeReason: { cn: '回忆海岸会把重要片段带回对话里。', en: 'Memory Coast brings important moments back into the conversation.' } },
  { id: 'sync', icon: '📡', label: { cn: '同步近况', en: 'Sync Up' }, description: { cn: '把最近的生活和感受重新对齐。', en: 'Realign recent life and feelings.' }, primaryArea: 'valley', routeReason: { cn: '日常山谷帮助你们同步生活节奏。', en: 'Life Valley helps synchronize daily rhythm.' } },
  { id: 'miss', icon: '🌙', label: { cn: '表达想念', en: 'Express Missing' }, description: { cn: '让距离里的想念被听见。', en: 'Let longing across distance be heard.' }, primaryArea: 'coast', routeReason: { cn: '回忆海岸适合承接想念与过去的温度。', en: 'Memory Coast holds longing and remembered warmth.' } },
  { id: 'future', icon: '🏙', label: { cn: '聊聊未来', en: 'Talk Future' }, description: { cn: '把未来的想象放到同一张地图上。', en: 'Place your imagined futures onto the same map.' }, primaryArea: 'city', routeReason: { cn: '未来之城会引导你们对齐期待。', en: 'Future City guides alignment around expectations.' } },
];

export function getStageOption(stage: RelationshipStage | null) {
  return relationshipStages.find((item) => item.id === stage) ?? null;
}

export const journeyLengths: JourneyLengthOption[] = [
  {
    id: 'short',
    icon: '✨',
    label: { cn: '轻量', en: 'Short' },
    description: { cn: '2 题，适合快速破冰。', en: '2 questions, a quick icebreaker.' },
    questionCount: 2,
  },
  {
    id: 'normal',
    icon: '🌿',
    label: { cn: '日常', en: 'Normal' },
    description: { cn: '3 题，一次标准的探索。', en: '3 questions, a standard exploration.' },
    questionCount: 3,
  },
  {
    id: 'deep',
    icon: '💫',
    label: { cn: '深度', en: 'Deep' },
    description: { cn: '5 题，更深入的对话。', en: '5 questions, a deeper conversation.' },
    questionCount: 5,
  },
];

export function getJourneyLengthOption(length: JourneyLength | null) {
  return journeyLengths.find((item) => item.id === length) ?? journeyLengths[1];
}

export function getJourneyQuestionCount(length: JourneyLength | null): number {
  return getJourneyLengthOption(length).questionCount;
}

export function getGoalOption(goal: JourneyGoal | null) {
  return journeyGoals.find((item) => item.id === goal) ?? null;
}

export function getRecommendedGoals(stage: RelationshipStage | null) {
  const option = getStageOption(stage);
  if (!option) return journeyGoals.slice(0, 3);
  return option.recommendedGoals.map((goal) => getGoalOption(goal)).filter((goal): goal is JourneyGoalOption => Boolean(goal));
}
