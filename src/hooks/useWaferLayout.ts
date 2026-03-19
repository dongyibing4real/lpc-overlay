import { useMemo } from 'react';
import * as d3 from 'd3';
import type { WaferLayoutConfig } from '../types/wafer';

export interface WaferLayoutHook {
  waferRadiusPx: number;
  canvasSize: number;
  centerPx: number;
  umPerPx: number;
  pxPerUm: number;
  toPixel: (umX: number, umY: number) => [number, number];
  toUm: (px: number, py: number) => [number, number];
  scaleUm: d3.ScaleLinear<number, number>;
}

export function useWaferLayout(canvasSizePx: number, cfg: WaferLayoutConfig): WaferLayoutHook {
  return useMemo(() => {
    const waferRadiusUm = (cfg.waferDiameterMm / 2) * 1000;
    const padding = canvasSizePx * 0.05;
    const waferRadiusPx = canvasSizePx / 2 - padding;
    const centerPx = canvasSizePx / 2;

    // Scale: µm → px (centered at canvas center)
    const scaleUm = d3
      .scaleLinear()
      .domain([-waferRadiusUm, waferRadiusUm])
      .range([centerPx - waferRadiusPx, centerPx + waferRadiusPx]);

    const pxPerUm = waferRadiusPx / waferRadiusUm;
    const umPerPx = waferRadiusUm / waferRadiusPx;

    const toPixel = (umX: number, umY: number): [number, number] => [
      scaleUm(umX),
      scaleUm(-umY), // Y-flip: SVG +Y is downward
    ];

    const toUm = (px: number, py: number): [number, number] => [
      scaleUm.invert(px),
      -scaleUm.invert(py),
    ];

    return { waferRadiusPx, canvasSize: canvasSizePx, centerPx, umPerPx, pxPerUm, toPixel, toUm, scaleUm };
  }, [canvasSizePx, cfg.waferDiameterMm]);
}
