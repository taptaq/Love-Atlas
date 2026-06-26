import { mapAreaConfig } from '../../features/map/map.config';
import type { Language, MapArea, RegionState } from '../../types';

// 对话地形图：把 5 个关系区域画成相互连接的地形节点
// 节点大小 = 对话密度（探索进度），节点颜色 = 共鸣状态
// 区域之间用对话河流（曲线）连接，当前所在区域有脉冲光晕

interface TerrainMapProps {
  language: Language;
  regionProgress: Record<MapArea, number>;
  regionStates: Record<MapArea, RegionState>;
  currentRegion: MapArea;
  visitedRegions: MapArea[];
  regionCounts: Record<string, number>;
  onSelectArea?: (area: MapArea) => void;
}

// 5 个区域的地形坐标（viewBox 0 0 400 380）
const TERRAIN_POSITIONS: Record<MapArea, { x: number; y: number }> = {
  valley: { x: 200, y: 210 },   // 日常山谷居中
  forest: { x: 95, y: 115 },    // 情绪森林左上
  coast: { x: 95, y: 305 },     // 回忆海岸左下
  city: { x: 305, y: 115 },     // 未来之城右上
  garden: { x: 305, y: 305 },   // 边界花园右下
};

// 共鸣状态 → 颜色（柔和渐变）
const STATE_COLORS: Record<RegionState, { core: string; glow: string; ring: string }> = {
  growth: { core: '#f472b6', glow: 'rgba(244, 114, 182, 0.35)', ring: 'rgba(244, 114, 182, 0.55)' },     // 玫瑰粉
  bright: { core: '#fbbf24', glow: 'rgba(251, 191, 36, 0.32)', ring: 'rgba(251, 191, 36, 0.5)' },        // 金色暖光
  blur: { core: '#a78bfa', glow: 'rgba(167, 139, 250, 0.3)', ring: 'rgba(167, 139, 250, 0.48)' },        // 月光紫
  fluctuate: { core: '#818cf8', glow: 'rgba(129, 140, 248, 0.3)', ring: 'rgba(129, 140, 248, 0.48)' },   // 蓝紫
  unexplored: { core: '#6b7280', glow: 'rgba(107, 114, 128, 0.16)', ring: 'rgba(107, 114, 128, 0.3)' },  // 灰雾
};

const AREA_ORDER: MapArea[] = ['valley', 'forest', 'coast', 'city', 'garden'];

