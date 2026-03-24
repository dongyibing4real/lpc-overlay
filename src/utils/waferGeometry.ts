import type { WaferLayoutConfig, FieldCell, Point } from '../types/wafer.ts';

function isFieldActive(cx: number, cy: number, fw: number, fh: number, R: number): boolean {
  const halfW = fw / 2;
  const halfH = fh / 2;
  const corners: Point[] = [
    { x: cx - halfW, y: cy - halfH },
    { x: cx + halfW, y: cy - halfH },
    { x: cx - halfW, y: cy + halfH },
    { x: cx + halfW, y: cy + halfH },
  ];
  return corners.some((c) => c.x * c.x + c.y * c.y <= R * R);
}

export function generateFieldGrid(cfg: WaferLayoutConfig): FieldCell[] {
  const R = (cfg.waferDiameterMm / 2 - cfg.edgeExclusionMm) * 1000; // mm → µm
  const fw = cfg.fieldWidthMm * 1000;
  const fh = cfg.fieldHeightMm * 1000;
  const ox = cfg.fieldOffsetX;
  const oy = cfg.fieldOffsetY;

  const nCols = Math.ceil((2 * R) / fw) + 2;
  const nRows = Math.ceil((2 * R) / fh) + 2;
  const startCol = -Math.floor(nCols / 2);
  const startRow = -Math.floor(nRows / 2);

  const fields: FieldCell[] = [];

  for (let row = startRow; row < startRow + nRows; row++) {
    for (let col = startCol; col < startCol + nCols; col++) {
      const cx = col * fw + ox;
      const cy = row * fh + oy;
      const isActive = isFieldActive(cx, cy, fw, fh, R);
      if (isActive) {
        fields.push({
          id: `f_${col}_${row}`,
          col,
          row,
          centerDesign: { x: cx, y: cy },
          isActive: true,
        });
      }
    }
  }

  return fields;
}

