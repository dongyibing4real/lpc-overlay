import { create } from 'zustand';
import {
  DEFAULT_PROVIDER_CONFIGS,
  type AgentHistoryItem,
  type AgentPlan,
  type AgentPlanDiagnostics,
  type AgentPromptTemplateId,
  type AgentProviderConfig,
  type AgentProviderId,
} from '../../shared/agent';
import type { WaferSceneSnapshot } from '../types/wafer';
import { useWaferStore } from './useWaferStore';
import { formatChatHistoryForAgent, summarizeExecutedPlan } from '../features/agent-panel/lib/conversationFormatter';
import { humanizeAgentError, requestAgentPlan, validateProviderBeforeRequest } from '../features/agent-panel/lib/agentApiClient';
import { applyPlanToSnapshot } from '../features/agent-panel/lib/sceneCommandExecutor';
import { captureSceneForAgent } from '../features/agent-panel/lib/sceneSummaryBuilder';
import { inferIntent, getTemplateLabel } from '../features/agent-panel/lib/promptIntent';

const STORAGE_KEY = 'overlay-agent-provider-configs';

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

let _persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistProviderConfigs(configs: Record<AgentProviderId, AgentProviderConfig>) {
  if (typeof window === 'undefined') return;
  if (_persistTimer !== null) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  }, 500);
}


interface AgentState {
  prompt: string;
  selectedTemplateId: AgentPromptTemplateId;
  isLoading: boolean;
  error: string | null;
  draftPlan: AgentPlan | null;
  draftPlanDiagnostics: AgentPlanDiagnostics | null;
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
  prompt: '',
  selectedTemplateId: 'general',
  isLoading: false,
  error: null,
  draftPlan: null,
  draftPlanDiagnostics: null,
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
    const state = get();
    if (state.isLoading) return;

    const { prompt: userInput, selectedTemplateId: templateId, history, draftPlan } = state;
    const intent = inferIntent(userInput, templateId);
    const provider = state.providerConfigs[state.selectedProviderId];
    const scene = captureSceneForAgent();
    const conversationContext = formatChatHistoryForAgent(history, draftPlan);
    const providerError = validateProviderBeforeRequest(provider);
    if (providerError) {
      set({ error: providerError });
      return;
    }

    if (!userInput.trim() && templateId === 'general') {
      set({ error: 'Describe what you want, or choose a prompt shortcut first.' });
      return;
    }

    const now = Date.now();
    const userItem: AgentHistoryItem = {
      id: `${now}-user`,
      role: 'user',
      text: userInput.trim() || `Used shortcut: ${getTemplateLabel(templateId)}`,
      createdAt: now - 1,
    };

    set((current) => ({
      isLoading: true,
      error: null,
      prompt: '',
      history: [...current.history.slice(-6), userItem],
    }));

    try {
      const plan = await requestAgentPlan({
        intent,
        templateId,
        userInput,
        conversationContext,
        provider,
        scene,
      });
      const assistantMessageId = `${Date.now()}-assistant`;
      const historyItem: AgentHistoryItem = {
        id: assistantMessageId,
        role: 'assistant',
        text: plan.plan.analysis ? `${plan.plan.summary}\n\n${plan.plan.analysis}` : plan.plan.summary,
        createdAt: Date.now(),
        plan: plan.plan,
        diagnostics: plan.diagnostics,
      };

      set((state) => ({
        draftPlan: plan.plan,
        draftPlanDiagnostics: plan.diagnostics,
        activePlanMessageId: assistantMessageId,
        history: [...state.history.slice(-6), historyItem],
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: humanizeAgentError(error),
      });
    }
  },

  discardDraftPlan() {
    set({ draftPlan: null, draftPlanDiagnostics: null, activePlanMessageId: null, error: null });
  },

  applyDraftPlan() {
    const draftPlan = get().draftPlan;
    if (!draftPlan) return;

    const waferStore = useWaferStore.getState();
    const previousSnapshot = waferStore.getSceneSnapshot();
    const nextSnapshot = applyPlanToSnapshot(previousSnapshot, draftPlan);

    waferStore.replaceSceneSnapshot(nextSnapshot);
    const now = Date.now();
    set((state) => ({
      draftPlan: null,
      draftPlanDiagnostics: null,
      activePlanMessageId: null,
      history: [
        ...state.history.slice(-7),
        {
          id: `${now}-system-apply`,
          role: 'system',
          text: summarizeExecutedPlan(draftPlan.actions),
          createdAt: now,
        },
      ],
      lastAppliedSnapshot: previousSnapshot,
      error: null,
    }));
  },

  undoLastApply() {
    const previousSnapshot = get().lastAppliedSnapshot;
    if (!previousSnapshot) return;

    useWaferStore.getState().replaceSceneSnapshot(previousSnapshot);
    const now = Date.now();
    set((state) => ({
      history: [
        ...state.history.slice(-7),
        {
          id: `${now}-system-undo`,
          role: 'system',
          text: 'Undid the last applied agent change.',
          createdAt: now,
        },
      ],
      lastAppliedSnapshot: null,
      error: null,
    }));
  },
}));
