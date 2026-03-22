import type {
  CornerOverlay,
  FieldTransformOverride,
  FieldDistortionParams,
  Point,
  WaferDistortionParams,
} from '../types/wafer';
import { applyIndependentTransformUm } from './overlayTransform';

type Vec2 = [number, number];
type CornerTuple<T> = [T, T, T, T];

const NM_TO_UM = 1e-3;

function computeExaggeratedDisplacementUm(
  pos: Point,
  translationNm: Point,
  rotationUrad: number,
  magnificationPpm: number,
  asymScaleXPpm: number,
  asymScaleYPpm: number,
  renderScale: number,
): Point {
  const transformed = applyIndependentTransformUm(pos, {
    translationNm: {
      x: translationNm.x * renderScale,
      y: translationNm.y * renderScale,
    },
    rotationUrad: rotationUrad * renderScale,
    magnificationPpm: magnificationPpm * renderScale,
    asymScaleXPpm: asymScaleXPpm * renderScale,
    asymScaleYPpm: asymScaleYPpm * renderScale,
  });

  return {
    x: transformed.x - pos.x,
    y: transformed.y - pos.y,
  };
}

export function computeRenderedCorners(
  designCorners: [Point, Point, Point, Point],
  localCorners: [Point, Point, Point, Point],
  waferParams: WaferDistortionParams,
  fieldParams: FieldDistortionParams,
  toPixel: (umX: number, umY: number) => [number, number],
  renderScale: number,
): Vec2[] {
  const designCenter = {
    x: (designCorners[0].x + designCorners[1].x + designCorners[2].x + designCorners[3].x) / 4,
    y: (designCorners[0].y + designCorners[1].y + designCorners[2].y + designCorners[3].y) / 4,
  };
  const localCenter = {
    x: (localCorners[0].x + localCorners[1].x + localCorners[2].x + localCorners[3].x) / 4,
    y: (localCorners[0].y + localCorners[1].y + localCorners[2].y + localCorners[3].y) / 4,
  };
  const fieldDesignCenter = {
    x: designCenter.x - localCenter.x,
    y: designCenter.y - localCenter.y,
  };

  const waferCenterDisp = computeExaggeratedDisplacementUm(
    fieldDesignCenter,
    { x: waferParams.Tx, y: waferParams.Ty },
    waferParams.theta,
    waferParams.M,
    waferParams.Sx,
    waferParams.Sy,
    renderScale,
  );
  const fieldCenterDisp = computeExaggeratedDisplacementUm(
    { x: 0, y: 0 },
    { x: fieldParams.FTx, y: fieldParams.FTy },
    fieldParams.Ftheta,
    fieldParams.FM,
    fieldParams.FSx,
    fieldParams.FSy,
    renderScale,
  );

  const centerX = fieldDesignCenter.x + waferCenterDisp.x + fieldCenterDisp.x;
  const centerY = fieldDesignCenter.y + waferCenterDisp.y + fieldCenterDisp.y;

  const combinedTheta = waferParams.theta + fieldParams.Ftheta;
  const combinedM = waferParams.M + fieldParams.FM;
  const combinedSx = waferParams.Sx + fieldParams.FSx;
  const combinedSy = waferParams.Sy + fieldParams.FSy;

  return localCorners.map((localCorner) => {
    const localDisp = computeExaggeratedDisplacementUm(
      localCorner,
      { x: 0, y: 0 },
      combinedTheta,
      combinedM,
      combinedSx,
      combinedSy,
      renderScale,
    );

    return toPixel(
      centerX + localCorner.x + localDisp.x,
      centerY + localCorner.y + localDisp.y,
    );
  }) as [Vec2, Vec2, Vec2, Vec2];
}

export interface RenderedFieldFrame {
  centerPx: Vec2;
  xAxisPxPerUm: Vec2;
  yAxisPxPerUm: Vec2;
  cornersPx: CornerTuple<Vec2>;
}

function getLocalCorners(fieldHalfW: number, fieldHalfH: number): CornerTuple<Point> {
  return [
    { x: -fieldHalfW, y: fieldHalfH },
    { x: fieldHalfW, y: fieldHalfH },
    { x: fieldHalfW, y: -fieldHalfH },
    { x: -fieldHalfW, y: -fieldHalfH },
  ];
}

function quadCenter(quad: CornerTuple<Vec2>): Vec2 {
  return [
    (quad[0][0] + quad[1][0] + quad[2][0] + quad[3][0]) / 4,
    (quad[0][1] + quad[1][1] + quad[2][1] + quad[3][1]) / 4,
  ];
}

function transformLocalPoint(
  localPoint: Point,
  rotationUrad: number,
  magnificationPpm: number,
  asymScaleXPpm: number,
  asymScaleYPpm: number,
  parameterScale: number,
): Point {
  return applyIndependentTransformUm(localPoint, {
    translationNm: { x: 0, y: 0 },
    rotationUrad: rotationUrad * parameterScale,
    magnificationPpm: magnificationPpm * parameterScale,
    asymScaleXPpm: asymScaleXPpm * parameterScale,
    asymScaleYPpm: asymScaleYPpm * parameterScale,
  });
}

