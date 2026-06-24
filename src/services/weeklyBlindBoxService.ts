import type { JourneyGoal, RelationshipStage } from '../types';
import { getGoalOption } from '../features/relationship/relationship.config';
import { generateAiTheme, type AiThemeResult } from '../features/relationship/aiJourneyService';

export interface WeeklyTheme {
  id: string;
  weekKey: string;
  icon: string;
  title: { cn: string; en: string };
  description: { cn: string; en: string };
  goal: JourneyGoal;
  stage: RelationshipStage;
  momentText: { cn: string; en: string };
  accent: 'rose' | 'mist' | 'amber' | 'teal';
  generatedBy: 'ai' | 'fallback';
}

interface BlindBoxState {
  openedWeekKey: string | null;
  dismissedWeekKey: string | null;
}

const STORAGE_KEY = 'love-atlas-blind-box';
const THEME_CACHE_KEY = 'love-atlas-blind-box-theme';

function getIsoWeekKey(date: Date): string {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = new Date(firstThursday).getFullYear();
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

// 预定义主题池：AI 失败时的 fallback
const FALLBACK_POOL: Array<Omit<WeeklyTheme, 'id' | 'weekKey' | 'generatedBy'>> = [
  {
    icon: '🌙',
    title: { cn: '深夜悄悄话', en: 'Late-Night Whispers' },
    description: { cn: '当城市安静下来，最适合聊一些白天来不及说的心事。', en: 'When the city quiets, it is the best time for thoughts left unsaid by day.' },
    goal: 'deep',
    stage: 'long-term',
    momentText: { cn: '此刻夜色温柔，我们刚结束一天的忙碌。', en: 'The night is gentle now, we just finished a busy day.' },
    accent: 'mist',
  },
  {
    icon: '☕',
    title: { cn: '咖啡馆慢聊', en: 'Café Slow Talk' },
    description: { cn: '像坐在咖啡馆窗边，用一杯咖啡的时间重新认识彼此。', en: 'Like sitting by a café window, rediscover each other over a cup of coffee.' },
    goal: 'know',
    stage: 'dating',
    momentText: { cn: '我们坐在一家安静的咖啡馆，阳光透过玻璃洒进来。', en: 'We are in a quiet café, sunlight spilling through the glass.' },
    accent: 'amber',
  },
  {
    icon: '🌅',
    title: { cn: '清晨第一束光', en: 'First Light of Morning' },
    description: { cn: '在新的一天开始前，分享一个你最想让对方知道的小心愿。', en: 'Before a new day begins, share one small wish you most want them to know.' },
    goal: 'fresh',
    stage: 'dating',
    momentText: { cn: '清晨刚醒来，阳光还没完全铺满房间。', en: 'Just woke up, sunlight not yet filling the room.' },
    accent: 'rose',
  },
  {
    icon: '✨',
    title: { cn: '重新发现你', en: 'Rediscover You' },
    description: { cn: '在一起久了，有些角落渐渐被忽略。今天，重新点亮一个。', en: 'After being together long, some corners fade. Today, light one up again.' },
    goal: 'miss',
    stage: 'long-term',
    momentText: { cn: '我们坐在沙发上，忽然觉得对方好像又变了。', en: 'We sit on the sofa, suddenly feeling the other has changed again.' },
    accent: 'mist',
  },
  {
    icon: '🎯',
    title: { cn: '我们的下一步', en: 'Our Next Step' },
    description: { cn: '聊聊你们都期待的未来——不必宏大，只要真实。', en: 'Talk about the future you both hope for — not grand, just true.' },
    goal: 'future',
    stage: 'long-term',
    momentText: { cn: '我们在规划下一段旅程，地图摊在桌上。', en: 'We are planning the next journey, map spread on the table.' },
    accent: 'amber',
  },
  {
    icon: '🫖',
    title: { cn: '茶余饭后', en: 'After Tea, After Dinner' },
    description: { cn: '饭后的小时光，最适合聊一些轻松又走心的话题。', en: 'The small moments after a meal are perfect for light yet heartfelt topics.' },
    goal: 'habit',
    stage: 'long-term',
    momentText: { cn: '刚吃完饭，桌上还留着温热的茶。', en: 'Just finished dinner, warm tea still on the table.' },
    accent: 'rose',
  },
  {
    icon: '🌧️',
    title: { cn: '雨天的小情绪', en: 'Rainy Day Feelings' },
    description: { cn: '下雨天总会让人想起一些平时不说的情绪。今天就聊聊它。', en: 'Rainy days stir up feelings usually left unspoken. Talk about them today.' },
    goal: 'sync',
    stage: 'dating',
    momentText: { cn: '窗外下着小雨，房间里很安静。', en: 'Light rain outside, very quiet inside.' },
    accent: 'teal',
  },
  {
    icon: '🛋️',
    title: { cn: '沙发上的周末', en: 'Weekend on the Sofa' },
    description: { cn: '周末赖在沙发上，最适合聊一些"最近怎么样"的真实回答。', en: 'Lingering on the sofa on weekends, perfect for honest "how have you been" talks.' },
    goal: 'review',
    stage: 'long-term',
    momentText: { cn: '周末下午，我们并排窝在沙发上。', en: 'Weekend afternoon, we sit together on the sofa.' },
    accent: 'rose',
  },
];

function pickFallbackTheme(weekKey: string): Omit<WeeklyTheme, 'id' | 'weekKey' | 'generatedBy'> {
  const match = weekKey.match(/W(\d+)$/);
  const weekNumber = match ? parseInt(match[1], 10) : 1;
  const index = (weekNumber - 1) % FALLBACK_POOL.length;
  return FALLBACK_POOL[index];
}

function loadState(): BlindBoxState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { openedWeekKey: null, dismissedWeekKey: null };
    const parsed = JSON.parse(raw) as Partial<BlindBoxState>;
    return {
      openedWeekKey: parsed.openedWeekKey ?? null,
      dismissedWeekKey: parsed.dismissedWeekKey ?? null,
    };
  } catch {
    return { openedWeekKey: null, dismissedWeekKey: null };
  }
}

