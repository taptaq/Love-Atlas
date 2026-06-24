import { useEffect, useState } from 'react';
import { mapAreaConfig } from '../../features/map/map.config';
import { loadSnapshots } from '../../services/relationshipSnapshotService';
import type { MapArea } from '../../types';
import type { Language } from '../../types';

const AREAS: MapArea[] = ['forest', 'coast', 'valley', 'city', 'garden'];

const AREA_COLORS: Record<MapArea, string> = {
  forest: '#4ade80',
  coast: '#38bdf8',
  valley: '#fbbf24',
  city: '#c084fc',
  garden: '#fb7185',
};

interface GrowthCurveProps {
  language: Language;
}

export function GrowthCurve({ language }: GrowthCurveProps) {
  const [snapshots, setSnapshots] = useState(() => loadSnapshots());

  useEffect(() => {
    setSnapshots(loadSnapshots());
  }, []);

  const cn = language === 'cn';

  if (snapshots.length < 2) {
    return (
      <article className="route-preview-card growth-curve-card">
        <span className="eyebrow">{cn ? '关系成长曲线' : 'Growth Curve'}</span>
        <p className="growth-curve-empty">
          {cn ? '完成至少 2 次探索后，这里会出现你们的关系成长曲线。' : 'Complete at least 2 explorations to see your growth curve.'}
        </p>
      </article>
    );
  }

  const width = 320;
  const height = 140;
  const padding = { top: 10, right: 10, bottom: 20, left: 28 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const stepX = snapshots.length > 1 ? chartWidth / (snapshots.length - 1) : 0;

  const pointsFor = (area: MapArea) =>
    snapshots.map((snap, index) => {
      const x = padding.left + index * stepX;
      const y = padding.top + chartHeight - (Math.min(100, Math.max(0, snap.regionProgress[area] ?? 0)) / 100) * chartHeight;
      return `${x},${y}`;
    });

  return (
    <article className="route-preview-card growth-curve-card">
      <span className="eyebrow">{cn ? '关系成长曲线' : 'Growth Curve'}</span>
      <p className="growth-curve-subtitle">
        {cn ? `${snapshots.length} 次探索的区域进度变化` : `${snapshots.length} explorations · region progress over time`}
      </p>
      <svg className="growth-curve-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={cn ? '关系成长曲线' : 'Relationship growth curve'}>
        {/* Y-axis grid lines */}
        {[0, 25, 50, 75, 100].map((value) => {
          const y = padding.top + chartHeight - (value / 100) * chartHeight;
          return (
            <g key={value}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
              <text x={padding.left - 4} y={y + 3} textAnchor="end" fontSize={8} fill="rgba(255,255,255,0.4)">{value}</text>
            </g>
          );
        })}
        {/* Area lines */}
        {AREAS.map((area) => {
          const points = pointsFor(area);
          if (points.length < 2) return null;
          return (
            <polyline
              key={area}
              points={points.join(' ')}
              fill="none"
              stroke={AREA_COLORS[area]}
              strokeWidth={1.8}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.85}
            />
          );
        })}
        {/* Data points on the latest snapshot */}
        {AREAS.map((area) => {
          const points = pointsFor(area);
          if (points.length === 0) return null;
          const [x, y] = points[points.length - 1].split(',').map(Number);
          return <circle key={area} cx={x} cy={y} r={2.5} fill={AREA_COLORS[area]} />;
        })}
      </svg>
      <div className="growth-curve-legend">
        {AREAS.map((area) => (
          <span key={area} className="growth-curve-legend-item">
            <span className="growth-curve-legend-dot" style={{ background: AREA_COLORS[area] }} />
            {mapAreaConfig[area].label[language]}
          </span>
        ))}
      </div>
    </article>
  );
}
