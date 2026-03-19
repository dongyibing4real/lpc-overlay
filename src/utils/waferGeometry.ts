import type { WaferLayoutConfig, FieldCell, DieCell, Point } from '../types/wafer';

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

export function generateDieGrid(fields: FieldCell[], cfg: WaferLayoutConfig): DieCell[] {
  const fw = cfg.fieldWidthMm * 1000;
  const fh = cfg.fieldHeightMm * 1000;
  const dw = fw / cfg.diesPerFieldX;
  const dh = fh / cfg.diesPerFieldY;

  const dies: DieCell[] = [];

  for (const field of fields) {
    for (let dr = 0; dr < cfg.diesPerFieldY; dr++) {
      for (let dc = 0; dc < cfg.diesPerFieldX; dc++) {
        const localX = (dc - (cfg.diesPerFieldX - 1) / 2) * dw;
        const localY = (dr - (cfg.diesPerFieldY - 1) / 2) * dh;

        dies.push({
          id: `d_${field.col}_${field.row}_${dc}_${dr}`,
          fieldId: field.id,
          localPos: { x: localX, y: localY },
          designPos: { x: field.centerDesign.x + localX, y: field.centerDesign.y + localY },
          isActive: true,
        });
      }
    }
  }

  return dies;
}
