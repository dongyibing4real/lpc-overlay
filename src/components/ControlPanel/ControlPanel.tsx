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
  const clearEntityOverlays = useWaferStore((s) => s.clearEntityOverlays);
  const perEntityOverlays = useWaferStore((s) => s.perEntityOverlays);
  const hasOverlays = Object.keys(perEntityOverlays).length > 0;

  const handleClearOverlays = useCallback(() => clearEntityOverlays(), [clearEntityOverlays]);

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ gap: 8, paddingRight: 2 }}>
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
