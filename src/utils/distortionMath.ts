import type {
  Point,
  WaferDistortionParams,
  FieldDistortionParams,
  EPEConfig,
  WaferLayoutConfig,
  FieldCell,
  DistortedPosition,
  OverlayStats,
} from '../types/wafer';
import { applyIndependentTransformUm } from './overlayTransform';

const NM_TO_UM = 1e-3;

export function computeIndependentOverlayNm(
  pos: Point,
  translationNm: Point,
  rotationUrad: number,
  magnificationPpm: number,
  asymScaleXPpm: number,
  asymScaleYPpm: number,
): [number, number] {
  const transformed = applyIndependentTransformUm(
    pos,
    {
      translationNm,
      rotationUrad,
      magnificationPpm,
      asymScaleXPpm,
      asymScaleYPpm,
    },
  );

  return [
    (transformed.x - pos.x) * 1e3,
    (transformed.y - pos.y) * 1e3,
  ];
}

export function applyWaferTransform(
  nominalCenter: Point,
  params: WaferDistortionParams,
): Point {
  return applyIndependentTransformUm(
    nominalCenter,
    {
      translationNm: { x: params.Tx, y: params.Ty },
      rotationUrad: params.theta,
      magnificationPpm: params.M,
      asymScaleXPpm: params.Sx,
      asymScaleYPpm: params.Sy,
    },
  );
}

export function applyFieldTransform(
  localPos: Point,
  params: FieldDistortionParams,
): Point {
  return applyIndependentTransformUm(
    localPos,
    {
      translationNm: { x: params.FTx, y: params.FTy },
      rotationUrad: params.Ftheta,
      magnificationPpm: params.FM,
      asymScaleXPpm: params.FSx,
      asymScaleYPpm: params.FSy,
    },
  );
}

function lcgRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function applyEPE(pos: Point, config: EPEConfig, dieIndex: number): Point {
  if (config.mode === 'none' || config.magnitude === 0) return pos;

  if (config.mode === 'random') {
    const rng = lcgRandom(config.seed + dieIndex * 31337);
    const angle = rng() * 2 * Math.PI;
    const r = rng() * config.magnitude * NM_TO_UM;
    return { x: pos.x + r * Math.cos(angle), y: pos.y + r * Math.sin(angle) };
  }

  const rad = (config.systematicAngle * Math.PI) / 180;
  const offset = config.magnitude * NM_TO_UM;
  return {
    x: pos.x + offset * Math.cos(rad),
    y: pos.y + offset * Math.sin(rad),
  };
}

const CORNER_SIGNS: [number, number][] = [
  [-1, +1],
  [+1, +1],
  [+1, -1],
  [-1, -1],
];

function buildCorners(
  center: Point,
  halfW: number,
  halfH: number,
): [Point, Point, Point, Point] {
  return [
    { x: center.x - halfW, y: center.y + halfH },
    { x: center.x + halfW, y: center.y + halfH },
    { x: center.x + halfW, y: center.y - halfH },
    { x: center.x - halfW, y: center.y - halfH },
  ];
}

function overlayNmAt(
  absPos: Point,
  localPos: Point,
  wp: WaferDistortionParams,
  fp: FieldDistortionParams,
): [number, number] {
  const wt = applyWaferTransform(absPos, wp);
  const ft = applyFieldTransform(localPos, fp);
  return [
    (wt.x - absPos.x + ft.x - localPos.x) * 1e3,
    (wt.y - absPos.y + ft.y - localPos.y) * 1e3,
  ];
}

