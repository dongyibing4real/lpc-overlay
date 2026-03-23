import React, { memo, useEffect, useMemo, useState } from 'react';
import { useWaferStore, ZERO_OVERLAY, ZERO_FIELD_TRANSFORM } from '../store/useWaferStore';
import type { CornerOverlay, FieldTransformOverride } from '../types/wafer';
import { NumericControlRow } from './common/NumericControlRow';

const CARD: React.CSSProperties = {
  background: 'var(--panel-bg)',
  borderRadius: 14,
  padding: '13px 14px',
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--panel-shadow)',
};

const CORNER_LABELS = ['TL', 'TR', 'BR', 'BL'] as const;

const FLOATING_SECTION_CARD: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 9,
  padding: '11px',
  borderRadius: 14,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(243,248,252,0.96) 100%)',
  border: '1px solid rgba(165, 183, 199, 0.26)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
};

const metricTileStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
  padding: '8px 9px',
  borderRadius: 11,
  background: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(173, 190, 204, 0.24)',
};

interface FieldEditPanelProps {
  floating?: boolean;
  onHeaderPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResetPosition?: () => void;
}

function isDragBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('button, input, select, textarea, label, [data-no-panel-drag="true"]'));
}

function formatCenterMm(valueUm: number): string {
  const valueMm = valueUm / 1000;
  return `${valueMm >= 0 ? '+' : ''}${valueMm.toFixed(4)} mm`;
}

function hasTransformValues(value: FieldTransformOverride): boolean {
  return Object.values(value).some((entry) => Math.abs(entry) > 0.0001);
}

function hasCornerValues(value: CornerOverlay): boolean {
  return [...value.cornerDx, ...value.cornerDy].some((entry) => Math.abs(entry) > 0.0001);
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: '#3e596d',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const sectionActionButtonStyle: React.CSSProperties = {
  fontSize: 9.5,
  fontWeight: 700,
  border: '1px solid rgba(164, 184, 198, 0.3)',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.82)',
  color: '#61788d',
  padding: '4px 9px',
  cursor: 'pointer',
};

