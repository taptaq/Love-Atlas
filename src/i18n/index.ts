import type { Language } from '../types';

export const copy = {
  cn: {
    homeSubtitle: '每段关系都是等待探索的宇宙',
    homeTagline: '一起探索，让关系更深刻',
    startTitle: '开启今日探索',
    startDesc: '开启一次新的关系探索旅程',
    worldTitle: '我们的关系世界',
    worldDesc: '查看你们的关系世界状态',
    latestDiscovery: '最近发现',
    emptyDiscovery: '开始探索后，这里会留下你们的发现',
    completed: '已完成',
    explorations: '次探索',
    discovered: '已发现',
    items: '项',
    atlasTitle: '关系发现图鉴',
    atlasSubtitle: '你们一起探索后留下的 45 个痕迹',
    back: '返回',
    all: '全部',
    event: '事件',
    region: '区域',
    journey: '旅程',
    special: '特殊',
    locked: '继续探索解锁',
  },
  en: {
    homeSubtitle: 'Every relationship is a universe waiting to be explored',
    homeTagline: 'Explore together, deepen the relationship',
    startTitle: 'Start Today’s Exploration',
    startDesc: 'Begin a new relationship exploration journey',
    worldTitle: 'Our Relationship World',
    worldDesc: 'View your relationship world status',
    latestDiscovery: 'Latest Discovery',
    emptyDiscovery: 'Your discoveries will appear here after you start exploring',
    completed: 'Completed',
    explorations: 'explorations',
    discovered: 'Discovered',
    items: 'items',
    atlasTitle: 'Relationship Discovery Atlas',
    atlasSubtitle: '45 traces left by your explorations together',
    back: 'Back',
    all: 'All',
    event: 'Events',
    region: 'Regions',
    journey: 'Journeys',
    special: 'Special',
    locked: 'Keep exploring to unlock',
  },
} satisfies Record<Language, Record<string, string>>;

export function t(language: Language, key: keyof typeof copy.cn): string {
  return copy[language][key];
}
