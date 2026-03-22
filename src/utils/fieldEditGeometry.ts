import type { DistortedPosition, CornerOverlay, FieldTransformOverride, Point } from '../types/wafer';
import { applyIndependentTransformUm } from './overlayTransform';

export const FIELD_EDIT_RENDER_SCALE = 10000;

type CornerTuplePoint = [Point, Point, Point, Point];

function getFieldLocalCorners(fieldHalfW: number, fieldHalfH: number): CornerTuplePoint {
  return [
    { x: -fieldHalfW, y: fieldHalfH },
    { x: fieldHalfW, y: fieldHalfH },
    { x: fieldHalfW, y: -fieldHalfH },
    { x: -fieldHalfW, y: -fieldHalfH },
  ];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function projectPointInQuadUm(
  quad: CornerTuplePoint,
  localPoint: Point,
  fieldHalfW: number,
  fieldHalfH: number,
): Point {
  const tx = (localPoint.x + fieldHalfW) / (2 * fieldHalfW);
  const ty = (fieldHalfH - localPoint.y) / (2 * fieldHalfH);

  const top = {
    x: lerp(quad[0].x, quad[1].x, tx),
    y: lerp(quad[0].y, quad[1].y, tx),
  };
  const bottom = {
    x: lerp(quad[3].x, quad[2].x, tx),
    y: lerp(quad[3].y, quad[2].y, tx),
  };

  return {
    x: lerp(top.x, bottom.x, ty),
    y: lerp(top.y, bottom.y, ty),
  };
}

function getQuadCenter(quad: CornerTuplePoint): Point {
  return {
    x: (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4,
    y: (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4,
  };
}

function transformFieldLocalPoint(localPoint: Point, transform: FieldTransformOverride): Point {
  return applyIndependentTransformUm(localPoint, {
    translationNm: { x: 0, y: 0 },
    rotationUrad: transform.theta,
    magnificationPpm: transform.M,
    asymScaleXPpm: transform.Sx,
    asymScaleYPpm: transform.Sy,
  });
}

export function isZeroFieldTransform(transform?: FieldTransformOverride): boolean {
  if (!transform) return true;
  return (
    transform.Tx === 0
    && transform.Ty === 0
    && transform.theta === 0
    && transform.M === 0
    && transform.Sx === 0
    && transform.Sy === 0
  );
}

export function isZeroOverlay(overlay?: CornerOverlay): boolean {
  if (!overlay) return true;
  return (
    overlay.cornerDx.every((v) => v === 0)
    && overlay.cornerDy.every((v) => v === 0)
  );
}

export function buildDistortedCornersFromOffsets(
  designCorners: [Point, Point, Point, Point] | undefined,
  cornerDx: [number, number, number, number] | undefined,
  cornerDy: [number, number, number, number] | undefined,
): DistortedPosition['distortedCorners'] {
  if (!designCorners || !cornerDx || !cornerDy) return undefined;
  return [
    { x: designCorners[0].x + cornerDx[0] * 1e-3, y: designCorners[0].y + cornerDy[0] * 1e-3 },
    { x: designCorners[1].x + cornerDx[1] * 1e-3, y: designCorners[1].y + cornerDy[1] * 1e-3 },
    { x: designCorners[2].x + cornerDx[2] * 1e-3, y: designCorners[2].y + cornerDy[2] * 1e-3 },
    { x: designCorners[3].x + cornerDx[3] * 1e-3, y: designCorners[3].y + cornerDy[3] * 1e-3 },
  ];
}

function buildResultFromGeometry(
  result: DistortedPosition,
  distortedPos: Point,
  distortedCorners: CornerTuplePoint,
): DistortedPosition {
  const designCorners = result.designCorners;
  const cornerDx = designCorners
    ? distortedCorners.map((corner, index) => (corner.x - designCorners[index].x) * 1e3) as [number, number, number, number]
    : result.cornerDx;
  const cornerDy = designCorners
    ? distortedCorners.map((corner, index) => (corner.y - designCorners[index].y) * 1e3) as [number, number, number, number]
    : result.cornerDy;
  const dx = (distortedPos.x - result.designPos.x) * 1e3;
  const dy = (distortedPos.y - result.designPos.y) * 1e3;

  return {
    ...result,
    distortedPos,
    distortedCorners,
    dx,
    dy,
    magnitude: Math.sqrt(dx * dx + dy * dy),
    cornerDx,
    cornerDy,
  };
}

export function applyFieldTransformToQuadUm(
  quad: CornerTuplePoint,
  fieldHalfW: number,
  fieldHalfH: number,
  transform: FieldTransformOverride | undefined,
): CornerTuplePoint {
  if (isZeroFieldTransform(transform)) return quad;

  const center = getQuadCenter(quad);
  const xAxis = {
    x: (quad[1].x - quad[0].x) / (2 * fieldHalfW),
    y: (quad[1].y - quad[0].y) / (2 * fieldHalfW),
  };
  const yAxis = {
    x: (quad[0].x - quad[3].x) / (2 * fieldHalfH),
    y: (quad[0].y - quad[3].y) / (2 * fieldHalfH),
  };
  const translation = {
    x: transform!.Tx * 1e-3,
    y: transform!.Ty * 1e-3,
  };

  return getFieldLocalCorners(fieldHalfW, fieldHalfH).map((corner) => {
    const local = transformFieldLocalPoint(corner, transform!);
    return {
      x: center.x + translation.x + xAxis.x * local.x + yAxis.x * local.y,
      y: center.y + translation.y + xAxis.y * local.x + yAxis.y * local.y,
    };
  }) as CornerTuplePoint;
}

export function applyCornerOverlayToQuadUm(
  quad: CornerTuplePoint,
  overlay: CornerOverlay | undefined,
): CornerTuplePoint {
  if (!overlay) return quad;
  return quad.map((corner, index) => ({
    x: corner.x + overlay.cornerDx[index] * 1e-3,
    y: corner.y + overlay.cornerDy[index] * 1e-3,
  })) as CornerTuplePoint;
}

export function applyFieldEditToFieldResult(
  result: DistortedPosition,
  finalFieldQuad: CornerTuplePoint,
  fieldHalfW: number,
  fieldHalfH: number,
): DistortedPosition {
  const distortedPos = projectPointInQuadUm(finalFieldQuad, { x: 0, y: 0 }, fieldHalfW, fieldHalfH);
  return buildResultFromGeometry(result, distortedPos, finalFieldQuad);
}
