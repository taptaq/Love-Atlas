import type { JourneyGoal, JourneyQuestion, LocalizedText, MapArea, PresentMomentState, QuestionType, RelationshipStage } from '../types';

interface QuestionTemplate {
  question: string;
  hint: string;
  emotion: string;
}

interface MatrixEntry {
  region: MapArea;
  type: QuestionType;
  templates: QuestionTemplate[];
}

type LegacyStage = 'ambiguous' | 'love' | 'long_term' | 'long_distance' | 'reconnect';
type LegacyGoal = 'understand' | 'rediscover' | 'express' | 'future' | 'reconnect';

export const STAGES: Record<LegacyStage, { cn: string; en: string }> = {
  ambiguous: { cn: '暧昧期', en: 'Ambiguous' },
  love: { cn: '热恋期', en: 'In Love' },
  long_term: { cn: '长期关系', en: 'Long Term' },
  long_distance: { cn: '异地恋', en: 'Long Distance' },
  reconnect: { cn: '重新靠近', en: 'Reconnect' },
};

export const GOALS: Record<LegacyGoal, { cn: string; en: string }> = {
  understand: { cn: '了解彼此', en: 'Understand Each Other' },
  rediscover: { cn: '重新发现', en: 'Rediscover' },
  express: { cn: '表达期待', en: 'Express Expectations' },
  future: { cn: '探索未来', en: 'Explore Future' },
  reconnect: { cn: '重新靠近', en: 'Reconnect' },
};

export const REGIONS: Record<MapArea, { cn: string; en: string; icon: string }> = {
  forest: { cn: '情绪森林', en: 'Emotion Forest', icon: '🌲' },
  coast: { cn: '回忆海岸', en: 'Memory Coast', icon: '🌊' },
  valley: { cn: '日常山谷', en: 'Daily Valley', icon: '🏡' },
  city: { cn: '未来之城', en: 'Future City', icon: '🏙' },
  garden: { cn: '边界花园', en: 'Boundary Garden', icon: '🌸' },
};

export const QUESTION_TYPES: Record<QuestionType, { cn: string; en: string }> = {
  guess: { cn: '猜测模式', en: 'Guess Mode' },
  mirror: { cn: '镜像模式', en: 'Mirror Mode' },
  choice: { cn: '选择模式', en: 'Choice Mode' },
  sync: { cn: '同步模式', en: 'Sync Mode' },
};

const WORLD_EFFECTS: Record<string, { message: string; unlock: string }> = {
  curious: { message: '🌊 回忆波纹已开启', unlock: 'ripple' },
  safe: { message: '🌲 柔光路径已开启', unlock: 'path' },
  hopeful: { message: '🏙 星光街区已开启', unlock: 'starlight' },
  nostalgic: { message: '🌊 时光涟漪已开启', unlock: 'time_ripple' },
  emotional: { message: '🌲 心灵树洞已开启', unlock: 'cave' },
  romantic: { message: '🌸 花语小径已开启', unlock: 'flower_path' },
  fresh: { message: '🏡 晨光庭院已开启', unlock: 'courtyard' },
  joyful: { message: '🏙 欢庆广场已开启', unlock: 'square' },
};

