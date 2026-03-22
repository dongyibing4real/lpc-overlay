import React, { useCallback, useMemo, useState } from 'react';
import { useWaferStore } from '../../store/useWaferStore';

const CARD: React.CSSProperties = {
  background: 'var(--panel-bg)',
  borderRadius: 14,
  padding: '13px 14px',
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--panel-shadow)',
};

interface ExportRow {
  x: number;
  y: number;
  xw: number;
  yw: number;
  xf: number;
  yf: number;
  dx: number;
  dy: number;
}

function downloadTextFile(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsv(rows: ExportRow[]): string {
  const header = 'x,y,xw,yw,xf,yf,dx,dy';
  const lines = rows.map((row) => [
    row.x,
    row.y,
    row.xw,
    row.yw,
    row.xf,
    row.yf,
    row.dx,
    row.dy,
  ].join(','));
  return [header, ...lines].join('\n');
}

export const FileUpload: React.FC = () => {
  const granularity = useWaferStore((s) => s.viewState.granularity);
  const distortionResults = useWaferStore((s) => s.distortionResults);
  const fields = useWaferStore((s) => s.fields);
  const [exportUnit, setExportUnit] = useState<'mm' | 'nm'>('mm');
  const [status, setStatus] = useState<'idle' | 'done'>('idle');

  const exportRows = useMemo<ExportRow[]>(() => {
    const resultMap = new Map(distortionResults.map((result) => [result.entityId, result]));
    const fieldMap = new Map(fields.map((field) => [field.id, field]));

    if (granularity === 'field') {
      return fields.map((field) => {
        const result = resultMap.get(field.id);
        return {
          x: field.centerDesign.x,
          y: field.centerDesign.y,
          xw: field.centerDesign.x,
          yw: field.centerDesign.y,
          xf: 0,
          yf: 0,
          dx: result?.dx ?? 0,
          dy: result?.dy ?? 0,
        };
      });
    }

    return distortionResults.map((result) => {
      const field = result.fieldId ? fieldMap.get(result.fieldId) : undefined;
      return {
        x: result.designPos.x,
        y: result.designPos.y,
        xw: field?.centerDesign.x ?? result.designPos.x,
        yw: field?.centerDesign.y ?? result.designPos.y,
        xf: result.localPos?.x ?? 0,
        yf: result.localPos?.y ?? 0,
        dx: result.dx,
        dy: result.dy,
      };
    });
  }, [distortionResults, fields, granularity]);

  const baseFilename = granularity === 'field' ? 'overlay-field-export' : 'overlay-die-export';

  const convertedRows = useMemo<ExportRow[]>(() => {
    const posFactor = exportUnit === 'mm' ? 1 / 1000 : 1000;
    const dispFactor = exportUnit === 'mm' ? 1 / 1_000_000 : 1;

    return exportRows.map((row) => ({
      x: row.x * posFactor,
      y: row.y * posFactor,
      xw: row.xw * posFactor,
      yw: row.yw * posFactor,
      xf: row.xf * posFactor,
      yf: row.yf * posFactor,
      dx: row.dx * dispFactor,
      dy: row.dy * dispFactor,
    }));
  }, [exportRows, exportUnit]);

  const handleExportCsv = useCallback(() => {
    downloadTextFile(`${baseFilename}-${exportUnit}.csv`, toCsv(convertedRows), 'text/csv;charset=utf-8');
    setStatus('done');
  }, [baseFilename, convertedRows, exportUnit]);

  const handleExportJson = useCallback(() => {
    downloadTextFile(`${baseFilename}-${exportUnit}.json`, JSON.stringify(convertedRows, null, 2), 'application/json;charset=utf-8');
    setStatus('done');
  }, [baseFilename, convertedRows, exportUnit]);

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 15, background: '#4b9b79', borderRadius: 99, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#243a4c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Export Data
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '12px 12px',
            background: 'rgba(255,255,255,0.78)',
          }}
        >
          <div style={{ fontSize: 12, color: '#5d7488', fontWeight: 600 }}>
            {exportRows.length.toLocaleString()} rows ready
          </div>
          <div style={{ fontSize: 10, color: '#90a3b3', marginTop: 4, letterSpacing: '0.04em' }}>
            columns: x / y / xw / yw / xf / yf / dx / dy
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#61788d' }}>Export unit</span>
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: 3,
            }}
          >
            {(['mm', 'nm'] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => setExportUnit(unit)}
                style={{
                  minWidth: 46,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                  background: exportUnit === unit ? 'var(--surface)' : 'transparent',
                  color: exportUnit === unit ? 'var(--text-1)' : 'var(--text-2)',
                  boxShadow: exportUnit === unit ? '0 2px 6px rgba(72,96,120,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleExportCsv}
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 600,
              color: '#243a4c',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '8px 10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Export CSV
          </button>
          <button
            onClick={handleExportJson}
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 600,
              color: '#243a4c',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '8px 10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Export JSON
          </button>
        </div>

        {status === 'done' && (
          <div style={{ fontSize: 11, color: '#5d7488' }}>
            Export complete. Current unit: {exportUnit}
          </div>
        )}
      </div>
    </div>
  );
};
