import React, { memo } from 'react';
import { useWaferStore } from '../store/useWaferStore';
import { VectorLegend } from './VectorLegend';
import { FileUpload } from './ControlPanel/FileUpload';

const CARD: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(246,250,253,0.98) 100%)',
  borderRadius: 16,
  padding: '14px 14px',
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--panel-shadow)',
};

export const DisplayPanel: React.FC = memo(() => {
  const setViewState = useWaferStore((s) => s.setViewState);
  const viewState = useWaferStore((s) => s.viewState);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto' }}>
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 4, height: 18, background: '#4f8bc9', borderRadius: 99, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#243a4c', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            Display
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {([
            ['showDisplacementVectors', 'Displacement vectors'],
            ['showFieldBoundaries', 'Field boundaries'],
            ['showDieBoundaries', 'Die boundaries'],
          ] as const).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={viewState[key]}
                onChange={(e) => setViewState({ [key]: e.target.checked })}
                className="accent-blue-400"
                style={{ width: 13, height: 13, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12.5, color: '#61788d' }}>{label}</span>
            </label>
          ))}

          <div style={{ marginTop: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 11.5, color: '#72879a' }}>Vector scale</span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#24465f' }}>
                {viewState.arrowScaleFactor.toLocaleString()}x
              </span>
            </div>
            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={viewState.arrowScaleFactor}
              onChange={(e) => setViewState({ arrowScaleFactor: parseInt(e.target.value, 10) })}
              className="w-full"
            />
          </div>

          <div style={{ marginTop: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 11.5, color: '#72879a' }}>Color max</span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#24465f' }}>
                {viewState.colorMapRange[1]} nm
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={1000}
              step={1}
              value={viewState.colorMapRange[1]}
              onChange={(e) => setViewState({ colorMapRange: [0, parseInt(e.target.value, 10)] })}
              className="w-full slider-purple"
            />
          </div>

          <div style={{ marginTop: 5 }}>
            <VectorLegend />
          </div>
        </div>
      </div>
      <FileUpload />
    </div>
  );
});

DisplayPanel.displayName = 'DisplayPanel';
