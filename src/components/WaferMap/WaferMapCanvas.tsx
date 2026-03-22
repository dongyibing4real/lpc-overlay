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
import { FieldEditPanel } from '../FieldEditPanel';

interface Props {
  variant: 'interactive' | 'reference';
  title: string;
}

export const WaferMapCanvas: React.FC<Props> = ({ variant, title }) => {
  const FLOATING_PANEL_TOP = 56;
  const FLOATING_PANEL_MARGIN = 12;
  const FLOATING_PANEL_FALLBACK_HEIGHT = 248;
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldPanelWrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomGroupRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const dragPanelRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState(480);
  const [zoomScale, setZoomScale] = useState(1);
  const [fieldPanelPos, setFieldPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [isFieldPanelAuto, setIsFieldPanelAuto] = useState(true);
  const layoutConfig = useWaferStore((s) => s.layoutConfig);
  const granularity = useWaferStore((s) => s.viewState.granularity);
  const selectField = useWaferStore((s) => s.selectField);
  const selectedFieldId = useWaferStore((s) => s.selectedFieldId);
  const resetModelState = useWaferStore((s) => s.resetModelState);
  const layout = useWaferLayout(canvasSize, layoutConfig);
  const isInteractive = variant === 'interactive';

  const clipId = `wafer-clip-${variant}`;

  const clampFieldPanelPosition = (
    position: { x: number; y: number },
    containerRect: DOMRect,
    panelRect?: DOMRect | null,
  ) => {
    const panelWidth = panelRect?.width ?? 212;
    const panelHeight = panelRect?.height ?? FLOATING_PANEL_FALLBACK_HEIGHT;
    return {
      x: Math.min(
        Math.max(FLOATING_PANEL_MARGIN, position.x),
        Math.max(FLOATING_PANEL_MARGIN, containerRect.width - panelWidth - FLOATING_PANEL_MARGIN),
      ),
      y: Math.min(
        Math.max(FLOATING_PANEL_TOP, position.y),
        Math.max(FLOATING_PANEL_TOP, containerRect.height - panelHeight - FLOATING_PANEL_MARGIN),
      ),
    };
  };

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
    if (!selectedFieldId) {
      setIsFieldPanelAuto(true);
      setFieldPanelPos(null);
    } else {
      setIsFieldPanelAuto(true);
    }
  }, [selectedFieldId]);

  useEffect(() => {
    if (!isInteractive || !selectedFieldId || !isFieldPanelAuto) return;
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const updateAutoPosition = () => {
      const fieldEl = containerEl.querySelector(`[data-field-id="${selectedFieldId}"]`) as SVGGraphicsElement | null;
      const panelEl = fieldPanelWrapperRef.current;
      const containerRect = containerEl.getBoundingClientRect();
      const panelRect = panelEl?.getBoundingClientRect();
      const panelWidth = panelRect?.width ?? 212;
      const panelHeight = panelEl?.getBoundingClientRect().height ?? FLOATING_PANEL_FALLBACK_HEIGHT;

      if (!fieldEl) {
        setFieldPanelPos(
          clampFieldPanelPosition(
            {
              x: Math.max(FLOATING_PANEL_MARGIN, containerRect.width - panelWidth - FLOATING_PANEL_MARGIN),
              y: FLOATING_PANEL_TOP,
            },
            containerRect,
            panelRect,
          ),
        );
        return;
      }

      const fieldRect = fieldEl.getBoundingClientRect();
      const fieldCenterX = fieldRect.left - containerRect.left + fieldRect.width / 2;
      const fieldCenterY = fieldRect.top - containerRect.top + fieldRect.height / 2;
      const zoomTransform = svgRef.current ? d3.zoomTransform(svgRef.current) : d3.zoomIdentity;
      const waferCenterX = zoomTransform.applyX(layout.centerPx);
      const waferCenterY = zoomTransform.applyY(layout.centerPx);
      const placeLeft = fieldCenterX >= waferCenterX;
      const placeTop = fieldCenterY <= waferCenterY;
      const nextX = placeLeft
        ? FLOATING_PANEL_MARGIN
        : Math.max(FLOATING_PANEL_MARGIN, containerRect.width - panelWidth - FLOATING_PANEL_MARGIN);
      const nextY = placeTop
        ? FLOATING_PANEL_TOP
        : Math.max(FLOATING_PANEL_TOP, containerRect.height - panelHeight - FLOATING_PANEL_MARGIN);

      setFieldPanelPos(clampFieldPanelPosition({ x: nextX, y: nextY }, containerRect, panelRect));
    };

    const frame = requestAnimationFrame(updateAutoPosition);
    return () => cancelAnimationFrame(frame);
  }, [
    isFieldPanelAuto,
    isInteractive,
    selectedFieldId,
    granularity,
    zoomScale,
  ]);

  const startPanelDragListeners = () => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragPanelRef.current;
      const el = containerRef.current;
      if (!drag || !el) return;
      const rect = el.getBoundingClientRect();
      const panelRect = fieldPanelWrapperRef.current?.getBoundingClientRect();
      setFieldPanelPos(
        clampFieldPanelPosition(
          {
            x: event.clientX - rect.left - drag.offsetX,
            y: event.clientY - rect.top - drag.offsetY,
          },
          rect,
          panelRect,
        ),
      );
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (dragPanelRef.current?.pointerId === event.pointerId) {
        dragPanelRef.current = null;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

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

  const handleFieldPanelHeaderPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const panelEl = event.currentTarget.closest('[data-field-edit-panel="true"]') as HTMLDivElement | null;
    if (!panelEl) return;
    const rect = panelEl.getBoundingClientRect();
    setIsFieldPanelAuto(false);
    dragPanelRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    startPanelDragListeners();
  };

  const handleResetFieldPanelPosition = () => {
    setIsFieldPanelAuto(true);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0, height: '100%' }}>
      <div style={{ position: 'relative', height: 28, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 24,
              fontSize: 10.5,
              fontWeight: 800,
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              background: 'rgba(250,252,254,0.96)',
              border: `1px solid ${accentBorder}`,
              borderRadius: 9,
              padding: '4px 14px 4px 11px',
              boxShadow: '0 4px 10px rgba(72,96,120,0.05)',
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
          background: '#fbfdff',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.92), 0 12px 24px rgba(64,86,110,0.05)',
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
            padding: '6px 7px',
            borderRadius: 9,
            background: toolbarBackground,
            border: '1px solid rgba(166,184,198,0.24)',
            boxShadow: '0 4px 10px rgba(72,96,120,0.04)',
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
              width: 24,
              height: 24,
              borderRadius: 7,
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
              width: 24,
              height: 24,
              borderRadius: 7,
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
              height: 24,
              padding: '0 8px',
              borderRadius: 7,
              fontSize: 10,
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
              height: 24,
              padding: '0 8px',
              borderRadius: 7,
              fontSize: 10,
            }}
          >
            Relocate
          </button>
        </div>

        {isInteractive && selectedFieldId && (
          <div
            ref={fieldPanelWrapperRef}
            data-no-zoom="true"
            style={{
              position: 'absolute',
              top: fieldPanelPos?.y ?? FLOATING_PANEL_TOP,
              left: fieldPanelPos?.x ?? FLOATING_PANEL_MARGIN,
              zIndex: 4,
              maxHeight: 'calc(100% - 68px)',
              overflowY: 'auto',
            }}
          >
            <FieldEditPanel
              floating
              onHeaderPointerDown={handleFieldPanelHeaderPointerDown}
              onResetPosition={handleResetFieldPanelPosition}
            />
          </div>
        )}

        {!isInteractive && <StatsSidebar />}
        {!isInteractive && <MiniWaferMap />}
      </div>
    </div>
  );
};