function saveState(state: BlindBoxState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

interface CachedTheme {
  weekKey: string;
  theme: WeeklyTheme;
}

function loadCachedTheme(weekKey: string): WeeklyTheme | null {
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedTheme>;
    if (parsed?.weekKey === weekKey && parsed.theme) {
      return parsed.theme as WeeklyTheme;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedTheme(theme: WeeklyTheme) {
  try {
    const cache: CachedTheme = { weekKey: theme.weekKey, theme };
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

function toWeeklyTheme(aiResult: AiThemeResult, weekKey: string): WeeklyTheme {
  const goalOption = getGoalOption(aiResult.goal);
  const safeGoal: JourneyGoal = goalOption ? aiResult.goal : 'deep';
  return {
    ...aiResult,
    goal: safeGoal,
    id: `blind-box-${weekKey}`,
    weekKey,
    generatedBy: 'ai',
  };
}

function toFallbackWeeklyTheme(weekKey: string): WeeklyTheme {
  const fallback = pickFallbackTheme(weekKey);
  const goalOption = getGoalOption(fallback.goal);
  const safeGoal: JourneyGoal = goalOption ? fallback.goal : 'deep';
  return {
    ...fallback,
    goal: safeGoal,
    id: `blind-box-${weekKey}`,
    weekKey,
    generatedBy: 'fallback',
  };
}

export interface ThemeGenerationParams {
  stage: RelationshipStage | null;
  history: string[];
  worldProgress?: Record<string, number>;
  lastExploreDays: number;
}

/**
 * 获取本周主题（优先用缓存，无缓存时调用 AI 生成，AI 失败用 fallback）
 */
export async function fetchWeeklyTheme(
  params: ThemeGenerationParams,
  date: Date = new Date(),
): Promise<WeeklyTheme> {
  const weekKey = getIsoWeekKey(date);

  // 1. 优先用本周缓存
  const cached = loadCachedTheme(weekKey);
  if (cached) return cached;

  // 2. 调用 AI 生成
  try {
    const aiResult = await generateAiTheme({
      stage: params.stage,
      history: params.history.slice(-6),
      worldProgress: params.worldProgress,
      lastExploreDays: params.lastExploreDays,
      weekKey,
    });
    const theme = toWeeklyTheme(aiResult, weekKey);
    saveCachedTheme(theme);
    return theme;
  } catch {
    // 3. AI 失败用 fallback
    const fallback = toFallbackWeeklyTheme(weekKey);
    saveCachedTheme(fallback);
    return fallback;
  }
}

/**
 * 同步获取本周主题（仅用于读取已缓存的状态，不触发 AI）
 */
export function getCachedWeeklyTheme(date: Date = new Date()): WeeklyTheme | null {
  const weekKey = getIsoWeekKey(date);
  return loadCachedTheme(weekKey);
}

export function getBlindBoxStatus(date: Date = new Date()): {
  weekKey: string;
  isOpened: boolean;
  isDismissed: boolean;
} {
  const weekKey = getIsoWeekKey(date);
  const state = loadState();
  return {
    weekKey,
    isOpened: state.openedWeekKey === weekKey,
    isDismissed: state.dismissedWeekKey === weekKey,
  };
}

export function markBlindBoxOpened(weekKey: string) {
  const state = loadState();
  saveState({ ...state, openedWeekKey: weekKey });
}

export function markBlindBoxDismissed(weekKey: string) {
  const state = loadState();
  saveState({ ...state, dismissedWeekKey: weekKey });
}