export function computeFieldDistortion(
  field: FieldCell,
  waferParams: WaferDistortionParams,
  fieldParams: FieldDistortionParams,
  fieldHalfW: number,
  fieldHalfH: number,
): DistortedPosition {
  const distortedPos = applyWaferTransform(field.centerDesign, waferParams);
  const dx = (distortedPos.x - field.centerDesign.x) * 1e3;
  const dy = (distortedPos.y - field.centerDesign.y) * 1e3;

  const cornerDx = [0, 0, 0, 0] as [number, number, number, number];
  const cornerDy = [0, 0, 0, 0] as [number, number, number, number];
  const designCorners = buildCorners(field.centerDesign, fieldHalfW, fieldHalfH);
  const distortedCorners = [] as Point[];

  for (let i = 0; i < 4; i += 1) {
    const ox = CORNER_SIGNS[i][0] * fieldHalfW;
    const oy = CORNER_SIGNS[i][1] * fieldHalfH;
    const [cdx, cdy] = overlayNmAt(
      { x: field.centerDesign.x + ox, y: field.centerDesign.y + oy },
      { x: ox, y: oy },
      waferParams,
      fieldParams,
    );

    cornerDx[i] = cdx;
    cornerDy[i] = cdy;
    distortedCorners.push({
      x: designCorners[i].x + cornerDx[i] * NM_TO_UM,
      y: designCorners[i].y + cornerDy[i] * NM_TO_UM,
    });
  }

  return {
    entityId: field.id,
    designPos: field.centerDesign,
    distortedPos,
    designCorners,
    distortedCorners: distortedCorners as [Point, Point, Point, Point],
    dx,
    dy,
    magnitude: Math.sqrt(dx * dx + dy * dy),
    cornerDx,
    cornerDy,
  };
}

// ─── Field-driven die interpolation ──────────────────────────────────────────

function projectPointInQuad(
  quad: [Point, Point, Point, Point],
  localPoint: Point,
  fieldHalfW: number,
  fieldHalfH: number,
): Point {
  const tx = (localPoint.x + fieldHalfW) / (2 * fieldHalfW);
  const ty = (fieldHalfH - localPoint.y) / (2 * fieldHalfH);
  const topX = quad[0].x + (quad[1].x - quad[0].x) * tx;
  const topY = quad[0].y + (quad[1].y - quad[0].y) * tx;
  const botX = quad[3].x + (quad[2].x - quad[3].x) * tx;
  const botY = quad[3].y + (quad[2].y - quad[3].y) * tx;
  return {
    x: topX + (botX - topX) * ty,
    y: topY + (botY - topY) * ty,
  };
}

/**
 * Derives die-level DistortedPosition[] from a field's final distorted quad.
 * The final quad already includes wafer distortion, field distortion,
 * per-field transform overrides, and per-field corner overlays.
 */
