import React from 'react';

export const RobotBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    style={{
      position: 'relative',
      width: compact ? 36 : 34,
      height: compact ? 36 : 34,
      borderRadius: compact ? 18 : 13,
      background: 'linear-gradient(145deg, rgba(124,163,225,0.94) 0%, rgba(89,125,187,0.94) 62%, rgba(69,98,152,0.94) 100%)',
      border: '1px solid rgba(214,231,255,0.44)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 10px 22px rgba(52, 85, 133, 0.26), 0 0 20px rgba(121, 179, 255, 0.24)',
      overflow: 'hidden',
      flexShrink: 0,
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(circle at 28% 24%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 100%)',
        pointerEvents: 'none',
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 6,
        borderRadius: compact ? 14 : 10,
        border: '1px solid rgba(236,244,255,0.14)',
        pointerEvents: 'none',
      }}
    />
    <svg width="22" height="22" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <rect x="4.5" y="5.5" width="12" height="10" rx="3.3" fill="#F8FBFF" />
      <rect x="7" y="9" width="2.3" height="2.6" rx="1.15" fill="#5477AF" />
      <rect x="11.7" y="9" width="2.3" height="2.6" rx="1.15" fill="#5477AF" />
      <path d="M8 13.2C8.65 14.1 9.45 14.55 10.5 14.55C11.55 14.55 12.35 14.1 13 13.2" stroke="#5477AF" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10.5 3.3V5.7" stroke="#DDE9F7" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10.5" cy="2.3" r="1.1" fill="#F7D67C" />
      <path d="M6.1 16.1L5 17.6" stroke="#DDE9F7" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M14.9 16.1L16 17.6" stroke="#DDE9F7" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  </div>
);
