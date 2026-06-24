import type { MomentScene, RouteInfluence } from '../../types';
import { generateAiMomentInfluence } from '../relationship/aiJourneyService';

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
  const source = text.toLowerCase();
  if (imageTags.includes('conflict') || /吵|争|冷战|生气|抱歉|道歉|conflict|fight|sorry|argue/.test(source)) {
    return sceneAreaMap.conflict;
  }
  if (imageTags.includes('future') || /未来|计划|以后|约定|期待|future|plan|promise/.test(source)) {
    return sceneAreaMap.morning;
  }
  if (imageTags.includes('memory') || /想念|回忆|纪念|以前|照片|miss|memory|remember/.test(source)) {
    return sceneAreaMap.sunset;
  }
  if (imageTags.includes('emotion') || /难过|开心|害怕|喜欢|爱|感受|emotion|feel|love/.test(source)) {
    return sceneAreaMap.night;
  }
  if (imageTags.includes('travel')) return sceneAreaMap.travel;
  if (imageTags.includes('cafe') || imageTags.includes('meal')) return sceneAreaMap.cafe;
  if (imageTags.includes('home') || imageTags.includes('daily')) return sceneAreaMap.home;
  if (imageTags.includes('gift') || imageTags.includes('celebration')) return sceneAreaMap.celebration;
  if (imageTags.includes('chat')) return { primaryArea: 'forest', reason: '聊天截图让此刻的表达被看见，路线加入情绪森林。', weight: 0.68 };
  if (imageTags.includes('daily')) return sceneAreaMap.home;
  if (scene && sceneAreaMap[scene]) return sceneAreaMap[scene];
  if (imageTags.length > 0) return { primaryArea: 'coast', reason: '图片让此刻被记录下来，路线加入回忆海岸。', weight: 0.58 };
  return null;
}

export function inferImageTags(fileName: string, text: string, ocrText = ''): string[] {
  const source = `${fileName} ${text} ${ocrText}`.toLowerCase();
  const tags = new Set<string>();
  if (/home|room|daily|家|房间|日常/.test(source)) tags.add('daily');
  if (/travel|trip|road|旅|路上|车|回忆|想念|纪念|miss|memory/.test(source)) tags.add('memory');
  if (/night|moon|晚|夜|感受|喜欢|爱|开心|难过|feel|love/.test(source)) tags.add('emotion');
  if (/future|plan|未来|计划|以后|约定|期待|promise/.test(source)) tags.add('future');
  if (/fight|conflict|argue|吵|争|冷战|生气|抱歉|道歉|sorry/.test(source)) tags.add('conflict');
  if (/photo|image|moment|照片|此刻/.test(source)) tags.add('moment');
  if (ocrText.trim()) tags.add('ocr-text');
  if (tags.size === 0) tags.add('moment');
  return Array.from(tags);
}

/**
 * 异步版本：优先用 AI 理解场景并生成路线影响，失败回退到规则引擎
 */
export async function getMomentInfluenceAsync(
  scene: MomentScene,
  text: string,
  imageTags: string[] = [],
): Promise<RouteInfluence | null> {
  // 无足够信息时直接返回 null，不浪费 AI 调用
  if (!text && !scene && imageTags.length === 0) return null;

  try {
    const aiResult = await generateAiMomentInfluence({
      text,
      scene: scene ?? '',
      imageTags,
    });
    return {
      primaryArea: aiResult.primaryArea,
      reason: aiResult.reason,
      weight: aiResult.weight,
    };
  } catch {
    // 回退到规则引擎
    return getMomentInfluence(scene, text, imageTags);
  }
}
