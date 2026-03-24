import type React from 'react';

// ─── Card ────────────────────────────────────────────────────────────────────
// Base card uses CSS variables from index.css so theme changes propagate everywhere.

export const CARD: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,249,252,0.98) 100%)',
  borderRadius: 16,
  padding: '14px 14px',
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--panel-shadow)',
};

/** Card with a tinted background gradient and matching border color. */
export function cardTinted(
  backgroundGradient: string,
  borderColor: string,
): React.CSSProperties {
  return {
    ...CARD,
    background: backgroundGradient,
    border: `1px solid ${borderColor}`,
  };
}

// ─── Section header ──────────────────────────────────────────────────────────

export const SECTION_HEADER: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

export const SECTION_TITLE: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 800,
  color: '#243a4c',
  textTransform: 'uppercase',
  letterSpacing: '0.09em',
};

export function accentBar(color: string): React.CSSProperties {
  return {
    width: 4,
    height: 18,
    background: color,
    borderRadius: 99,
    flexShrink: 0,
  };
}

// ─── Inner section card ──────────────────────────────────────────────────────
// Used inside panels for sub-sections (e.g. FieldEditPanel corners/transforms).

export const INNER_CARD: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 9,
  padding: '11px',
  borderRadius: 14,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(243,248,252,0.96) 100%)',
  border: '1px solid rgba(165, 183, 199, 0.26)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
};
