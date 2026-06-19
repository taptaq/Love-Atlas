import type { MomentScene, RouteInfluence } from '../../types';

const sceneAreaMap: Record<string, RouteInfluence> = {
  cafe: { primaryArea: 'valley', reason: '此刻场景偏日常陪伴，路线加入日常山谷。', weight: 0.62 },
  coffee: { primaryArea: 'valley', reason: '咖啡时刻适合轻柔同步近况，路线加入日常山谷。', weight: 0.62 },
  night: { primaryArea: 'forest', reason: '夜晚更适合表达真实感受，路线加入情绪森林。', weight: 0.72 },
  room: { primaryArea: 'forest', reason: '私密空间会提高情绪表达权重，路线加入情绪森林。', weight: 0.68 },
  travel: { primaryArea: 'coast', reason: '旅途会带出共同经历，路线加入回忆海岸。', weight: 0.66 },
  street: { primaryArea: 'city', reason: '移动中的场景更容易谈到方向与未来，路线加入未来之城。', weight: 0.58 },
  home: { primaryArea: 'valley', reason: '家里的场景强化日常关系线索，路线加入日常山谷。', weight: 0.64 },
  conflict: { primaryArea: 'garden', reason: '冲突场景需要边界与理解，路线加入边界花园。', weight: 0.8 },
  sunset: { primaryArea: 'coast', reason: '黄昏适合回看共同记忆，路线加入回忆海岸。', weight: 0.6 },
  morning: { primaryArea: 'city', reason: '早晨适合开启新的计划，路线加入未来之城。', weight: 0.56 },
  celebration: { primaryArea: 'coast', reason: '庆祝时刻会激活共同记忆，路线加入回忆海岸。', weight: 0.7 },
};

export function getMomentInfluence(scene: MomentScene, text: string, imageTags: string[] = []): RouteInfluence | null {
  if (imageTags.includes('conflict') || text.includes('吵') || text.includes('争') || text.toLowerCase().includes('conflict')) {
    return sceneAreaMap.conflict;
  }
  if (imageTags.includes('future') || text.includes('未来') || text.toLowerCase().includes('future')) {
    return sceneAreaMap.morning;
  }
  if (imageTags.includes('memory') || text.includes('想念') || text.includes('回忆') || text.toLowerCase().includes('miss')) {
    return sceneAreaMap.sunset;
  }
  if (imageTags.includes('daily')) return sceneAreaMap.home;
  if (scene && sceneAreaMap[scene]) return sceneAreaMap[scene];
  if (imageTags.length > 0) return { primaryArea: 'coast', reason: '图片让此刻被记录下来，路线加入回忆海岸。', weight: 0.58 };
  return null;
}

export function inferImageTags(fileName: string, text: string): string[] {
  const source = `${fileName} ${text}`.toLowerCase();
  const tags = new Set<string>();
  if (/home|room|daily|家|房间|日常/.test(source)) tags.add('daily');
  if (/travel|trip|road|旅|路上|车/.test(source)) tags.add('memory');
  if (/night|moon|晚|夜/.test(source)) tags.add('emotion');
  if (/future|plan|未来|计划/.test(source)) tags.add('future');
  if (/fight|conflict|argue|吵|争/.test(source)) tags.add('conflict');
  if (/photo|image|moment|照片|此刻/.test(source)) tags.add('moment');
  if (tags.size === 0) tags.add('moment');
  return Array.from(tags);
}
