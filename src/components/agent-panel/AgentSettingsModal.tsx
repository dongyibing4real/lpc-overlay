import React, { useState } from 'react';
import { DEFAULT_PROVIDER_DESCRIPTORS, type AgentProviderConfig, type AgentProviderId } from '../../../shared/agent';
import { humanizeAgentError } from '../../agent/agentApiClient';
import { INPUT_STYLE, LABEL, OVERLAY_CARD, SECONDARY_BUTTON } from './agentPanelStyles';
import { getStatusTone, summarizeActiveProvider, summarizeProvider } from './agentPanelHelpers';

interface AgentSettingsModalProps {
  selectedProviderId: AgentProviderId;
  providerConfig: AgentProviderConfig;
  setSelectedProviderId: (providerId: AgentProviderId) => void;
  updateProviderConfig: (providerId: AgentProviderId, patch: Partial<AgentProviderConfig>) => void;
  onClose: () => void;
}

export const AgentSettingsModal: React.FC<AgentSettingsModalProps> = ({
  selectedProviderId,
  providerConfig,
  setSelectedProviderId,
  updateProviderConfig,
  onClose,
}) => {
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [connectionTone, setConnectionTone] = useState<'idle' | 'success' | 'error' | 'testing'>('idle');
  const statusTone = getStatusTone(connectionTone);

  const handleTestConnection = async () => {
    setConnectionTone('testing');
    setConnectionMessage(null);
    try {
      const response = await fetch('/api/agent/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerConfig }),
      });
      const payload = await response.json() as { ok: boolean; message: string };
      setConnectionTone(payload.ok ? 'success' : 'error');
      setConnectionMessage(payload.message);
    } catch (connectionError) {
      setConnectionTone('error');
      setConnectionMessage(humanizeAgentError(connectionError));
    }
  };

  const selectedProviderDescriptor =
    DEFAULT_PROVIDER_DESCRIPTORS.find((provider) => provider.id === selectedProviderId) ?? DEFAULT_PROVIDER_DESCRIPTORS[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 210,
        background: 'rgba(224, 232, 240, 0.36)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ width: 460, maxWidth: '100%', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', padding: '16px 16px', ...OVERLAY_CARD }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 3, height: 15, background: '#5878ad', borderRadius: 99, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#243a4c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                LPC Agent Settings
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#61788d', lineHeight: 1.55 }}>
              Configure the connection once, then keep the chat window focused on prompting and review.
            </div>
          </div>
          <button onClick={onClose} style={{ ...SECONDARY_BUTTON, minHeight: 32, width: 32, padding: 0 }} aria-label="Close settings">
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 10, padding: '12px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.52)', border: '1px solid rgba(166,184,198,0.2)' }}>
            <div style={LABEL}>Active Model Source</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {DEFAULT_PROVIDER_DESCRIPTORS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProviderId(provider.id)}
                  style={{
                    flex: 1,
                    minHeight: 38,
                    borderRadius: 10,
                    border: '1px solid rgba(166,184,198,0.32)',
                    background: selectedProviderId === provider.id ? 'rgba(242,247,252,0.96)' : 'rgba(255,255,255,0.78)',
                    color: selectedProviderId === provider.id ? '#24445d' : '#6b8093',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {provider.kind === 'local' ? 'Local Model' : 'Remote API'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: '#60788b', lineHeight: 1.55 }}>
              LPC Agent always sends requests through the currently active source. Both profiles use the same OpenAI-compatible protocol.
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, padding: '12px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.52)', border: '1px solid rgba(166,184,198,0.2)' }}>
            <div style={LABEL}>Connection Details</div>
            <div style={{ fontSize: 11.5, color: '#60788b', lineHeight: 1.55 }}>
              Current source: <strong style={{ color: '#355d80' }}>{summarizeActiveProvider(selectedProviderId)}</strong>
            </div>
            <div style={{ display: 'grid', gap: 7 }}>
              <label style={LABEL}>Base URL</label>
              <input value={providerConfig.baseUrl} onChange={(event) => updateProviderConfig(selectedProviderId, { baseUrl: event.target.value })} placeholder={selectedProviderDescriptor.defaultBaseUrl} style={INPUT_STYLE} />
            </div>
            <div style={{ display: 'grid', gap: 7 }}>
              <label style={LABEL}>Model</label>
              <input value={providerConfig.model} onChange={(event) => updateProviderConfig(selectedProviderId, { model: event.target.value })} placeholder="Model name" style={INPUT_STYLE} />
              <div style={{ fontSize: 11.5, color: '#60788b', lineHeight: 1.5 }}>
                Required by most OpenAI-compatible endpoints, including local model servers and remote APIs.
              </div>
            </div>
            <div style={{ display: 'grid', gap: 7 }}>
              <label style={LABEL}>{selectedProviderDescriptor.requiresApiKey ? 'API Key' : 'API Key (Optional)'}</label>
              <input value={providerConfig.apiKey ?? ''} onChange={(event) => updateProviderConfig(selectedProviderId, { apiKey: event.target.value })} placeholder={selectedProviderDescriptor.requiresApiKey ? 'API key' : 'Optional API key'} type="password" style={INPUT_STYLE} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 11.5, color: statusTone.text }}>
                {connectionMessage ?? 'Run a quick connection check before your first prompt.'}
              </div>
              <button onClick={() => void handleTestConnection()} style={{ ...SECONDARY_BUTTON, padding: '0 12px', flexShrink: 0 }}>
                {connectionTone === 'testing' ? `Testing ${summarizeProvider(selectedProviderId)}...` : 'Test Connection'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
