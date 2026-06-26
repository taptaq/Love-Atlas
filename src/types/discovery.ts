export type DiscoveryCategory = 'event' | 'region' | 'journey' | 'special';

export type DiscoveryRarity = 'common' | 'rare' | 'hidden';

export interface DiscoveryCondition {
  event?: string;
  region?: string;
  count?: number;
  journeyLength?: number;
  guessMatched?: boolean;
  answersLong?: boolean;
  answersBoth?: boolean;
  firstComplete?: boolean;
  completeCount?: number;
  multiRegion?: boolean;
  allRegions?: boolean;
  hasEvent?: boolean;
  eventCount?: number;
  recentExplore?: boolean;
  firstMomentUpload?: boolean;
  coastCount?: number;
  nightExplore?: boolean;
  deepJourney?: boolean;
  longestAnswer?: boolean;
  forestCount?: number;
  fullCircle?: boolean;
}

export interface DiscoveryItem {
  id: string;
  icon: string;
  title: string;
  message: string;
  category: DiscoveryCategory;
  condition: DiscoveryCondition;
  hidden: boolean;
  rarity: DiscoveryRarity;
  hint: string;
}

export interface UnlockedDiscovery {
  id: string;
  unlockedAt: string;
}

export interface AtlasDiscoveryState {
  unlocked: UnlockedDiscovery[];
}

export interface AtlasStats {
  completeCount: number;
  regionCounts: Record<string, number>;
  eventCounts: Record<string, number>;
  momentUpload: boolean;
  lastExploreTime: number | null;
  longestAnswer: number;
  regionVisited: string[];
  eventTypeVisited: string[];
}
