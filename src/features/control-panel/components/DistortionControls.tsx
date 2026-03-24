import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useWaferStore } from '../../../state/waferStore';
import { NumericControlRow } from '../../../components/common/NumericControlRow';
import { cardTinted, accentBar, SECTION_HEADER, SECTION_TITLE } from '../../../styles/shared';

interface SectionHeaderProps {
  label: string;
  sublabel: string;
  accentColor: string;
  onReset: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ label, sublabel, accentColor, onReset }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
    <div style={SECTION_HEADER}>
      <div style={accentBar(accentColor)} />
      <span style={SECTION_TITLE}>{label}</span>
      <span style={{ fontSize: 9.5, color: '#7f96aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {sublabel}
      </span>
    </div>
    <button
      onClick={onReset}
      style={{
        fontSize: 10.5,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 999,
        padding: '3px 9px',
        cursor: 'pointer',
        color: '#627b90',
        transition: 'all 0.15s',
        letterSpacing: '0.03em',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#264155';
        e.currentTarget.style.borderColor = 'rgba(112,141,169,0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#627b90';
        e.currentTarget.style.borderColor = 'rgba(170,188,202,0.42)';
      }}
    >
      Reset
    </button>
  </div>
);

function useRafPatchCommit<T extends object>(commit: (patch: Partial<T>) => void) {
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<Partial<T>>({});

  const schedule = useCallback((patch: Partial<T>) => {
    pendingRef.current = { ...pendingRef.current, ...patch };
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const nextPatch = pendingRef.current;
      pendingRef.current = {};
      commit(nextPatch);
    });
  }, [commit]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  return schedule;
}

