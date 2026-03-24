import React, { useCallback, useMemo, useState } from 'react';
import { useWaferStore } from '../../../state/waferStore';
import { cardTinted, accentBar, SECTION_HEADER, SECTION_TITLE } from '../../../styles/shared';
import css from './FileUpload.module.css';

const CARD = cardTinted(
  'linear-gradient(180deg, rgba(245,250,248,0.98) 0%, rgba(251,253,252,0.98) 100%)',
  'rgba(107, 163, 140, 0.2)',
);

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
      <div style={{ ...SECTION_HEADER, marginBottom: 12 }}>
        <div style={accentBar('#4b9b79')} />
        <span style={SECTION_TITLE}>Export Data</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className={css.infoBox}>
          <div className={css.infoTitle}>
            {exportRows.length.toLocaleString()} rows ready
          </div>
          <div className={css.infoSubtitle}>
            columns: x / y / xw / yw / xf / yf / dx / dy
          </div>
        </div>

        <div className={css.unitRow}>
          <span className={css.unitLabel}>Export unit</span>
          <div className={css.unitToggle}>
            {(['mm', 'nm'] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => setExportUnit(unit)}
                className={exportUnit === unit ? css.unitButtonActive : css.unitButtonInactive}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>

        <div className={css.exportButtons}>
          <button onClick={handleExportCsv} className={css.exportButton}>
            Export CSV
          </button>
          <button onClick={handleExportJson} className={css.exportButton}>
            Export JSON
          </button>
        </div>

        {status === 'done' && (
          <div className={css.statusMessage}>
            Export complete. Current unit: {exportUnit}
          </div>
        )}
      </div>
    </div>
  );
};