export function computeRenderedFieldFrame(
  fieldDesignCenter: Point,
  fieldHalfW: number,
  fieldHalfH: number,
  waferParams: WaferDistortionParams,
  fieldParams: FieldDistortionParams,
  toPixel: (umX: number, umY: number) => [number, number],
  renderScale: number,
): RenderedFieldFrame {
  const designCorners: CornerTuple<Point> = [
    { x: fieldDesignCenter.x - fieldHalfW, y: fieldDesignCenter.y + fieldHalfH },
    { x: fieldDesignCenter.x + fieldHalfW, y: fieldDesignCenter.y + fieldHalfH },
    { x: fieldDesignCenter.x + fieldHalfW, y: fieldDesignCenter.y - fieldHalfH },
    { x: fieldDesignCenter.x - fieldHalfW, y: fieldDesignCenter.y - fieldHalfH },
  ];
  const localCorners = getLocalCorners(fieldHalfW, fieldHalfH);
  const cornersPx = computeRenderedCorners(
    designCorners,
    localCorners,
    waferParams,
    fieldParams,
    toPixel,
    renderScale,
  ) as CornerTuple<Vec2>;
  const centerPx = quadCenter(cornersPx);

  return {
    centerPx,
    xAxisPxPerUm: [
      (cornersPx[1][0] - cornersPx[0][0]) / (2 * fieldHalfW),
      (cornersPx[1][1] - cornersPx[0][1]) / (2 * fieldHalfW),
    ],
    yAxisPxPerUm: [
      (cornersPx[0][0] - cornersPx[3][0]) / (2 * fieldHalfH),
      (cornersPx[0][1] - cornersPx[3][1]) / (2 * fieldHalfH),
    ],
    cornersPx,
  };
}

export function applyFieldTransformToRenderedQuad(
  quad: CornerTuple<Vec2>,
  fieldHalfW: number,
  fieldHalfH: number,
  override: FieldTransformOverride | undefined,
  pxPerUm: number,
  renderScale: number,
): CornerTuple<Vec2> {
  if (!override) return quad;

  const centerPx = quadCenter(quad);
  const xAxisPxPerUm: Vec2 = [
    (quad[1][0] - quad[0][0]) / (2 * fieldHalfW),
    (quad[1][1] - quad[0][1]) / (2 * fieldHalfW),
  ];
  const yAxisPxPerUm: Vec2 = [
    (quad[0][0] - quad[3][0]) / (2 * fieldHalfH),
    (quad[0][1] - quad[3][1]) / (2 * fieldHalfH),
  ];
  const translationPx: Vec2 = [
    override.Tx * NM_TO_UM * pxPerUm * renderScale,
    -override.Ty * NM_TO_UM * pxPerUm * renderScale,
  ];

  return getLocalCorners(fieldHalfW, fieldHalfH).map((corner) => {
    const transformed = transformLocalPoint(
      corner,
      override.theta,
      override.M,
      override.Sx,
      override.Sy,
      renderScale,
    );
    return [
      centerPx[0] + translationPx[0] + xAxisPxPerUm[0] * transformed.x + yAxisPxPerUm[0] * transformed.y,
      centerPx[1] + translationPx[1] + xAxisPxPerUm[1] * transformed.x + yAxisPxPerUm[1] * transformed.y,
    ] as Vec2;
  }) as CornerTuple<Vec2>;
}

export function applyCornerOverlayToQuad(
  quad: CornerTuple<Vec2>,
  overlay: CornerOverlay | undefined,
  pxPerUm: number,
  renderScale: number,
): CornerTuple<Vec2> {
  if (!overlay) return quad;
  return quad.map((corner, index) => [
    corner[0] + overlay.cornerDx[index] * 1e-3 * pxPerUm * renderScale,
    corner[1] - overlay.cornerDy[index] * 1e-3 * pxPerUm * renderScale,
  ]) as CornerTuple<Vec2>;
}



export function projectLocalPoint(frame: RenderedFieldFrame, localPoint: Point): Vec2 {
  return [
    frame.centerPx[0]
      + frame.xAxisPxPerUm[0] * localPoint.x
      + frame.yAxisPxPerUm[0] * localPoint.y,
    frame.centerPx[1]
      + frame.xAxisPxPerUm[1] * localPoint.x
      + frame.yAxisPxPerUm[1] * localPoint.y,
  ];
}

export function projectLocalCorners(
  frame: RenderedFieldFrame,
  localCorners: CornerTuple<Point>,
): CornerTuple<Vec2> {
  return localCorners.map((corner) => projectLocalPoint(frame, corner)) as CornerTuple<Vec2>;
}

export function computeRenderedCenter(
  designPos: Point,
  localPos: Point,
  waferParams: WaferDistortionParams,
  fieldParams: FieldDistortionParams,
  toPixel: (umX: number, umY: number) => [number, number],
  renderScale: number,
): Vec2 {
  const waferDisp = computeExaggeratedDisplacementUm(
    designPos,
    { x: waferParams.Tx, y: waferParams.Ty },
    waferParams.theta,
    waferParams.M,
    waferParams.Sx,
    waferParams.Sy,
    renderScale,
  );
  const fieldDisp = computeExaggeratedDisplacementUm(
    localPos,
    { x: fieldParams.FTx, y: fieldParams.FTy },
    fieldParams.Ftheta,
    fieldParams.FM,
    fieldParams.FSx,
    fieldParams.FSy,
    renderScale,
  );

  return toPixel(
    designPos.x + waferDisp.x + fieldDisp.x,
    designPos.y + waferDisp.y + fieldDisp.y,
  );
}