const MOMENT_SCENE_MAP: Record<string, { region: MapArea; emotion: string; cn: string; en: string; prefix: string }> = {
  coffee: { region: 'coast', emotion: 'nostalgic', cn: '咖啡', en: 'Coffee', prefix: '在这个咖啡香气里' },
  cafe: { region: 'coast', emotion: 'nostalgic', cn: '咖啡馆', en: 'Cafe', prefix: '在这个咖啡馆里' },
  night: { region: 'forest', emotion: 'emotional', cn: '夜晚', en: 'Night', prefix: '在今晚这个瞬间' },
  travel: { region: 'city', emotion: 'hopeful', cn: '旅行', en: 'Travel', prefix: '在旅途中' },
  home: { region: 'valley', emotion: 'safe', cn: '家', en: 'Home', prefix: '在这个家的氛围里' },
  room: { region: 'forest', emotion: 'safe', cn: '房间', en: 'Room', prefix: '在这个安静空间里' },
  street: { region: 'city', emotion: 'fresh', cn: '街上', en: 'Street', prefix: '在移动的路上' },
  conflict: { region: 'garden', emotion: 'curious', cn: '争执', en: 'Conflict', prefix: '在这个当下' },
  sunset: { region: 'coast', emotion: 'romantic', cn: '日落', en: 'Sunset', prefix: '在日落时分' },
  morning: { region: 'valley', emotion: 'fresh', cn: '清晨', en: 'Morning', prefix: '在这个清晨' },
  celebration: { region: 'city', emotion: 'joyful', cn: '庆祝', en: 'Celebration', prefix: '在这个庆祝时刻' },
};

