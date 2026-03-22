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

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: '#486579',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const sectionActionButtonStyle: React.CSSProperties = {
  fontSize: 9.5,
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: '#61788d',
  padding: '3px 7px',
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
    setShowCorners(true);
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

  if (floating && !selectedField) return null;

  return (
    <div
      data-no-zoom={floating ? 'true' : undefined}
      data-field-edit-panel="true"
      onPointerDown={(event) => {
        if (!floating || !onHeaderPointerDown) return;
        if (isDragBlockedTarget(event.target)) return;
        onHeaderPointerDown(event);
      }}
      style={{
        ...CARD,
        ...(floating
          ? {
            width: 212,
            padding: '9px 9px',
            background: 'rgba(250,252,253,0.82)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(166,184,198,0.32)',
            boxShadow: '0 10px 24px rgba(72,96,120,0.12)',
          }
          : null),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: floating ? 6 : 8,
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
          <div style={{ width: 3, height: floating ? 12 : 14, background: '#3c78a8', borderRadius: 99, flexShrink: 0 }} />
          <span style={{ fontSize: floating ? 10 : 10.5, fontWeight: 700, color: '#243a4c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Field Edit
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {floating && onResetPosition && (
            <button
              onClick={onResetPosition}
              onPointerDown={(event) => event.stopPropagation()}
              style={{
                fontSize: 9,
                border: '1px solid var(--line)',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.68)',
                color: '#61788d',
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              Dock
            </button>
          )}
          {selectedFieldId && (
            <button
              onClick={() => selectField(null)}
              onPointerDown={(event) => event.stopPropagation()}
              style={{
                fontSize: 9,
                border: '1px solid var(--line)',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.68)',
                color: '#61788d',
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {!selectedField ? (
        <div style={{ fontSize: 12, color: '#73879a', lineHeight: 1.5 }}>
          Select a field in the Actual Map to edit its local transform and corner residuals.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: floating ? 10 : 12 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: floating ? 6 : 7,
              padding: floating ? '7px 8px' : '8px 9px',
              borderRadius: 10,
              background: floating ? 'rgba(239,245,249,0.66)' : 'rgba(239,245,249,0.82)',
              border: '1px solid rgba(176,193,206,0.24)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
              <div style={{ fontSize: floating ? 11 : 11.5, fontWeight: 700, color: '#24465f', letterSpacing: '0.01em' }}>
                Field ({selectedField.col}, {selectedField.row})
              </div>
              <div
                style={{
                  fontSize: floating ? 8.5 : 9,
                  color: '#6f879a',
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.42)',
                  border: '1px solid rgba(176,193,206,0.22)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {selectedField.id}
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto 1fr',
                columnGap: 6,
                rowGap: 2,
                alignItems: 'center',
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: 9, color: '#7f95a8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cx
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  color: '#486579',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  minWidth: 0,
                }}
              >
                {formatCenterMm(selectedField.centerDesign.x)}
              </span>
              <span style={{ fontSize: 9, color: '#7f95a8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cy
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  color: '#486579',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  minWidth: 0,
                }}
              >
                {formatCenterMm(selectedField.centerDesign.y)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={sectionTitleStyle}>Transform</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => {
                    resetFieldTransformOverride(selectedField.id);
                    setTransformDraft(ZERO_FIELD_TRANSFORM);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  style={sectionActionButtonStyle}
                >
                  Reset T
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
                  <span style={{ color: '#869aad' }}>{showTransform ? '-' : '+'}</span>
                </button>
              </div>
            </div>
            {showTransform && (
              <>
                <NumericControlRow label="Translate X" unit="nm" value={transformDraft.Tx} min={-2000} max={2000} step={5} showSlider onChange={(value) => updateTransform({ Tx: value })} displayPrecision={2} />
                <NumericControlRow label="Translate Y" unit="nm" value={transformDraft.Ty} min={-2000} max={2000} step={5} showSlider onChange={(value) => updateTransform({ Ty: value })} displayPrecision={2} />
                <NumericControlRow label="Rotate" unit="urad" value={transformDraft.theta} min={-1200} max={1200} step={1} showSlider onChange={(value) => updateTransform({ theta: value })} displayPrecision={2} />
                <NumericControlRow label="Magnify" unit="ppm" value={transformDraft.M} min={-300} max={300} step={0.5} showSlider onChange={(value) => updateTransform({ M: value })} displayPrecision={2} />
                <NumericControlRow label="Scale X" unit="ppm" value={transformDraft.Sx} min={-300} max={300} step={0.5} showSlider onChange={(value) => updateTransform({ Sx: value })} displayPrecision={2} />
                <NumericControlRow label="Scale Y" unit="ppm" value={transformDraft.Sy} min={-300} max={300} step={0.5} showSlider onChange={(value) => updateTransform({ Sy: value })} displayPrecision={2} />
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <span style={sectionTitleStyle}>Corner Residuals</span>
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
                  Reset C
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
                  <span style={{ color: '#869aad' }}>{showCorners ? '-' : '+'}</span>
                </button>
              </div>
            </div>
            {showCorners && (
              <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', gap: 5, alignItems: 'center' }}>
                <div />
                <div style={{ fontSize: 9.5, color: '#869aad' }}>dx</div>
                <div style={{ fontSize: 9.5, color: '#869aad' }}>dy</div>
                {CORNER_LABELS.map((label, index) => (
                  <React.Fragment key={label}>
                    <div style={{ fontSize: 10, color: '#486579', fontWeight: 700 }}>{label}</div>
                    <input
                      type="number"
                      value={Number(cornerDraft.cornerDx[index].toFixed(2))}
                      step={0.5}
                      onChange={(e) => updateCornerValue(index, 'x', parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        fontSize: 11,
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 7,
                        padding: '4px 5px',
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
                        fontSize: 11,
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 7,
                        padding: '4px 5px',
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
  );
});

FieldEditPanel.displayName = 'FieldEditPanel';
