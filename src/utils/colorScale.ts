import * as d3 from 'd3';

const _stops = [0, 0.28, 0.52, 0.78, 1.0];
const _colors = ['#9eb6c8', '#6f9fc4', '#4bb7bb', '#d6a25f', '#d86b55'];

export function getOverlayColor(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  let i = _stops.length - 2;
  for (let j = 0; j < _stops.length - 1; j++) {
    if (x <= _stops[j + 1]) {
      i = j;
      break;
    }
  }
  const hi = Math.min(i + 1, _stops.length - 1);
  if (i === hi) return _colors[i];
  const f = (_stops[i + 1] - _stops[i]) === 0 ? 0 : (x - _stops[i]) / (_stops[i + 1] - _stops[i]);
  return d3.interpolateRgb(_colors[i], _colors[hi])(f);
}

export function getOverlayColorByMag(magnitude: number, maxMag: number): string {
  if (maxMag <= 0) return _colors[0];
  return getOverlayColor(magnitude / maxMag);
}