const QUESTION_MATRIX: Record<LegacyStage, Record<LegacyGoal, MatrixEntry>> = {
  ambiguous: {
    understand: { region: 'forest', type: 'guess', templates: [
      { question: '最近有没有什么小事让你想分享给我？', hint: '从日常小事开始，感受彼此的存在', emotion: 'curious' },
      { question: '你觉得我们之间最自然的相处方式是什么？', hint: '关注当下的感受，不需要定义', emotion: 'safe' },
      { question: '有什么是你想了解但还没机会问我的？', hint: '好奇心是靠近的桥梁', emotion: 'curious' },
    ] },
    rediscover: { region: 'coast', type: 'mirror', templates: [
      { question: '如果用一个词形容我们现在的状态，你会选什么？', hint: '不必急着定义，感受当下的氛围', emotion: 'nostalgic' },
      { question: '最近一次让你想起我是什么时候？', hint: '分享那些不经意的瞬间', emotion: 'romantic' },
    ] },
    express: { region: 'valley', type: 'sync', templates: [
      { question: '你期待我们接下来会怎样发展？', hint: '表达期待不是压力，是邀请', emotion: 'hopeful' },
      { question: '有什么是你希望在关系中慢慢建立的？', hint: '从小期待开始，让关系自然生长', emotion: 'hopeful' },
    ] },
    future: { region: 'city', type: 'mirror', templates: [
      { question: '如果未来我们成为彼此生活的一部分，你最期待什么？', hint: '想象未来是了解彼此的方式', emotion: 'hopeful' },
      { question: '你觉得我们会有怎样的故事？', hint: '让想象力自由飞翔', emotion: 'curious' },
    ] },
    reconnect: { region: 'garden', type: 'choice', templates: [
      { question: '你觉得我们现在最需要什么？', hint: '倾听内心的声音', emotion: 'safe' },
      { question: '有什么是你想让我知道的？', hint: '真诚表达会拉近彼此', emotion: 'emotional' },
    ] },
  },
  love: {
    understand: { region: 'forest', type: 'mirror', templates: [
      { question: '最近有没有什么瞬间让你觉得“就是你了”？', hint: '分享那些心动的时刻', emotion: 'romantic' },
      { question: '你最喜欢我们在一起的哪种状态？', hint: '关注让彼此舒适的相处模式', emotion: 'joyful' },
    ] },
    rediscover: { region: 'coast', type: 'guess', templates: [
      { question: '如果重新认识彼此，你觉得最吸引你的是什么？', hint: '从新的视角看熟悉的人', emotion: 'nostalgic' },
      { question: '最近有什么让你重新认识我的小事？', hint: '发现彼此新的面貌', emotion: 'curious' },
    ] },
    express: { region: 'valley', type: 'sync', templates: [
      { question: '你最近最想被我怎样在乎？', hint: '爱的表达可以很具体', emotion: 'romantic' },
      { question: '有什么是你想为我们的关系做的？', hint: '行动是很好的表达', emotion: 'joyful' },
    ] },
    future: { region: 'city', type: 'choice', templates: [
      { question: '如果安排一次只属于我们的未来小计划，你会想做什么？', hint: '让未来变得具体一点', emotion: 'hopeful' },
      { question: '你希望我们一起养成什么新的关系习惯？', hint: '未来也可以从习惯开始', emotion: 'fresh' },
    ] },
    reconnect: { region: 'garden', type: 'mirror', templates: [
      { question: '当我们很靠近时，你最需要我注意什么边界？', hint: '亲密和边界可以同时存在', emotion: 'safe' },
      { question: '哪一种靠近会让你觉得舒服？', hint: '具体说出舒服的方式', emotion: 'romantic' },
    ] },
  },
  long_term: {
    understand: { region: 'forest', type: 'mirror', templates: [
      { question: '最近你有没有什么感受，是觉得我可能没注意到的？', hint: '熟悉也需要重新看见', emotion: 'emotional' },
      { question: '在这段关系里，你最近最真实的状态是什么？', hint: '不用修饰，说出此刻的你', emotion: 'safe' },
    ] },
    rediscover: { region: 'coast', type: 'guess', templates: [
      { question: '如果回看我们一路走来，哪一段最近让你有新感受？', hint: '旧时刻也会长出新意义', emotion: 'nostalgic' },
      { question: '你觉得我这些年最大的变化是什么？', hint: '从熟悉里重新发现', emotion: 'curious' },
    ] },
    express: { region: 'garden', type: 'sync', templates: [
      { question: '最近有什么需要，是你希望我们重新协调的？', hint: '需求可以被温柔说出来', emotion: 'safe' },
      { question: '你希望我在哪件小事上更理解你？', hint: '从具体的小事开始', emotion: 'emotional' },
    ] },
    future: { region: 'city', type: 'choice', templates: [
      { question: '未来一年，你希望我们关系里有什么新的生长？', hint: '共同方向需要被说出口', emotion: 'hopeful' },
      { question: '有哪些计划，是你希望我们一起认真讨论的？', hint: '让未来进入今天', emotion: 'hopeful' },
    ] },
    reconnect: { region: 'valley', type: 'sync', templates: [
      { question: '日常里哪件事，能让你重新感觉我们在一起？', hint: '亲密藏在重复的小事里', emotion: 'safe' },
      { question: '如果给最近的我们加一点新鲜感，你会选什么？', hint: '熟悉也可以重新开始', emotion: 'fresh' },
    ] },
  },
  long_distance: {
    understand: { region: 'forest', type: 'mirror', templates: [
      { question: '距离里，最近你最希望我理解你的哪种感受？', hint: '把没被看见的部分说出来', emotion: 'emotional' },
      { question: '不在彼此身边时，什么会让你觉得被陪伴？', hint: '陪伴也可以有不同形式', emotion: 'safe' },
    ] },
    rediscover: { region: 'coast', type: 'guess', templates: [
      { question: '最近哪一刻，你突然很想念我们在一起的某个画面？', hint: '让想念有一个具体画面', emotion: 'nostalgic' },
      { question: '你觉得距离让你重新认识了我哪一点？', hint: '距离也会带来新的理解', emotion: 'curious' },
    ] },
    express: { region: 'valley', type: 'sync', templates: [
      { question: '最近的生活里，哪一件事你最想同步给我？', hint: '同步是异地里的日常连接', emotion: 'safe' },
      { question: '你希望我用什么方式让你更安心？', hint: '说出可执行的安心方式', emotion: 'emotional' },
    ] },
    future: { region: 'city', type: 'choice', templates: [
      { question: '想到下一次见面，你最期待哪个瞬间？', hint: '把未来的见面变得具体', emotion: 'hopeful' },
      { question: '为了更靠近，我们接下来可以一起做哪件小事？', hint: '未来可以从小行动开始', emotion: 'fresh' },
    ] },
    reconnect: { region: 'garden', type: 'mirror', templates: [
      { question: '距离带来的不安里，哪一部分最需要被理解？', hint: '不安不是责备，是线索', emotion: 'emotional' },
      { question: '我们怎样表达边界，才不会让对方觉得疏远？', hint: '边界也能保护连接', emotion: 'safe' },
    ] },
  },
  reconnect: {
    understand: { region: 'forest', type: 'mirror', templates: [
      { question: '如果重新靠近，你最希望我先理解什么？', hint: '重新开始需要一个入口', emotion: 'emotional' },
      { question: '现在的你，和过去相比最想被怎样对待？', hint: '变化值得被看见', emotion: 'safe' },
    ] },
    rediscover: { region: 'coast', type: 'guess', templates: [
      { question: '如果回看我们之间的旧故事，你希望保留哪一部分？', hint: '不是回到过去，而是带着过去往前', emotion: 'nostalgic' },
      { question: '你觉得我们还有哪一面值得重新认识？', hint: '熟悉之外还有新的可能', emotion: 'curious' },
    ] },
    express: { region: 'garden', type: 'sync', templates: [
      { question: '重新靠近时，什么节奏会让你觉得安全？', hint: '节奏比速度更重要', emotion: 'safe' },
      { question: '有什么话你希望这次可以被认真听见？', hint: '把重要的话放到桌面上', emotion: 'emotional' },
    ] },
    future: { region: 'city', type: 'choice', templates: [
      { question: '如果这次重新开始，你希望我们走向哪里？', hint: '方向可以先从愿望开始', emotion: 'hopeful' },
      { question: '未来的关系里，你最不想重复什么？', hint: '看清过去，是为了更好往前', emotion: 'curious' },
    ] },
    reconnect: { region: 'valley', type: 'sync', templates: [
      { question: '哪一个日常动作，会让你觉得我们正在重新靠近？', hint: '靠近可以很小，但很真实', emotion: 'fresh' },
      { question: '你希望我们从哪件小事重新开始？', hint: '小事可以打开新入口', emotion: 'safe' },
    ] },
  },
};

