import React, { useCallback } from 'react';
import { WaferLayoutParams } from './WaferLayoutParams';
import { DistortionControls } from './DistortionControls';
import { useWaferStore } from '../../store/useWaferStore';

const CARD: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(245,249,252,0.98) 100%)',
  borderRadius: 16,
  padding: '12px 12px',
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
    <div className="flex flex-col h-full overflow-y-auto" style={{ gap: 9, paddingRight: 2 }}>
      <div
        style={{
          ...CARD,
          background: 'linear-gradient(180deg, rgba(241,247,255,0.98) 0%, rgba(230,239,251,0.96) 100%)',
          border: '1px solid rgba(112, 142, 185, 0.22)',
          boxShadow: '0 18px 34px rgba(69, 103, 151, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
          <div style={{ width: 4, height: 18, background: '#6d73c7', borderRadius: 99, flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#243a4c', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            Showcase
          </span>
        </div>
        <div style={{ fontSize: 10.75, color: '#5b6f84', lineHeight: 1.55, marginBottom: 10 }}>
          Load a richer demo pattern with wafer-level drift, intra-field distortion, and several locally warped fields so the vector map is easier to read and present.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleLoadShowcase}
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 800,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #5c88cb 0%, #3c6598 100%)',
              border: '1px solid rgba(69,109,159,0.46)',
              borderRadius: 11,
              padding: '10px 10px',
              cursor: 'pointer',
              boxShadow: '0 10px 22px rgba(68,104,155,0.24)',
            }}
          >
            Load Complex Demo
          </button>
          <button
            onClick={handleResetModel}
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#5b7387',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 11,
              padding: '10px 10px',
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
              fontWeight: 700,
              color: '#b06c34',
              background: 'rgba(223,162,110,0.1)',
              border: '1px solid rgba(214,160,112,0.28)',
              borderRadius: 10,
              padding: '9px 11px',
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
