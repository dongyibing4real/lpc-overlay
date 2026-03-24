import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWaferStore } from '../../../state/waferStore';
import { getViewport } from '../../../utils/viewport';
import { FieldEditPanel } from '../../../components/FieldEditPanel';

type WindowSize = {
  width: number;
  height: number;
};

type DragState =
  | {
    mode: 'move';
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }
  | {
    mode: 'resize';
    pointerId: number;
    startX: number;
    startY: number;
    originWidth: number;
    originHeight: number;
  };

const WINDOW_MARGIN = 20;
const FIELD_WINDOW_GAP = 28;
const DEFAULT_WINDOW_WIDTH = 332;
const DEFAULT_WINDOW_HEIGHT = 620;
const MIN_WINDOW_WIDTH = 300;
const MIN_WINDOW_HEIGHT = 340;
const MAX_WINDOW_WIDTH = 420;
const MAX_WINDOW_HEIGHT = 840;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampWindowSize(size: WindowSize, viewport: { width: number; height: number }): WindowSize {
  return {
    width: clamp(
      size.width,
      MIN_WINDOW_WIDTH,
      Math.max(MIN_WINDOW_WIDTH, Math.min(MAX_WINDOW_WIDTH, viewport.width - WINDOW_MARGIN * 2)),
    ),
    height: clamp(
      size.height,
      MIN_WINDOW_HEIGHT,
      Math.max(MIN_WINDOW_HEIGHT, Math.min(MAX_WINDOW_HEIGHT, viewport.height - WINDOW_MARGIN * 2 - 56)),
    ),
  };
}

function clampWindowPosition(
  position: { x: number; y: number },
  viewport: { width: number; height: number },
  size: WindowSize,
) {
  return {
    x: clamp(position.x, WINDOW_MARGIN, viewport.width - size.width - WINDOW_MARGIN),
    y: clamp(position.y, WINDOW_MARGIN + 56, viewport.height - size.height - WINDOW_MARGIN),
  };
}

function getDefaultWindowPosition(viewport: { width: number; height: number }, size: WindowSize) {
  return clampWindowPosition(
    {
      x: viewport.width - size.width - WINDOW_MARGIN,
      y: 96,
    },
    viewport,
    size,
  );
}

function getNearbyWindowPosition(
  fieldRect: DOMRect,
  viewport: { width: number; height: number },
  size: WindowSize,
) {
  const fieldCenterX = fieldRect.left + fieldRect.width / 2;
  const fieldCenterY = fieldRect.top + fieldRect.height / 2;
  const verticalAlign = fieldCenterY - size.height / 2;
  const horizontalAlign = fieldCenterX - size.width / 2;

  const candidates = [
    { x: fieldRect.right + FIELD_WINDOW_GAP, y: verticalAlign },
    { x: fieldRect.left - size.width - FIELD_WINDOW_GAP, y: verticalAlign },
    { x: horizontalAlign, y: fieldRect.bottom + FIELD_WINDOW_GAP },
    { x: horizontalAlign, y: fieldRect.top - size.height - FIELD_WINDOW_GAP },
  ];

  const viewportMinY = WINDOW_MARGIN + 56;

  const fitsViewport = (candidate: { x: number; y: number }) =>
    candidate.x >= WINDOW_MARGIN &&
    candidate.y >= viewportMinY &&
    candidate.x + size.width <= viewport.width - WINDOW_MARGIN &&
    candidate.y + size.height <= viewport.height - WINDOW_MARGIN;

  const positioned = candidates.map((candidate) => {
    const clamped = clampWindowPosition(candidate, viewport, size);
    const displacement = Math.abs(clamped.x - candidate.x) + Math.abs(clamped.y - candidate.y);
    const distanceToField =
      Math.abs(clamped.x + size.width / 2 - fieldCenterX) +
      Math.abs(clamped.y + size.height / 2 - fieldCenterY);

    return {
      clamped,
      fits: fitsViewport(candidate),
      score: displacement * 4 + distanceToField,
    };
  });

  const perfect = positioned.find((entry) => entry.fits);
  if (perfect) return perfect.clamped;

  positioned.sort((a, b) => a.score - b.score);
  return positioned[0].clamped;
}

