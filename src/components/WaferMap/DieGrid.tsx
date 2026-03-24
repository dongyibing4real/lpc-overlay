import React, { memo, useMemo } from 'react';
import type { WaferLayoutHook } from '../../hooks/useWaferLayout';
import { useWaferStore } from '../../state/waferStore';
import {
  applyCornerOverlayToQuad,
  applyFieldTransformToRenderedQuad,
  computeRenderedFieldFrame,
} from '../../utils/renderCorners';
import { FIELD_EDIT_RENDER_SCALE } from '../../utils/fieldEditGeometry';

interface Props {
  layout: WaferLayoutHook;
  variant: 'interactive' | 'reference';
  clipId: string;
  zoomScale?: number;
}

const GEOMETRY_RENDER_SCALE = 1;

export const DieGrid: React.FC<Props> = memo(({ layout, variant, clipId }) => {
  const fields = useWaferStore((s) => s.fields);
  const showDieBoundaries = useWaferStore((s) => s.viewState.showDieBoundaries);
  const layoutConfig = useWaferStore((s) => s.layoutConfig);
  const dataSource = useWaferStore((s) => s.viewState.dataSource);
  const waferDistortion = useWaferStore((s) => s.waferDistortion);
  const fieldDistortion = useWaferStore((s) => s.fieldDistortion);
  const perFieldTransformOverrides = useWaferStore((s) => s.perFieldTransformOverrides);
  const perFieldCornerOverlays = useWaferStore((s) => s.perFieldCornerOverlays);

  const { diesPerFieldX, diesPerFieldY } = layoutConfig;
  const fieldHalfWUm = layoutConfig.fieldWidthMm * 500;
  const fieldHalfHUm = layoutConfig.fieldHeightMm * 500;
  const geometryRenderScale = variant === 'interactive' ? FIELD_EDIT_RENDER_SCALE : GEOMETRY_RENDER_SCALE;

  const strokeColor = showDieBoundaries ? 'rgba(103,130,154,0.44)' : 'transparent';

  const gridPath = useMemo(() => {
    if (dataSource === 'imported') return '';
    if (diesPerFieldX <= 1 && diesPerFieldY <= 1) return '';

    const segments: string[] = [];

    for (const field of fields) {
      const frame = computeRenderedFieldFrame(
        field.centerDesign,
        fieldHalfWUm,
        fieldHalfHUm,
        waferDistortion,
        fieldDistortion,
        layout.toPixel,
        geometryRenderScale,
      );
      const cornerAdjusted = applyCornerOverlayToQuad(
        frame.cornersPx,
        perFieldCornerOverlays[field.id],
        layout.pxPerUm,
        geometryRenderScale,
      );
      const quad = applyFieldTransformToRenderedQuad(
        cornerAdjusted,
        fieldHalfWUm,
        fieldHalfHUm,
        perFieldTransformOverrides[field.id],
        layout.pxPerUm,
        geometryRenderScale,
        frame.cornersPx,
      );
      // quad = [TL, TR, BR, BL] in pixel space

      for (let r = 1; r < diesPerFieldY; r++) {
        const s = r / diesPerFieldY;
        const lx = quad[0][0] + (quad[3][0] - quad[0][0]) * s;
        const ly = quad[0][1] + (quad[3][1] - quad[0][1]) * s;
        const rx = quad[1][0] + (quad[2][0] - quad[1][0]) * s;
        const ry = quad[1][1] + (quad[2][1] - quad[1][1]) * s;
        segments.push(`M${lx} ${ly}L${rx} ${ry}`);
      }

      for (let c = 1; c < diesPerFieldX; c++) {
        const t = c / diesPerFieldX;
        const tx = quad[0][0] + (quad[1][0] - quad[0][0]) * t;
        const ty = quad[0][1] + (quad[1][1] - quad[0][1]) * t;
        const bx = quad[3][0] + (quad[2][0] - quad[3][0]) * t;
        const by = quad[3][1] + (quad[2][1] - quad[3][1]) * t;
        segments.push(`M${tx} ${ty}L${bx} ${by}`);
      }
    }

    return segments.join('');
  }, [
    fields,
    layout,
    waferDistortion,
    fieldDistortion,
    perFieldTransformOverrides,
    perFieldCornerOverlays,
    fieldHalfWUm,
    fieldHalfHUm,
    diesPerFieldX,
    diesPerFieldY,
    dataSource,
    geometryRenderScale,
  ]);

  if (!gridPath) return null;

  return (
    <g clipPath={variant === 'reference' ? `url(#${clipId})` : undefined} style={{ pointerEvents: 'none' }}>
      <path d={gridPath} stroke={strokeColor} strokeWidth={0.55} fill="none" opacity={0.95} />
    </g>
  );
});

DieGrid.displayName = 'DieGrid';
