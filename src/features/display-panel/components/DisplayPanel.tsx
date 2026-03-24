import React, { memo } from 'react';
import { useWaferStore } from '../../../state/waferStore';
import { VectorLegend } from './VectorLegend';
import { FileUpload } from '../../control-panel/components/FileUpload';
import { cardTinted, accentBar, SECTION_HEADER, SECTION_TITLE } from '../../../styles/shared';
import css from './DisplayPanel.module.css';

const CARD = cardTinted(
  'linear-gradient(180deg, rgba(242,247,255,0.98) 0%, rgba(250,252,255,0.98) 100%)',
  'rgba(116, 152, 197, 0.22)',
);

export const DisplayPanel: React.FC = memo(() => {
  const setViewState = useWaferStore((s) => s.setViewState);
  const viewState = useWaferStore((s) => s.viewState);

  return (
    <div className={css.root}>
      <div style={CARD}>
        <div style={{ ...SECTION_HEADER, marginBottom: 14 }}>
          <div style={accentBar('#4f8bc9')} />
          <span style={SECTION_TITLE}>Display</span>
        </div>

        <div className={css.checkboxGroup}>
          {([
            ['showDisplacementVectors', 'Displacement vectors'],
            ['showFieldBoundaries', 'Field boundaries'],
            ['showDieBoundaries', 'Die boundaries'],
          ] as const).map(([key, label]) => (
            <label key={key} className={css.checkboxLabel}>
              <input
                type="checkbox"
                checked={viewState[key]}
                onChange={(e) => setViewState({ [key]: e.target.checked })}
                className={`accent-blue-400 ${css.checkbox}`}
              />
              <span className={css.checkboxText}>{label}</span>
            </label>
          ))}

          <div className={css.sliderGroup}>
            <div className={css.sliderHeader}>
              <span className={css.sliderLabel}>Vector scale</span>
              <span className={css.sliderValue}>{viewState.arrowScaleFactor.toLocaleString()}x</span>
            </div>
            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={viewState.arrowScaleFactor}
              onChange={(e) => setViewState({ arrowScaleFactor: parseInt(e.target.value, 10) })}
              className="w-full"
            />
          </div>

          <div className={css.sliderGroup}>
            <div className={css.sliderHeader}>
              <span className={css.sliderLabel}>Color max</span>
              <span className={css.sliderValue}>{viewState.colorMapRange[1]} nm</span>
            </div>
            <input
              type="range"
              min={1}
              max={1000}
              step={1}
              value={viewState.colorMapRange[1]}
              onChange={(e) => setViewState({ colorMapRange: [0, parseInt(e.target.value, 10)] })}
              className="w-full slider-purple"
            />
          </div>

          <div className={css.legendSection}>
            <VectorLegend />
          </div>
        </div>
      </div>
      <FileUpload />
    </div>
  );
});

DisplayPanel.displayName = 'DisplayPanel';
