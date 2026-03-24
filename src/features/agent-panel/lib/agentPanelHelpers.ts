import type { AgentAction, AgentPromptTemplateId, AgentProviderConfig, AgentProviderId } from '../../../../shared/agent';
import { validateProviderBeforeRequest } from './agentApiClient';

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

export function getStatusTone(kind: 'idle' | 'success' | 'error' | 'testing' | 'configured' | 'setup'): StatusTone {
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
    case 'configured':
      return {
        dot: '#6f9edf',
        text: '#365577',
        label: 'Configured',
        glow: 'rgba(111, 158, 223, 0.24)',
      };
    case 'setup':
      return {
        dot: '#d8a54f',
        text: '#7b5a28',
        label: 'Incomplete',
        glow: 'rgba(216, 165, 79, 0.24)',
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

export function getAgentUiStatus(input: {
  providerConfig: AgentProviderConfig;
  isLoading: boolean;
  error: string | null;
}) {
  const providerIssue = validateProviderBeforeRequest(input.providerConfig);

  if (input.isLoading) {
    return {
      tone: getStatusTone('testing'),
      label: 'Thinking',
      detail: 'Working on your request',
    };
  }

  if (providerIssue) {
    return {
      tone: getStatusTone('setup'),
      label: 'Incomplete',
      detail: providerIssue,
    };
  }

  if (input.error && !input.error.startsWith('Describe what you want')) {
    return {
      tone: getStatusTone('error'),
      label: 'Attention',
      detail: input.error,
    };
  }

  return {
    tone: getStatusTone('configured'),
    label: 'Configured',
    detail: 'Provider settings are ready',
  };
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
