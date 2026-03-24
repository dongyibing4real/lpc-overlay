import React, { memo } from 'react';
import type { AgentHistoryItem, AgentPlan, AgentPlanDiagnostics, AgentPromptTemplateId } from '../../../../shared/agent';
import {
  LOG_CARD,
  PANEL_ACCENT_BAR,
  PANEL_SECTION_SUBTITLE,
  PANEL_SECTION_TITLE,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SOFT_PANEL,
} from '../lib/agentPanelStyles';
import { describeAgentAction, QUICK_ACTIONS } from '../lib/agentPanelHelpers';
import { getTemplateLabel } from '../lib/promptIntent';

function renderDiagnosticsSummary(diagnostics: AgentPlanDiagnostics | null) {
  if (!diagnostics) return null;

  const { rawActionCount, normalizedActionCount, finalActionCount, droppedActionCount, droppedActionTypes, droppedActions, warnings } = diagnostics;
  if (rawActionCount === 0 && warnings.length === 0) return null;
  const droppedTypesLabel = droppedActionTypes.length > 0 ? ` (${Array.from(new Set(droppedActionTypes)).join(', ')})` : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11.5, color: '#56728b', lineHeight: 1.5, padding: '9px 10px', borderRadius: 12, background: 'rgba(243,247,251,0.9)', border: '1px solid rgba(166,184,198,0.16)' }}>
        Model returned <strong>{rawActionCount}</strong> action block{rawActionCount === 1 ? '' : 's'}. LPC Agent normalized that into <strong>{normalizedActionCount}</strong> candidate action{normalizedActionCount === 1 ? '' : 's'} and the final executable plan contains <strong>{finalActionCount}</strong> action{finalActionCount === 1 ? '' : 's'}.
        {droppedActionCount > 0 ? (
          <>
            {' '}<strong>{droppedActionCount}</strong> block{droppedActionCount === 1 ? '' : 's'} were skipped{droppedTypesLabel}.
          </>
        ) : null}
      </div>
      {warnings.map((warning) => (
        <div key={warning} style={{ fontSize: 11.5, color: '#8b6643', lineHeight: 1.5, padding: '9px 10px', borderRadius: 12, background: 'rgba(252,247,239,0.96)', border: '1px solid rgba(221,194,151,0.22)' }}>
          {warning}
        </div>
      ))}
      {droppedActions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {droppedActions.map((entry) => (
            <div key={`${entry.type}-${entry.index}`} style={{ fontSize: 11.5, color: '#755844', lineHeight: 1.5, padding: '9px 10px', borderRadius: 12, background: 'rgba(250,244,239,0.96)', border: '1px solid rgba(214,182,153,0.2)' }}>
              <strong style={{ color: '#614633' }}>Skipped block {entry.index + 1}</strong>: {entry.type}{' '}
              <span style={{ color: '#8b6a50' }}>{entry.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function summarizeTimelineItem(item: AgentHistoryItem) {
  if (item.role === 'assistant' && item.plan) {
    return item.plan.summary;
  }
  return item.text;
}

function getTimelineBadge(item: AgentHistoryItem) {
  if (item.role === 'assistant') {
    return {
      label: 'Proposed',
      background: 'rgba(241,246,251,0.92)',
      border: '1px solid rgba(180,194,208,0.26)',
      color: '#6d8498',
    };
  }

  if (item.role === 'system') {
    return {
      label: 'Applied',
      background: 'rgba(227,243,235,0.94)',
      border: '1px solid rgba(140,194,170,0.3)',
      color: '#347a54',
    };
  }

  return {
    label: 'Asked',
    background: 'rgba(218,233,250,0.96)',
    border: '1px solid rgba(140,174,210,0.34)',
    color: '#4a6d8a',
  };
}

function getTimelineItemStyle(role: string): React.CSSProperties {
  if (role === 'assistant') {
    return {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.78) 0%, rgba(248,251,254,0.74) 100%)',
      color: '#496174',
    };
  }
  if (role === 'system') {
    return {
      background: 'linear-gradient(135deg, rgba(237,247,243,0.92) 0%, rgba(244,250,248,0.88) 100%)',
      color: '#2d6648',
      borderColor: 'rgba(140,194,170,0.22)',
    };
  }
  return {
    background: 'linear-gradient(135deg, rgba(233,242,252,0.92) 0%, rgba(244,249,255,0.88) 100%)',
    color: '#28445a',
  };
}

interface AgentConversationProps {
  conversationRef: React.RefObject<HTMLDivElement | null>;
  history: AgentHistoryItem[];
  draftPlan: AgentPlan | null;
  draftPlanDiagnostics: AgentPlanDiagnostics | null;
  activePlanMessageId: string | null;
  canApplyDraftPlan: boolean;
  isLoading: boolean;
  error: string | null;
  selectedTemplateId: AgentPromptTemplateId;
  prompt: string;
  lastAppliedSnapshotPresent: boolean;
  setPrompt: (prompt: string) => void;
  setSelectedTemplateId: (templateId: AgentPromptTemplateId) => void;
  openPanel: () => void;
  applyDraftPlan: () => void;
  discardDraftPlan: () => void;
  undoLastApply: () => void;
  handleQuickAction: (templateId: AgentPromptTemplateId) => void;
  handlePromptKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSubmit: () => Promise<void>;
}

export const AgentConversation: React.FC<AgentConversationProps> = memo(({
  conversationRef,
  history,
  draftPlan,
  draftPlanDiagnostics,
  activePlanMessageId,
  canApplyDraftPlan,
  isLoading,
  error,
  selectedTemplateId,
  prompt,
  lastAppliedSnapshotPresent,
  setPrompt,
  setSelectedTemplateId,
  openPanel,
  applyDraftPlan,
  discardDraftPlan,
  undoLastApply,
  handleQuickAction,
  handlePromptKeyDown,
  handleSubmit,
}) => {
  const recentHistory = history
    .filter((item) => !(draftPlan && activePlanMessageId && item.id === activePlanMessageId))
    .slice(-6);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2.25fr) minmax(220px, 0.95fr)',
        gap: 12,
        padding: '14px 14px',
        overflow: 'hidden',
      }}
    >
      <div style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', paddingRight: 12 }}>
        <div style={{ ...SOFT_PANEL, padding: '13px 13px 12px', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg, rgba(244,248,253,0.98) 0%, rgba(250,252,255,0.96) 100%)', borderColor: 'rgba(116, 152, 197, 0.18)' }}>
          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={PANEL_ACCENT_BAR('#4f8bc9')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div style={PANEL_SECTION_TITLE}>Compose</div>
              <div style={PANEL_SECTION_SUBTITLE}>
                Describe the scene change you want, then review the current proposal below.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.templateId)}
                style={{
                  borderRadius: 999,
                  border: selectedTemplateId === action.templateId ? '1px solid rgba(92,126,175,0.42)' : '1px solid rgba(180,194,208,0.3)',
                  background: selectedTemplateId === action.templateId ? 'rgba(228,238,250,0.98)' : 'rgba(255,255,255,0.72)',
                  color: selectedTemplateId === action.templateId ? '#355d80' : '#51687d',
                  fontSize: 10.5,
                  fontWeight: 800,
                  padding: '6px 9px',
                  cursor: 'pointer',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#60788b', lineHeight: 1.45 }}>
            Active template: <strong style={{ color: '#355d80' }}>{getTemplateLabel(selectedTemplateId)}</strong>
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handlePromptKeyDown}
            placeholder="Describe your request here. The selected template stays in the background."
            rows={3}
            style={{ width: '100%', resize: 'none', minHeight: 90, borderRadius: 14, border: '1px solid rgba(166,184,198,0.24)', background: 'rgba(255,255,255,0.94)', color: '#22384b', padding: '12px 13px', outline: 'none', fontSize: 12, lineHeight: 1.6, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.84)' }}
          />
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 10.5, color: '#6f8497', lineHeight: 1.35 }}>
              <strong>Enter</strong> to send. <strong>Shift + Enter</strong> for a new line.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {lastAppliedSnapshotPresent && (
                <button onClick={undoLastApply} style={{ ...SECONDARY_BUTTON, padding: '0 12px' }}>
                  Undo
                </button>
              )}
              <button onClick={() => void handleSubmit()} style={{ ...PRIMARY_BUTTON, minWidth: 112 }}>
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ minWidth: 0, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {draftPlan ? (
            <div style={{ border: '1px solid rgba(126,157,194,0.22)', borderRadius: 16, padding: '14px 14px', background: 'linear-gradient(180deg, rgba(241,247,253,0.98) 0%, rgba(252,254,255,0.95) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(48, 72, 96, 0.04)', display: 'flex', flexDirection: 'column', gap: 11, position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={PANEL_ACCENT_BAR('#728ea5')} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={PANEL_SECTION_TITLE}>Current Proposal</div>
                    <div style={{ fontSize: 11, color: '#70879b', lineHeight: 1.45 }}>
                      {canApplyDraftPlan ? `${draftPlan.actions.length} action${draftPlan.actions.length === 1 ? '' : 's'} ready for review` : 'Analysis only'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: draftPlan.intent === 'analysis' ? '#6d7f93' : '#496987', fontWeight: 800 }}>
                  {draftPlan.intent === 'analysis' ? 'Analysis' : 'Scenario'}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#355773', lineHeight: 1.55, fontWeight: 800 }}>
                {draftPlan.summary}
              </div>
              {draftPlan.analysis && (
                <div style={{ ...SOFT_PANEL, padding: '9px 10px', fontSize: 11.5, color: '#61788d', lineHeight: 1.55, background: 'rgba(248,251,254,0.92)', borderColor: 'rgba(180,194,208,0.2)' }}>
                  {draftPlan.analysis}
                </div>
              )}
              {canApplyDraftPlan ? (
                <div style={{ fontSize: 11.5, color: '#4d6c88', lineHeight: 1.5, padding: '9px 10px', borderRadius: 13, background: 'rgba(233,241,248,0.82)', border: '1px solid rgba(160,182,206,0.16)' }}>
                  This reply includes executable actions. Review the plan, then apply if it matches your intent.
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: '#61788d' }}>No state changes planned.</div>
              )}
              {renderDiagnosticsSummary(draftPlanDiagnostics)}
              {draftPlan.actions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {draftPlan.actions.map((action, index) => (
                    <div key={`${action.type}-${index}`} style={{ ...LOG_CARD, padding: '9px 10px', fontSize: 11.5, color: '#486275', lineHeight: 1.5 }}>
                      {describeAgentAction(action)}
                    </div>
                  ))}
                </div>
              )}
              {draftPlan.suggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ fontSize: 10.5, color: '#6f87a0', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                    Follow-up
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {draftPlan.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setSelectedTemplateId('general');
                          setPrompt(suggestion);
                          openPanel();
                        }}
                        style={{ borderRadius: 999, border: '1px solid rgba(180,194,208,0.24)', background: 'rgba(255,255,255,0.82)', color: '#4e667b', fontSize: 10.5, fontWeight: 800, padding: '6px 9px', cursor: 'pointer' }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                {canApplyDraftPlan && (
                  <button onClick={applyDraftPlan} style={{ ...PRIMARY_BUTTON, flex: 1, minHeight: 36 }}>
                    Apply Plan
                  </button>
                )}
                <button onClick={discardDraftPlan} style={{ ...SECONDARY_BUTTON, minHeight: 36, padding: '0 11px', flex: canApplyDraftPlan ? undefined : 1 }}>
                  {canApplyDraftPlan ? 'Discard' : 'Close'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ ...SOFT_PANEL, padding: '14px 14px', color: '#60788b', fontSize: 12, lineHeight: 1.6, background: 'rgba(247,250,253,0.96)' }}>
              The current proposal will appear here. Send a prompt to generate a scene change or analysis.
            </div>
          )}

          {error && (
            <div style={{ borderRadius: 12, padding: '10px 11px', background: 'rgba(252, 242, 238, 0.9)', border: '1px solid rgba(214,164,144,0.32)', color: '#9a5d48', fontSize: 11.5, lineHeight: 1.5 }}>
              {error}
            </div>
          )}
        </div>
      </div>

      <div style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid transparent', paddingLeft: 14, position: 'relative' }}>
        {/* Gradient timeline border */}
        <div style={{ position: 'absolute', left: -1, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(79,139,201,0.5) 0%, rgba(191,205,218,0.34) 30%, rgba(191,205,218,0.34) 70%, rgba(109,115,199,0.3) 100%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '2px 2px 8px', marginBottom: 4, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={PANEL_ACCENT_BAR('#728ea5')} />
            <div style={{ ...PANEL_SECTION_TITLE, color: '#788da0', letterSpacing: '0.05em', fontWeight: 700 }}>
              Timeline
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: '#6f8497', lineHeight: 1.35, paddingLeft: 12 }}>
            Recent asks, proposals, and applied changes
          </div>
        </div>

        <div ref={conversationRef} style={{ minWidth: 0, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {recentHistory.length === 0 && !draftPlan && (
            <div style={{ ...SOFT_PANEL, padding: '12px 12px', color: '#60788b', fontSize: 11.5, lineHeight: 1.55 }}>
              Timeline entries will show up here after you start interacting with the agent.
            </div>
          )}

          {recentHistory.map((item) => (
            (() => {
              const badge = getTimelineBadge(item);
              const itemStyle = getTimelineItemStyle(item.role);
              return (
                <div
                  key={item.id}
                  style={{
                    ...LOG_CARD,
                    padding: '10px 11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 7,
                    ...itemStyle,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      alignSelf: 'flex-start',
                      minHeight: 20,
                      padding: '0 8px',
                      borderRadius: 999,
                      background: badge.background,
                      border: badge.border,
                      color: badge.color,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {badge.label}
                  </div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.55 }}>{summarizeTimelineItem(item)}</div>
                </div>
              );
            })()
          ))}

          {isLoading && (
            <div
              style={{
                ...LOG_CARD,
                padding: '10px 11px',
                color: '#496174',
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#73889b', marginBottom: 4 }}>
                Agent Working
              </div>
              <div style={{ fontSize: 11.5, lineHeight: 1.55 }}>Building the current proposal...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AgentConversation.displayName = 'AgentConversation';
