import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useWaferStore } from '../../store/useWaferStore';
import { NumericControlRow } from '../common/NumericControlRow';

const CARD: React.CSSProperties = {
  background: 'var(--panel-bg)',
  borderRadius: 14,
  padding: '13px 14px',
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--panel-shadow)',
};

interface SectionHeaderProps {
  label: string;
  sublabel: string;
  accentColor: string;
  onReset: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ label, sublabel, accentColor, onReset }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 3, height: 15, background: accentColor, borderRadius: 99, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: '#243a4c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontSize: 10, color: '#7f96aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {sublabel}
      </span>
    </div>
    <button
      onClick={onReset}
      style={{
        fontSize: 11,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 999,
        padding: '3px 10px',
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
  const clearEntityOverlays = useWaferStore((s) => s.clearEntityOverlays);

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
    clearEntityOverlays();
  }, [setWaferDistortion, clearEntityOverlays]);

  const resetField = useCallback(() => {
    const reset = { FTx: 0, FTy: 0, Ftheta: 0, FM: 0, FSx: 0, FSy: 0 };
    setFieldDraft(reset);
    setFieldDistortion(reset);
    clearEntityOverlays();
  }, [setFieldDistortion, clearEntityOverlays]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={CARD}>
        <SectionHeader label="Wafer-Level" sublabel="Inter-field" accentColor="#4f8bc9" onReset={resetWafer} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <NumericControlRow label="Translation X" symbol="Tx" unit="nm" value={waferDraft.Tx} min={-2000} max={2000} step={5} showSlider onChange={(v) => updateWafer({ Tx: v })} accentColor="#4f8bc9" displayPrecision={2} />
          <NumericControlRow label="Translation Y" symbol="Ty" unit="nm" value={waferDraft.Ty} min={-2000} max={2000} step={5} showSlider onChange={(v) => updateWafer({ Ty: v })} accentColor="#4f8bc9" displayPrecision={2} />
          <NumericControlRow label="Rotation" symbol="theta" unit="urad" value={waferDraft.theta} min={-400} max={400} step={1} showSlider onChange={(v) => updateWafer({ theta: v })} accentColor="#4f8bc9" displayPrecision={2} />
          <NumericControlRow label="Magnification" symbol="M" unit="ppm" value={waferDraft.M} min={-300} max={300} step={0.5} showSlider onChange={(v) => updateWafer({ M: v })} accentColor="#4f8bc9" displayPrecision={2} />
          <NumericControlRow label="Asym Scale X" symbol="Sx" unit="ppm" value={waferDraft.Sx} min={-300} max={300} step={0.5} showSlider onChange={(v) => updateWafer({ Sx: v })} accentColor="#4f8bc9" displayPrecision={2} />
          <NumericControlRow label="Asym Scale Y" symbol="Sy" unit="ppm" value={waferDraft.Sy} min={-300} max={300} step={0.5} showSlider onChange={(v) => updateWafer({ Sy: v })} accentColor="#4f8bc9" displayPrecision={2} />
        </div>
      </div>

      <div style={CARD}>
        <SectionHeader label="Field-Level" sublabel="Intra-field" accentColor="#728ea5" onReset={resetField} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <NumericControlRow label="Translation X" symbol="FTx" unit="nm" value={fieldDraft.FTx} min={-1000} max={1000} step={5} showSlider onChange={(v) => updateField({ FTx: v })} accentColor="#728ea5" displayPrecision={2} />
          <NumericControlRow label="Translation Y" symbol="FTy" unit="nm" value={fieldDraft.FTy} min={-1000} max={1000} step={5} showSlider onChange={(v) => updateField({ FTy: v })} accentColor="#728ea5" displayPrecision={2} />
          <NumericControlRow label="Rotation" symbol="Ftheta" unit="urad" value={fieldDraft.Ftheta} min={-300} max={300} step={1} showSlider onChange={(v) => updateField({ Ftheta: v })} accentColor="#728ea5" displayPrecision={2} />
          <NumericControlRow label="Magnification" symbol="FM" unit="ppm" value={fieldDraft.FM} min={-200} max={200} step={0.5} showSlider onChange={(v) => updateField({ FM: v })} accentColor="#728ea5" displayPrecision={2} />
          <NumericControlRow label="Asym Scale X" symbol="FSx" unit="ppm" value={fieldDraft.FSx} min={-200} max={200} step={0.5} showSlider onChange={(v) => updateField({ FSx: v })} accentColor="#728ea5" displayPrecision={2} />
          <NumericControlRow label="Asym Scale Y" symbol="FSy" unit="ppm" value={fieldDraft.FSy} min={-200} max={200} step={0.5} showSlider onChange={(v) => updateField({ FSy: v })} accentColor="#728ea5" displayPrecision={2} />
        </div>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 3, height: 15, background: '#d4874e', borderRadius: 99, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#243a4c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            EPE
          </span>
          <span style={{ fontSize: 10, color: '#7f96aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Edge Placement Error
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              <NumericControlRow label="Magnitude" symbol="EPE" unit="nm" value={epeDraft.magnitude} min={0} max={250} step={1} showSlider onChange={(v) => updateEpe({ magnitude: v })} accentColor="#d4874e" displayPrecision={2} />
              {epeDraft.mode === 'systematic' && (
                <NumericControlRow label="Direction" symbol="deg" unit="deg" value={epeDraft.systematicAngle} min={0} max={360} step={1} showSlider onChange={(v) => updateEpe({ systematicAngle: v })} accentColor="#d4874e" displayPrecision={2} />
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
