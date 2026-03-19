import React, { memo, useMemo } from 'react';
import type { WaferLayoutHook } from '../../hooks/useWaferLayout';
import { useWaferStore } from '../../store/useWaferStore';
import { getOverlayColor } from '../../utils/colorScale';

interface Props {
  layout: WaferLayoutHook;
  clipId: string;
}

export const DisplacementVectorLayer: React.FC<Props> = memo(({ layout, clipId }) => {
  const distortionResults = useWaferStore((s) => s.distortionResults);
  const arrowScaleFactor = useWaferStore((s) => s.viewState.arrowScaleFactor);
  const showVectors = useWaferStore((s) => s.viewState.showDisplacementVectors);
  const colorMapRange = useWaferStore((s) => s.viewState.colorMapRange);

  const maxMag = colorMapRange[1];

  const vectors = useMemo(() => {
    if (!showVectors || distortionResults.length === 0) return [];
    const pxPerNm = layout.pxPerUm / 1000;
    return distortionResults.map((r) => {
      const [x1, y1] = layout.toPixel(r.designPos.x, r.designPos.y);
      const x2 = x1 + r.dx * pxPerNm * arrowScaleFactor;
      const y2 = y1 - r.dy * pxPerNm * arrowScaleFactor;
      const t = maxMag > 0 ? Math.min(r.magnitude / maxMag, 1) : 0;
      const color = getOverlayColor(t);
      return { id: r.entityId, x1, y1, x2, y2, color, magnitude: r.magnitude };
    });
  }, [distortionResults, arrowScaleFactor, layout, showVectors, maxMag]);

  if (!showVectors || vectors.length === 0) return null;

  if (vectors.length > 5000) {
    return <CanvasVectors vectors={vectors} layout={layout} clipId={clipId} />;
  }

  return (
    <g clipPath={`url(#${clipId})`}>
      {vectors.map((v) => {
        const dx = v.x2 - v.x1;
        const dy = v.y2 - v.y1;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len < 0.5) {
          return <circle key={v.id} cx={v.x1} cy={v.y1} r={1.2} fill={v.color} opacity={0.7} />;
        }

        const ux = dx / len;
        const uy = dy / len;
        const arrowSize = Math.min(len * 0.38, 4.5);
        const ax = v.x2 - ux * arrowSize;
        const ay = v.y2 - uy * arrowSize;
        const perpX = -uy * arrowSize * 0.48;
        const perpY =  ux * arrowSize * 0.48;

        return (
          <g key={v.id} opacity={0.88}>
            <line
              x1={v.x1} y1={v.y1} x2={ax} y2={ay}
              stroke={v.color}
              strokeWidth={1.1}
              strokeLinecap="round"
            />
            <polygon
              points={`${v.x2},${v.y2} ${ax + perpX},${ay + perpY} ${ax - perpX},${ay - perpY}`}
              fill={v.color}
            />
          </g>
        );
      })}
    </g>
  );
});

// ── Canvas fallback for large die counts ───────────────────────
interface CanvasProps {
  vectors: Array<{ id: string; x1: number; y1: number; x2: number; y2: number; color: string }>;
  layout: WaferLayoutHook;
  clipId: string;
}

const CanvasVectors: React.FC<CanvasProps> = memo(({ vectors, layout, clipId }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, layout.canvasSize, layout.canvasSize);

    for (const v of vectors) {
      const dx = v.x2 - v.x1;
      const dy = v.y2 - v.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      ctx.strokeStyle = v.color;
      ctx.fillStyle = v.color;
      ctx.globalAlpha = 0.88;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(v.x1, v.y1);
      ctx.lineTo(v.x2, v.y2);
      ctx.stroke();
      if (len > 1) {
        const ux = dx / len, uy = dy / len;
        const a = Math.min(len * 0.38, 4.5);
        ctx.beginPath();
        ctx.moveTo(v.x2, v.y2);
        ctx.lineTo(v.x2 - ux * a - uy * a * 0.48, v.y2 - uy * a + ux * a * 0.48);
        ctx.lineTo(v.x2 - ux * a + uy * a * 0.48, v.y2 - uy * a - ux * a * 0.48);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, [vectors, layout.canvasSize]);

  return (
    <foreignObject x={0} y={0} width={layout.canvasSize} height={layout.canvasSize}>
      <canvas
        ref={canvasRef}
        width={layout.canvasSize}
        height={layout.canvasSize}
        style={{ clipPath: `url(#${clipId})` }}
      />
    </foreignObject>
  );
});

DisplacementVectorLayer.displayName = 'DisplacementVectorLayer';
CanvasVectors.displayName = 'CanvasVectors';
