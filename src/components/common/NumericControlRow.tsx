import React, { memo } from 'react';

export const NUMERIC_CONTROL_LAYOUT = {
  inputWidth: 54,
  inputHeight: 26,
  unitWidth: 26,
  columnGap: 3,
  rowGap: 6,
} as const;

interface NumericControlRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showSlider?: boolean;
  symbol?: string;
  accentColor?: string;
  displayPrecision?: number;
}

export const NumericControlRow: React.FC<NumericControlRowProps> = memo(({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  showSlider = false,
  symbol,
  accentColor = '#4f8bc9',
  displayPrecision = 2,
}) => {
  const labelNode = symbol ? (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: accentColor, fontFamily: 'monospace' }}>
        {symbol}
      </span>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: '#5f7689',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
    </div>
  ) : (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        color: '#5f7689',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: NUMERIC_CONTROL_LAYOUT.rowGap }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `minmax(0, 1fr) ${NUMERIC_CONTROL_LAYOUT.inputWidth}px ${unit ? `${NUMERIC_CONTROL_LAYOUT.unitWidth}px` : '0px'}`,
          alignItems: 'center',
          columnGap: NUMERIC_CONTROL_LAYOUT.columnGap,
        }}
      >
        {labelNode}
        <input
          type="number"
          value={Number(value.toFixed(displayPrecision))}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = accentColor;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--line)';
          }}
          style={{
            width: NUMERIC_CONTROL_LAYOUT.inputWidth,
            height: NUMERIC_CONTROL_LAYOUT.inputHeight,
            fontSize: 11.5,
            textAlign: 'right',
            background: 'rgba(248, 251, 253, 0.96)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '0 6px',
            color: '#203547',
            fontFamily: 'monospace',
            fontWeight: 700,
            outline: 'none',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
            justifySelf: 'end',
            transition: 'border-color 0.15s ease',
          }}
        />
        {unit ? (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              color: '#8aa0b3',
              width: NUMERIC_CONTROL_LAYOUT.unitWidth,
              letterSpacing: '0.04em',
              textTransform: 'lowercase',
              textAlign: 'right',
              justifySelf: 'end',
            }}
          >
            {unit}
          </span>
        ) : (
          <span />
        )}
      </div>

      {showSlider && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ marginTop: 1 }}
        />
      )}
    </div>
  );
});

NumericControlRow.displayName = 'NumericControlRow';
