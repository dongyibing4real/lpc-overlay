import React, { useCallback } from 'react';
import { WaferLayoutParams } from './WaferLayoutParams';
import { DistortionControls } from './DistortionControls';
import { useWaferStore } from '../../store/useWaferStore';

const CARD: React.CSSProperties = {
  background: 'var(--panel-bg)',
  borderRadius: 14,
  padding: '13px 14px',
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--panel-shadow)',
};

export const ControlPanel: React.FC = () => {
  const clearCornerOverlays = useWaferStore((s) => s.clearCornerOverlays);
  const applyVectorMapShowcase = useWaferStore((s) => s.applyVectorMapShowcase);
  const resetModelState = useWaferStore((s) => s.resetModelState);
  const perCornerOverlays = useWaferStore((s) => s.perCornerOverlays);
  const hasOverlays = Object.keys(perCornerOverlays).length > 0;

  const handleClearOverlays = useCallback(() => clearCornerOverlays(), [clearCornerOverlays]);
  const handleLoadShowcase = useCallback(() => applyVectorMapShowcase(), [applyVectorMapShowcase]);
  const handleResetModel = useCallback(() => resetModelState(), [resetModelState]);

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ gap: 8, paddingRight: 2 }}>
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 3, height: 15, background: '#7468b3', borderRadius: 99, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#243a4c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Showcase
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#61788d', lineHeight: 1.55, marginBottom: 10 }}>
          Load a richer demo pattern with wafer-level drift, intra-field distortion, and several locally warped fields so the vector map is easier to read and present.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleLoadShowcase}
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 700,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #547fc0 0%, #44689b 100%)',
              border: '1px solid rgba(78,118,169,0.46)',
              borderRadius: 9,
              padding: '9px 10px',
              cursor: 'pointer',
              boxShadow: '0 6px 14px rgba(68,104,155,0.18)',
            }}
          >
            Load Complex Demo
          </button>
          <button
            onClick={handleResetModel}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#5b7387',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 9,
              padding: '9px 10px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <WaferLayoutParams />
      <DistortionControls />

      {hasOverlays && (
        <div style={CARD}>
          <button
            onClick={handleClearOverlays}
            style={{
              width: '100%',
              fontSize: 12,
              fontWeight: 500,
              color: '#b06c34',
              background: 'rgba(223,162,110,0.1)',
              border: '1px solid rgba(214,160,112,0.28)',
              borderRadius: 8,
              padding: '8px 10px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#955525'; e.currentTarget.style.borderColor = 'rgba(194,134,82,0.42)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#b06c34'; e.currentTarget.style.borderColor = 'rgba(214,160,112,0.28)'; }}
          >
            Clear drag overlays
          </button>
        </div>
      )}
    </div>
  );
};