export function interpolateDieResultsFromField(
  field: FieldCell,
  finalFieldQuad: [Point, Point, Point, Point],
  _fieldResult: DistortedPosition,
  epeConfig: EPEConfig,
  layoutConfig: WaferLayoutConfig,
  fieldHalfW: number,
  fieldHalfH: number,
  globalDieIndexOffset: number,
): DistortedPosition[] {
  const { diesPerFieldX, diesPerFieldY, fieldWidthMm, fieldHeightMm } = layoutConfig;
  const dw = (fieldWidthMm * 1000) / diesPerFieldX;
  const dh = (fieldHeightMm * 1000) / diesPerFieldY;
  const dieHalfW = dw / 2;
  const dieHalfH = dh / 2;

  const results: DistortedPosition[] = [];
  let dieIdx = globalDieIndexOffset;

  for (let dr = 0; dr < diesPerFieldY; dr++) {
    for (let dc = 0; dc < diesPerFieldX; dc++) {
      const localX = (dc - (diesPerFieldX - 1) / 2) * dw;
      const localY = (dr - (diesPerFieldY - 1) / 2) * dh;
      const localPos: Point = { x: localX, y: localY };
      const designPos: Point = {
        x: field.centerDesign.x + localX,
        y: field.centerDesign.y + localY,
      };

      // Bilinear interpolation of die center within the field quad
      const interpolatedPos = projectPointInQuad(finalFieldQuad, localPos, fieldHalfW, fieldHalfH);

      // Apply EPE noise
      const distortedPos = applyEPE(interpolatedPos, epeConfig, dieIdx);

      const dx = (distortedPos.x - designPos.x) * 1e3;
      const dy = (distortedPos.y - designPos.y) * 1e3;

      // Interpolate die corners
      const designCorners: [Point, Point, Point, Point] = [
        { x: designPos.x - dieHalfW, y: designPos.y + dieHalfH },
        { x: designPos.x + dieHalfW, y: designPos.y + dieHalfH },
        { x: designPos.x + dieHalfW, y: designPos.y - dieHalfH },
        { x: designPos.x - dieHalfW, y: designPos.y - dieHalfH },
      ];
      const localCorners: [Point, Point, Point, Point] = [
        { x: localX - dieHalfW, y: localY + dieHalfH },
        { x: localX + dieHalfW, y: localY + dieHalfH },
        { x: localX + dieHalfW, y: localY - dieHalfH },
        { x: localX - dieHalfW, y: localY - dieHalfH },
      ];

      const epeOffsetX = distortedPos.x - interpolatedPos.x;
      const epeOffsetY = distortedPos.y - interpolatedPos.y;

      const cornerDx = [0, 0, 0, 0] as [number, number, number, number];
      const cornerDy = [0, 0, 0, 0] as [number, number, number, number];
      const distortedCorners: [Point, Point, Point, Point] = [
        { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
      ];

      for (let i = 0; i < 4; i++) {
        const projected = projectPointInQuad(finalFieldQuad, localCorners[i], fieldHalfW, fieldHalfH);
        const cx = projected.x + epeOffsetX;
        const cy = projected.y + epeOffsetY;
        distortedCorners[i] = { x: cx, y: cy };
        cornerDx[i] = (cx - designCorners[i].x) * 1e3;
        cornerDy[i] = (cy - designCorners[i].y) * 1e3;
      }

      results.push({
        entityId: `d_${field.col}_${field.row}_${dc}_${dr}`,
        designPos,
        distortedPos,
        designCorners,
        distortedCorners,
        dx,
        dy,
        magnitude: Math.sqrt(dx * dx + dy * dy),
        cornerDx,
        cornerDy,
        fieldId: field.id,
        localPos,
      });

      dieIdx++;
    }
  }

  return results;
}

// O(N) average-case selection; avoids full sort for P99/max
function quickselect(arr: number[], k: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo < hi) {
    const pivot = arr[(lo + hi) >> 1];
    let i = lo;
    let j = hi;
    while (i <= j) {
      while (arr[i] < pivot) i++;
      while (arr[j] > pivot) j--;
      if (i <= j) {
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        i++; j--;
      }
    }
    if (k <= j) hi = j;
    else if (k >= i) lo = i;
    else break;
  }
  return arr[k];
}

export function computeStats(results: DistortedPosition[]): OverlayStats | null {
  const n = results.length;
  if (n === 0) return null;

  const meanDx = results.reduce((s, r) => s + r.dx, 0) / n;
  const meanDy = results.reduce((s, r) => s + r.dy, 0) / n;
  const stdDx = Math.sqrt(results.reduce((s, r) => s + (r.dx - meanDx) ** 2, 0) / n);
  const stdDy = Math.sqrt(results.reduce((s, r) => s + (r.dy - meanDy) ** 2, 0) / n);

  const mags = results.map((r) => r.magnitude);
  let maxMag = mags[0];
  for (let i = 1; i < n; i++) {
    if (mags[i] > maxMag) maxMag = mags[i];
  }
  const p99Index = Math.max(0, Math.floor(n * 0.99) - 1);
  const p99 = quickselect(mags, p99Index);

  return {
    meanDx,
    meanDy,
    stdDx,
    stdDy,
    maxMagnitude: maxMag,
    p99Magnitude: p99,
    count: n,
  };
}
