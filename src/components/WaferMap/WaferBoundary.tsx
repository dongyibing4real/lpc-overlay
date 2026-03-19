import React from 'react';
import { useWaferStore } from '../../store/useWaferStore';
import type { WaferLayoutHook } from '../../hooks/useWaferLayout';

interface Props {
  layout: WaferLayoutHook;
  clipId: string;
}

export const WaferBoundary: React.FC<Props> = ({ layout, clipId }) => {
  const { centerPx: cx, waferRadiusPx: R } = layout;
  const layoutConfig = useWaferStore((s) => s.layoutConfig);

  const exclFrac = layoutConfig.edgeExclusionMm / (layoutConfig.waferDiameterMm / 2);
  const activeR = R * (1 - exclFrac);

  const notchHalf = (2.8 * Math.PI) / 180;
  const lx = cx + R * Math.cos(Math.PI / 2 - notchHalf);
  const ly = cx + R * Math.sin(Math.PI / 2 - notchHalf);
  const rx = cx + R * Math.cos(Math.PI / 2 + notchHalf);
  const ry = cx + R * Math.sin(Math.PI / 2 + notchHalf);
  const tipX = cx;
  const tipY = cx + activeR;

  const waferPath = [
    `M ${lx} ${ly}`,
    `A ${R} ${R} 0 1 0 ${rx} ${ry}`,
    `L ${tipX} ${tipY}`,
    'Z',
  ].join(' ');

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cx} r={activeR} />
        </clipPath>
      </defs>

      <path d={waferPath} fill="#f3f7fa" />

      <circle cx={cx} cy={cx} r={R} fill="none" stroke="rgba(166,182,196,0.18)" strokeWidth={5} />
      <circle cx={cx} cy={cx} r={R} fill="none" stroke="rgba(108,127,146,0.44)" strokeWidth={1.1} />

      <line x1={lx} y1={ly} x2={tipX} y2={tipY} stroke="rgba(106,130,152,0.48)" strokeWidth={0.8} strokeLinecap="round" />
      <line x1={tipX} y1={tipY} x2={rx} y2={ry} stroke="rgba(106,130,152,0.48)" strokeWidth={0.8} strokeLinecap="round" />
      <circle cx={tipX} cy={tipY} r={1.2} fill="rgba(116,138,159,0.46)" />

      <circle cx={cx} cy={cx} r={R * 0.333} fill="none" stroke="rgba(128,148,166,0.13)" strokeWidth={0.5} />
      <circle cx={cx} cy={cx} r={R * 0.667} fill="none" stroke="rgba(128,148,166,0.13)" strokeWidth={0.5} />

      <circle cx={cx} cy={cx} r={activeR} fill="none" stroke="rgba(201,138,79,0.56)" strokeWidth={1} />

      <line x1={cx - 6} y1={cx} x2={cx + 6} y2={cx} stroke="rgba(114,134,153,0.32)" strokeWidth={0.5} />
      <line x1={cx} y1={cx - 6} x2={cx} y2={cx + 6} stroke="rgba(114,134,153,0.32)" strokeWidth={0.5} />
      <circle cx={cx} cy={cx} r={1.2} fill="rgba(114,134,153,0.4)" />
    </g>
  );
};
