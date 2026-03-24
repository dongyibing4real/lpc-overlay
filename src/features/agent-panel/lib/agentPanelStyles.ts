import type React from 'react';

export const OVERLAY_CARD: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(250, 252, 255, 0.96) 0%, rgba(244, 248, 252, 0.95) 100%)',
  borderRadius: 22,
  border: '1px solid rgba(162, 186, 210, 0.3)',
  boxShadow: '0 18px 40px rgba(52, 80, 116, 0.12), 0 3px 10px rgba(52, 80, 116, 0.05), inset 0 1px 0 rgba(255,255,255,0.86)',
  backdropFilter: 'blur(18px)',
};

export const INPUT_STYLE: React.CSSProperties = {
  minHeight: 38,
  borderRadius: 12,
  border: '1px solid rgba(166,184,198,0.34)',
  background: 'rgba(255,255,255,0.94)',
  color: '#22384b',
  padding: '0 11px',
  outline: 'none',
  fontSize: 12,
};

export const SECONDARY_BUTTON: React.CSSProperties = {
  minHeight: 34,
  borderRadius: 999,
  border: '1px solid rgba(166,184,198,0.38)',
  background: 'rgba(255,255,255,0.9)',
  color: '#536b7f',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

export const PRIMARY_BUTTON: React.CSSProperties = {
  minHeight: 36,
  borderRadius: 999,
  border: '1px solid rgba(78,118,169,0.46)',
  background: 'linear-gradient(135deg, #5f89ca 0%, #476b9e 100%)',
  color: '#ffffff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 10px 22px rgba(68,104,155,0.18)',
};

export const LABEL: React.CSSProperties = {
  fontSize: 10.5,
  color: '#708596',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

export const SOFT_PANEL: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(165, 183, 199, 0.26)',
  background: 'linear-gradient(180deg, rgba(245, 249, 253, 0.98) 0%, rgba(250, 252, 255, 0.96) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(48, 72, 96, 0.04)',
};

export const LOG_CARD: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid rgba(191,205,218,0.2)',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.82) 0%, rgba(248,251,254,0.78) 100%)',
  boxShadow: '0 1px 4px rgba(48, 72, 96, 0.03)',
};

export const PANEL_SECTION_TITLE: React.CSSProperties = {
  fontSize: 10.5,
  color: '#243a4c',
  textTransform: 'uppercase',
  letterSpacing: '0.09em',
  fontWeight: 800,
};

export const PANEL_SECTION_SUBTITLE: React.CSSProperties = {
  fontSize: 11.25,
  color: '#61788d',
  lineHeight: 1.5,
};

export const PANEL_ACCENT_BAR = (color: string): React.CSSProperties => ({
  width: 4,
  height: 18,
  background: color,
  borderRadius: 99,
  flexShrink: 0,
});