export const DistortionControls: React.FC = memo(() => {
  const waferDistortion = useWaferStore((s) => s.waferDistortion);
  const fieldDistortion = useWaferStore((s) => s.fieldDistortion);
  const epeConfig = useWaferStore((s) => s.epeConfig);
  const setWaferDistortion = useWaferStore((s) => s.setWaferDistortion);
  const setFieldDistortion = useWaferStore((s) => s.setFieldDistortion);
  const setEPEConfig = useWaferStore((s) => s.setEPEConfig);
  const clearCornerOverlays = useWaferStore((s) => s.clearCornerOverlays);

  const [waferDraft, setWaferDraft] = useState(waferDistortion);
  const [fieldDraft, setFieldDraft] = useState(fieldDistortion);
  const [epeDraft, setEpeDraft] = useState(epeConfig);

  useEffect(() => setWaferDraft(waferDistortion), [waferDistortion]);
  useEffect(() => setFieldDraft(fieldDistortion), [fieldDistortion]);
  useEffect(() => setEpeDraft(epeConfig), [epeConfig]);

  const commitWafer = useRafPatchCommit(setWaferDistortion);
  const commitField = useRafPatchCommit(setFieldDistortion);
  const commitEpe = useRafPatchCommit(setEPEConfig);

  const updateWafer = useCallback((patch: Partial<typeof waferDistortion>) => {
    setWaferDraft((prev) => ({ ...prev, ...patch }));
    commitWafer(patch);
  }, [commitWafer]);

  const updateField = useCallback((patch: Partial<typeof fieldDistortion>) => {
    setFieldDraft((prev) => ({ ...prev, ...patch }));
    commitField(patch);
  }, [commitField]);

  const updateEpe = useCallback((patch: Partial<typeof epeConfig>) => {
    setEpeDraft((prev) => ({ ...prev, ...patch }));
    commitEpe(patch);
  }, [commitEpe]);

  const resetWafer = useCallback(() => {
    const reset = { Tx: 0, Ty: 0, theta: 0, M: 0, Sx: 0, Sy: 0 };
    setWaferDraft(reset);
    setWaferDistortion(reset);
    clearCornerOverlays();
  }, [setWaferDistortion, clearCornerOverlays]);

  const resetField = useCallback(() => {
    const reset = { FTx: 0, FTy: 0, Ftheta: 0, FM: 0, FSx: 0, FSy: 0 };
    setFieldDraft(reset);
    setFieldDistortion(reset);
    clearCornerOverlays();
  }, [setFieldDistortion, clearCornerOverlays]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div
        style={{
          ...cardTinted(
            'linear-gradient(180deg, rgba(242,247,255,0.98) 0%, rgba(250,252,255,0.98) 100%)',
            'rgba(116, 152, 197, 0.22)',
          ),
          padding: '12px 12px',
        }}
      >
        <SectionHeader label="Wafer-Level" sublabel="Inter-field" accentColor="#4f8bc9" onReset={resetWafer} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <NumericControlRow label="Translation X" symbol="Tx" unit="nm" value={waferDraft.Tx} min={-2000} max={2000} step={5} showSlider chrome="soft" onChange={(v) => updateWafer({ Tx: v })} accentColor="#4f8bc9" displayPrecision={2} />
          <NumericControlRow label="Translation Y" symbol="Ty" unit="nm" value={waferDraft.Ty} min={-2000} max={2000} step={5} showSlider chrome="soft" onChange={(v) => updateWafer({ Ty: v })} accentColor="#4f8bc9" displayPrecision={2} />
          <NumericControlRow label="Rotation" symbol="Th" unit="urad" value={waferDraft.theta} min={-400} max={400} step={1} showSlider chrome="soft" onChange={(v) => updateWafer({ theta: v })} accentColor="#4f8bc9" displayPrecision={2} />
          <NumericControlRow label="Magnification" symbol="M" unit="ppm" value={waferDraft.M} min={-300} max={300} step={0.5} showSlider chrome="soft" onChange={(v) => updateWafer({ M: v })} accentColor="#4f8bc9" displayPrecision={2} />
          <NumericControlRow label="Asym Scale X" symbol="Sx" unit="ppm" value={waferDraft.Sx} min={-300} max={300} step={0.5} showSlider chrome="soft" onChange={(v) => updateWafer({ Sx: v })} accentColor="#4f8bc9" displayPrecision={2} />
          <NumericControlRow label="Asym Scale Y" symbol="Sy" unit="ppm" value={waferDraft.Sy} min={-300} max={300} step={0.5} showSlider chrome="soft" onChange={(v) => updateWafer({ Sy: v })} accentColor="#4f8bc9" displayPrecision={2} />
        </div>
      </div>

      <div
        style={{
          ...cardTinted(
            'linear-gradient(180deg, rgba(245,248,251,0.98) 0%, rgba(251,252,253,0.98) 100%)',
            'rgba(136, 155, 174, 0.2)',
          ),
          padding: '12px 12px',
        }}
      >
        <SectionHeader label="Field-Level" sublabel="Intra-field" accentColor="#728ea5" onReset={resetField} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <NumericControlRow label="Translation X" symbol="FTx" unit="nm" value={fieldDraft.FTx} min={-1000} max={1000} step={5} showSlider chrome="soft" onChange={(v) => updateField({ FTx: v })} accentColor="#728ea5" displayPrecision={2} />
          <NumericControlRow label="Translation Y" symbol="FTy" unit="nm" value={fieldDraft.FTy} min={-1000} max={1000} step={5} showSlider chrome="soft" onChange={(v) => updateField({ FTy: v })} accentColor="#728ea5" displayPrecision={2} />
          <NumericControlRow label="Rotation" symbol="FTh" unit="urad" value={fieldDraft.Ftheta} min={-300} max={300} step={1} showSlider chrome="soft" onChange={(v) => updateField({ Ftheta: v })} accentColor="#728ea5" displayPrecision={2} />
          <NumericControlRow label="Magnification" symbol="FM" unit="ppm" value={fieldDraft.FM} min={-200} max={200} step={0.5} showSlider chrome="soft" onChange={(v) => updateField({ FM: v })} accentColor="#728ea5" displayPrecision={2} />
          <NumericControlRow label="Asym Scale X" symbol="FSx" unit="ppm" value={fieldDraft.FSx} min={-200} max={200} step={0.5} showSlider chrome="soft" onChange={(v) => updateField({ FSx: v })} accentColor="#728ea5" displayPrecision={2} />
          <NumericControlRow label="Asym Scale Y" symbol="FSy" unit="ppm" value={fieldDraft.FSy} min={-200} max={200} step={0.5} showSlider chrome="soft" onChange={(v) => updateField({ FSy: v })} accentColor="#728ea5" displayPrecision={2} />
        </div>
      </div>

      <div
        style={{
          ...cardTinted(
            'linear-gradient(180deg, rgba(255,247,240,0.98) 0%, rgba(252,250,247,0.98) 100%)',
            'rgba(210, 154, 101, 0.24)',
          ),
          padding: '12px 12px',
        }}
      >
        <div style={{ ...SECTION_HEADER, marginBottom: 12 }}>
          <div style={accentBar('#d4874e')} />
          <span style={SECTION_TITLE}>EPE</span>
          <span style={{ fontSize: 10, color: '#7f96aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Edge Placement Error
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#61788d' }}>Mode</span>
            <select
              value={epeDraft.mode}
              onChange={(e) => updateEpe({ mode: e.target.value as 'none' | 'random' | 'systematic' })}
              style={{
                fontSize: 12,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 7,
                padding: '4px 10px',
                color: '#203547',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="none">None</option>
              <option value="random">Random</option>
              <option value="systematic">Systematic</option>
            </select>
          </div>
          {epeDraft.mode !== 'none' && (
            <>
              <NumericControlRow label="Magnitude" symbol="EPE" unit="nm" value={epeDraft.magnitude} min={0} max={250} step={1} showSlider chrome="soft" onChange={(v) => updateEpe({ magnitude: v })} accentColor="#d4874e" displayPrecision={2} />
              {epeDraft.mode === 'systematic' && (
                <NumericControlRow label="Direction" symbol="deg" unit="deg" value={epeDraft.systematicAngle} min={0} max={360} step={1} showSlider chrome="soft" onChange={(v) => updateEpe({ systematicAngle: v })} accentColor="#d4874e" displayPrecision={2} />
              )}
              {epeDraft.mode === 'random' && (
                <NumericControlRow label="RNG Seed" unit="id" value={epeDraft.seed} min={0} max={9999} step={1} onChange={(v) => updateEpe({ seed: Math.round(v) || 0 })} accentColor="#d4874e" displayPrecision={0} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

DistortionControls.displayName = 'DistortionControls';