const stageMap: Record<RelationshipStage, LegacyStage> = {
  new: 'ambiguous',
  dating: 'love',
  'long-term': 'long_term',
  'long-distance': 'long_distance',
};

const goalMap: Partial<Record<JourneyGoal, LegacyGoal>> = {
  know: 'understand',
  icebreak: 'understand',
  common: 'rediscover',
  connect: 'understand',
  fresh: 'rediscover',
  deep: 'express',
  bedtime: 'express',
  warm: 'express',
  refresh: 'rediscover',
  habit: 'reconnect',
  needs: 'express',
  review: 'rediscover',
  maintain: 'reconnect',
  sync: 'express',
  miss: 'rediscover',
  future: 'future',
  understand: 'understand',
  rediscover: 'rediscover',
  express: 'express',
  reconnect: 'reconnect',
  boundary: 'reconnect',
  connection: 'understand',
  freshness: 'rediscover',
  'late-night-chat': 'express',
};

export interface GenerateQuestionInput {
  stage: RelationshipStage | null;
  goal: JourneyGoal | null;
  areas: MapArea[];
  currentQuestionIndex: number;
  moment?: PresentMomentState;
  history?: string[];
}

export function generateQuestion(input: GenerateQuestionInput): JourneyQuestion {
  const legacyStage = input.stage ? stageMap[input.stage] : 'ambiguous';
  const legacyGoal = input.goal ? goalMap[input.goal] ?? 'understand' : 'understand';
  const matrixEntry = QUESTION_MATRIX[legacyStage][legacyGoal];
  const templates = avoidRepeat(matrixEntry.templates, input.history ?? []);
  const selected = templates[input.currentQuestionIndex % templates.length];
  const areaOverride = input.areas[input.currentQuestionIndex % Math.max(input.areas.length, 1)];
  let questionData: JourneyQuestion = {
    ...selected,
    region: areaOverride ?? matrixEntry.region,
    type: matrixEntry.type,
  };

  if (input.moment && (input.moment.scene || input.moment.text || input.moment.imageTags.length > 0)) {
    questionData = enhanceWithMoment(questionData, input.moment);
  }

  const reason = generateReason(legacyStage, legacyGoal, input.moment, questionData.region);
  const worldEffect = generateWorldEffect(questionData.emotion);
  return {
    ...questionData,
    localized: localizeQuestion(questionData.question),
    localizedHint: localizeHint(questionData.hint),
    localizedReason: reason,
    reason: reason.cn,
    worldEffect,
  };
}

