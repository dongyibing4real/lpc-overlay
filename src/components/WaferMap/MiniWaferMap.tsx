import React, { memo, useId, useMemo } from 'react';
import { useWaferLayout } from '../../hooks/useWaferLayout';
import { useWaferStore } from '../../state/waferStore';
import { getOverlayColorByMag } from '../../utils/colorScale';

interface Props {
  size?: number;
}

export const MiniWaferMap: React.FC<Props> = memo(({ size = 124 }) => {
  const innerSize = size - 12;
  const layoutConfig = useWaferStore((s) => s.layoutConfig);
  const granularity = useWaferStore((s) => s.viewState.granularity);
  const dataSource = useWaferStore((s) => s.viewState.dataSource);
  const colorMapRange = useWaferStore((s) => s.viewState.colorMapRange);
  const distortionResults = useWaferStore((s) => s.distortionResults);
  const fields = useWaferStore((s) => s.fields);
  const layout = useWaferLayout(innerSize, layoutConfig);
  const clipId = useId().replace(/:/g, '');

  const dieWPx = layout.pxPerUm * (layoutConfig.fieldWidthMm * 1000 / layoutConfig.diesPerFieldX);
  const dieHPx = layout.pxPerUm * (layoutConfig.fieldHeightMm * 1000 / layoutConfig.diesPerFieldY);
  const fieldWPx = layout.pxPerUm * layoutConfig.fieldWidthMm * 1000;
  const fieldHPx = layout.pxPerUm * layoutConfig.fieldHeightMm * 1000;
  const maxMag = colorMapRange[1];

  const items = useMemo(() => {
    if (dataSource === 'imported') {
      return distortionResults.map((result) => {
        const [x, y] = layout.toPixel(result.designPos.x, result.designPos.y);
        return {
          id: result.entityId,
          shape: 'dot' as const,
          x,
          y,
          color: getOverlayColorByMag(result.magnitude, maxMag),
        };
      });
    }

    if (granularity === 'field') {
      const distMap = new Map(distortionResults.map((r) => [r.entityId, r]));
      return fields.map((field) => {
        const [x, y] = layout.toPixel(field.centerDesign.x, field.centerDesign.y);
        const magnitude = distMap.get(field.id)?.magnitude ?? 0;
        return {
          id: field.id,
          shape: 'rect' as const,
          x,
          y,
          width: fieldWPx,
          height: fieldHPx,
          color: getOverlayColorByMag(magnitude, maxMag),
        };
      });
    }

    return distortionResults.map((result) => {
      const [x, y] = layout.toPixel(result.designPos.x, result.designPos.y);
      return {
        id: result.entityId,
        shape: 'rect' as const,
        x,
        y,
        width: dieWPx,
        height: dieHPx,
        color: getOverlayColorByMag(result.magnitude, maxMag),
      };
    });
  }, [
    dataSource,
    distortionResults,
    layout,
    granularity,
    fields,
    fieldWPx,
    fieldHPx,
    dieWPx,
    dieHPx,
    maxMag,
  ]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: size,
        height: size,
        padding: 6,
        borderRadius: 12,
        background: 'rgba(244, 248, 251, 0.38)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(164,184,198,0.22)',
        boxShadow: '0 3px 10px rgba(75,95,116,0.04)',
        pointerEvents: 'none',
      }}
    >
      <svg width={innerSize} height={innerSize} viewBox={`0 0 ${innerSize} ${innerSize}`} style={{ display: 'block' }}>
        <defs>
          <clipPath id={clipId}>
            <circle cx={layout.centerPx} cy={layout.centerPx} r={layout.waferRadiusPx} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {items.map((item) => {
            if (item.shape === 'dot') {
              return <circle key={item.id} cx={item.x} cy={item.y} r={1.4} fill={item.color} />;
            }

            return (
              <rect
                key={item.id}
                x={item.x - item.width / 2}
                y={item.y - item.height / 2}
                width={item.width}
                height={item.height}
                fill={item.color}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
});

MiniWaferMap.displayName = 'MiniWaferMap';
