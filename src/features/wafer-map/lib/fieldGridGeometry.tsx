import type { CornerOverlay, FieldTransformOverride } from '../../../types/wafer';

export type Vec2 = [number, number];

export type TransformDragMode = 'translate' | 'rotate' | 'scale-uniform' | 'scale-x' | 'scale-y' | 'corner';

export type HandleDragState = {
  fieldId: string;
  mode: TransformDragMode;
  target: SVGGraphicsElement;
  startPoint: Vec2;
  center: Vec2;
  startTransform: FieldTransformOverride;
  xAxisUnit: Vec2;
  yAxisUnit: Vec2;
  uniformUnit: Vec2;
  startXProjection: number;
  startYProjection: number;
  startUniformProjection: number;
  startAngle: number;
  screenCenter?: Vec2;
  accumulatedTheta?: number;
  cornerIndex?: number;
  startOverlay?: CornerOverlay;
  startCornerQuad?: [Vec2, Vec2, Vec2, Vec2];
};

export const GEOMETRY_RENDER_SCALE = 1;

export function add(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]];
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}

export function scale(v: Vec2, k: number): Vec2 {
  return [v[0] * k, v[1] * k];
}

export function mid(a: Vec2, b: Vec2): Vec2 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

export function length(v: Vec2): number {
  return Math.hypot(v[0], v[1]);
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  return len > 0 ? [v[0] / len, v[1] / len] : [1, 0];
}

export function dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1];
}

export function computeScaleRatio(projection: number, startProjection: number): number {
  if (!Number.isFinite(projection) || !Number.isFinite(startProjection) || Math.abs(startProjection) < 1e-6) {
    return 1;
  }
  return Math.max(0.05, projection / startProjection);
}

export function avgQuad(quad: [Vec2, Vec2, Vec2, Vec2]): Vec2 {
  return [
    (quad[0][0] + quad[1][0] + quad[2][0] + quad[3][0]) / 4,
    (quad[0][1] + quad[1][1] + quad[2][1] + quad[3][1]) / 4,
  ];
}

export function clientToLocal(target: SVGGraphicsElement, clientX: number, clientY: number): Vec2 {
  const svg = target.ownerSVGElement;
  const ctm = target.getScreenCTM();
  if (!svg || !ctm) return [0, 0];
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const transformed = point.matrixTransform(ctm.inverse());
  return [transformed.x, transformed.y];
}

export function localToScreen(target: SVGGraphicsElement, point: Vec2): Vec2 {
  const svg = target.ownerSVGElement;
  const ctm = target.getScreenCTM();
  if (!svg || !ctm) return point;
  const p = svg.createSVGPoint();
  p.x = point[0];
  p.y = point[1];
  const transformed = p.matrixTransform(ctm);
  return [transformed.x, transformed.y];
}

export function normalizeAngleDelta(delta: number): number {
  let value = delta;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

export function renderHandleGlyph(mode: TransformDragMode, center: Vec2) {
  if (mode === 'rotate') {
    return (
      <g transform={`translate(${center[0]} ${center[1]})`}>
        <circle cx={0} cy={0} r={6.2} fill="#f8fbfd" stroke="#2d6a9d" strokeWidth={1.8} />
        <circle cx={0} cy={0} r={1.7} fill="#2d6a9d" />
        <path d="M -3.7 4.2 L -1.7 2.1" fill="none" stroke="#2d6a9d" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }

  if (mode === 'scale-uniform') {
    return (
      <g transform={`translate(${center[0]} ${center[1]})`}>
        <rect x={-4.2} y={-4.2} width={8.4} height={8.4} rx={1.4} fill="#f8fbfd" stroke="#2d6a9d" strokeWidth={1.5} transform="rotate(45)" />
        <path d="M -1.9 1.9 L 1.9 -1.9" fill="none" stroke="#2d6a9d" strokeWidth={1.1} strokeLinecap="round" />
        <path d="M 0.7 -1.9 L 2.5 -2.5 L 1.9 -0.7" fill="none" stroke="#2d6a9d" strokeWidth={1.05} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M -0.7 1.9 L -2.5 2.5 L -1.9 0.7" fill="none" stroke="#2d6a9d" strokeWidth={1.05} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }

  return null;
}
