import React, { useMemo } from 'react';
import { useWaferStore } from '../store/useWaferStore';
import { computeStats } from '../utils/distortionMath';

const valueStyle: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'monospace',
  fontWeight: 700,
  color: '#294156',
};

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  color: '#70879a',
  letterSpacing: '0.03em',
};

export const StatsSidebar: React.FC = () => {
  const distortionResults = useWaferStore((s) => s.distortionResults);
  const stats = useMemo(() => computeStats(distortionResults), [distortionResults]);

  if (!stats) return null;

  const rows = [
    { label: 'Mean dx', value: `${stats.meanDx >= 0 ? '+' : ''}${stats.meanDx.toFixed(1)}` },
    { label: 'Mean dy', value: `${stats.meanDy >= 0 ? '+' : ''}${stats.meanDy.toFixed(1)}` },
    { label: 'Std dx', value: `${stats.stdDx.toFixed(1)}` },
    { label: 'Std dy', value: `${stats.stdDy.toFixed(1)}` },
    { label: 'Max |d|', value: `${stats.maxMagnitude.toFixed(1)} nm` },
    { label: 'P99 |d|', value: `${stats.p99Magnitude.toFixed(1)} nm` },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 3,
        pointerEvents: 'none',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        columnGap: 8,
        rowGap: 3,
        padding: '7px 9px',
        border: '1px solid rgba(150, 170, 186, 0.34)',
        borderRadius: 10,
        background: 'rgba(245, 249, 252, 0.26)',
        textShadow: '0 1px 0 rgba(255,255,255,0.65)',
      }}
    >
      {rows.map((row) => (
        <React.Fragment key={row.label}>
          <div style={labelStyle}>{row.label}</div>
          <div style={valueStyle}>{row.value}</div>
        </React.Fragment>
      ))}
      <div style={labelStyle}>Count</div>
      <div style={valueStyle}>{stats.count.toLocaleString()}</div>
    </div>
  );
};
