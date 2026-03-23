import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { WaferLayoutHook } from '../../hooks/useWaferLayout';
import { useWaferStore, ZERO_OVERLAY } from '../../store/useWaferStore';
import {
  applyCornerOverlayToQuad,
  applyFieldTransformToRenderedQuad,
  computeRenderedFieldFrame,
} from '../../utils/renderCorners';
import { FIELD_EDIT_RENDER_SCALE } from '../../utils/fieldEditGeometry';
import type { CornerOverlay, FieldTransformOverride } from '../../types/wafer';

interface Props {
  layout: WaferLayoutHook;
  variant: 'interactive' | 'reference';
  clipId: string;
  zoomScale: number;
}

type Vec2 = [number, number];

type TransformDragMode = 'translate' | 'rotate' | 'scale-uniform' | 'scale-x' | 'scale-y' | 'corner';

type HandleDragState = {
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
};

const GEOMETRY_RENDER_SCALE = 1;

function add(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]];
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}

function scale(v: Vec2, k: number): Vec2 {
  return [v[0] * k, v[1] * k];
}

function mid(a: Vec2, b: Vec2): Vec2 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function length(v: Vec2): number {
  return Math.hypot(v[0], v[1]);
}

function normalize(v: Vec2): Vec2 {
  const len = length(v);
  return len > 0 ? [v[0] / len, v[1] / len] : [1, 0];
}

function dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1];
}

function avgQuad(quad: [Vec2, Vec2, Vec2, Vec2]): Vec2 {
  return [
    (quad[0][0] + quad[1][0] + quad[2][0] + quad[3][0]) / 4,
    (quad[0][1] + quad[1][1] + quad[2][1] + quad[3][1]) / 4,
  ];
}

function clientToLocal(target: SVGGraphicsElement, clientX: number, clientY: number): Vec2 {
  const svg = target.ownerSVGElement;
  const ctm = target.getScreenCTM();
  if (!svg || !ctm) return [0, 0];
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const transformed = point.matrixTransform(ctm.inverse());
  return [transformed.x, transformed.y];
}

function localToScreen(target: SVGGraphicsElement, point: Vec2): Vec2 {
  const svg = target.ownerSVGElement;
  const ctm = target.getScreenCTM();
  if (!svg || !ctm) return point;
  const p = svg.createSVGPoint();
  p.x = point[0];
  p.y = point[1];
  const transformed = p.matrixTransform(ctm);
  return [transformed.x, transformed.y];
}

