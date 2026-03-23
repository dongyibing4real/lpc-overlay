import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { WaferBoundary } from './WaferBoundary';
import { FieldGrid } from './FieldGrid';
import { DieGrid } from './DieGrid';
import { DisplacementVectorLayer } from './DisplacementVector';
import { FieldVectorLayer } from './FieldVectorLayer';
import { MiniWaferMap } from './MiniWaferMap';
import { useWaferLayout } from '../../hooks/useWaferLayout';
import { useWaferStore } from '../../store/useWaferStore';
import { StatsSidebar } from '../StatsSidebar';

interface Props {
  variant: 'interactive' | 'reference';
  title: string;
}

export const WaferMapCanvas: React.FC<Props> = ({ variant, title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomGroupRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [canvasSize, setCanvasSize] = useState(480);
  const [zoomScale, setZoomScale] = useState(1);
  const layoutConfig = useWaferStore((s) => s.layoutConfig);
  const granularity = useWaferStore((s) => s.viewState.granularity);
  const selectField = useWaferStore((s) => s.selectField);
  const resetModelState = useWaferStore((s) => s.resetModelState);
  const layout = useWaferLayout(canvasSize, layoutConfig);
  const isInteractive = variant === 'interactive';

  const clipId = `wafer-clip-${variant}`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const size = Math.floor(Math.min(width, height));
      if (size > 0) setCanvasSize(size);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !zoomGroupRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoomGroup = d3.select(zoomGroupRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 40])
      .filter((event) => {
        const target = event.target as Element | null;
        if (target?.closest?.('[data-no-zoom="true"], [data-editor-handle="true"]')) return false;
        if (event.type === 'wheel') return true;
        return !event.button;
      })
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform.toString());
        setZoomScale(event.transform.k);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);
    svg.on('dblclick.zoom', () => {
      svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });

    return () => {
      svg.on('.zoom', null);
    };
  }, [canvasSize, variant]);

  const accentColor = isInteractive ? '#355d80' : '#5e7185';
  const accentBorder = isInteractive ? 'rgba(157,180,198,0.42)' : 'rgba(170,186,199,0.42)';
  const toolbarBackground = isInteractive ? 'rgba(247,250,252,0.86)' : 'rgba(247,250,252,0.92)';

  const handleResetView = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(220)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const handleZoomBy = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(180)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetModel = () => {
    resetModelState();
  };

  const handleToolbarReset = () => {
    if (isInteractive) {
      handleResetModel();
    }
    handleResetView();
  };

  const handleSvgPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isInteractive) return;
    if (event.target !== event.currentTarget) return;
    selectField(null);
  };

  const toolButtonStyle: React.CSSProperties = {
    border: '1px solid rgba(166,184,198,0.28)',
    background: '#fdfefe',
    color: '#284257',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(72,96,120,0.05)',
    transition: 'transform 0.06s ease, box-shadow 0.12s ease, background-color 0.12s ease',
  };

  const handleToolButtonPress = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.style.transform = 'translateY(1px) scale(0.985)';
    event.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(72,96,120,0.12)';
    event.currentTarget.style.backgroundColor = '#f1f6fa';
  };

  const handleToolButtonRelease = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.style.transform = 'translateY(0) scale(1)';
    event.currentTarget.style.boxShadow = '0 1px 2px rgba(72,96,120,0.05)';
    event.currentTarget.style.backgroundColor = '#fdfefe';
  };

  return (
    <div
      data-wafer-map-panel={variant}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0, height: '100%' }}
    >
      <div style={{ position: 'relative', height: 30, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 26,
              fontSize: 10.5,
              fontWeight: 800,
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              background: 'rgba(251, 253, 255, 0.96)',
              border: `1px solid ${accentBorder}`,
              borderRadius: 11,
              padding: '5px 15px 5px 12px',
              boxShadow: '0 8px 18px rgba(72,96,120,0.08)',
            }}
          >
            <div
              style={{
                width: 3,
                height: 13,
                borderRadius: 99,
                background: accentColor,
                opacity: 0.88,
                flexShrink: 0,
              }}
            />
            {title}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(173,189,203,0.34)',
          background: 'linear-gradient(180deg, rgba(252,254,255,0.98) 0%, rgba(246,250,253,0.98) 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.96), 0 18px 34px rgba(64,86,110,0.08)',
        }}
      >
        <svg
          ref={svgRef}
          onPointerDown={handleSvgPointerDown}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          viewBox={`0 0 ${canvasSize} ${canvasSize}`}
        >
          <g ref={zoomGroupRef}>
            <WaferBoundary layout={layout} clipId={clipId} />
            {granularity === 'die' && (
              <DieGrid layout={layout} variant={variant} clipId={clipId} zoomScale={zoomScale} />
            )}
            <FieldGrid layout={layout} variant={variant} clipId={clipId} zoomScale={zoomScale} />
            {variant === 'reference' && granularity === 'die' && (
              <DisplacementVectorLayer layout={layout} clipId={clipId} />
            )}
            {variant === 'reference' && granularity === 'field' && (
              <FieldVectorLayer layout={layout} clipId={clipId} zoomScale={zoomScale} />
            )}
          </g>
        </svg>

        <div
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 8px',
            borderRadius: 11,
            background: toolbarBackground,
            border: '1px solid rgba(166,184,198,0.24)',
            boxShadow: '0 10px 22px rgba(72,96,120,0.08)',
            transform: 'translateX(-50%)',
          }}
        >
          <button
            onClick={() => handleZoomBy(0.8)}
            onPointerDown={handleToolButtonPress}
            onPointerUp={handleToolButtonRelease}
            onPointerLeave={handleToolButtonRelease}
            style={{
              ...toolButtonStyle,
              width: 26,
              height: 26,
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1,
            }}
          >
            -
          </button>
          <button
            onClick={() => handleZoomBy(1.25)}
            onPointerDown={handleToolButtonPress}
            onPointerUp={handleToolButtonRelease}
            onPointerLeave={handleToolButtonRelease}
            style={{
              ...toolButtonStyle,
              width: 26,
              height: 26,
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1,
            }}
          >
            +
          </button>
          <button
            onClick={handleToolbarReset}
            onPointerDown={handleToolButtonPress}
            onPointerUp={handleToolButtonRelease}
            onPointerLeave={handleToolButtonRelease}
            style={{
              ...toolButtonStyle,
              height: 26,
              padding: '0 10px',
              borderRadius: 8,
              fontSize: 10.5,
            }}
          >
            Reset
          </button>
          <button
            onClick={handleResetView}
            onPointerDown={handleToolButtonPress}
            onPointerUp={handleToolButtonRelease}
            onPointerLeave={handleToolButtonRelease}
            style={{
              ...toolButtonStyle,
              height: 26,
              padding: '0 10px',
              borderRadius: 8,
              fontSize: 10.5,
            }}
          >
            Relocate
          </button>
        </div>

        {!isInteractive && <StatsSidebar />}
        {!isInteractive && <MiniWaferMap />}
      </div>
    </div>
  );
};
