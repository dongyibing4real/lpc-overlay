import React, { memo, useRef, useEffect } from 'react';
import { useWaferStore } from '../../../state/waferStore';
import { getOverlayColor } from '../../../utils/colorScale';

export const VectorLegend: React.FC = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorMapRange = useWaferStore((s) => s.viewState.colorMapRange);

  const width = 184;
  const height = 14;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    for (let x = 0; x < width; x += 1) {
      ctx.fillStyle = getOverlayColor(x / (width - 1));
      ctx.fillRect(x, 0, 1, height);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: '#61788d', fontWeight: 600, letterSpacing: '0.02em' }}>Overlay Magnitude</div>
      <canvas ref={canvasRef} width={width} height={height} style={{ borderRadius: 5, display: 'block', border: '1px solid rgba(168,186,200,0.28)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#70879a' }}>{colorMapRange[0]} nm</span>
        <span style={{ fontSize: 11, color: '#70879a' }}>{colorMapRange[1]} nm</span>
      </div>
    </div>
  );
});

VectorLegend.displayName = 'VectorLegend';
