import React, { memo, useCallback, useRef } from 'react';
import { useWaferStore } from '../../../state/waferStore';
import { NumericControlRow } from '../../../components/common/NumericControlRow';
import { cardTinted, accentBar, SECTION_HEADER, SECTION_TITLE } from '../../../styles/shared';

const CARD = cardTinted(
  'linear-gradient(180deg, rgba(238, 250, 247, 0.98) 0%, rgba(248, 252, 251, 0.98) 100%)',
  'var(--panel-border)',
);

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
  >
    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#5f7a92" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WaferLayoutParams: React.FC = memo(() => {
  const layoutConfig = useWaferStore((s) => s.layoutConfig);
  const setLayoutConfig = useWaferStore((s) => s.setLayoutConfig);
  const [isOpen, setIsOpen] = React.useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSet = useCallback((cfg: Parameters<typeof setLayoutConfig>[0]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setLayoutConfig(cfg), 400);
  }, [setLayoutConfig]);

  return (
    <div style={CARD}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '13px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <div style={SECTION_HEADER}>
          <div style={accentBar('#269989')} />
          <span style={{ ...SECTION_TITLE, color: '#1d6d69' }}>Wafer Layout</span>
        </div>
        <ChevronIcon open={isOpen} />
      </button>

      {isOpen && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ height: 1, background: 'rgba(121, 171, 163, 0.24)', marginBottom: 6 }} />
          <NumericControlRow label="Diameter" value={layoutConfig.waferDiameterMm} min={100} max={450} step={1} unit="mm" onChange={(v) => debouncedSet({ waferDiameterMm: v })} displayPrecision={2} />
          <NumericControlRow label="Edge Exclusion" value={layoutConfig.edgeExclusionMm} min={0} max={10} step={0.5} unit="mm" onChange={(v) => debouncedSet({ edgeExclusionMm: v })} displayPrecision={2} />
          <NumericControlRow label="Field Width" value={layoutConfig.fieldWidthMm} min={5} max={50} step={0.5} unit="mm" onChange={(v) => debouncedSet({ fieldWidthMm: v })} displayPrecision={2} />
          <NumericControlRow label="Field Height" value={layoutConfig.fieldHeightMm} min={5} max={50} step={0.5} unit="mm" onChange={(v) => debouncedSet({ fieldHeightMm: v })} displayPrecision={2} />
          <NumericControlRow label="Dies / Field X" value={layoutConfig.diesPerFieldX} min={1} max={8} step={1} unit="ct" onChange={(v) => debouncedSet({ diesPerFieldX: Math.round(v) })} displayPrecision={0} />
          <NumericControlRow label="Dies / Field Y" value={layoutConfig.diesPerFieldY} min={1} max={8} step={1} unit="ct" onChange={(v) => debouncedSet({ diesPerFieldY: Math.round(v) })} displayPrecision={0} />
          <NumericControlRow label="Offset X" value={layoutConfig.fieldOffsetX} min={-13000} max={13000} step={500} unit="um" onChange={(v) => debouncedSet({ fieldOffsetX: v })} displayPrecision={0} />
          <NumericControlRow label="Offset Y" value={layoutConfig.fieldOffsetY} min={-16500} max={16500} step={500} unit="um" onChange={(v) => debouncedSet({ fieldOffsetY: v })} displayPrecision={0} />
        </div>
      )}
    </div>
  );
});

WaferLayoutParams.displayName = 'WaferLayoutParams';
