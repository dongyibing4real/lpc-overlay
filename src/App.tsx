import React from 'react';
import { WaferMapCanvas } from './components/WaferMap/WaferMapCanvas';
import { ControlPanel } from './components/ControlPanel/ControlPanel';
import { DisplayPanel } from './components/DisplayPanel';
import { AgentPanel } from './components/AgentPanel';
import { useWaferStore } from './store/useWaferStore';

const ChipIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="4" y="4" width="7" height="7" rx="1.5" fill="#1d2b38" opacity="0.96" />
    <rect x="6.75" y="0.75" width="1.5" height="2.5" rx="0.75" fill="#53738f" opacity="0.9" />
    <rect x="6.75" y="11.75" width="1.5" height="2.5" rx="0.75" fill="#53738f" opacity="0.9" />
    <rect x="0.75" y="6.75" width="2.5" height="1.5" rx="0.75" fill="#53738f" opacity="0.9" />
    <rect x="11.75" y="6.75" width="2.5" height="1.5" rx="0.75" fill="#53738f" opacity="0.9" />
    <rect x="2.5" y="2.5" width="1.2" height="1.2" rx="0.4" fill="#89a3bc" opacity="0.7" />
    <rect x="11.3" y="2.5" width="1.2" height="1.2" rx="0.4" fill="#89a3bc" opacity="0.7" />
    <rect x="2.5" y="11.3" width="1.2" height="1.2" rx="0.4" fill="#89a3bc" opacity="0.7" />
    <rect x="11.3" y="11.3" width="1.2" height="1.2" rx="0.4" fill="#89a3bc" opacity="0.7" />
  </svg>
);

const shellPanel: React.CSSProperties = {
  background: 'var(--panel-bg)',
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--panel-shadow)',
  backdropFilter: 'blur(16px)',
};

const App: React.FC = () => {
  const granularity = useWaferStore((s) => s.viewState.granularity);
  const setViewState = useWaferStore((s) => s.setViewState);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--app-bg)',
        color: 'var(--text-1)',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 22px',
          height: 56,
          flexShrink: 0,
          background: 'rgba(250,252,253,0.84)',
          borderBottom: '1px solid var(--panel-border)',
          backdropFilter: 'blur(18px)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 10,
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--panel-border)',
              boxShadow: '0 4px 10px rgba(72,96,120,0.06)',
            }}
          >
            <ChipIcon />
          </div>

          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                color: 'var(--text-1)',
              }}
            >
              LPC - Overlay Distortion Data Mocker
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-2)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Granularity
          </span>
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-2)',
              border: '1px solid var(--panel-border)',
              borderRadius: 10,
              padding: 3,
            }}
          >
            {(['die', 'field'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setViewState({ granularity: g })}
                style={{
                  padding: '5px 18px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 7,
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'all 0.15s ease',
                  background:
                    granularity === g
                      ? 'var(--surface)'
                      : 'transparent',
                  color: granularity === g ? 'var(--text-1)' : 'var(--text-2)',
                  boxShadow:
                    granularity === g
                      ? '0 2px 6px rgba(72,96,120,0.08)'
                      : 'none',
                }}
              >
                {g === 'die' ? 'Die' : 'Field'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 12, gap: 12 }}>
        <aside
          style={{
            ...shellPanel,
            width: 288,
            flexShrink: 0,
            borderRadius: 16,
            padding: '10px 10px',
            overflow: 'hidden',
          }}
        >
          <ControlPanel />
        </aside>

        <main
          style={{
            flex: 1,
            display: 'flex',
            gap: 12,
            padding: 2,
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <WaferMapCanvas variant="interactive" title="Actual Map" />
          <WaferMapCanvas variant="reference" title="Distortion Vector Map" />
        </main>

        <aside
          style={{
            ...shellPanel,
            width: 246,
            flexShrink: 0,
            borderRadius: 16,
            padding: '10px 10px',
            overflow: 'hidden',
          }}
        >
          <DisplayPanel />
        </aside>
      </div>

      <AgentPanel />
    </div>
  );
};

export default App;
