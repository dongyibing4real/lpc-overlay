import React from 'react';
import type { FieldGridRenderItem } from '../lib/fieldGridRenderItems';
import { normalize, renderHandleGlyph, sub } from '../lib/fieldGridGeometry';

interface Props {
  item: FieldGridRenderItem;
  beginTransformDrag: (
    fieldId: string,
    mode: 'translate' | 'rotate' | 'scale-uniform' | 'scale-x' | 'scale-y',
    anchor: [number, number],
    center: [number, number],
    xAxisUnit: [number, number],
    yAxisUnit: [number, number],
    uniformUnit: [number, number],
    event: React.PointerEvent<SVGGraphicsElement>,
  ) => void;
  beginCornerDrag: (
    fieldId: string,
    cornerIndex: number,
    baseQuad: [[number, number], [number, number], [number, number], [number, number]],
    event: React.PointerEvent<SVGGraphicsElement>,
  ) => void;
}

export const FieldGridHandlesLayer: React.FC<Props> = ({ item, beginTransformDrag, beginCornerDrag }) => {
  if (!item.isSelected || !item.center || !item.topMid || !item.rightMid || !item.bottomMid || !item.leftMid || !item.rotateHandle || !item.uniformHandle || !item.quad || !item.baseQuad || !item.controlQuad) {
    return null;
  }

  const xAxisUnit = normalize(sub(item.rightMid, item.center));
  const yAxisUnit = normalize(sub(item.topMid, item.center));
  const uniformUnit = normalize(sub(item.uniformHandle, item.center));
  const handles = [
    { key: 'translate', center: item.center, mode: 'translate' as const, radius: 6, fill: '#2d6a9d', stroke: '#f8fbfd' },
    { key: 'rotate', center: item.rotateHandle, mode: 'rotate' as const, radius: 10, fill: '#f8fbfd', stroke: '#2d6a9d' },
    { key: 'uniform', center: item.uniformHandle, mode: 'scale-uniform' as const, radius: 5, fill: '#dfeef9', stroke: '#2d6a9d' },
  ];
  const edgeHandles = [
    { key: 'scale-top-edge', from: item.controlQuad[0], to: item.controlQuad[1], anchor: item.topMid, mode: 'scale-y' as const, cursor: 'ns-resize' },
    { key: 'scale-right-edge', from: item.controlQuad[1], to: item.controlQuad[2], anchor: item.rightMid, mode: 'scale-x' as const, cursor: 'ew-resize' },
    { key: 'scale-bottom-edge', from: item.controlQuad[3], to: item.controlQuad[2], anchor: item.bottomMid, mode: 'scale-y' as const, cursor: 'ns-resize' },
    { key: 'scale-left-edge', from: item.controlQuad[0], to: item.controlQuad[3], anchor: item.leftMid, mode: 'scale-x' as const, cursor: 'ew-resize' },
  ];

  return (
    <g data-no-zoom="true">
      {edgeHandles.map((edge) => (
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
          onPointerDown={(event) => beginTransformDrag(item.id, edge.mode, edge.anchor, item.center!, xAxisUnit, yAxisUnit, uniformUnit, event)}
        />
      ))}
      {[...handles.filter((handle) => handle.mode !== 'rotate'), ...handles.filter((handle) => handle.mode === 'rotate')].map((handle) => (
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
            onPointerDown={(event) => beginTransformDrag(item.id, handle.mode, handle.center, item.center!, xAxisUnit, yAxisUnit, uniformUnit, event)}
          />
          {handle.mode !== 'rotate' && (
            <circle cx={handle.center[0]} cy={handle.center[1]} r={handle.radius} fill={handle.fill} stroke={handle.stroke} strokeWidth={1.4} style={{ pointerEvents: 'none' }} />
          )}
          <g style={{ pointerEvents: 'none' }}>
            {renderHandleGlyph(handle.mode, handle.center)}
          </g>
        </g>
      ))}
      {item.quad.map((corner, index) => (
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
            onPointerDown={(event) => beginCornerDrag(item.id, index, item.baseQuad!, event)}
          />
          <rect x={corner[0] - 3.4} y={corner[1] - 3.4} width={6.8} height={6.8} rx={1.4} fill="#fff7ef" stroke="#cb8b4e" strokeWidth={1.2} style={{ pointerEvents: 'none' }} />
        </g>
      ))}
    </g>
  );
};
