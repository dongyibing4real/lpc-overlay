import React from 'react';
import { AgentPanel } from '../features/agent-panel/components/AgentPanel.tsx';
import { ControlPanel } from '../features/control-panel/components/ControlPanel.tsx';
import { DisplayPanel } from '../features/display-panel/components/DisplayPanel.tsx';
import { FieldEditFloatingWindow } from '../features/field-editor/components/FieldEditFloatingWindow.tsx';
import { WaferMapCanvas } from '../features/wafer-map/components/WaferMapCanvas.tsx';
import { useWaferStore } from '../state/waferStore';
import css from './AppShell.module.css';

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

export const AppShell: React.FC = () => {
  const granularity = useWaferStore((s) => s.viewState.granularity);
  const setViewState = useWaferStore((s) => s.setViewState);

  return (
    <div className={css.root}>
      <header className={css.header}>
        <div className={css.brand}>
          <div className={css.brandMark}>
            <ChipIcon />
          </div>
          <div className={css.brandTitle}>LPC - Overlay Distortion Data Mocker</div>
        </div>

        <div className={css.granularity}>
          <span className={css.granularityLabel}>Granularity</span>
          <div className={css.granularityControl}>
            {(['die', 'field'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setViewState({ granularity: g })}
                className={`${css.granularityButton} ${granularity === g ? css.granularityButtonActive : ''}`}
              >
                {g === 'die' ? 'Die' : 'Field'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={css.content}>
        <aside className={`${css.panelShell} ${css.leftRail}`}>
          <ControlPanel />
        </aside>

        <main className={css.workspace}>
          <WaferMapCanvas variant="interactive" title="Actual Map" />
          <WaferMapCanvas variant="reference" title="Distortion Vector Map" />
        </main>

        <aside className={`${css.panelShell} ${css.rightRail}`}>
          <DisplayPanel />
        </aside>
      </div>

      <FieldEditFloatingWindow />
      <AgentPanel />
    </div>
  );
};

export default AppShell;
