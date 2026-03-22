import React, { memo, useMemo } from 'react';
import type { WaferLayoutHook } from '../../hooks/useWaferLayout';
import { useWaferStore } from '../../store/useWaferStore';
import { getOverlayColor } from '../../utils/colorScale';
import {
  applyCornerOverlayToQuad,
  applyFieldTransformToRenderedQuad,
  computeRenderedFieldFrame,
} from '../../utils/renderCorners';

interface Props {
  layout: WaferLayoutHook;
  clipId: string;
  zoomScale: number;
}

const FIELD_VECTOR_POLYGON_LOD_ZOOM = 0.9;
const GEOMETRY_RENDER_SCALE = 1;

export const FieldVectorLayer: React.FC<Props> = memo(({ layout, clipId, zoomScale }) => {
  const distortionResults = useWaferStore((s) => s.distortionResults);
  const arrowScaleFactor = useWaferStore((s) => s.viewState.arrowScaleFactor);
  const showVectors = useWaferStore((s) => s.viewState.showDisplacementVectors);
  const colorMapRange = useWaferStore((s) => s.viewState.colorMapRange);
  const fields = useWaferStore((s) => s.fields);
  const layoutConfig = useWaferStore((s) => s.layoutConfig);
  const waferDistortion = useWaferStore((s) => s.waferDistortion);
  const fieldDistortion = useWaferStore((s) => s.fieldDistortion);
  const perFieldTransformOverrides = useWaferStore((s) => s.perFieldTransformOverrides);
  const perFieldCornerOverlays = useWaferStore((s) => s.perFieldCornerOverlays);

  const maxMag = colorMapRange[1];
  const halfWPx = layout.pxPerUm * layoutConfig.fieldWidthMm * 500;
  const halfHPx = layout.pxPerUm * layoutConfig.fieldHeightMm * 500;
  const pxPerNm = layout.pxPerUm / 1000;
  const usePolygonDetail = zoomScale >= FIELD_VECTOR_POLYGON_LOD_ZOOM;

  const renderItems = useMemo(() => {
    const distMap = new Map(distortionResults.map((r) => [r.entityId, r]));
    return fields.map((field) => {
      const [cx, cy] = layout.toPixel(field.centerDesign.x, field.centerDesign.y);
      const result = distMap.get(field.id);
      const t = result ? Math.min(result.magnitude / Math.max(maxMag, 0.001), 1) : 0;
      const color = getOverlayColor(t);
      const baseFrame = usePolygonDetail && result?.designCorners
        ? computeRenderedFieldFrame(
            field.centerDesign,
            layoutConfig.fieldWidthMm * 500,
            layoutConfig.fieldHeightMm * 500,
            waferDistortion,
            fieldDistortion,
            layout.toPixel,
            GEOMETRY_RENDER_SCALE,
          )
        : null;
      const transformedQuad = baseFrame
        ? applyFieldTransformToRenderedQuad(
          baseFrame.cornersPx,
          layoutConfig.fieldWidthMm * 500,
          layoutConfig.fieldHeightMm * 500,
          perFieldTransformOverrides[field.id],
          layout.pxPerUm,
          GEOMETRY_RENDER_SCALE,
        )
        : null;
      const polygonPoints = transformedQuad
        ? applyCornerOverlayToQuad(
          transformedQuad,
          perFieldCornerOverlays[field.id],
          layout.pxPerUm,
          GEOMETRY_RENDER_SCALE,
        ).map((c) => `${c[0]},${c[1]}`).join(' ')
        : null;

      let arrow = null as null | {
        x2: number;
        y2: number;
        ax: number;
        ay: number;
        perpX: number;
        perpY: number;
        isDot: boolean;
      };

      if (result) {
        const x2 = cx + result.dx * pxPerNm * arrowScaleFactor;
        const y2 = cy - result.dy * pxPerNm * arrowScaleFactor;
        const dx = x2 - cx;
        const dy = y2 - cy;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len < 0.5) {
          arrow = { x2, y2, ax: x2, ay: y2, perpX: 0, perpY: 0, isDot: true };
        } else {
          const ux = dx / len;
          const uy = dy / len;
          const arrowSize = Math.min(len * 0.36, 6);
          const ax = x2 - ux * arrowSize;
          const ay = y2 - uy * arrowSize;
          arrow = {
            x2,
            y2,
            ax,
            ay,
            perpX: -uy * arrowSize * 0.48,
            perpY: ux * arrowSize * 0.48,
            isDot: false,
          };
        }
      }

      return { id: field.id, cx, cy, color, polygonPoints, arrow };
    });
  }, [
    distortionResults,
    fields,
    layout,
    maxMag,
    usePolygonDetail,
    waferDistortion,
    fieldDistortion,
    perFieldTransformOverrides,
    perFieldCornerOverlays,
    pxPerNm,
    arrowScaleFactor,
    layoutConfig.fieldWidthMm,
    layoutConfig.fieldHeightMm,
  ]);

  if (!showVectors) return null;

  return (
    <g clipPath={`url(#${clipId})`}>
      {renderItems.map((item) => (
        <g key={item.id}>
          {item.polygonPoints ? (
            <polygon
              points={item.polygonPoints}
              fill={item.color}
              fillOpacity={0.18}
              stroke={item.color}
              strokeOpacity={0.35}
              strokeWidth={0.7}
              strokeLinejoin="round"
            />
          ) : (
            <rect
              x={item.cx - halfWPx}
              y={item.cy - halfHPx}
              width={halfWPx * 2}
              height={halfHPx * 2}
              fill={item.color}
              fillOpacity={0.18}
              stroke={item.color}
              strokeOpacity={0.35}
              strokeWidth={0.7}
              rx={0.5}
            />
          )}

          {item.arrow && (item.arrow.isDot ? (
            <circle cx={item.cx} cy={item.cy} r={2} fill={item.color} opacity={0.8} />
          ) : (
            <g opacity={0.92}>
              <line
                x1={item.cx}
                y1={item.cy}
                x2={item.arrow.ax}
                y2={item.arrow.ay}
                stroke={item.color}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <polygon
                points={`${item.arrow.x2},${item.arrow.y2} ${item.arrow.ax + item.arrow.perpX},${item.arrow.ay + item.arrow.perpY} ${item.arrow.ax - item.arrow.perpX},${item.arrow.ay - item.arrow.perpY}`}
                fill={item.color}
              />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
});

FieldVectorLayer.displayName = 'FieldVectorLayer';