export function TerrainMap({
  language,
  regionProgress,
  regionStates,
  currentRegion,
  visitedRegions,
  regionCounts,
  onSelectArea,
}: TerrainMapProps) {
  const cn = language === 'cn';

  // 节点半径：基础 30 + 进度系数（30~48）
  const getRadius = (area: MapArea) => {
    const progress = regionProgress[area] ?? 0;
    return 30 + (progress / 100) * 18;
  };

  // 连接路径：从山谷中心到其他 4 个区域
  const connectionPaths = AREA_ORDER.filter((area) => area !== 'valley').map((area) => {
    const from = TERRAIN_POSITIONS.valley;
    const to = TERRAIN_POSITIONS[area];
    // 贝塞尔曲线，中点稍微弯曲
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const curveOffset = area === 'forest' || area === 'city' ? -15 : 15;
    return {
      area,
      d: `M ${from.x} ${from.y} Q ${midX} ${midY + curveOffset} ${to.x} ${to.y}`,
      // 两端都探索过才高亮连接
      active: visitedRegions.includes('valley') && visitedRegions.includes(area),
    };
  });

  return (
    <div className="terrain-map-wrapper" role="img" aria-label={cn ? '对话地形图' : 'Conversation Terrain Map'}>
      <svg className="terrain-map-svg" viewBox="0 0 400 380" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* 柔光滤镜 */}
          <filter id="terrain-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* 背景朦胧渐变 */}
          <radialGradient id="terrain-bg" cx="50%" cy="55%" r="65%">
            <stop offset="0%" stopColor="rgba(244, 114, 182, 0.06)" />
            <stop offset="60%" stopColor="rgba(167, 139, 250, 0.04)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </radialGradient>
        </defs>

        {/* 背景朦胧光晕 */}
        <rect x="0" y="0" width="400" height="380" fill="url(#terrain-bg)" />

        {/* 对话河流：连接曲线 */}
        {connectionPaths.map((path) => (
          <path
            key={path.area}
            d={path.d}
            fill="none"
            stroke={path.active ? 'rgba(244, 114, 182, 0.4)' : 'rgba(167, 139, 250, 0.16)'}
            strokeWidth={path.active ? 1.8 : 1.2}
            strokeDasharray={path.active ? '4 6' : '2 5'}
            strokeLinecap="round"
            className={path.active ? 'terrain-river terrain-river-active' : 'terrain-river'}
          />
        ))}

        {/* 5 个地形节点 */}
        {AREA_ORDER.map((area) => {
          const pos = TERRAIN_POSITIONS[area];
          const config = mapAreaConfig[area];
          const state = regionStates[area];
          const colors = STATE_COLORS[state];
          const radius = getRadius(area);
          const isActive = currentRegion === area;
          const isVisited = visitedRegions.includes(area);
          const questionCount = regionCounts[area] ?? 0;
          const progress = regionProgress[area] ?? 0;

          return (
            <g
              key={area}
              className={`terrain-node ${isActive ? 'terrain-node-active' : ''} ${!isVisited ? 'terrain-node-dim' : ''}`}
              onClick={() => onSelectArea?.(area)}
              style={{ cursor: onSelectArea ? 'pointer' : 'default' }}
            >
              {/* 外层柔光晕（活跃区域脉冲） */}
              {isActive && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius + 10}
                  fill="none"
                  stroke={colors.ring}
                  strokeWidth={1.5}
                  className="terrain-pulse-ring"
                />
              )}
              {/* 光晕背景 */}
              <circle cx={pos.x} cy={pos.y} r={radius + 6} fill={colors.glow} filter="url(#terrain-glow)" opacity={isVisited ? 0.9 : 0.4} />
              {/* 主节点 */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill={colors.core}
                opacity={isVisited ? 0.85 : 0.35}
                stroke={colors.ring}
                strokeWidth={isActive ? 2.5 : 1.2}
              />
              {/* 内层高光 */}
              <circle cx={pos.x - radius * 0.3} cy={pos.y - radius * 0.3} r={radius * 0.4} fill="rgba(255, 255, 255, 0.18)" />
              {/* 图标 */}
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={radius * 0.7}
                opacity={isVisited ? 1 : 0.5}
              >
                {config.icon}
              </text>
              {/* 区域名 */}
              <text
                x={pos.x}
                y={pos.y + radius + 16}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill={isVisited ? '#f3e8ff' : '#9aa3bd'}
                className="terrain-label"
              >
                {config.label[language]}
              </text>
              {/* 探索问题数 */}
              {questionCount > 0 && (
                <text
                  x={pos.x}
                  y={pos.y + radius + 30}
                  textAnchor="middle"
                  fontSize={10}
                  fill={colors.ring}
                  className="terrain-count"
                >
                  {cn ? `${questionCount} 题` : `${questionCount} Q`}
                </text>
              )}
              {/* 进度微指示（小弧线） */}
              {progress > 0 && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius + 3}
                  fill="none"
                  stroke={colors.ring}
                  strokeWidth={1.5}
                  strokeDasharray={`${(progress / 100) * 2 * Math.PI * (radius + 3)} ${2 * Math.PI * (radius + 3)}`}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${pos.x} ${pos.y})`}
                  opacity={0.7}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* 共鸣图例 */}
      <div className="terrain-legend" aria-label={cn ? '共鸣图例' : 'Resonance legend'}>
        <span className="terrain-legend-item"><i style={{ background: STATE_COLORS.growth.core }} />{cn ? '正在生长' : 'Growing'}</span>
        <span className="terrain-legend-item"><i style={{ background: STATE_COLORS.bright.core }} />{cn ? '变得明亮' : 'Brightening'}</span>
        <span className="terrain-legend-item"><i style={{ background: STATE_COLORS.blur.core }} />{cn ? '仍有模糊' : 'Blurry'}</span>
        <span className="terrain-legend-item"><i style={{ background: STATE_COLORS.fluctuate.core }} />{cn ? '正在波动' : 'Fluctuating'}</span>
        <span className="terrain-legend-item terrain-legend-dim"><i style={{ background: STATE_COLORS.unexplored.core }} />{cn ? '尚未探索' : 'Unexplored'}</span>
      </div>
    </div>
  );
}
