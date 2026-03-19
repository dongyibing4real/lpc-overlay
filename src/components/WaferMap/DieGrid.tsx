import React, { memo, useMemo } from 'react';
import type { WaferLayoutHook } from '../../hooks/useWaferLayout';
import { useWaferStore } from '../../store/useWaferStore';
import type { DistortedPosition, Point } from '../../types/wafer';
import {
  applyCornerOverlayToQuad,
  applyFieldTransformToRenderedQuad,
  computeRenderedFieldFrame,
  projectLocalCornersInQuad,
} from '../../utils/renderCorners';
import { FIELD_EDIT_RENDER_SCALE } from '../../utils/fieldEditGeometry';

interface Props {
  layout: WaferLayoutHook;
  variant: 'interactive' | 'reference';
  clipId: string;
  zoomScale: number;
}

export const DieGrid: React.FC<Props> = memo(({ layout, variant, clipId }) => {
  const dies = useWaferStore((s) => s.dies);
  const distortionResults = useWaferStore((s) => s.distortionResults);
  const fields = useWaferStore((s) => s.fields);
  const showDieBoundaries = useWaferStore((s) => s.viewState.showDieBoundaries);
  const layoutConfig = useWaferStore((s) => s.layoutConfig);
  const granularity = useWaferStore((s) => s.viewState.granularity);
  const dataSource = useWaferStore((s) => s.viewState.dataSource);
  const waferDistortion = useWaferStore((s) => s.waferDistortion);
  const fieldDistortion = useWaferStore((s) => s.fieldDistortion);
  const perFieldTransformOverrides = useWaferStore((s) => s.perFieldTransformOverrides);
  const perFieldCornerOverlays = useWaferStore((s) => s.perFieldCornerOverlays);

  const dieWPx = layout.pxPerUm * (layoutConfig.fieldWidthMm * 1000 / layoutConfig.diesPerFieldX);
  const dieHPx = layout.pxPerUm * (layoutConfig.fieldHeightMm * 1000 / layoutConfig.diesPerFieldY);
  const dieHalfWUm = (layoutConfig.fieldWidthMm * 1000) / (2 * layoutConfig.diesPerFieldX);
  const dieHalfHUm = (layoutConfig.fieldHeightMm * 1000) / (2 * layoutConfig.diesPerFieldY);
  const fieldHalfWUm = layoutConfig.fieldWidthMm * 500;
  const fieldHalfHUm = layoutConfig.fieldHeightMm * 500;
  const isFieldLevel = granularity === 'field';
  const isInteractive = variant === 'interactive';
  const usePolygonDetail = isInteractive;

  if (dataSource === 'imported') return null;

  const strokeColor = showDieBoundaries ? 'rgba(103,130,154,0.44)' : 'transparent';

  const renderItems = useMemo(() => {
    const distMap = new Map<string, DistortedPosition>(distortionResults.map((r) => [r.entityId, r]));
    const fieldFrameMap = new Map(
      fields.map((field) => [
        field.id,
        computeRenderedFieldFrame(
          field.centerDesign,
          fieldHalfWUm,
          fieldHalfHUm,
          waferDistortion,
          fieldDistortion,
          layout.toPixel,
          FIELD_EDIT_RENDER_SCALE,
        ),
      ]),
    );

    return dies.map((die) => {
      const result = distMap.get(die.id);
      const [designX, designY] = layout.toPixel(die.designPos.x, die.designPos.y);
      const fill = isFieldLevel ? 'rgba(126,146,164,0.18)' : 'rgba(88,117,145,0.22)';

      const frame = fieldFrameMap.get(die.fieldId);
      const transformedQuad = frame
        ? applyFieldTransformToRenderedQuad(
          frame.cornersPx,
          fieldHalfWUm,
          fieldHalfHUm,
          perFieldTransformOverrides[die.fieldId],
          layout.pxPerUm,
          FIELD_EDIT_RENDER_SCALE,
        )
        : null;
      const quad = transformedQuad
        ? applyCornerOverlayToQuad(
          transformedQuad,
          perFieldCornerOverlays[die.fieldId],
          layout.pxPerUm,
          FIELD_EDIT_RENDER_SCALE,
        )
        : null;
      const localCorners: [Point, Point, Point, Point] = [
        { x: die.localPos.x - dieHalfWUm, y: die.localPos.y + dieHalfHUm },
        { x: die.localPos.x + dieHalfWUm, y: die.localPos.y + dieHalfHUm },
        { x: die.localPos.x + dieHalfWUm, y: die.localPos.y - dieHalfHUm },
        { x: die.localPos.x - dieHalfWUm, y: die.localPos.y - dieHalfHUm },
      ];
      const points = usePolygonDetail && quad && result?.designCorners
        ? projectLocalCornersInQuad(quad, localCorners, fieldHalfWUm, fieldHalfHUm).map((c) => `${c[0]},${c[1]}`).join(' ')
        : null;

      return {
        id: die.id,
        designX,
        designY,
        fill,
        points,
      };
    });
  }, [
    dies,
    fields,
    distortionResults,
    layout,
    isFieldLevel,
    waferDistortion,
    fieldDistortion,
    perFieldTransformOverrides,
    perFieldCornerOverlays,
    fieldHalfWUm,
    fieldHalfHUm,
    dieHalfWUm,
    dieHalfHUm,
  ]);

  return (
    <g clipPath={variant === 'reference' ? `url(#${clipId})` : undefined} style={{ pointerEvents: 'none' }}>
      {renderItems.map((item) => {
        if (item.points) {
          return (
            <polygon
              key={item.id}
              data-die-id={item.id}
              points={item.points}
              fill={item.fill}
              stroke={strokeColor}
              strokeWidth={0.55}
              opacity={0.95}
              strokeLinejoin="round"
            />
          );
        }

        if (variant === 'reference') {
          return (
            <rect
              key={item.id}
              data-die-id={item.id}
              x={item.designX - dieWPx / 2}
              y={item.designY - dieHPx / 2}
              width={dieWPx}
              height={dieHPx}
              fill={item.fill}
              stroke={strokeColor}
              strokeWidth={0.55}
              opacity={0.95}
              rx={0.5}
            />
          );
        }

        return null;
      })}
    </g>
  );
});

DieGrid.displayName = 'DieGrid';
