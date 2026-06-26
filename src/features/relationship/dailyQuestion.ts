import type { JourneyQuestion, Language, MapArea } from '../../types';

// 今日一问：精选问题池
// 跨阶段、跨区域，每个问题都适合作为开启深度对话的入口
// 设计原则：低门槛、有温度、能引发真实表达
interface DailyQuestionSeed {
  question: { cn: string; en: string };
  hint: { cn: string; en: string };
  region: MapArea;
  emotion: string;
  // 适合的关系阶段（空数组表示通用）
  suitableStages?: Array<'new' | 'dating' | 'long-term' | 'long-distance'>;
}

const DAILY_QUESTION_POOL: DailyQuestionSeed[] = [
  {
    question: { cn: '最近有没有什么小事，让你突然想分享给我？', en: 'Was there a small moment recently that made you want to share it with me?' },
    hint: { cn: '从一件具体的小事开始，比从感受开始更容易。', en: 'Start from one concrete moment — it is easier than starting from a feeling.' },
    region: 'valley',
    emotion: 'fresh',
  },
  {
    question: { cn: '你觉得我们之间最自然的相处方式是什么样的？', en: 'What feels most natural between us when we are together?' },
    hint: { cn: '不需要定义，描述那个状态就好。', en: 'No need to define it — just describe the feeling.' },
    region: 'forest',
    emotion: 'safe',
  },
  {
    question: { cn: '如果用一个词形容我们现在的状态，你会选什么？', en: 'If you had one word for how we are right now, what would it be?' },
    hint: { cn: '第一反应往往最真实。', en: 'The first word that comes is usually the truest.' },
    region: 'coast',
    emotion: 'nostalgic',
  },
  {
    question: { cn: '有什么是你想了解我，但一直没机会问的？', en: 'What have you wanted to know about me, but never had the chance to ask?' },
    hint: { cn: '好奇心是靠近的桥梁。', en: 'Curiosity is a bridge.' },
    region: 'forest',
    emotion: 'curious',
  },
  {
    question: { cn: '最近一次让你想起我，是在什么场景？', en: 'When was the last time something reminded you of me?' },
    hint: { cn: '那些不经意的瞬间，往往藏着在意。', en: 'The offhand moments often carry the most care.' },
    region: 'coast',
    emotion: 'romantic',
  },
  {
    question: { cn: '我们之间，有什么是你希望被看见但没说出口的？', en: 'Between us, what do you wish had been seen but stayed unspoken?' },
    hint: { cn: '说出口不是为了改变什么，是为了被理解。', en: 'Speaking is not to change anything — it is to be understood.' },
    region: 'garden',
    emotion: 'emotional',
    suitableStages: ['dating', 'long-term'],
  },
  {
    question: { cn: '如果未来的我们感谢今天的这次对话，你觉得会是因为什么？', en: 'If our future selves thanked today\'s conversation, what would it be for?' },
    hint: { cn: '从未来的视角回看，有时更清楚。', en: 'Looking back from the future is sometimes clearer.' },
    region: 'city',
    emotion: 'hopeful',
  },
  {
    question: { cn: '有什么是你在关系里慢慢想要的，但还没说清楚？', en: 'What do you slowly want in this relationship, but haven\'t said clearly yet?' },
    hint: { cn: '模糊的期待说出来，才有机会被回应。', en: 'Fuzzy hopes need to be spoken to be met.' },
    region: 'garden',
    emotion: 'hopeful',
    suitableStages: ['dating', 'long-term', 'long-distance'],
  },
  {
    question: { cn: '我们日常里，哪个瞬间让你觉得最放松？', en: 'In our daily life, which moment makes you feel most at ease?' },
    hint: { cn: '放松的地方，往往是关系最真实的地方。', en: 'Where you relax is where the relationship is most real.' },
    region: 'valley',
    emotion: 'safe',
    suitableStages: ['dating', 'long-term'],
  },
  {
    question: { cn: '你希望我更懂你哪一面？', en: 'Which side of you do you wish I understood better?' },
    hint: { cn: '被懂，比被赞美更让人安心。', en: 'Being understood feels safer than being praised.' },
    region: 'forest',
    emotion: 'emotional',
  },
  {
    question: { cn: '如果我们之间有一次"重新来过"的机会，你想回到哪个瞬间？', en: 'If we had one "do-over" between us, which moment would you return to?' },
    hint: { cn: '不是后悔，是想做得更好。', en: 'Not regret — just wanting to do better.' },
    region: 'coast',
    emotion: 'nostalgic',
    suitableStages: ['dating', 'long-term'],
  },
  {
    question: { cn: '距离之外，你最想让我感受到什么？', en: 'Across the distance, what do you most want me to feel?' },
    hint: { cn: '距离会放大没说出口的话。', en: 'Distance amplifies what goes unsaid.' },
    region: 'city',
    emotion: 'hopeful',
    suitableStages: ['long-distance'],
  },
  {
    question: { cn: '我们之间有没有一个话题，是你们一直在绕开的？', en: 'Is there a topic between us that we keep circling around?' },
    hint: { cn: '绕开的，往往是需要被温柔打开的。', en: 'What we avoid is often what needs a gentle opening.' },
    region: 'garden',
    emotion: 'curious',
    suitableStages: ['dating', 'long-term'],
  },
  {
    question: { cn: '你最近有没有什么想法，是希望我先问你的？', en: 'Is there something on your mind lately that you wish I would ask you about first?' },
    hint: { cn: '有时候，等一个提问本身就是一种期待。', en: 'Sometimes waiting for the question is itself a hope.' },
    region: 'valley',
    emotion: 'fresh',
  },
];

// 基于日期生成稳定种子：同一天返回同一题
function dateToSeed(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return year * 10000 + month * 100 + day;
}

export interface DailyQuestion {
  question: JourneyQuestion;
  seed: string; // 用于缓存和去重，格式 YYYY-MM-DD
  index: number; // 在池中的索引
}

// 获取今日一问
export function getDailyQuestion(date: Date = new Date(), language: Language = 'cn'): DailyQuestion {
  const seed = dateToSeed(date);
  // 简单的线性同余生成器，保证同一天结果稳定
  const index = seed % DAILY_QUESTION_POOL.length;
  const seedStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const item = DAILY_QUESTION_POOL[index];

  const question: JourneyQuestion = {
    question: item.question[language],
    hint: item.hint[language],
    emotion: item.emotion,
    region: item.region,
    type: 'guess',
    localized: item.question,
    localizedHint: item.hint,
  };

  return { question, seed: seedStr, index };
}

// 获取今日一问的简短展示文本（用于卡片预览，不依赖当前语言）
export function getDailyQuestionPreview(date: Date = new Date()): { cn: string; en: string; hintCn: string; hintEn: string } {
  const seed = dateToSeed(date);
  const index = seed % DAILY_QUESTION_POOL.length;
  const item = DAILY_QUESTION_POOL[index];
  return {
    cn: item.question.cn,
    en: item.question.en,
    hintCn: item.hint.cn,
    hintEn: item.hint.en,
  };
}
