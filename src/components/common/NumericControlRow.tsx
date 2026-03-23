import React, { memo } from 'react';

export const NUMERIC_CONTROL_LAYOUT = {
  inputWidth: 62,
  inputHeight: 28,
  unitWidth: 34,
  columnGap: 6,
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
  chrome?: 'none' | 'soft';
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
  chrome = 'none',
}) => {
  const hasSoftChrome = chrome === 'soft';
  const labelNode = symbol ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
      <span
        style={{
          minWidth: 28,
          height: 18,
          padding: '0 7px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          background: `${accentColor}18`,
          color: accentColor,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.04em',
          fontFamily: 'monospace',
          lineHeight: 1,
        }}
      >
        {symbol}
      </span>
      <span
        style={{
          fontSize: showSlider ? 10.5 : 10.75,
          fontWeight: 700,
          color: '#4f677a',
          letterSpacing: '0.015em',
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
        fontSize: showSlider ? 10.5 : 10.75,
        fontWeight: 700,
        color: '#4f677a',
        letterSpacing: '0.015em',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: NUMERIC_CONTROL_LAYOUT.rowGap,
        padding: hasSoftChrome ? (showSlider ? '9px 10px 10px' : '8px 9px') : 0,
        borderRadius: hasSoftChrome ? 12 : 0,
        background: hasSoftChrome ? 'linear-gradient(180deg, rgba(249,252,254,0.94) 0%, rgba(243,248,252,0.94) 100%)' : 'transparent',
        border: hasSoftChrome ? '1px solid rgba(176, 193, 206, 0.2)' : 'none',
        boxShadow: hasSoftChrome ? 'inset 0 1px 0 rgba(255,255,255,0.86)' : 'none',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          columnGap: NUMERIC_CONTROL_LAYOUT.columnGap,
        }}
      >
        {labelNode}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, justifySelf: 'end' }}>
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
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '0 8px',
              color: '#203547',
              fontFamily: 'monospace',
              fontWeight: 800,
              outline: 'none',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
              transition: 'border-color 0.15s ease',
            }}
          />
          {unit ? (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#89a0b3',
                minWidth: NUMERIC_CONTROL_LAYOUT.unitWidth,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                textAlign: 'right',
              }}
            >
              {unit}
            </span>
          ) : null}
        </div>
      </div>

      {showSlider && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ marginTop: 0 }}
        />
      )}
    </div>
  );
});

NumericControlRow.displayName = 'NumericControlRow';
