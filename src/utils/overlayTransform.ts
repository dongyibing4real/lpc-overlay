import type { Point } from '../types/wafer';

const NM_TO_UM = 1e-3;
const PPM = 1e-6;
const URAD_TO_RAD = 1e-6;

interface IndependentTransformInput {
  translationNm: Point;
  rotationUrad: number;
  magnificationPpm: number;
  asymScaleXPpm: number;
  asymScaleYPpm: number;
}

export function applyIndependentTransformUm(
  pos: Point,
  {
    translationNm,
    rotationUrad,
    magnificationPpm,
    asymScaleXPpm,
    asymScaleYPpm,
  }: IndependentTransformInput,
): Point {
  const tx = translationNm.x * NM_TO_UM;
  const ty = translationNm.y * NM_TO_UM;
  const theta = rotationUrad * URAD_TO_RAD;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const scaleX = 1 + (magnificationPpm + asymScaleXPpm) * PPM;
  const scaleY = 1 + (magnificationPpm + asymScaleYPpm) * PPM;
  const scaledX = pos.x * scaleX;
  const scaledY = pos.y * scaleY;

  return {
    x: cosTheta * scaledX - sinTheta * scaledY + tx,
    y: sinTheta * scaledX + cosTheta * scaledY + ty,
  };
}

export function computeIndependentDisplacementUm(
  pos: Point,
  input: IndependentTransformInput,
): Point {
  const transformed = applyIndependentTransformUm(pos, input);
  return {
    x: transformed.x - pos.x,
    y: transformed.y - pos.y,
  };
}