function enhanceWithMoment(questionData: JourneyQuestion, moment: PresentMomentState): JourneyQuestion {
  const sceneMap = moment.scene ? MOMENT_SCENE_MAP[moment.scene] : undefined;
  let question = questionData.question;
  const momentPhrase = getMomentPhrase(moment);
  if (sceneMap && !question.includes(sceneMap.prefix)) {
    question = question.replace(/^(如果|最近|有什么|你觉得|想到|当|哪)/, `$1${sceneMap.prefix}，`);
  } else if (momentPhrase && !question.includes(momentPhrase)) {
    question = `从「${momentPhrase}」这个此刻出发，${question}`;
  }

  let emotion = sceneMap?.emotion ?? questionData.emotion;
  if (moment.imageTags.includes('daily')) emotion = 'safe';
  if (moment.imageTags.includes('memory')) emotion = 'nostalgic';
  if (moment.imageTags.includes('future')) emotion = 'hopeful';
  if (moment.imageTags.includes('conflict')) emotion = 'curious';

  return {
    ...questionData,
    question,
    emotion,
    region: moment.routeInfluence?.primaryArea ?? sceneMap?.region ?? questionData.region,
  };
}

function getMomentPhrase(moment: PresentMomentState) {
  const source = moment.text || moment.imageCaption;
  if (!source.trim()) return '';
  return source.trim().replace(/\s+/g, ' ').slice(0, 24);
}

function avoidRepeat(templates: QuestionTemplate[], history: string[]): QuestionTemplate[] {
  if (history.length === 0) return templates;
  const recent = new Set(history.slice(-5));
  const filtered = templates.filter((item) => !recent.has(item.question));
  return filtered.length > 0 ? filtered : templates;
}

function generateReason(stage: LegacyStage, goal: LegacyGoal, moment: PresentMomentState | undefined, region: MapArea): LocalizedText {
  const cnParts = [`${STAGES[stage].cn} × ${GOALS[goal].cn}`, `${REGIONS[region].icon} ${REGIONS[region].cn}`];
  const enParts = [`${STAGES[stage].en} × ${GOALS[goal].en}`, `${REGIONS[region].icon} ${REGIONS[region].en}`];
  if (moment?.scene) {
    cnParts.push(MOMENT_SCENE_MAP[moment.scene]?.cn ?? moment.scene);
    enParts.push(MOMENT_SCENE_MAP[moment.scene]?.en ?? moment.scene);
  }
  if (moment?.imageTags.length) {
    const tags = moment.imageTags.map((tag) => `#${tag}`).join(' ');
    cnParts.push(tags);
    enParts.push(tags);
  }
  return { cn: cnParts.join(' × '), en: enParts.join(' × ') };
}

export function generateWorldEffect(emotion: string): { message: string; unlock: string; localizedMessage: LocalizedText } {
  const effect = WORLD_EFFECTS[emotion] ?? WORLD_EFFECTS.curious;
  return { ...effect, localizedMessage: localizeWorldEffect(effect.message) };
}