export const FieldEditPanel: React.FC<FieldEditPanelProps> = memo(({
  floating = false,
  onHeaderPointerDown,
  onResetPosition,
}) => {
  const fields = useWaferStore((s) => s.fields);
  const selectedFieldId = useWaferStore((s) => s.selectedFieldId);
  const selectField = useWaferStore((s) => s.selectField);
  const selectedTransform = useWaferStore((s) => s.selectedFieldId ? s.perFieldTransformOverrides[s.selectedFieldId] ?? null : null);
  const selectedCornerOverlay = useWaferStore((s) => s.selectedFieldId ? s.perFieldCornerOverlays[s.selectedFieldId] ?? null : null);
  const setFieldTransformOverride = useWaferStore((s) => s.setFieldTransformOverride);
  const resetFieldTransformOverride = useWaferStore((s) => s.resetFieldTransformOverride);
  const setFieldCornerOverlay = useWaferStore((s) => s.setFieldCornerOverlay);
  const resetFieldCornerOverlay = useWaferStore((s) => s.resetFieldCornerOverlay);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId],
  );

  const [transformDraft, setTransformDraft] = useState<FieldTransformOverride>(ZERO_FIELD_TRANSFORM);
  const [cornerDraft, setCornerDraft] = useState<CornerOverlay>(ZERO_OVERLAY);
  const [showTransform, setShowTransform] = useState(true);
  const [showCorners, setShowCorners] = useState(true);
  const hasTransformOverrides = useMemo(() => hasTransformValues(transformDraft), [transformDraft]);
  const hasCornerOverrides = useMemo(() => hasCornerValues(cornerDraft), [cornerDraft]);

  useEffect(() => {
    if (!selectedFieldId) {
      setTransformDraft(ZERO_FIELD_TRANSFORM);
      setCornerDraft(ZERO_OVERLAY);
      return;
    }
    setTransformDraft(selectedTransform ?? ZERO_FIELD_TRANSFORM);
    setCornerDraft(selectedCornerOverlay ?? ZERO_OVERLAY);
  }, [selectedFieldId, selectedTransform, selectedCornerOverlay]);

  useEffect(() => {
    setShowTransform(true);
    setShowCorners(!floating);
  }, [floating, selectedFieldId]);

  const updateTransform = (patch: Partial<FieldTransformOverride>) => {
    if (!selectedFieldId) return;
    setTransformDraft((prev) => ({ ...prev, ...patch }));
    setFieldTransformOverride(selectedFieldId, patch);
  };

  const updateCornerValue = (cornerIndex: number, axis: 'x' | 'y', value: number) => {
    if (!selectedFieldId) return;
    const next: CornerOverlay = {
      cornerDx: [...cornerDraft.cornerDx] as CornerOverlay['cornerDx'],
      cornerDy: [...cornerDraft.cornerDy] as CornerOverlay['cornerDy'],
    };
    if (axis === 'x') next.cornerDx[cornerIndex] = value;
    else next.cornerDy[cornerIndex] = value;
    setCornerDraft(next);
    setFieldCornerOverlay(selectedFieldId, next);
  };

  const renderTransformControl = (
    label: string,
    symbol: string,
    unit: string,
    value: number,
    min: number,
    max: number,
    step: number,
    key: keyof FieldTransformOverride,
  ) => (
    <NumericControlRow
      label={label}
      symbol={symbol}
      unit={unit}
      value={value}
      min={min}
      max={max}
      step={step}
      showSlider
      chrome="soft"
      accentColor="#3c78a8"
      onChange={(nextValue) => updateTransform({ [key]: nextValue })}
      displayPrecision={2}
    />
  );

  if (floating && !selectedField) return null;

  return (
    <div
      data-no-zoom={floating ? 'true' : undefined}
      data-field-edit-panel="true"
      style={{
        ...CARD,
        display: 'flex',
        flexDirection: 'column',
        ...(floating
          ? {
            width: '100%',
            height: '100%',
            padding: '13px 13px',
            background: 'rgba(253, 254, 255, 0.88)',
            backdropFilter: 'blur(18px)',
            border: '1px solid rgba(154, 176, 195, 0.34)',
            boxShadow: '0 18px 36px rgba(72,96,120,0.14)',
            overflow: 'hidden',
          }
          : null),
      }}
    >
      <div
        onPointerDown={(event) => {
          if (!floating || !onHeaderPointerDown) return;
          if (isDragBlockedTarget(event.target)) return;
          onHeaderPointerDown(event);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: floating ? 10 : 8,
          flexShrink: 0,
          ...(floating
            ? {
              position: 'relative',
              zIndex: 2,
              paddingBottom: 10,
              borderBottom: '1px solid rgba(176,193,206,0.24)',
              background: 'linear-gradient(180deg, rgba(253,254,255,0.98) 0%, rgba(249,252,254,0.92) 100%)',
            }
            : null),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
          }}
        >
          <div style={{ width: 4, height: floating ? 18 : 14, background: '#3c78a8', borderRadius: 99, flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#7590a6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Selected Field
            </span>
            <span style={{ fontSize: floating ? 11.5 : 10.5, fontWeight: 800, color: '#243a4c', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
              Field Editor
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {floating && onResetPosition && (
            <button
              onClick={onResetPosition}
              onPointerDown={(event) => event.stopPropagation()}
              style={{
                fontSize: 9.5,
                border: '1px solid var(--line)',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.84)',
                color: '#61788d',
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              Reset Pos
            </button>
          )}
          {selectedFieldId && (
            <button
              onClick={() => selectField(null)}
              onPointerDown={(event) => event.stopPropagation()}
              style={{
                fontSize: 9.5,
                border: '1px solid var(--line)',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.84)',
                color: '#61788d',
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minHeight: 0,
          flex: 1,
          overflowY: floating ? 'auto' : 'visible',
          paddingRight: floating ? 4 : 0,
          paddingTop: floating ? 2 : 0,
        }}
      >
        {!selectedField ? (
          <div
            style={{
              ...FLOATING_SECTION_CARD,
              gap: 6,
              alignItems: 'flex-start',
              background: 'linear-gradient(180deg, rgba(248,252,255,0.94) 0%, rgba(242,248,252,0.96) 100%)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, color: '#4a6477', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              No Field Selected
            </div>
            <div style={{ fontSize: 12, color: '#73879a', lineHeight: 1.6 }}>
              Click any field on the Actual Map to open a local inspector for transform overrides and corner residual shaping.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: floating ? 12 : 12 }}>
          <div
            style={{
              ...FLOATING_SECTION_CARD,
              gap: 9,
              background: 'linear-gradient(180deg, rgba(238,246,252,0.98) 0%, rgba(246,250,253,0.98) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#24465f', letterSpacing: '-0.01em' }}>
                  Field ({selectedField.col}, {selectedField.row})
                </div>
                <div style={{ fontSize: 10.5, color: '#6b8598', marginTop: 2 }}>
                  Local distortions and per-corner residual tweaks
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    fontSize: 9,
                    color: '#6f879a',
                    fontFamily: 'monospace',
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.74)',
                    border: '1px solid rgba(176,193,206,0.22)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedField.id}
                </div>
                {hasTransformOverrides && (
                  <div
                    style={{
                      fontSize: 8.5,
                      fontWeight: 800,
                      color: '#275f8d',
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: 'rgba(85, 145, 201, 0.12)',
                    }}
                  >
                    Transform Active
                  </div>
                )}
                {hasCornerOverrides && (
                  <div
                    style={{
                      fontSize: 8.5,
                      fontWeight: 800,
                      color: '#927047',
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: 'rgba(213, 168, 94, 0.14)',
                    }}
                  >
                    Residuals Active
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                minWidth: 0,
              }}
            >
              <div style={metricTileStyle}>
                <span style={{ fontSize: 9, color: '#7f95a8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Center X
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    color: '#375469',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    minWidth: 0,
                  }}
                >
                  {formatCenterMm(selectedField.centerDesign.x)}
                </span>
              </div>
              <div style={metricTileStyle}>
                <span style={{ fontSize: 9, color: '#7f95a8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Center Y
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    color: '#375469',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    minWidth: 0,
                  }}
                >
                  {formatCenterMm(selectedField.centerDesign.y)}
                </span>
              </div>
            </div>
          </div>

          <div style={FLOATING_SECTION_CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={sectionTitleStyle}>Transform</span>
                <span style={{ fontSize: 10.5, color: '#73879a' }}>
                  Move, rotate, and scale this one field without changing the wafer model.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => {
                    resetFieldTransformOverride(selectedField.id);
                    setTransformDraft(ZERO_FIELD_TRANSFORM);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  style={sectionActionButtonStyle}
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowTransform((prev) => !prev)}
                  onPointerDown={(event) => event.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: '#869aad', fontSize: 14, lineHeight: 1 }}>{showTransform ? '-' : '+'}</span>
                </button>
              </div>
            </div>
            {showTransform && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {renderTransformControl('Translate X', 'Tx', 'nm', transformDraft.Tx, -2000, 2000, 5, 'Tx')}
                {renderTransformControl('Translate Y', 'Ty', 'nm', transformDraft.Ty, -2000, 2000, 5, 'Ty')}
                {renderTransformControl('Rotate', 'Th', 'urad', transformDraft.theta, -1200, 1200, 1, 'theta')}
                {renderTransformControl('Magnify', 'M', 'ppm', transformDraft.M, -300, 300, 0.5, 'M')}
                {renderTransformControl('Scale X', 'Sx', 'ppm', transformDraft.Sx, -300, 300, 0.5, 'Sx')}
                {renderTransformControl('Scale Y', 'Sy', 'ppm', transformDraft.Sy, -300, 300, 0.5, 'Sy')}
              </div>
            )}
          </div>

          <div style={FLOATING_SECTION_CARD}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={sectionTitleStyle}>Corner Residuals</span>
                <span style={{ fontSize: 10.5, color: '#73879a' }}>
                  Shape the four corners directly when a rigid transform is not enough.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    resetFieldCornerOverlay(selectedField.id);
                    setCornerDraft(ZERO_OVERLAY);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  style={sectionActionButtonStyle}
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowCorners((prev) => !prev)}
                  onPointerDown={(event) => event.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: '#869aad', fontSize: 14, lineHeight: 1 }}>{showCorners ? '-' : '+'}</span>
                </button>
              </div>
            </div>
            {showCorners && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 1fr',
                  gap: 8,
                  alignItems: 'center',
                  padding: '10px',
                  borderRadius: 12,
                  background: 'rgba(248, 251, 253, 0.92)',
                  border: '1px solid rgba(176, 193, 206, 0.22)',
                }}
              >
                <div />
                <div style={{ fontSize: 9.5, color: '#869aad', textTransform: 'uppercase', letterSpacing: '0.05em' }}>dx</div>
                <div style={{ fontSize: 9.5, color: '#869aad', textTransform: 'uppercase', letterSpacing: '0.05em' }}>dy</div>
                {CORNER_LABELS.map((label, index) => (
                  <React.Fragment key={label}>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#486579',
                        fontWeight: 800,
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.86)',
                        border: '1px solid rgba(176,193,206,0.22)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {label}
                    </div>
                    <input
                      type="number"
                      value={Number(cornerDraft.cornerDx[index].toFixed(2))}
                      step={0.5}
                      onChange={(e) => updateCornerValue(index, 'x', parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        fontSize: 11.5,
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 9,
                        padding: '6px 7px',
                        color: '#203547',
                        fontFamily: 'monospace',
                        outline: 'none',
                      }}
                    />
                    <input
                      type="number"
                      value={Number(cornerDraft.cornerDy[index].toFixed(2))}
                      step={0.5}
                      onChange={(e) => updateCornerValue(index, 'y', parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        fontSize: 11.5,
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 9,
                        padding: '6px 7px',
                        color: '#203547',
                        fontFamily: 'monospace',
                        outline: 'none',
                      }}
                    />
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  );
});

FieldEditPanel.displayName = 'FieldEditPanel';
