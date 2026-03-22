import React, { memo } from 'react';
import type { AgentHistoryItem, AgentPlan, AgentPromptTemplateId } from '../../../shared/agent';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from './agentPanelStyles';
import { describeAgentAction, QUICK_ACTIONS } from './agentPanelHelpers';
import { getTemplateLabel } from '../../agent/promptIntent';

function renderDiagnosticsSummary(item: AgentHistoryItem) {
  const diagnostics = item.diagnostics;
  if (!diagnostics) return null;

  const { rawActionCount, normalizedActionCount, finalActionCount, droppedActionCount, droppedActionTypes, droppedActions, warnings } = diagnostics;
  if (rawActionCount === 0 && warnings.length === 0) return null;
  const droppedTypesLabel = droppedActionTypes.length > 0 ? ` (${Array.from(new Set(droppedActionTypes)).join(', ')})` : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11.5, color: '#56728b', lineHeight: 1.5, padding: '8px 9px', borderRadius: 10, background: 'rgba(242,247,251,0.94)', border: '1px solid rgba(166,184,198,0.2)' }}>
        Model returned <strong>{rawActionCount}</strong> action block{rawActionCount === 1 ? '' : 's'}. LPC Agent normalized that into <strong>{normalizedActionCount}</strong> candidate action{normalizedActionCount === 1 ? '' : 's'} and the final executable plan contains <strong>{finalActionCount}</strong> action{finalActionCount === 1 ? '' : 's'}.
        {droppedActionCount > 0 ? (
          <>
            {' '}<strong>{droppedActionCount}</strong> block{droppedActionCount === 1 ? '' : 's'} were skipped{droppedTypesLabel}.
          </>
        ) : null}
      </div>
      {warnings.map((warning) => (
        <div key={warning} style={{ fontSize: 11.5, color: '#8b6643', lineHeight: 1.5, padding: '8px 9px', borderRadius: 10, background: 'rgba(252,247,239,0.96)', border: '1px solid rgba(221,194,151,0.26)' }}>
          {warning}
        </div>
      ))}
      {droppedActions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {droppedActions.map((entry) => (
            <div key={`${entry.type}-${entry.index}`} style={{ fontSize: 11.5, color: '#755844', lineHeight: 1.5, padding: '8px 9px', borderRadius: 10, background: 'rgba(250,244,239,0.96)', border: '1px solid rgba(214,182,153,0.24)' }}>
              <strong style={{ color: '#614633' }}>Skipped block {entry.index + 1}</strong>: {entry.type}  
              <span style={{ color: '#8b6a50' }}>{entry.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AgentConversationProps {
  conversationRef: React.RefObject<HTMLDivElement | null>;
  history: AgentHistoryItem[];
  draftPlan: AgentPlan | null;
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
}) => (
  <>
    <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(191, 205, 218, 0.28)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 10.5, color: '#788da0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
          Prompt Shortcuts
        </div>
        <div style={{ fontSize: 11.5, color: '#61788d', lineHeight: 1.5 }}>
          Pick a backend template, then describe your request in the chat box.
        </div>
      </div>
    </div>

    <div ref={conversationRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {history.length === 0 && !draftPlan && (
        <div style={{ borderRadius: 14, padding: '12px 12px', background: 'rgba(245,248,251,0.8)', border: '1px solid rgba(191,205,218,0.28)', color: '#60788b', fontSize: 12, lineHeight: 1.6 }}>
          Ask for a new scenario, a small adjustment to the current scene, or an explanation of the current vector map.
        </div>
      )}

      {history.slice(-6).map((item) => (
        <div
          key={item.id}
          style={{
            alignSelf: item.role === 'assistant' || item.role === 'system' ? 'stretch' : 'flex-end',
            maxWidth: item.role === 'assistant' || item.role === 'system' ? '100%' : '88%',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              padding: '10px 11px',
              borderRadius:
                item.role === 'assistant'
                  ? '14px 14px 14px 6px'
                  : item.role === 'system'
                    ? '12px'
                    : '14px 14px 6px 14px',
              background:
                item.role === 'assistant'
                  ? 'rgba(255,255,255,0.84)'
                  : item.role === 'system'
                    ? 'rgba(240,245,250,0.92)'
                    : 'rgba(235,243,252,0.94)',
              border: '1px solid rgba(191,205,218,0.28)',
              color:
                item.role === 'assistant'
                  ? '#496174'
                  : item.role === 'system'
                    ? '#5d7488'
                    : '#28445a',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color:
                  item.role === 'assistant'
                    ? '#73889b'
                    : item.role === 'system'
                      ? '#8194a5'
                      : '#5f7991',
                marginBottom: 4,
              }}
            >
              {item.role === 'assistant' ? 'Agent' : item.role === 'system' ? 'System' : 'You'}
            </div>
            {item.text}
          </div>

          {item.role === 'assistant' && item.plan && draftPlan && activePlanMessageId === item.id && (
            <div style={{ border: '1px solid rgba(166,184,198,0.3)', borderRadius: 14, padding: '12px 12px', background: 'rgba(255,255,255,0.82)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 10.5, color: '#788da0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Current Plan</div>
                <div style={{ fontSize: 10.5, color: item.plan.intent === 'analysis' ? '#6d7f93' : '#496987', fontWeight: 700 }}>
                  {item.plan.intent === 'analysis' ? 'Analysis' : 'Scenario'}
                </div>
              </div>
              {canApplyDraftPlan ? (
                <div style={{ fontSize: 11.5, color: '#57708d', lineHeight: 1.5, padding: '9px 10px', borderRadius: 10, background: 'rgba(238,244,251,0.92)', border: '1px solid rgba(166,184,198,0.22)' }}>
                  This reply includes executable actions. Review them here, then apply if the plan looks right.
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: '#61788d' }}>No state changes planned.</div>
              )}
              {renderDiagnosticsSummary(item)}
              {item.plan.actions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {item.plan.actions.map((action, index) => (
                    <div key={`${action.type}-${index}`} style={{ fontSize: 11.5, color: '#486275', lineHeight: 1.5, padding: '8px 9px', borderRadius: 10, background: 'rgba(247,250,252,0.92)', border: '1px solid rgba(166,184,198,0.18)' }}>
                      {describeAgentAction(action)}
                    </div>
                  ))}
                </div>
              )}
              {item.plan.suggestions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {item.plan.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setSelectedTemplateId('general');
                        setPrompt(suggestion);
                        openPanel();
                      }}
                      style={{ borderRadius: 999, border: '1px solid rgba(166,184,198,0.32)', background: 'rgba(255,255,255,0.88)', color: '#4e667b', fontSize: 11, fontWeight: 700, padding: '6px 9px', cursor: 'pointer' }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                {canApplyDraftPlan && (
                  <button onClick={applyDraftPlan} style={{ ...PRIMARY_BUTTON, flex: 1, minHeight: 34, background: '#eef4fb', color: '#355d80', boxShadow: 'none' }}>
                    Apply
                  </button>
                )}
                <button onClick={discardDraftPlan} style={{ ...SECONDARY_BUTTON, minHeight: 34, padding: '0 11px', flex: canApplyDraftPlan ? undefined : 1 }}>
                  {canApplyDraftPlan ? 'Discard' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div
          style={{
            alignSelf: 'stretch',
            maxWidth: '100%',
            padding: '10px 11px',
            borderRadius: '14px 14px 14px 6px',
            background: 'rgba(255,255,255,0.84)',
            border: '1px solid rgba(191,205,218,0.28)',
            color: '#496174',
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#73889b', marginBottom: 4 }}>
            Agent
          </div>
          Thinking...
        </div>
      )}

      {error && (
        <div style={{ borderRadius: 12, padding: '10px 11px', background: 'rgba(252, 242, 238, 0.9)', border: '1px solid rgba(214,164,144,0.32)', color: '#9a5d48', fontSize: 11.5, lineHeight: 1.5 }}>
          {error}
        </div>
      )}
    </div>

    <div style={{ padding: '12px 14px 14px', borderTop: '1px solid rgba(191, 205, 218, 0.42)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => handleQuickAction(action.templateId)}
            style={{
              borderRadius: 999,
              border: selectedTemplateId === action.templateId ? '1px solid rgba(102,131,175,0.38)' : '1px solid rgba(166,184,198,0.32)',
              background: selectedTemplateId === action.templateId ? 'rgba(238,244,251,0.96)' : 'rgba(255,255,255,0.86)',
              color: selectedTemplateId === action.templateId ? '#355d80' : '#4e667b',
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 9px',
              cursor: 'pointer',
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: '#60788b', lineHeight: 1.5 }}>
        Active template: <strong style={{ color: '#355d80' }}>{getTemplateLabel(selectedTemplateId)}</strong>
      </div>
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={handlePromptKeyDown}
        placeholder="Describe your request here. The selected template stays in the background."
        rows={3}
        style={{ width: '100%', resize: 'none', minHeight: 86, borderRadius: 12, border: '1px solid rgba(166,184,198,0.36)', background: 'rgba(255,255,255,0.92)', color: '#22384b', padding: '10px 11px', outline: 'none', fontSize: 12, lineHeight: 1.55 }}
      />
      <div style={{ fontSize: 11, color: '#6f8497', lineHeight: 1.4 }}>
        Press <strong>Enter</strong> to send. Use <strong>Shift + Enter</strong> for a new line.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => void handleSubmit()} style={{ ...PRIMARY_BUTTON, flex: 1 }}>
          Send
        </button>
        {lastAppliedSnapshotPresent && (
          <button onClick={undoLastApply} style={{ ...SECONDARY_BUTTON, padding: '0 12px' }}>
            Undo
          </button>
        )}
      </div>
    </div>
  </>
));

AgentConversation.displayName = 'AgentConversation';
