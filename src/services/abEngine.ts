import type { ABInsights, MapArea, MirrorSignalBreakdown, RelationshipStage } from '../types';
import { AB_INSIGHT_THRESHOLD, AB_MISMATCH_THRESHOLD, MIRROR_SIGNAL_TRIGGER_SCORE } from '../features/relationship/journeyConfig';

// ---------------- 语义相似度核心 ----------------

/** 提取中文词（2字起）+ 英文词（2字符起） */
function extractWords(text: string): string[] {
  const lower = text.toLowerCase();
  // 中文：2-4 字词组（简单滑动窗口，覆盖常见短词）
  const chineseChars = lower.match(/[\u4e00-\u9fa5]/g) || [];
  const chineseWords: string[] = [];
  for (let size = 2; size <= 4; size++) {
    for (let i = 0; i + size <= chineseChars.length; i++) {
      chineseWords.push(chineseChars.slice(i, i + size).join(''));
    }
  }
  // 英文/数字词
  const englishWords = lower
    .replace(/[\u4e00-\u9fa5]/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
  return [...chineseWords, ...englishWords];
}

/** 同义词/近义词集合：中文 */
const SYNONYM_GROUPS_CN: string[][] = [
  ['海边', '海岸', '海滩', '海面', '大海', '海洋', '沙滩', '海滨'],
  ['日落', '夕阳', '晚霞', '黄昏', '落日', '夕阳西'],
  ['宁静', '安静', '平静', '静谧', '安宁', '寂静', '恬淡', '平和'],
  ['浪漫', '甜蜜', '温馨', '柔情', '亲密', '爱意'],
  ['陪伴', '相守', '一起', '共同', '同在', '陪在身边', '陪着'],
  ['聊天', '交谈', '对话', '说话', '聊聊', '谈心', '沟通', '交流'],
  ['沉默', '安静', '不说话', '静静', '静默'],
  ['约会', '见面', '相聚', '碰面', '一起出去'],
  ['毯子', '毛毯', '被子', '盖毯'],
  ['热饮', '咖啡', '茶', '奶茶', '热茶', '热咖啡'],
  ['未来', '以后', '将来', '长远', '明天'],
  ['结婚', '婚姻', '嫁娶', '成家', '步入婚姻', '领证', '婚礼'],
  ['孩子', '宝宝', '小孩', '儿女', '子女', '生育'],
  ['家', '家庭', '家人', '家里', '归属'],
  ['安全感', '安心', '踏实', '放心', '依靠', '依赖'],
  ['自由', '独立', '空间', '独处', '自我'],
  ['理解', '懂', '体谅', '包容', '明白', '懂我', '懂得'],
  ['支持', '鼓励', '撑腰', '陪伴', '后盾'],
  ['信任', '相信', '信赖', '不疑'],
  ['惊喜', '意外', '小惊喜', '浪漫'],
  // 新增：关系情感核心概念
  ['感情', '情感', '情意', '爱意', '爱', '情'],
  ['温度', '温暖', '暖意', '热度', '温情', '暖心', '热络'],
  ['手工', '亲手', '创造', '制作', '动手'],
  ['科技', '手机', '视频', '网络', '线上', '屏幕'],
  ['远距离', '远程', '距离', '异地', '异国'],
  ['日常', '每天', '天天', '日子', '生活', '点滴'],
  ['分享', '交流', '倾诉', '表达', '传递'],
  ['心意', '真诚', '用心', '走心', '认真', '真心', '诚意'],
  ['沉浸', '投入', '专注', '全身心', '沉浸感'],
  ['纽带', '连接', '连结', '链接', '联系', '联结'],
  ['牵挂', '惦念', '惦记', '想念', '思念', '挂念'],
  ['互动', '接触', '相处', '来往', '交往'],
  ['增进', '加深', '促进', '提升', '增强', '加强'],
  ['表达', '表达方式', '方式', '说法', '表述'],
  ['珍视', '看重', '重视', '在乎', '珍惜', '看重'],
];

/** 同义词/近义词集合：英文 */
const SYNONYM_GROUPS_EN: string[][] = [
  ['sea', 'ocean', 'beach', 'coast', 'seaside', 'shore'],
  ['sunset', 'sunrise', 'dusk', 'twilight', 'evening'],
  ['quiet', 'peaceful', 'calm', 'silent', 'serene'],
  ['romantic', 'sweet', 'warm', 'intimate', 'loving'],
  ['companionship', 'company', 'together', 'accompany', 'stay'],
  ['chat', 'talk', 'conversation', 'speak', 'dialogue'],
  ['future', 'later', 'tomorrow', 'plan ahead'],
  ['marriage', 'wedding', 'married', 'spouse'],
  ['kids', 'children', 'baby', 'family'],
  ['home', 'family', 'household'],
  ['trust', 'believe', 'rely', 'confide'],
  ['support', 'encourage', 'back', 'stand by'],
  ['understand', 'empathize', 'get it', 'comprehend'],
];

/** 创建词 → 同义组 ID 的映射 */
function buildSynonymMap(groups: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  groups.forEach((group, id) => {
    group.forEach((word) => map.set(word, id));
  });
  return map;
}

const SYNONYM_MAP_CN = buildSynonymMap(SYNONYM_GROUPS_CN);
const SYNONYM_MAP_EN = buildSynonymMap(SYNONYM_GROUPS_EN);

function getSynonymId(word: string): number | null {
  return SYNONYM_MAP_CN.get(word) ?? SYNONYM_MAP_EN.get(word) ?? null;
}

// ---------------- 抽象概念检测层 ----------------
// 当两个回答用完全不同的具体表达描述同一抽象关系价值时，
// 字面/同义词匹配会漏掉。概念层将具体词汇映射到抽象类别，
// 共享同一类别即视为部分语义相似。

const CONCEPT_CATEGORIES: Record<string, string[]> = {
  '情感连接': ['感情', '情感', '情意', '爱意', '爱', '纽带', '连接', '连结', '联系', '联结', '羁绊', '情结', '依恋'],
  '牵挂惦念': ['牵挂', '惦念', '惦记', '想念', '思念', '挂念', '惦'],
  '温暖温度': ['温度', '温暖', '暖意', '热度', '温情', '暖心', '热络', '暖'],
  '互动相处': ['互动', '接触', '相处', '来往', '交往', '交流', '沟通'],
  '陪伴相守': ['陪伴', '相守', '陪着', '陪', '在身边', '一起', '同在'],
  '创造手工': ['手工', '亲手', '创造', '制作', '动手', 'DIY'],
  '科技媒介': ['科技', '手机', '视频', '网络', '线上', '屏幕', '电话'],
  '距离异地': ['远距离', '远程', '距离', '异地', '异国', '隔'],
  '日常分享': ['日常', '每天', '天天', '日子', '生活', '点滴', '分享'],
  '心意真诚': ['心意', '真诚', '用心', '走心', '认真', '真心', '诚意'],
  '沉浸投入': ['沉浸', '投入', '专注', '全身心', '沉浸感'],
  '安全感依靠': ['安全感', '安心', '踏实', '放心', '依靠', '依赖', '归属'],
  '理解包容': ['理解', '懂', '体谅', '包容', '明白', '懂得'],
  '信任信赖': ['信任', '相信', '信赖', '不疑'],
  '未来规划': ['未来', '以后', '将来', '长远', '明天', '规划', '计划'],
  '浪漫甜蜜': ['浪漫', '甜蜜', '温馨', '柔情', '亲密'],
  '自由空间': ['自由', '独立', '空间', '独处', '自我'],
  '增进加深': ['增进', '加深', '促进', '提升', '增强', '加强'],
  '珍视看重': ['珍视', '看重', '重视', '在乎', '珍惜'],
  '表达方式': ['表达', '方式', '说法', '表述', '表达方式'],
};

/** 构建 词 → 概念类别 集合 的映射 */
const WORD_TO_CONCEPTS: Map<string, Set<string>> = (() => {
  const map = new Map<string, Set<string>>();
  for (const [category, words] of Object.entries(CONCEPT_CATEGORIES)) {
    for (const w of words) {
      if (!map.has(w)) map.set(w, new Set());
      map.get(w)!.add(category);
    }
  }
  return map;
})();

/** 检测一段文本命中了哪些抽象概念 */
function detectConcepts(words: string[]): Set<string> {
  const concepts = new Set<string>();
  for (const w of words) {
    const cats = WORD_TO_CONCEPTS.get(w);
    if (cats) cats.forEach((c) => concepts.add(c));
  }
  return concepts;
}

/** 计算两个回答的语义相似度（0-100） */
export function calculateSimilarity(answerA: string, answerB: string): number {
  const a = answerA.trim();
  const b = answerB.trim();
  if (!a || !b) return 0;

  const wordsA = extractWords(a);
  const wordsB = extractWords(b);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  // 1. 字面重叠（去重后）
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const literalOverlap = new Set<string>();
  setA.forEach((w) => {
    if (setB.has(w)) literalOverlap.add(w);
  });

  // 2. 同义词/近义词重叠
  const synonymOverlapA = new Map<number, string>();
  const synonymOverlapB = new Map<number, string>();
  setA.forEach((w) => {
    const id = getSynonymId(w);
    if (id !== null) synonymOverlapA.set(id, w);
  });
  setB.forEach((w) => {
    const id = getSynonymId(w);
    if (id !== null) synonymOverlapB.set(id, w);
  });
  const semanticMatches = new Set<number>();
  synonymOverlapA.forEach((_, id) => {
    if (synonymOverlapB.has(id)) semanticMatches.add(id);
  });

  // 3. 关键词加权：场景/情感/动作类词命中权重更高
  const weightFor = (word: string): number => {
    if (getSynonymId(word) !== null) return 1.4;
    if (/海边|日落|宁静|浪漫|陪伴|未来|婚姻|孩子|家|信任|理解|支持|自由|安全感|约会|沉默|聊天/.test(word)) return 1.3;
    if (/sea|ocean|beach|sunset|quiet|romantic|future|marriage|kids|trust|support|understand|home/.test(word)) return 1.3;
    return 1.0;
  };

  // 计算加权并集与加权交集
  let weightedUnion = 0;
  let weightedIntersection = 0;

  const counted = new Set<string | number>();

  setA.forEach((w) => {
    const weight = weightFor(w);
    weightedUnion += weight;
    if (literalOverlap.has(w) || semanticMatches.has(getSynonymId(w) ?? -1)) {
      weightedIntersection += weight;
    }
    counted.add(w);
  });

  setB.forEach((w) => {
    if (counted.has(w)) return;
    const weight = weightFor(w);
    weightedUnion += weight;
  });

  // 额外：长度比例相似度（防止一人写长篇、一人写极简导致偏差过大）
  const lengthRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);

  if (weightedUnion === 0) return 0;
  const tokenSimilarity = (weightedIntersection / weightedUnion) * 100;
  // 融入长度比例：最多上下浮动 15%
  const tokenAdjusted = tokenSimilarity * (0.85 + 0.15 * lengthRatio);

  // 4. 抽象概念层匹配
  // 当字面/同义词匹配为 0 或极低时，检测双方是否共享抽象关系概念。
  // 例如 A 说"手工增进感情"，B 说"科技维持情感纽带"——字面无重叠，
  // 但双方都涉及「情感连接」概念，应给予基础相似度。
  const conceptsA = detectConcepts(wordsA);
  const conceptsB = detectConcepts(wordsB);
  const sharedConcepts = new Set<string>();
  conceptsA.forEach((c) => {
    if (conceptsB.has(c)) sharedConcepts.add(c);
  });

  // 每个共享概念给予 22% 基础分，最多累积到 66%
  // （概念匹配不如字面匹配精确，封顶 66% 以保留区分度）
  const conceptScore = Math.min(66, sharedConcepts.size * 22);

  // 取字面相似度和概念相似度的较大值
  // 但如果字面已有较高分（≥30），说明已有实质重叠，概念层只做微调
  let finalSimilarity: number;
  if (tokenAdjusted >= 30) {
    // 字面已有一定匹配，概念层作为补充（最多 +10%）
    finalSimilarity = tokenAdjusted + Math.min(10, conceptScore * 0.15);
  } else {
    // 字面匹配低，以概念层为主要依据
    finalSimilarity = Math.max(tokenAdjusted, conceptScore);
  }

  // 长度差异过大时适度下调（一方极简一方详述时概念可能偶然重合）
  if (lengthRatio < 0.3 && conceptScore > 0 && tokenAdjusted < 10) {
    finalSimilarity *= 0.7;
  }

  return Math.min(100, Math.round(finalSimilarity));
}

