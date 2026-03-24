import { useCallback, useEffect, useRef } from 'react';
import { ZERO_OVERLAY, useWaferStore } from '../../../state/waferStore';
import { invertFieldTransformPointPx } from '../../../utils/renderCorners';
import { FIELD_EDIT_RENDER_SCALE } from '../../../utils/fieldEditGeometry';
import type { CornerOverlay } from '../../../types/wafer';
import {
  clientToLocal,
  computeScaleRatio,
  dot,
  localToScreen,
  normalizeAngleDelta,
  sub,
  type HandleDragState,
  type TransformDragMode,
  type Vec2,
} from './fieldGridGeometry';

interface Input {
  isInteractive: boolean;
  pxPerUm: number;
  halfWUm: number;
  halfHUm: number;
}

export function useFieldGridInteractions({ isInteractive, pxPerUm, halfWUm, halfHUm }: Input) {
  const perFieldTransformOverrides = useWaferStore((s) => s.perFieldTransformOverrides);
  const perFieldCornerOverlays = useWaferStore((s) => s.perFieldCornerOverlays);
  const setFieldTransformOverride = useWaferStore((s) => s.setFieldTransformOverride);
  const setFieldCornerOverlay = useWaferStore((s) => s.setFieldCornerOverlay);
  const dragStateRef = useRef<HandleDragState | null>(null);

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
    const screenCenter = mode === 'rotate' ? localToScreen(event.currentTarget, center) : undefined;
    const startAngle = mode === 'rotate' && screenCenter
      ? Math.atan2(event.clientY - screenCenter[1], event.clientX - screenCenter[0])
      : Math.atan2(startPoint[1] - center[1], startPoint[0] - center[0]);
    const currentTransform = perFieldTransformOverrides[fieldId] ?? { Tx: 0, Ty: 0, theta: 0, M: 0, Sx: 0, Sy: 0 };
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
      startXProjection: dot(sub(anchor, center), xAxisUnit),
      startYProjection: dot(sub(anchor, center), yAxisUnit),
      startUniformProjection: dot(sub(anchor, center), uniformUnit),
      startAngle,
      screenCenter,
      accumulatedTheta: currentTransform.theta,
    };
  }, [perFieldTransformOverrides]);

  const beginCornerDrag = useCallback((
    fieldId: string,
    cornerIndex: number,
    baseQuad: [Vec2, Vec2, Vec2, Vec2],
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
      startTransform: perFieldTransformOverrides[fieldId] ?? { Tx: 0, Ty: 0, theta: 0, M: 0, Sx: 0, Sy: 0 },
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
      startCornerQuad: baseQuad,
    };
  }, [perFieldCornerOverlays, perFieldTransformOverrides]);

  useEffect(() => {
    if (!isInteractive) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const currentPoint = clientToLocal(drag.target, event.clientX, event.clientY);
      const deltaPx = sub(currentPoint, drag.startPoint);
      const pxToNm = 1000 / (pxPerUm * FIELD_EDIT_RENDER_SCALE);

      if (drag.mode === 'corner' && drag.cornerIndex !== undefined && drag.startOverlay) {
        const startOverlayPoint = drag.startCornerQuad
          ? invertFieldTransformPointPx(drag.startPoint, drag.startCornerQuad, halfWUm, halfHUm, drag.startTransform, pxPerUm, FIELD_EDIT_RENDER_SCALE)
          : drag.startPoint;
        const currentOverlayPoint = drag.startCornerQuad
          ? invertFieldTransformPointPx(currentPoint, drag.startCornerQuad, halfWUm, halfHUm, drag.startTransform, pxPerUm, FIELD_EDIT_RENDER_SCALE)
          : currentPoint;
        const overlayDeltaPx = sub(currentOverlayPoint, startOverlayPoint);
        const nextOverlay = {
          cornerDx: [...drag.startOverlay.cornerDx] as CornerOverlay['cornerDx'],
          cornerDy: [...drag.startOverlay.cornerDy] as CornerOverlay['cornerDy'],
        };
        nextOverlay.cornerDx[drag.cornerIndex] += overlayDeltaPx[0] * pxToNm;
        nextOverlay.cornerDy[drag.cornerIndex] += -overlayDeltaPx[1] * pxToNm;
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
        const nextTheta = (drag.accumulatedTheta ?? drag.startTransform.theta) + deltaAngle * 1e6 / FIELD_EDIT_RENDER_SCALE;
        drag.startAngle = angle;
        drag.accumulatedTheta = nextTheta;
        setFieldTransformOverride(drag.fieldId, { theta: nextTheta });
        return;
      }

      if (drag.mode === 'scale-uniform') {
        const projection = dot(sub(currentPoint, drag.center), drag.uniformUnit);
        const ratio = computeScaleRatio(projection, drag.startUniformProjection);
        setFieldTransformOverride(drag.fieldId, { M: drag.startTransform.M + (ratio - 1) * 1e6 / FIELD_EDIT_RENDER_SCALE });
        return;
      }

      if (drag.mode === 'scale-x') {
        const projection = dot(sub(currentPoint, drag.center), drag.xAxisUnit);
        const ratio = computeScaleRatio(projection, drag.startXProjection);
        setFieldTransformOverride(drag.fieldId, { Sx: drag.startTransform.Sx + (ratio - 1) * 1e6 / FIELD_EDIT_RENDER_SCALE });
        return;
      }

      const projection = dot(sub(currentPoint, drag.center), drag.yAxisUnit);
      const ratio = computeScaleRatio(projection, drag.startYProjection);
      setFieldTransformOverride(drag.fieldId, { Sy: drag.startTransform.Sy + (ratio - 1) * 1e6 / FIELD_EDIT_RENDER_SCALE });
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
  }, [halfHUm, halfWUm, isInteractive, pxPerUm, setFieldCornerOverlay, setFieldTransformOverride]);

  return { beginTransformDrag, beginCornerDrag };
}
