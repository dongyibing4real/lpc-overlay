import type { AgentAction, AgentHistoryItem, AgentPlan } from '../../shared/agent';
import { describeAgentAction } from '../features/agent-panel/lib/agentPanelHelpers';

export function summarizeHistoryText(text: string, maxLength = 180): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3)}...`;
}

export function formatChatHistoryForAgent(history: AgentHistoryItem[], draftPlan: AgentPlan | null): string | undefined {
  const recentItems = history.slice(-4);
  const lines = recentItems.map((item) => {
    const speaker = item.role === 'assistant' ? 'Agent' : item.role === 'system' ? 'System' : 'User';
    return `${speaker}: ${summarizeHistoryText(item.text)}`;
  });

  if (draftPlan) {
    lines.push(`Pending plan: ${summarizeHistoryText(draftPlan.summary)}`);
  }

  return lines.length > 0 ? lines.join('\n') : undefined;
}

export function summarizeExecutedPlan(actions: AgentAction[]): string {
  if (actions.length === 0) return 'Executed plan with no state changes.';
  const labels = actions.slice(0, 3).map(describeAgentAction);
  const suffix = actions.length > 3 ? `, and ${actions.length - 3} more` : '';
  return `Executed: ${labels.join('; ')}${suffix}.`;
}