// ---------------- 规则引擎洞察 ----------------

export function generateABInsights(answerA: string, answerB: string, region: MapArea): ABInsights {
  const similarity = calculateSimilarity(answerA, answerB);
  return {
    resonance: similarity >= AB_INSIGHT_THRESHOLD ? '你们对这个问题有明显重叠的理解。' : '你们的答案之间出现了值得继续看的差异。',
    difference: similarity >= AB_INSIGHT_THRESHOLD ? '差异不大，更多是表达方式不同。' : '对方真实表达和你的猜测之间存在距离。',
    emotion: region === 'forest' ? '情绪被更明确地看见了。' : '关系地图出现了新的信号。',
    suggestion: similarity >= AB_INSIGHT_THRESHOLD ? '可以继续追问一个更具体的细节。' : '不要急着解释，先问问对方为什么这样想。',
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
  const mismatchScore = input.similarity < AB_MISMATCH_THRESHOLD ? 30 : input.similarity < 55 ? 18 : 8;
  const momentScore = input.hasMoment ? 14 : 6;
  const triggerScore = stageScore + goalScore + mismatchScore + momentScore;
  return {
    trigger: triggerScore >= MIRROR_SIGNAL_TRIGGER_SCORE,
    triggerScore,
    probability: Math.min(99, triggerScore),
    stageScore,
    goalScore,
    mismatchScore,
    momentScore,
    stage: input.stage ?? '',
    goal: input.goal ?? '',
    forceTrigger: false,
    reason: triggerScore >= MIRROR_SIGNAL_TRIGGER_SCORE ? 'mirror-unlocked' : 'continue-route',
    nextMemorySeed: input.similarity < AB_MISMATCH_THRESHOLD ? '你以为的，和对方真实表达之间出现了差异。' : '你们的理解正在接近。',
  };
}
