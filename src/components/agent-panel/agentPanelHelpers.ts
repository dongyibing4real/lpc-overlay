import type { AgentAction, AgentPromptTemplateId, AgentProviderId } from '../../../shared/agent';

export const QUICK_ACTIONS: Array<{ label: string; templateId: AgentPromptTemplateId }> = [
  { label: 'Generate Plan', templateId: 'generate-plan' },
  { label: 'Explain View', templateId: 'explain-view' },
  { label: 'Generate Report', templateId: 'generate-report' },
];

export type StatusTone = {
  dot: string;
  text: string;
  label: string;
  glow: string;
};

export function getStatusTone(kind: 'idle' | 'success' | 'error' | 'testing'): StatusTone {
  switch (kind) {
    case 'success':
      return {
        dot: '#49c46f',
        text: '#21583a',
        label: 'Connected',
        glow: 'rgba(73, 196, 111, 0.34)',
      };
    case 'error':
      return {
        dot: '#e36a5a',
        text: '#8c4238',
        label: 'Needs Attention',
        glow: 'rgba(227, 106, 90, 0.28)',
      };
    case 'testing':
      return {
        dot: '#6f9edf',
        text: '#365577',
        label: 'Testing',
        glow: 'rgba(111, 158, 223, 0.28)',
      };
    default:
      return {
        dot: '#7da4cc',
        text: '#41627f',
        label: 'Ready',
        glow: 'rgba(125, 164, 204, 0.24)',
      };
  }
}

export function summarizeProvider(providerId: AgentProviderId) {
  return providerId === 'local-openai-compatible' ? 'Local Model' : 'Remote API';
}

export function summarizeActiveProvider(providerId: AgentProviderId) {
  return providerId === 'local-openai-compatible' ? 'Using Local Model' : 'Using Remote API';
}

export function describeAgentAction(action: AgentAction): string {
  switch (action.type) {
    case 'set_wafer_distortion':
      return `Update wafer distortion: ${Object.keys(action.patch).join(', ') || 'parameters'}`;
    case 'set_field_distortion':
      return `Update field distortion: ${Object.keys(action.patch).join(', ') || 'parameters'}`;
    case 'set_view_state':
      return `Adjust view settings: ${Object.keys(action.patch).join(', ') || 'view controls'}`;
    case 'set_field_transform':
      return `Modify field ${action.fieldId}`;
    case 'set_field_corner_overlay':
      return `Update field corner overlay for ${action.fieldId}`;
    case 'select_field':
      return action.fieldId ? `Select field ${action.fieldId}` : 'Clear selected field';
    case 'reset_model':
      return 'Reset the interactive scene';
    default:
      return JSON.stringify(action);
  }
}
