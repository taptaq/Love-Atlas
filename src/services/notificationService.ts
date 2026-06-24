import type { Language } from '../types';
import { generateAiReminder } from '../features/relationship/aiJourneyService';

export type ReminderFrequency = 'off' | 'daily' | 'every3days' | 'weekly';

interface ReminderState {
  frequency: ReminderFrequency;
  browserEnabled: boolean;
  lastExplorationAt: string | null;
  lastReminderAt: string | null;
  dismissedWeekKey: string | null;
}

const STORAGE_KEY = 'love-atlas-reminders';

const REMINDER_INTERVALS: Record<Exclude<ReminderFrequency, 'off'>, number> = {
  daily: 24 * 60 * 60 * 1000,
  every3days: 3 * 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

function defaultState(): ReminderState {
  return {
    frequency: 'off',
    browserEnabled: false,
    lastExplorationAt: null,
    lastReminderAt: null,
    dismissedWeekKey: null,
  };
}

function loadState(): ReminderState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<ReminderState>;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function saveState(state: ReminderState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function getReminderState(): ReminderState {
  return loadState();
}

export function setReminderFrequency(frequency: ReminderFrequency) {
  const state = loadState();
  saveState({ ...state, frequency });
}

export function setBrowserNotificationsEnabled(enabled: boolean) {
  const state = loadState();
  saveState({ ...state, browserEnabled: enabled });
}

export function recordExplorationCompleted() {
  const state = loadState();
  saveState({ ...state, lastExplorationAt: new Date().toISOString() });
}

export function getBrowserPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

function getWeekKey(date: Date = new Date()): string {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  return `${target.getFullYear()}-W${String(Math.ceil((target.valueOf() - new Date(target.getFullYear(), 0, 1).valueOf()) / 604800000)).padStart(2, '0')}`;
}

export interface ReminderContent {
  title: string;
  body: string;
  weekKey: string;
}

export function checkShouldRemind(date: Date = new Date()): ReminderContent | null {
  const state = loadState();
  if (state.frequency === 'off') return null;

  const now = date.getTime();
  const lastExploration = state.lastExplorationAt ? new Date(state.lastExplorationAt).getTime() : 0;
  const lastReminder = state.lastReminderAt ? new Date(state.lastReminderAt).getTime() : 0;
  const interval = REMINDER_INTERVALS[state.frequency];

  const sinceLastExploration = now - lastExploration;
  const sinceLastReminder = now - lastReminder;

  if (sinceLastExploration < interval && sinceLastReminder < interval) return null;

  const weekKey = getWeekKey(date);
  if (state.dismissedWeekKey === weekKey) return null;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'cn';
  const content = buildReminderContent(lang, sinceLastExploration, state.frequency);
  return { ...content, weekKey };
}

/**
 * 异步版本：优先用 AI 生成个性化提醒，失败回退到固定文案
 */
export async function checkShouldRemindAsync(
  params: {
    stage: string | null;
    lastGoal: string | null;
    history: string[];
  },
  date: Date = new Date(),
): Promise<ReminderContent | null> {
  const state = loadState();
  if (state.frequency === 'off') return null;

  const now = date.getTime();
  const lastExploration = state.lastExplorationAt ? new Date(state.lastExplorationAt).getTime() : 0;
  const lastReminder = state.lastReminderAt ? new Date(state.lastReminderAt).getTime() : 0;
  const interval = REMINDER_INTERVALS[state.frequency];

  const sinceLastExploration = now - lastExploration;
  const sinceLastReminder = now - lastReminder;

  if (sinceLastExploration < interval && sinceLastReminder < interval) return null;

  const weekKey = getWeekKey(date);
  if (state.dismissedWeekKey === weekKey) return null;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'cn';
  const days = Math.floor(sinceLastExploration / (24 * 60 * 60 * 1000));

  // 优先用 AI 生成个性化提醒
  try {
    const aiResult = await generateAiReminder({
      days,
      stage: params.stage as never,
      lastGoal: params.lastGoal as never,
      history: params.history.slice(-3),
    });
    return {
      title: lang === 'cn' ? aiResult.title.cn : aiResult.title.en,
      body: lang === 'cn' ? aiResult.body.cn : aiResult.body.en,
      weekKey,
    };
  } catch {
    // 回退到固定文案
    const content = buildReminderContent(lang, sinceLastExploration, state.frequency);
    return { ...content, weekKey };
  }
}

function buildReminderContent(lang: Language, sinceLastExploration: number, frequency: ReminderFrequency): Omit<ReminderContent, 'weekKey'> {
  const days = Math.floor(sinceLastExploration / (24 * 60 * 60 * 1000));
  const cn = lang === 'cn';

  if (days === 0 || sinceLastExploration === 0) {
    return {
      title: cn ? '今天还没有聊聊心事' : 'No heart-to-heart today yet',
      body: cn ? '花几分钟，和对方来一次轻松的探索吧。' : 'Take a few minutes for a light exploration together.',
    };
  }

  if (days === 1) {
    return {
      title: cn ? '昨天聊得不错，今天继续吗？' : 'Yesterday went well — continue today?',
      body: cn ? '保持每天一点点，关系会慢慢长出新东西。' : 'A little each day helps your relationship grow something new.',
    };
  }

  if (days <= 3) {
    return {
      title: cn ? `已经 ${days} 天没有探索了` : `It has been ${days} days since your last exploration`,
      body: cn ? '不用很长，一次小小的对话就够。' : 'It does not need to be long — one small conversation is enough.',
    };
  }

  if (days <= 7) {
    return {
      title: cn ? `快一周没聊了（${days} 天）` : `Almost a week (${days} days)`,
      body: cn ? '这周的主题盲盒已经更新，来看看推荐聊什么。' : 'This week’s blind box is refreshed — see what to talk about.',
    };
  }

  return {
    title: cn ? `已经 ${days} 天了，该回来了` : `It has been ${days} days — time to come back`,
    body: cn ? '关系像植物，需要一点点水。今天来一次就好。' : 'Relationships are like plants — a little water today is enough.',
  };
}

export function markReminderDismissed(weekKey: string) {
  const state = loadState();
  saveState({ ...state, lastReminderAt: new Date().toISOString(), dismissedWeekKey: weekKey });
}

export function sendBrowserNotification(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.svg', tag: 'love-atlas-reminder' });
  } catch {
    // ignore notification errors
  }
}
