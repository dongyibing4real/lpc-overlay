import { useMemo } from 'react';
import type { WaferLayoutHook } from '../../../hooks/useWaferLayout';
import { useWaferStore } from '../../../state/waferStore';
import {
  applyCornerOverlayToQuad,
  applyFieldTransformToRenderedQuad,
  computeRenderedFieldFrame,
} from '../../../utils/renderCorners';
import { FIELD_EDIT_RENDER_SCALE } from '../../../utils/fieldEditGeometry';
import { add, avgQuad, GEOMETRY_RENDER_SCALE, mid, normalize, scale, sub, type Vec2 } from './fieldGridGeometry';

export interface FieldGridRenderItem {
  id: string;
  designX: number;
  designY: number;
  points: string | null;
  baseQuad: [Vec2, Vec2, Vec2, Vec2] | null;
  quad: [Vec2, Vec2, Vec2, Vec2] | null;
  isSelected: boolean;
  center: Vec2 | null;
  topMid: Vec2 | null;
  rightMid: Vec2 | null;
  bottomMid: Vec2 | null;
  leftMid: Vec2 | null;
  rotateHandle: Vec2 | null;
  uniformHandle: Vec2 | null;
  controlQuad: [Vec2, Vec2, Vec2, Vec2] | null;
}

export function useFieldGridRenderItems(layout: WaferLayoutHook, isInteractive: boolean, usePolygonDetail: boolean) {
  const fields = useWaferStore((s) => s.fields);
  const layoutConfig = useWaferStore((s) => s.layoutConfig);
  const waferDistortion = useWaferStore((s) => s.waferDistortion);
  const fieldDistortion = useWaferStore((s) => s.fieldDistortion);
  const selectedFieldId = useWaferStore((s) => s.selectedFieldId);
  const perFieldTransformOverrides = useWaferStore((s) => s.perFieldTransformOverrides);
  const perFieldCornerOverlays = useWaferStore((s) => s.perFieldCornerOverlays);

  const halfWUm = layoutConfig.fieldWidthMm * 500;
  const halfHUm = layoutConfig.fieldHeightMm * 500;
  const geometryRenderScale = isInteractive ? FIELD_EDIT_RENDER_SCALE : GEOMETRY_RENDER_SCALE;

  const renderItems = useMemo<FieldGridRenderItem[]>(() => fields.map((field) => {
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
    const cornerAdjustedQuad = baseFrame
      ? applyCornerOverlayToQuad(baseFrame.cornersPx, perFieldCornerOverlays[field.id], layout.pxPerUm, geometryRenderScale)
      : null;
    const transformedBaseQuad = baseFrame
      ? applyFieldTransformToRenderedQuad(baseFrame.cornersPx, halfWUm, halfHUm, perFieldTransformOverrides[field.id], layout.pxPerUm, geometryRenderScale)
      : null;
    const quad = cornerAdjustedQuad
      ? applyFieldTransformToRenderedQuad(cornerAdjustedQuad, halfWUm, halfHUm, perFieldTransformOverrides[field.id], layout.pxPerUm, geometryRenderScale, baseFrame!.cornersPx)
      : null;
    const points = quad ? quad.map((c) => `${c[0]},${c[1]}`).join(' ') : null;
    const isSelected = isInteractive && selectedFieldId === field.id;
    const controlQuad = transformedBaseQuad ?? baseFrame?.cornersPx ?? null;
    const center = controlQuad ? avgQuad(controlQuad) : null;
    const topMid = controlQuad ? mid(controlQuad[0], controlQuad[1]) : null;
    const rightMid = controlQuad ? mid(controlQuad[1], controlQuad[2]) : null;
    const bottomMid = controlQuad ? mid(controlQuad[2], controlQuad[3]) : null;
    const leftMid = controlQuad ? mid(controlQuad[3], controlQuad[0]) : null;
    const topDir = topMid && center ? normalize(sub(topMid, center)) : null;
    const uniformDir = controlQuad && center ? normalize(sub(controlQuad[1], center)) : null;
    const rotateHandle = topMid && topDir ? add(topMid, scale(topDir, 28)) : null;
    const uniformHandle = controlQuad && uniformDir ? add(controlQuad[1], scale(uniformDir, 18)) : null;

    return {
      id: field.id,
      designX,
      designY,
      points,
      baseQuad: baseFrame?.cornersPx ?? null,
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
  }), [
    fields,
    layout,
    halfWUm,
    halfHUm,
    waferDistortion,
    fieldDistortion,
    perFieldTransformOverrides,
    perFieldCornerOverlays,
    geometryRenderScale,
    isInteractive,
    selectedFieldId,
    usePolygonDetail,
  ]);

  const orderedRenderItems = useMemo(() => {
    const unselected = renderItems.filter((item) => !item.isSelected);
    const selected = renderItems.filter((item) => item.isSelected);
    return [...unselected, ...selected];
  }, [renderItems]);

  return { orderedRenderItems, halfWUm, halfHUm };
}
