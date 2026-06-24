import type { EventType, LocalizedText, MapArea, QuestionType, RelationshipEvent } from '../types';
import { MIRROR_TRIGGER_SIMILARITY, HIGH_RESONANCE_SIMILARITY, FOREST_MIRROR_THRESHOLD } from '../features/relationship/journeyConfig';

function text(cn: string, en: string): LocalizedText {
  return { cn, en };
}

const regionEventMap: Record<MapArea, EventType> = {
  forest: 'mirror',
  coast: 'memory',
  valley: 'moment',
  city: 'future',
  garden: 'switch',
};

const eventTemplates: Record<Exclude<EventType, 'mirror'>, Omit<RelationshipEvent, 'timestamp' | 'unlockedByAI'>> = {
  memory: {
    type: 'memory',
    icon: '🌊',
    title: text('回忆海岸事件', 'Memory Coast Event'),
    description: text('一个过去的片段被带回了这次对话。', 'A past moment returns to this conversation.'),
    action: text('一起回看', 'Look Back Together'),
    question: text('如果重新回到那个时刻，你希望对方看见当时的你什么？', 'If you returned to that moment, what would you want them to see about you then?'),
  },
  switch: {
    type: 'switch',
    icon: '🔄',
    title: text('视角切换事件', 'Perspective Switch Event'),
    description: text('你们的差异适合换一个位置重新看。', 'Your difference is worth viewing from the other side.'),
    action: text('交换视角', 'Switch Perspectives'),
    question: text('如果你替对方解释这个答案，你会怎么说？', 'If you explained this answer for the other person, what would you say?'),
  },
  moment: {
    type: 'moment',
    icon: '📸',
    title: text('此刻记录事件', 'Present Moment Event'),
    description: text('此刻的场景正在改变这次旅程的方向。', 'The current scene is changing the direction of this journey.'),
    action: text('记录此刻', 'Record This Moment'),
    question: text('如果把现在保存成一张关系照片，它的标题会是什么？', 'If this moment became a relationship photo, what would its title be?'),
  },
  future: {
    type: 'future',
    icon: '🏙',
    title: text('未来之城事件', 'Future City Event'),
    description: text('未来的想象开始进入你们的对话。', 'An imagined future begins entering your conversation.'),
    action: text('看看以后', 'Look Ahead'),
    question: text('三个月后的你们，希望感谢今天的彼此做了什么？', 'Three months from now, what would you thank each other for doing today?'),
  },
  silence: {
    type: 'silence',
    icon: '🌙',
    title: text('安静事件', 'Silence Event'),
    description: text('不是所有靠近都需要立刻说话。', 'Not every kind of closeness needs immediate words.'),
    action: text('安静片刻', 'Hold Quiet'),
    question: text('如果此刻先不解释，你希望对方感受到什么？', 'If you did not explain yet, what would you want them to feel?'),
    duration: 30,
  },
};

export function createMirrorEvent(memorySeed: string): RelationshipEvent {
  return {
    type: 'mirror',
    icon: '🪞',
    title: text('镜像时刻', 'Mirror Moment'),
    description: text('你们的回答里出现了值得互相确认的差异。', 'Your answers revealed a difference worth checking together.'),
    action: text('进入镜像', 'Enter Mirror'),
    question: text(memorySeed || '如果站在对方的位置，你觉得 TA 真正想表达什么？', memorySeed || 'If you stood in their place, what do you think they truly meant?'),
    timestamp: new Date().toISOString(),
    unlockedByAI: true,
  };
}

export function generateRelationshipEvent(input: {
  region: MapArea;
  questionType: QuestionType;
  similarity: number;
  hasMoment: boolean;
  forceMirror?: boolean;
  memorySeed?: string;
}): RelationshipEvent | null {
  if (input.forceMirror) return createMirrorEvent(input.memorySeed ?? '');
  if (input.questionType === 'mirror' && input.similarity < MIRROR_TRIGGER_SIMILARITY) return createMirrorEvent(input.memorySeed ?? '');
  if (input.hasMoment && input.region === 'valley') return withRuntime(eventTemplates.moment);
  if (input.similarity > HIGH_RESONANCE_SIMILARITY && input.region !== 'city') return null;
  const eventType = regionEventMap[input.region];
  if (eventType === 'mirror') return input.similarity < FOREST_MIRROR_THRESHOLD ? createMirrorEvent(input.memorySeed ?? '') : null;
  if (eventType === 'future' && input.questionType !== 'choice') return null;
  return withRuntime(eventTemplates[eventType]);
}

function withRuntime(template: Omit<RelationshipEvent, 'timestamp' | 'unlockedByAI'>): RelationshipEvent {
  return {
    ...template,
    timestamp: new Date().toISOString(),
    unlockedByAI: true,
  };
}

export function createEventCompletionMessage(event: RelationshipEvent): LocalizedText {
  const messages: Record<EventType, LocalizedText> = {
    mirror: text('镜像事件已完成，差异被看见后会返回原旅程。', 'Mirror Event completed. The route continues after the difference is seen.'),
    memory: text('回忆被重新看见，关系世界的海岸留下了新的痕迹。', 'A memory was seen again, leaving a new trace on the coast.'),
    switch: text('视角已经交换，差异不再只是阻隔。', 'Perspectives were switched, and difference is no longer only distance.'),
    moment: text('此刻被记录下来，旅程带着现场感继续。', 'This moment was recorded, and the journey continues with context.'),
    future: text('未来被说出口后，方向感变得更清晰。', 'Once the future was spoken, direction became clearer.'),
    silence: text('安静也完成了一次靠近。', 'Quiet also completed a kind of closeness.'),
  };
  return messages[event.type];
}
