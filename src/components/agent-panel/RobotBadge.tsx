import React from 'react';

export const RobotBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    style={{
      width: compact ? 36 : 32,
      height: compact ? 36 : 32,
      borderRadius: compact ? 18 : 12,
      background: 'linear-gradient(135deg, #6f93cf 0%, #4f72a8 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 18px rgba(68,104,155,0.2)',
      flexShrink: 0,
    }}
  >
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" aria-hidden="true">
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
