import type { AgentIntent, AgentPromptTemplateId } from '../../shared/agent';

export function inferIntent(userInput: string, templateId: AgentPromptTemplateId): AgentIntent {
  if (templateId === 'explain-view' || templateId === 'generate-report') {
    return 'analysis';
  }

  if (templateId === 'generate-plan') {
    return 'scenario';
  }

  const normalized = userInput.trim().toLowerCase();
  if (!normalized) return 'scenario';

  const analysisKeywords = ['explain', 'analyze', 'analysis', 'report', 'summarize', 'summary', 'what dominates'];
  return analysisKeywords.some((keyword) => normalized.includes(keyword)) ? 'analysis' : 'scenario';
}

export function getTemplateLabel(templateId: AgentPromptTemplateId): string {
  switch (templateId) {
    case 'generate-plan':
      return 'Generate Plan';
    case 'explain-view':
      return 'Explain View';
    case 'generate-report':
      return 'Generate Report';
    default:
      return 'Free Prompt';
  }
}
