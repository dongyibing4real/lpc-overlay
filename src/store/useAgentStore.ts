import { create } from 'zustand';
import { DEFAULT_PROVIDER_CONFIGS, type AgentAction, type AgentHistoryItem, type AgentIntent, type AgentPlan, type AgentPromptTemplateId, type AgentProviderConfig, type AgentProviderId, type SceneContextSummary } from '../../shared/agent';
import type { WaferSceneSnapshot } from '../types/wafer';
import { computeStats } from '../utils/distortionMath';
import { useWaferStore } from './useWaferStore';

const STORAGE_KEY = 'overlay-agent-provider-configs';

function inferIntent(userInput: string, templateId: AgentPromptTemplateId): AgentIntent {
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

function summarizeTemplate(templateId: AgentPromptTemplateId): string {
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

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function loadProviderConfigs(): Record<AgentProviderId, AgentProviderConfig> {
  if (typeof window === 'undefined') {
    return structuredClone(DEFAULT_PROVIDER_CONFIGS);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROVIDER_CONFIGS);
    const parsed = JSON.parse(raw) as Partial<Record<AgentProviderId, AgentProviderConfig>>;
    return {
      'local-openai-compatible': { ...DEFAULT_PROVIDER_CONFIGS['local-openai-compatible'], ...parsed['local-openai-compatible'] },
      'remote-openai-compatible': { ...DEFAULT_PROVIDER_CONFIGS['remote-openai-compatible'], ...parsed['remote-openai-compatible'] },
    };
  } catch {
    return structuredClone(DEFAULT_PROVIDER_CONFIGS);
  }
}

function persistProviderConfigs(configs: Record<AgentProviderId, AgentProviderConfig>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

function summarizeHistoryText(text: string, maxLength = 180): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1)}…`;
}

function buildConversationContextSummary(history: AgentHistoryItem[], draftPlan: AgentPlan | null): string | undefined {
  const recentItems = history.slice(-4);
  const lines = recentItems.map((item) => `${item.role === 'assistant' ? 'Agent' : 'User'}: ${summarizeHistoryText(item.text)}`);

  if (draftPlan) {
    lines.push(`Pending plan: ${summarizeHistoryText(draftPlan.summary)}`);
  }

  if (lines.length === 0) return undefined;
  return lines.join('\n');
}

function applyAgentAction(snapshot: WaferSceneSnapshot, action: AgentAction) {
  switch (action.type) {
    case 'set_wafer_distortion':
      Object.assign(snapshot.waferDistortion, action.patch);
      return;
    case 'set_field_distortion':
      Object.assign(snapshot.fieldDistortion, action.patch);
      return;
    case 'set_view_state':
      Object.assign(snapshot.viewState, action.patch);
      return;
    case 'set_field_transform': {
      const current = snapshot.perFieldTransformOverrides[action.fieldId] ?? {
        Tx: 0,
        Ty: 0,
        theta: 0,
        M: 0,
        Sx: 0,
        Sy: 0,
      };
      snapshot.perFieldTransformOverrides[action.fieldId] = { ...current, ...action.patch };
      return;
    }
    case 'set_field_corner_overlay':
      snapshot.perFieldCornerOverlays[action.fieldId] = structuredClone(action.overlay);
      return;
    case 'select_field':
      snapshot.selectedFieldId = action.fieldId;
      return;
    case 'reset_model': {
      const clean = useWaferStore.getState().getDefaultSceneSnapshot();
      snapshot.layoutConfig = clean.layoutConfig;
      snapshot.waferDistortion = clean.waferDistortion;
      snapshot.fieldDistortion = clean.fieldDistortion;
      snapshot.epeConfig = clean.epeConfig;
      snapshot.viewState = clean.viewState;
      snapshot.importedData = clean.importedData;
      snapshot.perEntityOverlays = clean.perEntityOverlays;
      snapshot.selectedFieldId = clean.selectedFieldId;
      snapshot.perFieldTransformOverrides = clean.perFieldTransformOverrides;
      snapshot.perFieldCornerOverlays = clean.perFieldCornerOverlays;
      return;
    }
  }
}

function buildSceneContextSummary(): SceneContextSummary {
  const waferState = useWaferStore.getState();
  return {
    layoutConfig: structuredClone(waferState.layoutConfig),
    waferDistortion: structuredClone(waferState.waferDistortion),
    fieldDistortion: structuredClone(waferState.fieldDistortion),
    epeConfig: structuredClone(waferState.epeConfig),
    viewState: structuredClone(waferState.viewState),
    selectedFieldId: waferState.selectedFieldId,
    stats: computeStats(waferState.distortionResults),
    activeFieldIds: waferState.fields.map((field) => field.id),
    editableFieldIds: waferState.fields.map((field) => field.id),
    limits: {
      wafer: {
        Tx: [-2000, 2000],
        Ty: [-2000, 2000],
        theta: [-400, 400],
        M: [-300, 300],
        Sx: [-300, 300],
        Sy: [-300, 300],
      },
      field: {
        FTx: [-1000, 1000],
        FTy: [-1000, 1000],
        Ftheta: [-300, 300],
        FM: [-200, 200],
        FSx: [-200, 200],
        FSy: [-200, 200],
      },
      fieldEdit: {
        Tx: [-2000, 2000],
        Ty: [-2000, 2000],
        theta: [-1200, 1200],
        M: [-300, 300],
        Sx: [-300, 300],
        Sy: [-300, 300],
      },
      cornerOverlayNm: [-1500, 1500],
      arrowScaleFactor: [1000, 100000],
      colorMaxNm: [1, 1000],
    },
  };
}

interface AgentState {
  intent: AgentIntent;
  prompt: string;
  selectedTemplateId: AgentPromptTemplateId;
  isLoading: boolean;
  error: string | null;
  draftPlan: AgentPlan | null;
  activePlanMessageId: string | null;
  history: AgentHistoryItem[];
  selectedProviderId: AgentProviderId;
  providerConfigs: Record<AgentProviderId, AgentProviderConfig>;
  lastAppliedSnapshot: WaferSceneSnapshot | null;
  setPrompt: (prompt: string) => void;
  setSelectedTemplateId: (templateId: AgentPromptTemplateId) => void;
  setSelectedProviderId: (providerId: AgentProviderId) => void;
  updateProviderConfig: (providerId: AgentProviderId, patch: Partial<AgentProviderConfig>) => void;
  requestPlan: () => Promise<void>;
  discardDraftPlan: () => void;
  applyDraftPlan: () => void;
  undoLastApply: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  intent: 'scenario',
  prompt: '',
  selectedTemplateId: 'general',
  isLoading: false,
  error: null,
  draftPlan: null,
  activePlanMessageId: null,
  history: [],
  selectedProviderId: 'local-openai-compatible',
  providerConfigs: loadProviderConfigs(),
  lastAppliedSnapshot: null,

  setPrompt(prompt) {
    set({ prompt });
  },

  setSelectedTemplateId(templateId) {
    set({ selectedTemplateId: templateId });
  },

  setSelectedProviderId(providerId) {
    set({ selectedProviderId: providerId });
  },

  updateProviderConfig(providerId, patch) {
    set((state) => {
      const providerConfigs = {
        ...state.providerConfigs,
        [providerId]: {
          ...state.providerConfigs[providerId],
          ...patch,
        },
      };
      persistProviderConfigs(providerConfigs);
      return { providerConfigs };
    });
  },

  async requestPlan() {
    if (get().isLoading) return;

    const userInput = get().prompt;
    const templateId = get().selectedTemplateId;
    const intent = inferIntent(userInput, templateId);
    const provider = get().providerConfigs[get().selectedProviderId];
    const scene = buildSceneContextSummary();
    const conversationContext = buildConversationContextSummary(get().history, get().draftPlan);

    if (!provider.baseUrl.trim()) {
      set({ error: 'Base URL is required before sending a request.' });
      return;
    }

    if (!isValidUrl(provider.baseUrl.trim())) {
      set({ error: 'Base URL must be a valid URL, for example https://api.deepseek.com/v1.' });
      return;
    }

    if (!provider.model.trim()) {
      set({ error: 'Model is required before sending a request.' });
      return;
    }

    if (provider.kind === 'api' && !provider.apiKey?.trim()) {
      set({ error: 'API key is required for remote providers.' });
      return;
    }

    if (!userInput.trim() && templateId === 'general') {
      set({ error: 'Describe what you want, or choose a prompt shortcut first.' });
      return;
    }

    set({ isLoading: true, error: null, intent });
    try {
      const response = await fetch('/api/agent/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planVersion: 'v1',
          intent,
          templateId,
          userInput,
          conversationContext,
          prompt: userInput,
          provider,
          scene,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || `Agent request failed with ${response.status}`);
      }

      const payload = await response.json() as { plan: AgentPlan };
      const now = Date.now();
      const userItem: AgentHistoryItem = {
        id: `${now}-user`,
        role: 'user',
        text: userInput.trim() || `Used shortcut: ${summarizeTemplate(templateId)}`,
        createdAt: now - 1,
      };
      const assistantMessageId = `${now}-assistant`;
      const historyItem: AgentHistoryItem = {
        id: assistantMessageId,
        role: 'assistant',
        text: payload.plan.analysis ? `${payload.plan.summary}\n\n${payload.plan.analysis}` : payload.plan.summary,
        createdAt: now,
        plan: payload.plan,
      };
      set((state) => ({
        draftPlan: payload.plan,
        activePlanMessageId: assistantMessageId,
        history: [...state.history.slice(-6), userItem, historyItem],
        isLoading: false,
        prompt: '',
      }));
    } catch (error) {
      let message = error instanceof Error ? error.message : 'Unknown agent error';
      if (message === 'Failed to fetch') {
        message = 'Could not reach the local agent backend. Restart the app with npm run dev:full and try again.';
      }
      set({
        isLoading: false,
        error: message,
      });
    }
  },

  discardDraftPlan() {
    set({ draftPlan: null, activePlanMessageId: null, error: null });
  },

  applyDraftPlan() {
    const draftPlan = get().draftPlan;
    if (!draftPlan) return;

    const waferStore = useWaferStore.getState();
    const previousSnapshot = waferStore.getSceneSnapshot();
    const nextSnapshot = structuredClone(previousSnapshot);

    for (const action of draftPlan.actions) {
      applyAgentAction(nextSnapshot, action);
    }

    waferStore.replaceSceneSnapshot(nextSnapshot);
    set({
      draftPlan: null,
      activePlanMessageId: null,
      lastAppliedSnapshot: previousSnapshot,
      error: null,
    });
  },

  undoLastApply() {
    const previousSnapshot = get().lastAppliedSnapshot;
    if (!previousSnapshot) return;
    useWaferStore.getState().replaceSceneSnapshot(previousSnapshot);
    set({ lastAppliedSnapshot: null, error: null });
  },
}));
