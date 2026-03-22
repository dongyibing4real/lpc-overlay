import type {
  AgentIntent,
  AgentPlanResponse,
  AgentPromptTemplateId,
  AgentProviderConfig,
  SceneContextSummary,
} from '../../shared/agent';

export function humanizeAgentError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown agent error';
  if (message === 'Failed to fetch') {
    return 'Could not reach the local agent backend. Restart the app with npm run dev:full and try again.';
  }
  return message;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function validateProviderBeforeRequest(provider: AgentProviderConfig) {
  if (!provider.baseUrl.trim()) {
    return 'Base URL is required before sending a request.';
  }

  if (!isValidUrl(provider.baseUrl.trim())) {
    return 'Base URL must be a valid URL, for example https://api.deepseek.com/v1.';
  }

  if (!provider.model.trim()) {
    return 'Model is required before sending a request.';
  }

  if (provider.kind === 'api' && !provider.apiKey?.trim()) {
    return 'API key is required for remote providers.';
  }

  return null;
}

export async function requestAgentPlan(input: {
  intent: AgentIntent;
  templateId: AgentPromptTemplateId;
  userInput: string;
  conversationContext?: string;
  provider: AgentProviderConfig;
  scene: SceneContextSummary;
}): Promise<AgentPlanResponse> {
  const response = await fetch('/api/agent/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planVersion: 'v1',
      intent: input.intent,
      templateId: input.templateId,
      userInput: input.userInput,
      conversationContext: input.conversationContext,
      provider: input.provider,
      scene: input.scene,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `Agent request failed with ${response.status}`);
  }

  return (await response.json()) as AgentPlanResponse;
}
