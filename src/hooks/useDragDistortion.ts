import { useRef, useCallback, useEffect } from 'react';
import { useWaferStore } from '../state/waferStore';
import type { WaferLayoutHook } from './useWaferLayout';

export interface DragDistortionHandlers {
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  isDraggingRef: React.RefObject<boolean>;
}

export function useDragDistortion(layout: WaferLayoutHook): DragDistortionHandlers {
  const setWaferDistortion = useWaferStore((s) => s.setWaferDistortion);
  const waferDistortionRef = useRef(useWaferStore.getState().waferDistortion);
  const arrowScaleFactorRef = useRef(useWaferStore.getState().viewState.arrowScaleFactor);

  // Keep refs in sync with store
  useEffect(() => {
    const unsub = useWaferStore.subscribe((state) => {
      waferDistortionRef.current = state.waferDistortion;
      arrowScaleFactorRef.current = state.viewState.arrowScaleFactor;
    });
    return unsub;
  }, []);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; Tx: number; Ty: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      Tx: waferDistortionRef.current.Tx,
      Ty: waferDistortionRef.current.Ty,
    };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStartRef.current) return;

    const dClientX = e.clientX - dragStartRef.current.clientX;
    const dClientY = e.clientY - dragStartRef.current.clientY;

    // On screen, 1 px of drag = (1 / (pxPerNm * arrowScaleFactor)) nm of real overlay
    // pxPerNm = pxPerUm / 1000
    // So: dNm = dPx * 1000 / (pxPerUm * arrowScaleFactor)
    const scale = layout.pxPerUm * arrowScaleFactorRef.current / 1000;
    const dNmX = dClientX / scale;
    const dNmY = -(dClientY / scale); // Y-flip: SVG Y is inverted

    setWaferDistortion({
      Tx: dragStartRef.current.Tx + dNmX,
      Ty: dragStartRef.current.Ty + dNmY,
    });
  }, [layout.pxPerUm, setWaferDistortion]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
  }, []);

  return { handleMouseDown, handleMouseMove, handleMouseUp, isDraggingRef };
}