function normalizeAngleDelta(delta: number): number {
  let value = delta;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function renderHandleGlyph(mode: TransformDragMode, center: Vec2) {
  if (mode === 'rotate') {
    return (
      <g transform={`translate(${center[0]} ${center[1]})`}>
        <circle
          cx={0}
          cy={0}
          r={6.2}
          fill="#f8fbfd"
          stroke="#2d6a9d"
          strokeWidth={1.8}
        />
        <circle
          cx={0}
          cy={0}
          r={1.7}
          fill="#2d6a9d"
        />
        <path
          d="M -3.7 4.2 L -1.7 2.1"
          fill="none"
          stroke="#2d6a9d"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }

  if (mode === 'scale-uniform') {
    return (
      <g transform={`translate(${center[0]} ${center[1]})`}>
        <rect
          x={-4.2}
          y={-4.2}
          width={8.4}
          height={8.4}
          rx={1.4}
          fill="#f8fbfd"
          stroke="#2d6a9d"
          strokeWidth={1.5}
          transform="rotate(45)"
        />
        <path
          d="M -1.9 1.9 L 1.9 -1.9"
          fill="none"
          stroke="#2d6a9d"
          strokeWidth={1.1}
          strokeLinecap="round"
        />
        <path
          d="M 0.7 -1.9 L 2.5 -2.5 L 1.9 -0.7"
          fill="none"
          stroke="#2d6a9d"
          strokeWidth={1.05}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M -0.7 1.9 L -2.5 2.5 L -1.9 0.7"
          fill="none"
          stroke="#2d6a9d"
          strokeWidth={1.05}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }

  return null;
}

export const FieldGrid: React.FC<Props> = memo(({ layout, variant, clipId, zoomScale }) => {
  const fields = useWaferStore((s) => s.fields);
  const layoutConfig = useWaferStore((s) => s.layoutConfig);
  const showFieldBoundaries = useWaferStore((s) => s.viewState.showFieldBoundaries);
  const granularity = useWaferStore((s) => s.viewState.granularity);
  const waferDistortion = useWaferStore((s) => s.waferDistortion);
  const fieldDistortion = useWaferStore((s) => s.fieldDistortion);
  const selectedFieldId = useWaferStore((s) => s.selectedFieldId);
  const selectField = useWaferStore((s) => s.selectField);
  const perFieldTransformOverrides = useWaferStore((s) => s.perFieldTransformOverrides);
  const perFieldCornerOverlays = useWaferStore((s) => s.perFieldCornerOverlays);
  const setFieldTransformOverride = useWaferStore((s) => s.setFieldTransformOverride);
  const setFieldCornerOverlay = useWaferStore((s) => s.setFieldCornerOverlay);

  const dragStateRef = useRef<HandleDragState | null>(null);

  const isInteractive = variant === 'interactive';
  const geometryRenderScale = isInteractive ? FIELD_EDIT_RENDER_SCALE : GEOMETRY_RENDER_SCALE;
  const isDieMode = granularity === 'die';
  const usePolygonDetail = isInteractive;
  const stroke = showFieldBoundaries
    ? (isDieMode ? 'rgba(99,125,149,0.82)' : 'rgba(112,136,156,0.72)')
    : 'transparent';
  const strokeWidth = isDieMode ? 1.15 : 0.9;
  const fill = isDieMode
    ? 'rgba(116,140,160,0.06)'
    : (isInteractive ? 'rgba(112,136,156,0.12)' : 'rgba(116,140,160,0.04)');
  const halfWUm = layoutConfig.fieldWidthMm * 500;
  const halfHUm = layoutConfig.fieldHeightMm * 500;

  const renderItems = useMemo(() => {
    return fields.map((field) => {
      const [designX, designY] = layout.toPixel(field.centerDesign.x, field.centerDesign.y);
      const baseFrame = usePolygonDetail
        ? computeRenderedFieldFrame(
          field.centerDesign,
          halfWUm,
          halfHUm,
          waferDistortion,
          fieldDistortion,
          layout.toPixel,
          geometryRenderScale,
        )
        : null;
      const transformedQuad = baseFrame
        ? applyFieldTransformToRenderedQuad(
          baseFrame.cornersPx,
          halfWUm,
          halfHUm,
          perFieldTransformOverrides[field.id],
          layout.pxPerUm,
          geometryRenderScale,
        )
        : null;
      const quad = transformedQuad
        ? applyCornerOverlayToQuad(
          transformedQuad,
          perFieldCornerOverlays[field.id],
          layout.pxPerUm,
          geometryRenderScale,
        )
        : null;
      const points = quad ? quad.map((c) => `${c[0]},${c[1]}`).join(' ') : null;
      const isSelected = isInteractive && selectedFieldId === field.id;
      const controlQuad = quad ?? baseFrame?.cornersPx ?? null;
      const center = controlQuad ? avgQuad(controlQuad) : null;
      const topMid = controlQuad ? mid(controlQuad[0], controlQuad[1]) : null;
      const rightMid = controlQuad ? mid(controlQuad[1], controlQuad[2]) : null;
      const bottomMid = controlQuad ? mid(controlQuad[2], controlQuad[3]) : null;
      const leftMid = controlQuad ? mid(controlQuad[3], controlQuad[0]) : null;
      const topDir = topMid && center ? normalize(sub(topMid, center)) : null;
      const uniformDir = controlQuad && center ? normalize(sub(controlQuad[1], center)) : null;
      const rotateHandle = topMid && topDir
        ? add(topMid, scale(topDir, 28))
        : null;
      const uniformHandle = controlQuad && uniformDir ? add(controlQuad[1], scale(uniformDir, 18)) : null;

      return {
        id: field.id,
        designX,
        designY,
        points,
        quad,
        isSelected,
        center,
        topMid,
        rightMid,
        bottomMid,
        leftMid,
        rotateHandle,
        uniformHandle,
        controlQuad,
      };
    });
  }, [
    fields,
    layout,
    halfWUm,
    halfHUm,
    usePolygonDetail,
    waferDistortion,
    fieldDistortion,
    perFieldTransformOverrides,
    perFieldCornerOverlays,
    geometryRenderScale,
    isInteractive,
    selectedFieldId,
  ]);

  const orderedRenderItems = useMemo(() => {
    const unselected = renderItems.filter((item) => !item.isSelected);
    const selected = renderItems.filter((item) => item.isSelected);
    return [...unselected, ...selected];
  }, [renderItems]);

  const beginTransformDrag = useCallback((
    fieldId: string,
    mode: TransformDragMode,
    anchor: Vec2,
    center: Vec2,
    xAxisUnit: Vec2,
    yAxisUnit: Vec2,
    uniformUnit: Vec2,
    event: React.PointerEvent<SVGGraphicsElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startPoint = clientToLocal(event.currentTarget, event.clientX, event.clientY);
    const screenCenter = mode === 'rotate'
      ? localToScreen(event.currentTarget, center)
      : undefined;
    const startAngle = mode === 'rotate' && screenCenter
      ? Math.atan2(event.clientY - screenCenter[1], event.clientX - screenCenter[0])
      : Math.atan2(startPoint[1] - center[1], startPoint[0] - center[0]);
    const currentTransform = perFieldTransformOverrides[fieldId] ?? {
      Tx: 0,
      Ty: 0,
      theta: 0,
      M: 0,
      Sx: 0,
      Sy: 0,
    };
    dragStateRef.current = {
      fieldId,
      mode,
      target: event.currentTarget,
      startPoint,
      center,
      startTransform: currentTransform,
      xAxisUnit,
      yAxisUnit,
      uniformUnit,
      startXProjection: Math.max(1, Math.abs(dot(sub(anchor, center), xAxisUnit))),
      startYProjection: Math.max(1, Math.abs(dot(sub(anchor, center), yAxisUnit))),
      startUniformProjection: Math.max(1, Math.abs(dot(sub(anchor, center), uniformUnit))),
      startAngle,
      screenCenter,
      accumulatedTheta: currentTransform.theta,
    };
  }, [perFieldTransformOverrides]);

  const beginCornerDrag = useCallback((
    fieldId: string,
    cornerIndex: number,
    event: React.PointerEvent<SVGGraphicsElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startPoint = clientToLocal(event.currentTarget, event.clientX, event.clientY);
    const currentOverlay = perFieldCornerOverlays[fieldId] ?? ZERO_OVERLAY;
    dragStateRef.current = {
      fieldId,
      mode: 'corner',
      target: event.currentTarget,
      startPoint,
      center: [0, 0],
      startTransform: perFieldTransformOverrides[fieldId] ?? {
        Tx: 0,
        Ty: 0,
        theta: 0,
        M: 0,
        Sx: 0,
        Sy: 0,
      },
      xAxisUnit: [1, 0],
      yAxisUnit: [0, 1],
      uniformUnit: [1, 0],
      startXProjection: 1,
      startYProjection: 1,
      startUniformProjection: 1,
      startAngle: 0,
      cornerIndex,
      startOverlay: {
        cornerDx: [...currentOverlay.cornerDx] as CornerOverlay['cornerDx'],
        cornerDy: [...currentOverlay.cornerDy] as CornerOverlay['cornerDy'],
      },
    };
  }, [perFieldCornerOverlays, perFieldTransformOverrides]);

  useEffect(() => {
    if (!isInteractive) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const currentPoint = clientToLocal(drag.target, event.clientX, event.clientY);
      const deltaPx = sub(currentPoint, drag.startPoint);
      const pxToNm = 1000 / (layout.pxPerUm * FIELD_EDIT_RENDER_SCALE);

      if (drag.mode === 'corner' && drag.cornerIndex !== undefined && drag.startOverlay) {
        const nextOverlay = {
          cornerDx: [...drag.startOverlay.cornerDx] as CornerOverlay['cornerDx'],
          cornerDy: [...drag.startOverlay.cornerDy] as CornerOverlay['cornerDy'],
        };
        nextOverlay.cornerDx[drag.cornerIndex] += deltaPx[0] * pxToNm;
        nextOverlay.cornerDy[drag.cornerIndex] += -deltaPx[1] * pxToNm;
        setFieldCornerOverlay(drag.fieldId, nextOverlay);
        return;
      }

      if (drag.mode === 'translate') {
        setFieldTransformOverride(drag.fieldId, {
          Tx: drag.startTransform.Tx + deltaPx[0] * pxToNm,
          Ty: drag.startTransform.Ty - deltaPx[1] * pxToNm,
        });
        return;
      }

      if (drag.mode === 'rotate') {
        const screenCenter = drag.screenCenter ?? localToScreen(drag.target, drag.center);
        const angle = Math.atan2(event.clientY - screenCenter[1], event.clientX - screenCenter[0]);
        const deltaAngle = normalizeAngleDelta(angle - drag.startAngle);
        const nextTheta = (drag.accumulatedTheta ?? drag.startTransform.theta) - deltaAngle * 1e6 / FIELD_EDIT_RENDER_SCALE;
        drag.startAngle = angle;
        drag.accumulatedTheta = nextTheta;
        setFieldTransformOverride(drag.fieldId, {
          theta: nextTheta,
        });
        return;
      }

      if (drag.mode === 'scale-uniform') {
        const projection = dot(sub(currentPoint, drag.center), drag.uniformUnit);
        const ratio = projection / drag.startUniformProjection;
        setFieldTransformOverride(drag.fieldId, {
          M: drag.startTransform.M + (ratio - 1) * 1e6 / FIELD_EDIT_RENDER_SCALE,
        });
        return;
      }

      if (drag.mode === 'scale-x') {
        const projection = dot(sub(currentPoint, drag.center), drag.xAxisUnit);
        const ratio = projection / drag.startXProjection;
        setFieldTransformOverride(drag.fieldId, {
          Sx: drag.startTransform.Sx + (ratio - 1) * 1e6 / FIELD_EDIT_RENDER_SCALE,
        });
        return;
      }

      const projection = dot(sub(currentPoint, drag.center), drag.yAxisUnit);
      const ratio = projection / drag.startYProjection;
      setFieldTransformOverride(drag.fieldId, {
        Sy: drag.startTransform.Sy + (ratio - 1) * 1e6 / FIELD_EDIT_RENDER_SCALE,
      });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isInteractive, layout.pxPerUm, setFieldCornerOverlay, setFieldTransformOverride, zoomScale]);

  return (
    <g clipPath={variant === 'reference' ? `url(#${clipId})` : undefined}>
      {orderedRenderItems.map((item) => {
        if (item.points) {
          return (
            <g
              key={item.id}
              data-no-zoom={item.isSelected ? 'true' : undefined}
            >
              <polygon
                data-field-id={item.id}
                points={item.points}
                fill={fill}
                stroke={item.isSelected ? 'rgba(40,97,150,0.95)' : stroke}
                strokeWidth={item.isSelected ? 1.5 : strokeWidth}
                strokeLinejoin="round"
                style={{ cursor: isInteractive ? 'pointer' : 'default' }}
                onClick={isInteractive ? () => selectField(item.id) : undefined}
              />
              {item.isSelected && item.center && item.topMid && item.rightMid && item.bottomMid && item.leftMid && item.rotateHandle && item.uniformHandle && (
                <g data-no-zoom="true">
                  {(() => {
                    const xAxisUnit = normalize(sub(item.rightMid, item.center));
                    const yAxisUnit = normalize(sub(item.topMid, item.center));
                    const uniformUnit = normalize(sub(item.uniformHandle, item.center));
                    const handles = [
                      { key: 'translate', center: item.center, mode: 'translate' as const, radius: 6, fill: '#2d6a9d', stroke: '#f8fbfd' },
                      { key: 'rotate', center: item.rotateHandle, mode: 'rotate' as const, radius: 10, fill: '#f8fbfd', stroke: '#2d6a9d' },
                      { key: 'uniform', center: item.uniformHandle, mode: 'scale-uniform' as const, radius: 5, fill: '#dfeef9', stroke: '#2d6a9d' },
                    ];
                    const edgeHandles = [
                      { key: 'scale-top-edge', from: item.controlQuad![0], to: item.controlQuad![1], anchor: item.topMid, mode: 'scale-y' as const, cursor: 'ns-resize' },
                      { key: 'scale-right-edge', from: item.controlQuad![1], to: item.controlQuad![2], anchor: item.rightMid, mode: 'scale-x' as const, cursor: 'ew-resize' },
                      { key: 'scale-bottom-edge', from: item.controlQuad![3], to: item.controlQuad![2], anchor: item.bottomMid, mode: 'scale-y' as const, cursor: 'ns-resize' },
                      { key: 'scale-left-edge', from: item.controlQuad![0], to: item.controlQuad![3], anchor: item.leftMid, mode: 'scale-x' as const, cursor: 'ew-resize' },
                    ];

                    return [
                      ...edgeHandles.map((edge) => (
                        <line
                          key={`${item.id}-${edge.key}`}
                          data-editor-handle="true"
                          data-editor-handle-key={edge.key}
                          data-editor-handle-field={item.id}
                          x1={edge.from[0]}
                          y1={edge.from[1]}
                          x2={edge.to[0]}
                          y2={edge.to[1]}
                          stroke="transparent"
                          strokeWidth={16}
                          style={{ cursor: edge.cursor, touchAction: 'none' }}
                          onPointerDown={(event) => beginTransformDrag(
                            item.id,
                            edge.mode,
                            edge.anchor,
                            item.center!,
                            xAxisUnit,
                            yAxisUnit,
                            uniformUnit,
                            event,
                          )}
                        />
                      )),
                      ...[
                        ...handles.filter((handle) => handle.mode !== 'rotate'),
                        ...handles.filter((handle) => handle.mode === 'rotate'),
                      ].map((handle) => (
                      <g key={`${item.id}-${handle.key}`}>
                        <circle
                          data-editor-handle="true"
                          data-editor-handle-key={handle.key}
                          data-editor-handle-field={item.id}
                          cx={handle.center[0]}
                          cy={handle.center[1]}
                          r={handle.mode === 'rotate' ? 22 : (handle.mode === 'scale-uniform' ? 16 : 12)}
                          fill="transparent"
                          style={{ cursor: handle.mode === 'rotate' ? 'crosshair' : (handle.mode === 'scale-uniform' ? 'nwse-resize' : 'grab'), touchAction: 'none' }}
                          onPointerDown={(event) => beginTransformDrag(
                            item.id,
                            handle.mode,
                            handle.center,
                            item.center!,
                            xAxisUnit,
                            yAxisUnit,
                            uniformUnit,
                            event,
                          )}
                        />
                        {handle.mode !== 'rotate' && (
                          <circle
                            cx={handle.center[0]}
                            cy={handle.center[1]}
                            r={handle.radius}
                            fill={handle.fill}
                            stroke={handle.stroke}
                            strokeWidth={1.4}
                            style={{ pointerEvents: 'none' }}
                          />
                        )}
                        <g style={{ pointerEvents: 'none' }}>
                          {renderHandleGlyph(handle.mode, handle.center)}
                        </g>
                      </g>
                      )),
                    ];
                  })()}
                  {item.quad && item.quad.map((corner, index) => (
                    <g key={`${item.id}-corner-${index}`}>
                      <circle
                        data-editor-handle="true"
                        data-editor-handle-key={`corner-${index}`}
                        data-editor-handle-field={item.id}
                        cx={corner[0]}
                        cy={corner[1]}
                        r={11}
                        fill="transparent"
                        style={{ cursor: 'nwse-resize', touchAction: 'none' }}
                        onPointerDown={(event) => beginCornerDrag(item.id, index, event)}
                      />
                      <rect
                        x={corner[0] - 3.4}
                        y={corner[1] - 3.4}
                        width={6.8}
                        height={6.8}
                        rx={1.4}
                        fill="#fff7ef"
                        stroke="#cb8b4e"
                        strokeWidth={1.2}
                        style={{ pointerEvents: 'none' }}
                      />
                    </g>
                  ))}
                </g>
              )}
            </g>
          );
        }

        if (variant === 'reference') {
          return (
            <rect
              key={item.id}
              data-field-id={item.id}
              x={item.designX - layout.pxPerUm * (layoutConfig.fieldWidthMm * 500)}
              y={item.designY - layout.pxPerUm * (layoutConfig.fieldHeightMm * 500)}
              width={layout.pxPerUm * layoutConfig.fieldWidthMm * 1000}
              height={layout.pxPerUm * layoutConfig.fieldHeightMm * 1000}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              rx={0.5}
            />
          );
        }

        return null;
      })}
    </g>
  );
});

FieldGrid.displayName = 'FieldGrid';
