import React, { memo, useEffect, useMemo, useState } from 'react';
import { useWaferStore, ZERO_OVERLAY, ZERO_FIELD_TRANSFORM } from '../state/waferStore';
import type { CornerOverlay, FieldTransformOverride } from '../types/wafer';
import { FIELD_EDIT_TRANSFORM_LIMITS } from '../utils/fieldEditGeometry';
import { NumericControlRow } from './common/NumericControlRow';
import { CARD, INNER_CARD } from '../styles/shared';
import css from './FieldEditPanel.module.css';

const CORNER_LABELS = ['TL', 'TR', 'BR', 'BL'] as const;

interface FieldEditPanelProps {
  floating?: boolean;
  onHeaderPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
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

export const FieldEditPanel: React.FC<FieldEditPanelProps> = memo(({
  floating = false,
  onHeaderPointerDown,
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
  const activeEditItems = useMemo(() => {
    const active: Array<'Transform' | 'Corner'> = [];
    if (hasTransformOverrides) active.push('Transform');
    if (hasCornerOverrides) active.push('Corner');
    return active;
  }, [hasCornerOverrides, hasTransformOverrides]);

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
      className={floating ? css.rootFloating : css.root}
      style={floating ? undefined : CARD}
    >
      <div
        onPointerDown={(event) => {
          if (!floating || !onHeaderPointerDown) return;
          if (isDragBlockedTarget(event.target)) return;
          onHeaderPointerDown(event);
        }}
        className={floating ? css.headerFloating : css.header}
      >
        <div className={css.headerLeft}>
          <div className={floating ? css.accentBarFloating : css.accentBar} />
          <div className={css.headerTitles}>
            <span className={css.headerSupertitle}>Selected Field</span>
            <span className={floating ? css.headerTitleFloating : css.headerTitle}>Field Editor</span>
          </div>
        </div>
        <div className={css.headerActions}>
          {selectedFieldId && (
            <button
              onClick={() => selectField(null)}
              onPointerDown={(event) => event.stopPropagation()}
              className={css.closeButton}
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div className={floating ? css.bodyFloating : css.body}>
        {!selectedField ? (
          <div
            style={{
              ...INNER_CARD,
              gap: 6,
              alignItems: 'flex-start',
              background: 'linear-gradient(180deg, rgba(248,252,255,0.94) 0%, rgba(242,248,252,0.96) 100%)',
            }}
          >
            <div className={css.emptyTitle}>No Field Selected</div>
            <div className={css.emptyDescription}>
              Click any field on the Actual Map to open a local inspector for transform overrides and corner residual shaping.
            </div>
          </div>
        ) : (
          <div className={css.sectionList}>
          {/* ── Field info card ── */}
          <div style={{ ...INNER_CARD, gap: 10 }} className={css.fieldInfoCard}>
            <div className={css.fieldInfoLayout}>
              <div className={css.fieldInfoNameBlock}>
                <div className={css.fieldName}>
                  Field ({selectedField.col}, {selectedField.row})
                </div>
                <div className={css.fieldId}>ID {selectedField.id}</div>
              </div>
            </div>
            <div className={css.fieldInfoGrid}>
              <div className={css.metaColumn}>
                <span className={css.metaLabel}>Active Edits</span>
                <div className={css.activeEditsList}>
                  {activeEditItems.length > 0 ? activeEditItems.map((item) => (
                    <span key={item} className={css.activeEditItem}>
                      <span aria-hidden="true" className={css.activeEditDot} />
                      {item}
                    </span>
                  )) : (
                    <span className={css.noEditsLabel}>No local edits</span>
                  )}
                </div>
              </div>
              <div className={css.twoColGrid}>
                <div className={css.metaColumn}>
                  <span className={css.metaLabel}>Center X</span>
                  <span className={css.monoValue}>{formatCenterMm(selectedField.centerDesign.x)}</span>
                </div>
                <div className={css.metaColumn}>
                  <span className={css.metaLabel}>Center Y</span>
                  <span className={css.monoValue}>{formatCenterMm(selectedField.centerDesign.y)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Transform section ── */}
          <div style={INNER_CARD}>
            <div className={css.sectionHeader}>
              <div className={css.sectionTitleBlock}>
                <span className={css.sectionTitle}>Transform</span>
                <span className={css.sectionSubtitle}>
                  Move, rotate, and scale this one field without changing the wafer model.
                </span>
              </div>
              <div className={css.sectionActions}>
                <button
                  onClick={() => {
                    resetFieldTransformOverride(selectedField.id);
                    setTransformDraft(ZERO_FIELD_TRANSFORM);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  className={css.pillButton}
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowTransform((prev) => !prev)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className={css.toggleButton}
                >
                  <span className={css.toggleIcon}>{showTransform ? '-' : '+'}</span>
                </button>
              </div>
            </div>
            {showTransform && (
              <div className={css.controlList}>
                {renderTransformControl('Translate X', 'Tx', 'nm', transformDraft.Tx, FIELD_EDIT_TRANSFORM_LIMITS.Tx[0], FIELD_EDIT_TRANSFORM_LIMITS.Tx[1], 5, 'Tx')}
                {renderTransformControl('Translate Y', 'Ty', 'nm', transformDraft.Ty, FIELD_EDIT_TRANSFORM_LIMITS.Ty[0], FIELD_EDIT_TRANSFORM_LIMITS.Ty[1], 5, 'Ty')}
                {renderTransformControl('Rotate', 'Th', 'urad', transformDraft.theta, FIELD_EDIT_TRANSFORM_LIMITS.theta[0], FIELD_EDIT_TRANSFORM_LIMITS.theta[1], 1, 'theta')}
                {renderTransformControl('Magnify', 'M', 'ppm', transformDraft.M, FIELD_EDIT_TRANSFORM_LIMITS.M[0], FIELD_EDIT_TRANSFORM_LIMITS.M[1], 0.5, 'M')}
                {renderTransformControl('Scale X', 'Sx', 'ppm', transformDraft.Sx, FIELD_EDIT_TRANSFORM_LIMITS.Sx[0], FIELD_EDIT_TRANSFORM_LIMITS.Sx[1], 0.5, 'Sx')}
                {renderTransformControl('Scale Y', 'Sy', 'ppm', transformDraft.Sy, FIELD_EDIT_TRANSFORM_LIMITS.Sy[0], FIELD_EDIT_TRANSFORM_LIMITS.Sy[1], 0.5, 'Sy')}
              </div>
            )}
          </div>

          {/* ── Corner residuals section ── */}
          <div style={INNER_CARD}>
            <div className={css.sectionHeaderFull}>
              <div className={css.sectionTitleBlock}>
                <span className={css.sectionTitle}>Corner Residuals</span>
                <span className={css.sectionSubtitle}>
                  Shape the four corners directly when a rigid transform is not enough.
                </span>
              </div>
              <div className={css.sectionActions}>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    resetFieldCornerOverlay(selectedField.id);
                    setCornerDraft(ZERO_OVERLAY);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  className={css.pillButton}
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowCorners((prev) => !prev)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className={css.toggleButton}
                >
                  <span className={css.toggleIcon}>{showCorners ? '-' : '+'}</span>
                </button>
              </div>
            </div>
            {showCorners && (
              <div className={css.cornerGrid}>
                <div />
                <div className={css.cornerAxisLabel}>dx</div>
                <div className={css.cornerAxisLabel}>dy</div>
                {CORNER_LABELS.map((label, index) => (
                  <React.Fragment key={label}>
                    <div className={css.cornerLabel}>{label}</div>
                    <input
                      type="number"
                      value={Number(cornerDraft.cornerDx[index].toFixed(2))}
                      step={0.5}
                      onChange={(e) => updateCornerValue(index, 'x', parseFloat(e.target.value) || 0)}
                      className={css.cornerInput}
                    />
                    <input
                      type="number"
                      value={Number(cornerDraft.cornerDy[index].toFixed(2))}
                      step={0.5}
                      onChange={(e) => updateCornerValue(index, 'y', parseFloat(e.target.value) || 0)}
                      className={css.cornerInput}
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
