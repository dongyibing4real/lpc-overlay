import {
  agentActionSchema,
  agentPlanSchema,
  type AgentPlan,
  type AgentProviderConfig,
  type ProviderConnectionResponse,
} from '../../shared/agent.js';
import type { AgentRequest } from '../../shared/agent.js';
import { buildAgentSystemPrompt, buildAgentUserPrompt } from './prompt.js';

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
  if (normalized.endsWith('/v1')) {
    return `${normalized}/${path}`;
  }
  return `${normalized}/v1/${path}`;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickNumberPatch(source: Record<string, unknown>, keys: string[]) {
  const patch: Record<string, number> = {};
  for (const key of keys) {
    if (typeof source[key] === 'number') {
      patch[key] = source[key];
    }
  }
  return patch;
}

function coerceOverlay(value: unknown) {
  if (!isRecord(value)) return undefined;
  const cornerDx = value.cornerDx;
  const cornerDy = value.cornerDy;
  if (
    Array.isArray(cornerDx) &&
    cornerDx.length === 4 &&
    cornerDx.every((item) => typeof item === 'number') &&
    Array.isArray(cornerDy) &&
    cornerDy.length === 4 &&
    cornerDy.every((item) => typeof item === 'number')
  ) {
    return {
      cornerDx: [cornerDx[0], cornerDx[1], cornerDx[2], cornerDx[3]] as [number, number, number, number],
      cornerDy: [cornerDy[0], cornerDy[1], cornerDy[2], cornerDy[3]] as [number, number, number, number],
    };
  }
  return undefined;
}

function normalizeAction(rawAction: unknown) {
  const direct = agentActionSchema.safeParse(rawAction);
  if (direct.success) {
    return direct.data;
  }

  if (!isRecord(rawAction) || typeof rawAction.type !== 'string') {
    return null;
  }

  switch (rawAction.type) {
    case 'set_wafer_distortion': {
      const normalized = {
        type: 'set_wafer_distortion' as const,
        patch: isRecord(rawAction.patch) ? rawAction.patch : pickNumberPatch(rawAction, ['Tx', 'Ty', 'theta', 'M', 'Sx', 'Sy']),
      };
      return agentActionSchema.safeParse(normalized).success ? normalized : null;
    }
    case 'set_field_distortion': {
      const normalized = {
        type: 'set_field_distortion' as const,
        patch: isRecord(rawAction.patch) ? rawAction.patch : pickNumberPatch(rawAction, ['FTx', 'FTy', 'Ftheta', 'FM', 'FSx', 'FSy']),
      };
      return agentActionSchema.safeParse(normalized).success ? normalized : null;
    }
    case 'set_view_state': {
      const normalized = {
        type: 'set_view_state' as const,
        patch: isRecord(rawAction.patch)
          ? rawAction.patch
          : {
              ...pickNumberPatch(rawAction, ['arrowScaleFactor']),
              ...(rawAction.granularity === 'die' || rawAction.granularity === 'field' ? { granularity: rawAction.granularity } : {}),
              ...(Array.isArray(rawAction.colorMapRange) ? { colorMapRange: rawAction.colorMapRange } : {}),
            },
      };
      return agentActionSchema.safeParse(normalized).success ? normalized : null;
    }
    case 'set_field_transform': {
      const fieldId = typeof rawAction.fieldId === 'string' ? rawAction.fieldId : typeof rawAction.id === 'string' ? rawAction.id : null;
      const normalized = {
        type: 'set_field_transform' as const,
        fieldId,
        patch: isRecord(rawAction.patch) ? rawAction.patch : pickNumberPatch(rawAction, ['Tx', 'Ty', 'theta', 'M', 'Sx', 'Sy']),
      };
      return agentActionSchema.safeParse(normalized).success ? normalized : null;
    }
    case 'set_field_corner_overlay': {
      const fieldId = typeof rawAction.fieldId === 'string' ? rawAction.fieldId : typeof rawAction.id === 'string' ? rawAction.id : null;
      const normalized = {
        type: 'set_field_corner_overlay' as const,
        fieldId,
        overlay: coerceOverlay(rawAction.overlay) ?? coerceOverlay(rawAction.patch),
      };
      return agentActionSchema.safeParse(normalized).success ? normalized : null;
    }
    case 'select_field': {
      const normalized = {
        type: 'select_field' as const,
        fieldId:
          typeof rawAction.fieldId === 'string' || rawAction.fieldId === null
            ? rawAction.fieldId
            : typeof rawAction.id === 'string'
              ? rawAction.id
              : null,
      };
      return agentActionSchema.safeParse(normalized).success ? normalized : null;
    }
    case 'reset_model': {
      const normalized = { type: 'reset_model' as const };
      return agentActionSchema.safeParse(normalized).success ? normalized : null;
    }
    default:
      return null;
  }
}

function sanitizePlan(rawPlan: unknown, request: AgentRequest): AgentPlan {
  if (!isRecord(rawPlan)) {
    throw new Error('Model response was not a JSON object.');
  }

  const rawActions = Array.isArray(rawPlan.actions) ? rawPlan.actions : [];
  const actions = rawActions
    .map((action) => normalizeAction(action))
    .filter((action): action is NonNullable<typeof action> => action !== null);

  const suggestions = Array.isArray(rawPlan.suggestions)
    ? rawPlan.suggestions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  const sanitized = {
    planVersion: 'v1' as const,
    intent: rawPlan.intent === 'analysis' || rawPlan.intent === 'scenario' ? rawPlan.intent : request.intent,
    summary: typeof rawPlan.summary === 'string' && rawPlan.summary.trim() ? rawPlan.summary : 'Plan generated.',
    ...(typeof rawPlan.analysis === 'string' && rawPlan.analysis.trim() ? { analysis: rawPlan.analysis } : {}),
    actions,
    suggestions,
    providerId: request.provider.id,
    requiresConfirmation: rawPlan.requiresConfirmation !== false,
  };

  const result = agentPlanSchema.safeParse(sanitized);
  if (!result.success) {
    throw new Error(`Model returned an invalid plan: ${result.error.message}`);
  }

  return result.data;
}

export async function generatePlanWithOpenAICompatible(request: AgentRequest): Promise<AgentPlan> {
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
          {
            role: 'system',
            content: buildAgentSystemPrompt(request),
          },
          {
            role: 'user',
            content: buildAgentUserPrompt(request),
          },
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

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Provider response did not contain a message content payload.');
  }

  const parsed = JSON.parse(extractJsonBlock(content));
  return sanitizePlan(parsed, request);
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
