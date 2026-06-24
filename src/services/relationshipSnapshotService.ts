import type { MapArea } from '../types';

const SNAPSHOT_STORAGE_KEY = 'loveAtlasSnapshots';
const MAX_SNAPSHOTS = 50;

export interface RelationshipSnapshot {
  id: string;
  timestamp: string;
  regionProgress: Record<MapArea, number>;
  resonance: string;
  eventCount: number;
}

export function loadSnapshots(): RelationshipSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSnapshot(snapshot: Omit<RelationshipSnapshot, 'id' | 'timestamp'>): void {
  try {
    const snapshots = loadSnapshots();
    const entry: RelationshipSnapshot = {
      ...snapshot,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [...snapshots, entry].slice(-MAX_SNAPSHOTS);
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}
