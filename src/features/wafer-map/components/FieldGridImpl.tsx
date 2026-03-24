import React, { memo } from 'react';
import type { WaferLayoutHook } from '../../../hooks/useWaferLayout';
import { useWaferStore } from '../../../state/waferStore';
import { useFieldGridRenderItems } from '../lib/fieldGridRenderItems';
import { useFieldGridInteractions } from '../lib/useFieldGridInteractions';
import { FieldGridHandlesLayer } from './FieldGridHandlesLayer';

interface Props {
  layout: WaferLayoutHook;
  variant: 'interactive' | 'reference';
  clipId: string;
  zoomScale: number;
}

export const FieldGrid: React.FC<Props> = memo(({ layout, variant, clipId }) => {
  const layoutConfig = useWaferStore((s) => s.layoutConfig);
  const showFieldBoundaries = useWaferStore((s) => s.viewState.showFieldBoundaries);
  const granularity = useWaferStore((s) => s.viewState.granularity);
  const selectField = useWaferStore((s) => s.selectField);

  const isInteractive = variant === 'interactive';
  const isDieMode = granularity === 'die';
  const usePolygonDetail = isInteractive;
  const stroke = showFieldBoundaries
    ? (isDieMode ? 'rgba(99,125,149,0.82)' : 'rgba(112,136,156,0.72)')
    : 'transparent';
  const strokeWidth = isDieMode ? 1.15 : 0.9;
  const fill = isDieMode
    ? 'rgba(116,140,160,0.06)'
    : (isInteractive ? 'rgba(112,136,156,0.12)' : 'rgba(116,140,160,0.04)');

  const { orderedRenderItems, halfWUm, halfHUm } = useFieldGridRenderItems(layout, isInteractive, usePolygonDetail);
  const { beginTransformDrag, beginCornerDrag } = useFieldGridInteractions({
    isInteractive,
    pxPerUm: layout.pxPerUm,
    halfWUm,
    halfHUm,
  });

  return (
    <g clipPath={variant === 'reference' ? `url(#${clipId})` : undefined}>
      {orderedRenderItems.map((item) => {
        if (item.points) {
          return (
            <g key={item.id} data-no-zoom={item.isSelected ? 'true' : undefined}>
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
              {item.isSelected && (
                <FieldGridHandlesLayer
                  item={item}
                  beginTransformDrag={beginTransformDrag}
                  beginCornerDrag={beginCornerDrag}
                />
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
