import type {
  Point,
  WaferDistortionParams,
  FieldDistortionParams,
  EPEConfig,
  DieCell,
  FieldCell,
  DistortedPosition,
  OverlayStats,
} from '../types/wafer';

const NM_TO_UM = 1e-3;
const PPM = 1e-6;
const URAD_TO_RAD = 1e-6;

function applyIndependentDistortionTransform(
  pos: Point,
  translationNm: Point,
  rotationUrad: number,
  magnificationPpm: number,
  asymScaleXPpm: number,
  asymScaleYPpm: number,
): Point {
  const tx = translationNm.x * NM_TO_UM;
  const ty = translationNm.y * NM_TO_UM;
  const theta = rotationUrad * URAD_TO_RAD;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const scaleDx = (magnificationPpm + asymScaleXPpm) * PPM * pos.x;
  const scaleDy = (magnificationPpm + asymScaleYPpm) * PPM * pos.y;
  const rotDx = (cosTheta - 1) * pos.x - sinTheta * pos.y;
  const rotDy = sinTheta * pos.x + (cosTheta - 1) * pos.y;

  return {
    x: pos.x + tx + scaleDx + rotDx,
    y: pos.y + ty + scaleDy + rotDy,
  };
}

export function computeIndependentOverlayNm(
  pos: Point,
  translationNm: Point,
  rotationUrad: number,
  magnificationPpm: number,
  asymScaleXPpm: number,
  asymScaleYPpm: number,
): [number, number] {
  const transformed = applyIndependentDistortionTransform(
    pos,
    translationNm,
    rotationUrad,
    magnificationPpm,
    asymScaleXPpm,
    asymScaleYPpm,
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
  return applyIndependentDistortionTransform(
    nominalCenter,
    { x: params.Tx, y: params.Ty },
    params.theta,
    params.M,
    params.Sx,
    params.Sy,
  );
}

export function applyFieldTransform(
  localPos: Point,
  params: FieldDistortionParams,
): Point {
  return applyIndependentDistortionTransform(
    localPos,
    { x: params.FTx, y: params.FTy },
    params.Ftheta,
    params.FM,
    params.FSx,
    params.FSy,
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

export function computeDieDistortion(
  die: DieCell,
  _field: FieldCell,
  waferParams: WaferDistortionParams,
  fieldParams: FieldDistortionParams,
  epeConfig: EPEConfig,
  dieIndex: number,
  dieHalfW: number,
  dieHalfH: number,
): DistortedPosition {
  const transformedAbsPos = applyWaferTransform(die.designPos, waferParams);
  const transformedLocalPos = applyFieldTransform(die.localPos, fieldParams);
  const intrafieldOverlayX = transformedLocalPos.x - die.localPos.x;
  const intrafieldOverlayY = transformedLocalPos.y - die.localPos.y;

  const preEpePos: Point = {
    x: transformedAbsPos.x + intrafieldOverlayX,
    y: transformedAbsPos.y + intrafieldOverlayY,
  };

  const distortedPos = applyEPE(preEpePos, epeConfig, dieIndex);
  const epeX = distortedPos.x - preEpePos.x;
  const epeY = distortedPos.y - preEpePos.y;

  const dx = (distortedPos.x - die.designPos.x) * 1e3;
  const dy = (distortedPos.y - die.designPos.y) * 1e3;

  const cornerDx = [0, 0, 0, 0] as [number, number, number, number];
  const cornerDy = [0, 0, 0, 0] as [number, number, number, number];
  const designCorners = buildCorners(die.designPos, dieHalfW, dieHalfH);
  const distortedCorners = [] as Point[];

  for (let i = 0; i < 4; i += 1) {
    const ox = CORNER_SIGNS[i][0] * dieHalfW;
    const oy = CORNER_SIGNS[i][1] * dieHalfH;
    const [cdx, cdy] = overlayNmAt(
      { x: die.designPos.x + ox, y: die.designPos.y + oy },
      { x: die.localPos.x + ox, y: die.localPos.y + oy },
      waferParams,
      fieldParams,
    );

    cornerDx[i] = cdx + epeX * 1e3;
    cornerDy[i] = cdy + epeY * 1e3;
    distortedCorners.push({
      x: designCorners[i].x + cornerDx[i] * NM_TO_UM,
      y: designCorners[i].y + cornerDy[i] * NM_TO_UM,
    });
  }

  return {
    entityId: die.id,
    designPos: die.designPos,
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

export function computeStats(results: DistortedPosition[]): OverlayStats | null {
  const n = results.length;
  if (n === 0) return null;

  const meanDx = results.reduce((s, r) => s + r.dx, 0) / n;
  const meanDy = results.reduce((s, r) => s + r.dy, 0) / n;
  const stdDx = Math.sqrt(results.reduce((s, r) => s + (r.dx - meanDx) ** 2, 0) / n);
  const stdDy = Math.sqrt(results.reduce((s, r) => s + (r.dy - meanDy) ** 2, 0) / n);

  const mags = results.map((r) => r.magnitude).sort((a, b) => a - b);
  const p99 = mags[Math.max(0, Math.floor(n * 0.99) - 1)];

  return {
    meanDx,
    meanDy,
    stdDx,
    stdDy,
    maxMagnitude: mags[n - 1],
    p99Magnitude: p99,
    count: n,
  };
}
