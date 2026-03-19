import Papa from 'papaparse';
import type { OverlayRecord } from '../types/wafer';

export function parseOverlayCSV(file: File): Promise<OverlayRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        try {
          const records = results.data.map((row): OverlayRecord => ({
            x: parseFloat(row['x'] ?? row['X'] ?? row['wafer_x'] ?? '0'),
            y: parseFloat(row['y'] ?? row['Y'] ?? row['wafer_y'] ?? '0'),
            dx: parseFloat(row['dx'] ?? row['DX'] ?? row['overlay_x'] ?? '0'),
            dy: parseFloat(row['dy'] ?? row['DY'] ?? row['overlay_y'] ?? '0'),
          }));
          resolve(records.filter((r) => !isNaN(r.x) && !isNaN(r.y)));
        } catch (e) {
          reject(e);
        }
      },
      error: reject,
    });
  });
}

export function parseOverlayJSON(file: File): Promise<OverlayRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        const arr: unknown[] = Array.isArray(raw) ? raw : (raw as Record<string, unknown[]>).records ?? (raw as Record<string, unknown[]>).data ?? [];
        resolve(arr as OverlayRecord[]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