export const FieldEditFloatingWindow: React.FC = () => {
  const selectedFieldId = useWaferStore((s) => s.selectedFieldId);
  const [mounted, setMounted] = useState(false);
  const [viewport, setViewport] = useState(() => getViewport());
  const [windowSize, setWindowSize] = useState<WindowSize>(() =>
    clampWindowSize({ width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT }, getViewport()),
  );
  const [windowPosition, setWindowPosition] = useState(() =>
    getDefaultWindowPosition(getViewport(), clampWindowSize({ width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT }, getViewport())),
  );
  const dragStateRef = useRef<DragState | null>(null);
  const lastAnchoredFieldIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const nextViewport = getViewport();
      setViewport(nextViewport);
      setWindowSize((current) => {
        const nextSize = clampWindowSize(current, nextViewport);
        setWindowPosition((position) => clampWindowPosition(position, nextViewport, nextSize));
        return nextSize;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;

      if (dragState.mode === 'move') {
        setWindowPosition(
          clampWindowPosition({ x: dragState.originX + dx, y: dragState.originY + dy }, viewport, windowSize),
        );
        return;
      }

      const nextSize = clampWindowSize(
        { width: dragState.originWidth + dx, height: dragState.originHeight + dy },
        viewport,
      );
      setWindowSize(nextSize);
      setWindowPosition((position) => clampWindowPosition(position, viewport, nextSize));
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (dragStateRef.current?.pointerId === event.pointerId) {
        dragStateRef.current = null;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [viewport, windowSize]);

  useEffect(() => {
    if (!mounted || !selectedFieldId) {
      lastAnchoredFieldIdRef.current = null;
      return;
    }

    if (lastAnchoredFieldIdRef.current === selectedFieldId) {
      return;
    }

    const fieldElement = document.querySelector(`[data-field-id="${selectedFieldId}"]`) as SVGGraphicsElement | null;
    if (!fieldElement) {
      setWindowPosition(getDefaultWindowPosition(viewport, windowSize));
      lastAnchoredFieldIdRef.current = selectedFieldId;
      return;
    }

    const fieldRect = fieldElement.getBoundingClientRect();
    setWindowPosition(getNearbyWindowPosition(fieldRect, viewport, windowSize));
    lastAnchoredFieldIdRef.current = selectedFieldId;
  }, [mounted, selectedFieldId, viewport, windowSize]);

  if (!mounted || !selectedFieldId || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: windowPosition.x,
        top: windowPosition.y,
        width: windowSize.width,
        height: windowSize.height,
        zIndex: 240,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <FieldEditPanel
          floating
          onHeaderPointerDown={(event) => {
            dragStateRef.current = {
              mode: 'move',
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originX: windowPosition.x,
              originY: windowPosition.y,
            };
          }}
        />
      </div>

      <button
        type="button"
        aria-label="Resize field editor"
        onPointerDown={(event) => {
          event.stopPropagation();
          dragStateRef.current = {
            mode: 'resize',
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originWidth: windowSize.width,
            originHeight: windowSize.height,
          };
        }}
        style={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          width: 22,
          height: 22,
          border: 'none',
          background: 'rgba(255,255,255,0.88)',
          borderRadius: 999,
          boxShadow: '0 4px 10px rgba(64, 86, 110, 0.1)',
          cursor: 'nwse-resize',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M4.5 9.5L9.5 4.5" stroke="#8DA2B5" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M7 11L11 7" stroke="#8DA2B5" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M9.5 12.5L12.5 9.5" stroke="#8DA2B5" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
    </div>,
    document.body,
  );
};
