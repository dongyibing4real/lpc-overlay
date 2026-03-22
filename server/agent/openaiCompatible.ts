import type {
  AgentProviderConfig,
  AgentPlanResponse,
  AgentRequest,
  ProviderConnectionResponse,
} from '../../shared/agent.js';
import { buildAgentSystemPrompt, buildAgentUserPrompt } from './promptBuilder.js';
import { normalizePlan } from './normalizePlan.js';

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function buildEndpoint(baseUrl: string, path: 'chat/completions' | 'models'): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid provider base URL: ${baseUrl}`);
  }

  const normalized = trimTrailingSlash(parsedUrl.toString());
  return normalized.endsWith('/v1') ? `${normalized}/${path}` : `${normalized}/v1/${path}`;
}

function buildHeaders(provider: AgentProviderConfig): Record<string, string> {
  const token = provider.apiKey?.trim() || 'local-dev';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function extractJsonBlock(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model response did not contain a JSON object.');
  }
  return text.slice(start, end + 1);
}

async function postChatCompletion(request: AgentRequest) {
  const endpoint = buildEndpoint(request.provider.baseUrl, 'chat/completions');

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(request.provider),
      body: JSON.stringify({
        model: request.provider.model,
        temperature: request.intent === 'analysis' ? 0.2 : 0.4,
        messages: [
          { role: 'system', content: buildAgentSystemPrompt(request) },
          { role: 'user', content: buildAgentUserPrompt(request) },
        ],
      }),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown network error';
    throw new Error(`Could not reach provider at ${endpoint}. ${reason}`);
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Provider returned ${response.status}: ${details}`);
  }

  return response.json() as Promise<ChatCompletionResponse>;
}

export async function generatePlanWithOpenAICompatible(request: AgentRequest): Promise<AgentPlanResponse> {
  const payload = await postChatCompletion(request);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Provider response did not contain a message content payload.');
  }

  const parsed = JSON.parse(extractJsonBlock(content));
  return normalizePlan(parsed, request);
}

export async function testOpenAICompatibleConnection(provider: AgentProviderConfig): Promise<ProviderConnectionResponse> {
  let endpoint: string;
  try {
    endpoint = buildEndpoint(provider.baseUrl, 'models');
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Invalid provider URL.',
    };
  }

  try {
    const response = await fetch(endpoint, {
      headers: buildHeaders(provider),
    });

    if (!response.ok) {
      const details = await response.text();
      return {
        ok: false,
        message: `Connection failed (${response.status}): ${details}`,
      };
    }

    return {
      ok: true,
      message: 'Provider is reachable.',
    };
  } catch (error) {
    return {
      ok: false,
      message: `Could not reach provider at ${endpoint}. ${error instanceof Error ? error.message : 'Unknown connection error'}`,
    };
  }
}
