import type { JourneyGoal, RelationshipStage } from '../types';

const MEMORY_STORAGE_KEY = 'loveAtlasConversationMemory';
const MAX_ENTRIES = 10;

// 单次探索的记忆条目
export interface ConversationMemoryEntry {
  date: string;              // ISO 时间戳
  stage: RelationshipStage;
  goal: JourneyGoal;
  questionCount: number;
  avgSimilarity: number;     // 0-100
  // 前 3 题的问题摘要
  topQuestions: string[];
  // 来自总结的核心共鸣洞察
  keyInsight: string;
}

export interface ConversationMemory {
  entries: ConversationMemoryEntry[];
}

export function loadConversationMemory(): ConversationMemory {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as Partial<ConversationMemory>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    return { entries: entries.slice(-MAX_ENTRIES) };
  } catch {
    return { entries: [] };
  }
}

// 添加一次探索的记忆，自动限制条目数
export function saveConversationMemoryEntry(entry: ConversationMemoryEntry): void {
  try {
    const memory = loadConversationMemory();
    memory.entries.push(entry);
    // 保留最近 MAX_ENTRIES 条
    if (memory.entries.length > MAX_ENTRIES) {
      memory.entries = memory.entries.slice(-MAX_ENTRIES);
    }
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // localStorage 不可用时静默失败
  }
}

// 清空记忆（用于重置/解绑空间时）
export function clearConversationMemory(): void {
  try {
    localStorage.removeItem(MEMORY_STORAGE_KEY);
  } catch {
    // 静默失败
  }
}

// 获取记忆摘要（用于传给 AI prompt）
// 返回最近 N 次探索的简短文本摘要
export function getMemorySummaryForPrompt(limit = 5): string {
  const memory = loadConversationMemory();
  if (memory.entries.length === 0) return '';

  const recent = memory.entries.slice(-limit);
  const lines = recent.map((entry, idx) => {
    const date = entry.date.slice(0, 10);
    const questions = entry.topQuestions.slice(0, 2).map((q) => `"${q.slice(0, 30)}"`).join(', ');
    return `Exploration ${idx + 1} (${date}): stage=${entry.stage}, goal=${entry.goal}, ${entry.questionCount} questions, avg similarity=${entry.avgSimilarity}%, top questions: ${questions || 'none'}, key insight: ${entry.keyInsight.slice(0, 60)}`;
  });

  return [
    'Past exploration memory (use to avoid repetition and build on previous discoveries):',
    ...lines,
  ].join('\n');
}
