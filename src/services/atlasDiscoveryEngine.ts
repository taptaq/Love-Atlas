import { discoveryPool } from '../features/discovery/discoveryPool';
import type { AtlasDiscoveryState, AtlasStats, DiscoveryItem } from '../types';

const ATLAS_STORAGE_KEY = 'loveAtlasDiscoveriesV2';
const ATLAS_STATS_KEY = 'loveAtlasStats';

export interface DiscoveryUnlockContext {
  event?: string;
  region?: string;
  journey?: {
    length?: number;
    hasEvent?: boolean;
    eventCount?: number;
    firstMomentUpload?: boolean;
  };
  stats?: AtlasStats;
  answers?: {
    a?: string;
    b?: string;
  };
  guessMatched?: boolean;
}

export interface UnlockResult {
  newItems: DiscoveryItem[];
  state: AtlasDiscoveryState;
}

export function emptyStats(): AtlasStats {
  return {
    completeCount: 0,
    regionCounts: { forest: 0, coast: 0, valley: 0, city: 0, garden: 0 },
    eventCounts: {},
    momentUpload: false,
    lastExploreTime: null,
    longestAnswer: 0,
    regionVisited: [],
    eventTypeVisited: [],
  };
}

export function loadAtlasState(): AtlasDiscoveryState {
  try {
    const raw = localStorage.getItem(ATLAS_STORAGE_KEY);
    if (!raw) return { unlocked: [] };
    const parsed = JSON.parse(raw) as AtlasDiscoveryState;
    return { unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [] };
  } catch {
    return { unlocked: [] };
  }
}

export function saveAtlasState(state: AtlasDiscoveryState): void {
  try {
    localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function loadStats(): AtlasStats {
  try {
    const raw = localStorage.getItem(ATLAS_STATS_KEY);
    if (!raw) return emptyStats();
    return { ...emptyStats(), ...(JSON.parse(raw) as Partial<AtlasStats>) };
  } catch {
    return emptyStats();
  }
}

export function saveStats(stats: AtlasStats): void {
  try {
    localStorage.setItem(ATLAS_STATS_KEY, JSON.stringify(stats));
  } catch {}
}

function checkCondition(discovery: DiscoveryItem, context: DiscoveryUnlockContext): boolean {
  const cond = discovery.condition;
  const stats = context.stats ?? loadStats();
  const answers = context.answers ?? {};

  if (cond.event) {
    if (!context.event || context.event !== cond.event) return false;
    if (cond.count && ((stats.eventCounts[cond.event] ?? 0) + 1) < cond.count) return false;
  }

  if (cond.region) {
    if (!context.region || context.region !== cond.region) return false;
    if (cond.count && ((stats.regionCounts[cond.region] ?? 0) + 1) < cond.count) return false;
  }

  if (cond.journeyLength !== undefined && context.journey?.length !== cond.journeyLength) return false;
  if (cond.guessMatched !== undefined && context.guessMatched !== cond.guessMatched) return false;
  if (cond.answersLong && ((answers.a ?? '').length + (answers.b ?? '').length) < 80) return false;
  if (cond.answersBoth && (!(answers.a ?? '').trim() || !(answers.b ?? '').trim())) return false;
  if (cond.firstComplete && stats.completeCount !== 0) return false;
  if (cond.completeCount && stats.completeCount + 1 !== cond.completeCount) return false;

  if (cond.multiRegion) {
    const uniq = new Set(stats.regionVisited.concat([context.region].filter(Boolean) as string[]));
    if (uniq.size < 3) return false;
  }

  if (cond.allRegions) {
    const uniq = new Set(stats.regionVisited.concat([context.region].filter(Boolean) as string[]));
    if (uniq.size < 5) return false;
  }

  if (cond.hasEvent && !context.journey?.hasEvent) return false;

  if (cond.eventCount) {
    const total = Object.values(stats.eventCounts).reduce((sum, count) => sum + count, 0);
    if (total + (context.journey?.hasEvent ? 1 : 0) < cond.eventCount) return false;
  }

  if (cond.recentExplore) {
    if (!stats.lastExploreTime) return false;
    if (Date.now() - stats.lastExploreTime > 1000 * 60 * 60 * 24 * 3) return false;
  }

  if (cond.firstMomentUpload && !context.journey?.firstMomentUpload) return false;
  if (cond.mirrorCount && ((stats.eventCounts.mirror ?? 0) + (context.event === 'mirror' ? 1 : 0)) < cond.mirrorCount) return false;
  if (cond.coastCount && ((stats.regionCounts.coast ?? 0) + (context.region === 'coast' ? 1 : 0)) < cond.coastCount) return false;
  if (cond.nightExplore) {
    const hour = new Date().getHours();
    if (!(hour >= 22 || hour <= 4)) return false;
  }
  if (cond.deepJourney && context.journey?.length !== 5) return false;
  if (cond.longestAnswer && Math.max((answers.a ?? '').length, (answers.b ?? '').length) < 80) return false;
  if (cond.forestCount && ((stats.regionCounts.forest ?? 0) + (context.region === 'forest' ? 1 : 0)) < cond.forestCount) return false;
  if (cond.fullCircle && Object.keys(stats.eventCounts).length < 5) return false;

  return true;
}

export function unlockDiscovery(context: DiscoveryUnlockContext): UnlockResult {
  const state = loadAtlasState();
  const stats = context.stats ?? loadStats();
  const originalUnlockedCount = state.unlocked.length;
  const unlockedIds = new Set<string>();
  state.unlocked = state.unlocked.filter((item) => {
    if (unlockedIds.has(item.id)) return false;
    unlockedIds.add(item.id);
    return true;
  });
  const now = new Date().toISOString();
  const newItems: DiscoveryItem[] = [];
  const queuedIds = new Set<string>();

  for (const item of discoveryPool) {
    if (unlockedIds.has(item.id) || queuedIds.has(item.id)) continue;
    if (!checkCondition(item, { ...context, stats })) continue;
    queuedIds.add(item.id);
    newItems.push(item);
  }

  if (newItems.length > 0) {
    state.unlocked.push(...newItems.map((item) => ({ id: item.id, unlockedAt: now })));
    saveAtlasState(state);
  } else if (originalUnlockedCount !== state.unlocked.length) {
    saveAtlasState(state);
  }

  return { newItems, state };
}

export function getLatestDiscovery(): DiscoveryItem | null {
  const state = loadAtlasState();
  const latest = state.unlocked[state.unlocked.length - 1];
  if (!latest) return null;
  return discoveryPool.find((item) => item.id === latest.id) ?? null;
}
