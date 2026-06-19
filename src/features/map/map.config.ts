import type { Language, MapArea } from '../../types';

export const mapAreaConfig: Record<MapArea, { icon: string; label: Record<Language, string>; description: Record<Language, string> }> = {
  forest: {
    icon: '🌲',
    label: { cn: '情绪森林', en: 'Emotion Forest' },
    description: { cn: '情绪、感受与真实表达。', en: 'Feelings, emotions, and honest expression.' },
  },
  coast: {
    icon: '🌊',
    label: { cn: '回忆海岸', en: 'Memory Coast' },
    description: { cn: '回忆、共同经历与旧时刻。', en: 'Memories, shared history, and old moments.' },
  },
  valley: {
    icon: '🏡',
    label: { cn: '日常山谷', en: 'Life Valley' },
    description: { cn: '日常生活、陪伴与节奏。', en: 'Daily life, companionship, and rhythm.' },
  },
  city: {
    icon: '🏙',
    label: { cn: '未来之城', en: 'Future City' },
    description: { cn: '未来计划、期待与共同方向。', en: 'Future plans, expectations, and shared direction.' },
  },
  garden: {
    icon: '🌸',
    label: { cn: '边界花园', en: 'Boundary Garden' },
    description: { cn: '界限、差异、需要与理解。', en: 'Boundaries, differences, needs, and understanding.' },
  },
};