function localizeQuestion(question: string): LocalizedText {
  const enMap: Record<string, string> = {
    '最近有没有什么小事让你想分享给我？': 'Is there a small recent moment you wanted to share with me?',
    '你觉得我们之间最自然的相处方式是什么？': 'What feels like the most natural way for us to be together?',
    '有什么是你想了解但还没机会问我的？': 'What have you wanted to ask me but have not had the chance to?',
    '如果用一个词形容我们现在的状态，你会选什么？': 'If you described where we are now in one word, what would it be?',
    '最近一次让你想起我是什么时候？': 'When was the last time something made you think of me?',
    '最近你有没有什么感受，是觉得我可能没注意到的？': 'Is there a recent feeling you think I may not have noticed?',
    '在这段关系里，你最近最真实的状态是什么？': 'What is your most honest state in this relationship recently?',
    '如果回看我们一路走来，哪一段最近让你有新感受？': 'Looking back at our path, which part feels different to you now?',
    '距离里，最近你最希望我理解你的哪种感受？': 'Across the distance, what feeling do you most hope I understand?',
    '最近的生活里，哪一件事你最想同步给我？': 'What part of your recent life do you most want to sync with me?',
    '想到下一次见面，你最期待哪个瞬间？': 'When you imagine our next meeting, which moment do you look forward to most?',
    '如果重新靠近，你最希望我先理解什么？': 'If we move closer again, what do you most want me to understand first?',
    '重新靠近时，什么节奏会让你觉得安全？': 'When reconnecting, what pace would feel safe for you?',
  };
  return { cn: question, en: enMap[question] ?? toEnglishFallback(question) };
}

function localizeHint(hint: string): LocalizedText {
  const enMap: Record<string, string> = {
    '从日常小事开始，感受彼此的存在': 'Start from a small daily moment and notice each other’s presence.',
    '关注当下的感受，不需要定义': 'Focus on the present feeling; no need to define it yet.',
    '好奇心是靠近的桥梁': 'Curiosity can become a bridge toward closeness.',
    '不必急着定义，感受当下的氛围': 'Do not rush to define it; notice the atmosphere first.',
    '分享那些不经意的瞬间': 'Share those unplanned little moments.',
    '熟悉也需要重新看见': 'Even familiarity needs to be seen again.',
    '不用修饰，说出此刻的你': 'No need to polish it; say where you are now.',
    '旧时刻也会长出新意义': 'Old moments can grow new meaning.',
    '把没被看见的部分说出来': 'Name the part that has not been seen yet.',
    '同步是异地里的日常连接': 'Syncing is a daily connection across distance.',
    '把未来的见面变得具体': 'Make the future meeting more concrete.',
    '重新开始需要一个入口': 'A new beginning needs a gentle entry point.',
    '节奏比速度更重要': 'Pace matters more than speed.',
  };
  return { cn: hint, en: enMap[hint] ?? 'Answer from a specific moment rather than a general idea.' };
}

function localizeWorldEffect(message: string): LocalizedText {
  const enMap: Record<string, string> = {
    '🌊 回忆波纹已开启': '🌊 Memory ripples unlocked',
    '🌲 柔光路径已开启': '🌲 Soft-light path unlocked',
    '🏙 星光街区已开启': '🏙 Starlight district unlocked',
    '🌊 时光涟漪已开启': '🌊 Time ripples unlocked',
    '🌲 心灵树洞已开启': '🌲 Inner tree hollow unlocked',
    '🌸 花语小径已开启': '🌸 Flower-language path unlocked',
    '🏡 晨光庭院已开启': '🏡 Morning courtyard unlocked',
    '🏙 欢庆广场已开启': '🏙 Celebration square unlocked',
  };
  return { cn: message, en: enMap[message] ?? '✨ A new world effect has appeared' };
}

function toEnglishFallback(question: string): string {
  if (question.includes('未来')) return 'What future possibility do you want us to look at together?';
  if (question.includes('回看') || question.includes('过去') || question.includes('想念')) return 'Which shared memory feels important to revisit now?';
  if (question.includes('边界') || question.includes('需要')) return 'What need or boundary would you like to express more gently?';
  if (question.includes('日常') || question.includes('生活')) return 'Which daily moment would help us understand each other better?';
  return 'What is one honest thing you want the other person to understand today?';
}
