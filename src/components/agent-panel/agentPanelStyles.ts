import type React from 'react';

export const OVERLAY_CARD: React.CSSProperties = {
  background: 'rgba(252, 253, 255, 0.92)',
  borderRadius: 20,
  border: '1px solid rgba(191, 205, 218, 0.58)',
  boxShadow: '0 24px 60px rgba(63, 91, 122, 0.18)',
  backdropFilter: 'blur(20px)',
};

export const INPUT_STYLE: React.CSSProperties = {
  minHeight: 38,
  borderRadius: 10,
  border: '1px solid rgba(166,184,198,0.36)',
  background: 'rgba(255,255,255,0.9)',
  color: '#22384b',
  padding: '0 11px',
  outline: 'none',
  fontSize: 12,
};

export const SECONDARY_BUTTON: React.CSSProperties = {
  minHeight: 34,
  borderRadius: 10,
  border: '1px solid rgba(166,184,198,0.42)',
  background: 'rgba(255,255,255,0.88)',
  color: '#51697d',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

export const PRIMARY_BUTTON: React.CSSProperties = {
  minHeight: 36,
  borderRadius: 10,
  border: '1px solid rgba(78,118,169,0.46)',
  background: 'linear-gradient(135deg, #547fc0 0%, #44689b 100%)',
  color: '#ffffff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 8px 18px rgba(68,104,155,0.18)',
};

export const LABEL: React.CSSProperties = {
  fontSize: 10.5,
  color: '#708596',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};
