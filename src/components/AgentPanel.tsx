import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_PROVIDER_DESCRIPTORS, type AgentAction, type AgentPromptTemplateId, type AgentProviderId } from '../../shared/agent';
import { useAgentStore } from '../store/useAgentStore';

const WINDOW_WIDTH = 388;
const WINDOW_HEIGHT = 560;
const FAB_WIDTH = 182;
const FAB_HEIGHT = 56;
const FLOAT_MARGIN = 24;
const PANEL_ANIMATION_MS = 240;
const POPUP_ICON_SIZE = 44;
const POPUP_ICON_GAP = 8;
const OPEN_STACK_HEIGHT = POPUP_ICON_SIZE + POPUP_ICON_GAP + WINDOW_HEIGHT;
const FAB_ATTRACT_RADIUS = 180;

const OVERLAY_CARD: React.CSSProperties = {
  background: 'rgba(252, 253, 255, 0.92)',
  borderRadius: 20,
  border: '1px solid rgba(191, 205, 218, 0.58)',
  boxShadow: '0 24px 60px rgba(63, 91, 122, 0.18)',
  backdropFilter: 'blur(20px)',
};

const INPUT_STYLE: React.CSSProperties = {
  minHeight: 38,
  borderRadius: 10,
  border: '1px solid rgba(166,184,198,0.36)',
  background: 'rgba(255,255,255,0.9)',
  color: '#22384b',
  padding: '0 11px',
  outline: 'none',
  fontSize: 12,
};

const SECONDARY_BUTTON: React.CSSProperties = {
  minHeight: 34,
  borderRadius: 10,
  border: '1px solid rgba(166,184,198,0.42)',
  background: 'rgba(255,255,255,0.88)',
  color: '#51697d',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const PRIMARY_BUTTON: React.CSSProperties = {
  minHeight: 36,
  borderRadius: 10,
  border: '1px solid rgba(78,118,169,0.46)',
  background: 'linear-gradient(135deg, #547fc0 0%, #44689b 100%)',
  color: '#ffffff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 8px 18px rgba(68,104,155,0.18)',
};

const LABEL: React.CSSProperties = {
  fontSize: 10.5,
  color: '#708596',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

const QUICK_ACTIONS: Array<{ label: string; templateId: AgentPromptTemplateId }> = [
  { label: 'Generate Plan', templateId: 'generate-plan' },
  { label: 'Explain View', templateId: 'explain-view' },
  { label: 'Generate Report', templateId: 'generate-report' },
];

type DragState = {
  mode: 'fab' | 'panel';
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

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

function getStatusTone(kind: 'idle' | 'success' | 'error' | 'testing') {
  switch (kind) {
    case 'success':
      return {
        dot: '#49c46f',
        text: '#21583a',
        label: 'Connected',
        glow: 'rgba(73, 196, 111, 0.34)',
        bg: 'rgba(236, 251, 241, 0.98)',
        border: 'rgba(105, 196, 132, 0.42)',
      };
    case 'error':
      return {
        dot: '#e36a5a',
        text: '#8c4238',
        label: 'Needs Attention',
        glow: 'rgba(227, 106, 90, 0.28)',
        bg: 'rgba(253, 241, 238, 0.98)',
        border: 'rgba(219, 138, 122, 0.36)',
      };
    case 'testing':
      return {
        dot: '#6f9edf',
        text: '#365577',
        label: 'Testing',
        glow: 'rgba(111, 158, 223, 0.28)',
        bg: 'rgba(239, 246, 255, 0.98)',
        border: 'rgba(125, 163, 214, 0.34)',
      };
    default:
      return {
        dot: '#7da4cc',
        text: '#41627f',
        label: 'Ready',
        glow: 'rgba(125, 164, 204, 0.24)',
        bg: 'rgba(240, 246, 252, 0.98)',
        border: 'rgba(161, 186, 209, 0.34)',
      };
  }
}

function summarizeProvider(providerId: AgentProviderId) {
  return providerId === 'local-openai-compatible' ? 'Local Model' : 'Remote API';
}

function formatAgentAction(action: AgentAction): string {
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampFabPosition(x: number, y: number, viewport: { width: number; height: number }) {
  return {
    x: clamp(x, FLOAT_MARGIN, viewport.width - FAB_WIDTH - FLOAT_MARGIN),
    y: clamp(y, FLOAT_MARGIN, viewport.height - FAB_HEIGHT - FLOAT_MARGIN),
  };
}

function clampPanelPosition(x: number, y: number, viewport: { width: number; height: number }) {
  return {
    x: clamp(x, FLOAT_MARGIN, viewport.width - WINDOW_WIDTH - FLOAT_MARGIN),
    y: clamp(y, FLOAT_MARGIN, viewport.height - OPEN_STACK_HEIGHT - FLOAT_MARGIN),
  };
}

function getDefaultFabPosition(viewport: { width: number; height: number }) {
  return clampFabPosition(
    viewport.width - FAB_WIDTH - FLOAT_MARGIN - 26,
    92,
    viewport,
  );
}

function getPanelPositionFromFab(fabPosition: { x: number; y: number }, viewport: { width: number; height: number }) {
  return clampPanelPosition(fabPosition.x, fabPosition.y, viewport);
}

const RobotBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    style={{
      width: compact ? 36 : 32,
      height: compact ? 36 : 32,
      borderRadius: compact ? 18 : 12,
      background: 'linear-gradient(135deg, #6f93cf 0%, #4f72a8 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 18px rgba(68,104,155,0.2)',
      flexShrink: 0,
    }}
  >
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <rect x="4.5" y="5.5" width="12" height="10" rx="3.3" fill="#F8FBFF" />
      <rect x="7" y="9" width="2.3" height="2.6" rx="1.15" fill="#5477AF" />
      <rect x="11.7" y="9" width="2.3" height="2.6" rx="1.15" fill="#5477AF" />
      <path d="M8 13.2C8.65 14.1 9.45 14.55 10.5 14.55C11.55 14.55 12.35 14.1 13 13.2" stroke="#5477AF" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10.5 3.3V5.7" stroke="#DDE9F7" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10.5" cy="2.3" r="1.1" fill="#F7D67C" />
      <path d="M6.1 16.1L5 17.6" stroke="#DDE9F7" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M14.9 16.1L16 17.6" stroke="#DDE9F7" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  </div>
);

export const AgentPanel: React.FC = () => {
  const {
    prompt,
    isLoading,
    error,
    draftPlan,
    activePlanMessageId,
    history,
    selectedTemplateId,
    selectedProviderId,
    providerConfigs,
    lastAppliedSnapshot,
    setPrompt,
    setSelectedTemplateId,
    setSelectedProviderId,
    updateProviderConfig,
    requestPlan,
    discardDraftPlan,
    applyDraftPlan,
    undoLastApply,
  } = useAgentStore();

  const providerConfig = providerConfigs[selectedProviderId];
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFabIntro, setShowFabIntro] = useState(true);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [connectionTone, setConnectionTone] = useState<'idle' | 'success' | 'error' | 'testing'>('idle');
  const [viewport, setViewport] = useState({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  });
  const [fabPosition, setFabPosition] = useState(() =>
    getDefaultFabPosition({
      width: typeof window === 'undefined' ? 1440 : window.innerWidth,
      height: typeof window === 'undefined' ? 900 : window.innerHeight,
    }),
  );
  const [panelPosition, setPanelPosition] = useState(() =>
    clampPanelPosition(
      typeof window === 'undefined' ? 1240 : window.innerWidth - WINDOW_WIDTH - FLOAT_MARGIN,
      typeof window === 'undefined' ? 120 : 140,
      {
        width: typeof window === 'undefined' ? 1440 : window.innerWidth,
        height: typeof window === 'undefined' ? 900 : window.innerHeight,
      },
    ),
  );
  const dragStateRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  const selectedProviderDescriptor = useMemo(
    () => DEFAULT_PROVIDER_DESCRIPTORS.find((provider) => provider.id === selectedProviderId) ?? DEFAULT_PROVIDER_DESCRIPTORS[0],
    [selectedProviderId],
  );

  const statusTone = getStatusTone(connectionTone);
  const canApplyDraftPlan = !!draftPlan && draftPlan.actions.length > 0;
  const collapsedTranslateX = fabPosition.x - panelPosition.x;
  const collapsedTranslateY = fabPosition.y - panelPosition.y;

  useEffect(() => {
    if (!showFabIntro) return;

    const handlePointerMove = (event: PointerEvent) => {
      const centerX = fabPosition.x + FAB_WIDTH / 2;
      const centerY = fabPosition.y + FAB_HEIGHT / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      if (Math.hypot(dx, dy) <= FAB_ATTRACT_RADIUS) {
        setShowFabIntro(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [fabPosition.x, fabPosition.y, showFabIntro]);

  useEffect(() => {
    const handleResize = () => {
      const nextViewport = { width: window.innerWidth, height: window.innerHeight };
      setViewport(nextViewport);
      setFabPosition((current) => clampFabPosition(current.x, current.y, nextViewport));
      setPanelPosition((current) => clampPanelPosition(current.x, current.y, nextViewport));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didDragRef.current = true;
      }
      if (drag.mode === 'panel') {
        setPanelPosition(clampPanelPosition(drag.originX + dx, drag.originY + dy, viewport));
        return;
      }
      setFabPosition(clampFabPosition(drag.originX + dx, drag.originY + dy, viewport));
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (dragStateRef.current?.pointerId === event.pointerId) {
        dragStateRef.current = null;
      }
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [viewport.height, viewport.width]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const el = conversationRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [history.length, isLoading, activePlanMessageId]);

  const openPanel = () => {
    setShowFabIntro(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!mounted) {
      setPanelPosition(getPanelPositionFromFab(fabPosition, viewport));
      setMounted(true);
      requestAnimationFrame(() => setExpanded(true));
      return;
    }
    setExpanded(true);
  };

  const closePanel = () => {
    setFabPosition(clampFabPosition(panelPosition.x, panelPosition.y, viewport));
    setExpanded(false);
    setShowSettings(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, PANEL_ANIMATION_MS);
  };

  const beginSharedDrag = (mode: 'fab' | 'panel', pointerId: number, clientX: number, clientY: number) => {
    const origin = mode === 'panel' ? panelPosition : fabPosition;
    dragStateRef.current = {
      mode,
      pointerId,
      startX: clientX,
      startY: clientY,
      originX: origin.x,
      originY: origin.y,
    };
    didDragRef.current = false;
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    openPanel();
    await requestPlan();
  };

  const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    if (isLoading) return;
    void handleSubmit();
  };

  const handleQuickAction = (templateId: AgentPromptTemplateId) => {
    setSelectedTemplateId(templateId);
    openPanel();
  };

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
      setConnectionMessage(
        connectionError instanceof Error && connectionError.message === 'Failed to fetch'
          ? 'Could not reach the local agent backend. Restart the app with npm run dev:full and try again.'
          : connectionError instanceof Error
            ? connectionError.message
            : 'Unknown connection error',
      );
    }
  };

  const handleFabPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (mounted) return;
    setShowFabIntro(false);
    beginSharedDrag('fab', event.pointerId, event.clientX, event.clientY);
  };

  const handleFabClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (!mounted) openPanel();
  };

  const handlePopupIconPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    beginSharedDrag('panel', event.pointerId, event.clientX, event.clientY);
  };

  const handlePopupIconClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    closePanel();
  };

  const handlePanelPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, input, textarea, select, label, a, [data-no-drag="true"]')) {
      return;
    }
    beginSharedDrag('panel', event.pointerId, event.clientX, event.clientY);
  };

  const overlay = (
    <>
      <style>
        {`
          @keyframes lpc-agent-fab-edge-glow {
            0%, 100% { opacity: 0.18; transform: scale(0.99); }
            18% { opacity: 1; transform: scale(1.045); }
            42% { opacity: 0.52; transform: scale(1.085); }
            58% { opacity: 1; transform: scale(1.035); }
            82% { opacity: 0.26; transform: scale(1.11); }
          }

          @keyframes lpc-agent-fab-halo {
            0%, 100% { opacity: 0.22; transform: scale(0.98); }
            40% { opacity: 0.92; transform: scale(1.12); }
            72% { opacity: 0.34; transform: scale(1.18); }
          }

          @keyframes lpc-agent-status-lamp {
            0%, 100% { transform: scale(1); opacity: 0.95; }
            50% { transform: scale(1.08); opacity: 1; }
          }

          @keyframes lpc-agent-status-text {
            0%, 100% { opacity: 0.82; }
            50% { opacity: 1; }
          }
        `}
      </style>
      {!mounted && showFabIntro && (
        <>
          <div
            style={{
              position: 'fixed',
              left: fabPosition.x - 14,
              top: fabPosition.y - 14,
              width: FAB_WIDTH + 28,
              height: FAB_HEIGHT + 28,
              zIndex: 198,
              borderRadius: 30,
              background: 'radial-gradient(circle at 35% 40%, rgba(131, 199, 255, 0.5) 0%, rgba(131, 199, 255, 0.18) 44%, rgba(247, 208, 97, 0.12) 72%, rgba(247, 208, 97, 0) 100%)',
              filter: 'blur(4px)',
              pointerEvents: 'none',
              animation: 'lpc-agent-fab-halo 1.9s ease-out infinite',
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: fabPosition.x - 6,
              top: fabPosition.y - 6,
              width: FAB_WIDTH + 12,
              height: FAB_HEIGHT + 12,
              zIndex: 199,
              borderRadius: 24,
              border: '2px solid rgba(129, 196, 255, 1)',
              boxShadow: '0 0 0 5px rgba(208, 232, 255, 0.34), 0 0 28px rgba(129, 196, 255, 1), 0 0 58px rgba(129, 196, 255, 0.84), 0 0 96px rgba(247, 208, 97, 0.48)',
              pointerEvents: 'none',
              animation: 'lpc-agent-fab-edge-glow 1.55s ease-out infinite',
            }}
          />
        </>
      )}
      <button
        onClick={handleFabClick}
        onPointerDown={handleFabPointerDown}
        style={{
          position: 'fixed',
          left: fabPosition.x,
          top: fabPosition.y,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: FAB_WIDTH,
          minHeight: FAB_HEIGHT,
          padding: '0 16px 0 14px',
          borderRadius: 18,
          border: '1px solid rgba(136,165,193,0.44)',
          background: 'rgba(250,252,255,0.97)',
          color: '#234057',
          boxShadow: showFabIntro
            ? '0 18px 34px rgba(63, 91, 122, 0.14), 0 0 0 1px rgba(129, 196, 255, 0.3), 0 0 30px rgba(129, 196, 255, 0.62), 0 0 60px rgba(247, 208, 97, 0.22)'
            : '0 18px 34px rgba(63, 91, 122, 0.14)',
          backdropFilter: 'blur(18px)',
          cursor: mounted ? 'default' : 'pointer',
          touchAction: 'none',
          transition: `opacity ${PANEL_ANIMATION_MS}ms ease, transform ${PANEL_ANIMATION_MS}ms ease`,
          opacity: expanded ? 0 : 1,
          transform: expanded ? 'scale(0.96)' : 'scale(1)',
          pointerEvents: mounted ? 'none' : 'auto',
        }}
        title="Drag to move. Click to open LPC Agent."
      >
        <RobotBadge />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, minWidth: 0 }}>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              color: '#1f3e56',
            }}
          >
            LPC Agent
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              maxWidth: '100%',
              color: statusTone.text,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              textShadow: `0 0 12px ${statusTone.glow}`,
              animation: 'lpc-agent-status-text 1.2s ease-in-out infinite',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: statusTone.dot,
                boxShadow: `0 0 0 3px ${statusTone.glow}, 0 0 10px ${statusTone.glow}`,
                animation: 'lpc-agent-status-lamp 1.2s ease-in-out infinite',
                flexShrink: 0,
              }}
            />
            {statusTone.label}
          </span>
        </div>
      </button>

      {mounted && (
        <div
          style={{
            position: 'fixed',
            left: panelPosition.x,
            top: panelPosition.y,
            width: WINDOW_WIDTH,
            height: OPEN_STACK_HEIGHT,
            zIndex: 190,
            isolation: 'isolate',
            transformOrigin: 'top left',
            transform: expanded
              ? 'translate(0px, 0px) scale(1, 1)'
              : `translate(${collapsedTranslateX}px, ${collapsedTranslateY}px) scale(${FAB_WIDTH / WINDOW_WIDTH}, ${FAB_HEIGHT / OPEN_STACK_HEIGHT})`,
            opacity: expanded ? 1 : 0.24,
            transition: `transform ${PANEL_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${PANEL_ANIMATION_MS}ms ease`,
            pointerEvents: expanded ? 'auto' : 'none',
          }}
        >
          <button
            onClick={handlePopupIconClick}
            onPointerDown={handlePopupIconPointerDown}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 2,
              width: POPUP_ICON_SIZE,
              height: POPUP_ICON_SIZE,
              borderRadius: 999,
              border: '1px solid rgba(163,184,202,0.38)',
              background: 'rgba(250,252,255,0.96)',
              boxShadow: '0 16px 28px rgba(63, 91, 122, 0.16)',
              backdropFilter: 'blur(18px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              touchAction: 'none',
            }}
            aria-label="Collapse LPC Agent"
          >
            <RobotBadge compact />
          </button>

          <div
            style={{
              position: 'absolute',
              left: POPUP_ICON_SIZE + 10,
              top: 8,
              zIndex: 2,
              padding: '6px 10px',
              borderRadius: 999,
              background: 'rgba(250,252,255,0.96)',
              border: '1px solid rgba(166,184,198,0.28)',
              color: '#60788b',
              fontSize: 11,
              fontWeight: 700,
              boxShadow: '0 12px 24px rgba(63, 91, 122, 0.12)',
              backdropFilter: 'blur(18px)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Click to collapse
          </div>

          <div
            onPointerDown={handlePanelPointerDown}
            style={{
              position: 'absolute',
              left: 0,
              top: POPUP_ICON_SIZE + POPUP_ICON_GAP,
              width: WINDOW_WIDTH,
              height: WINDOW_HEIGHT,
              display: 'flex',
              flexDirection: 'column',
              cursor: 'grab',
              ...OVERLAY_CARD,
            }}
          >
            <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid rgba(191, 205, 218, 0.42)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 3, height: 15, background: '#5878ad', borderRadius: 99, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#243a4c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LPC Agent</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#496174', fontWeight: 600 }}>{summarizeProvider(selectedProviderId)}</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      color: statusTone.text,
                      fontSize: 10.5,
                      fontWeight: 900,
                      textShadow: `0 0 12px ${statusTone.glow}`,
                      animation: 'lpc-agent-status-text 1.2s ease-in-out infinite',
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: statusTone.dot,
                        boxShadow: `0 0 0 3px ${statusTone.glow}, 0 0 10px ${statusTone.glow}`,
                        animation: 'lpc-agent-status-lamp 1.2s ease-in-out infinite',
                      }}
                    />
                    {statusTone.label}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowSettings(true)} style={{ ...SECONDARY_BUTTON, minHeight: 32, padding: '0 10px', flexShrink: 0 }}>Settings</button>
            </div>

            <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(191, 205, 218, 0.28)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 10.5, color: '#788da0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Prompt Shortcuts</div>
                <div style={{ fontSize: 11.5, color: '#61788d', lineHeight: 1.5 }}>Pick a backend template, then describe your request in the chat box.</div>
              </div>
            </div>

            <div ref={conversationRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.length === 0 && !draftPlan && (
                <div style={{ borderRadius: 14, padding: '12px 12px', background: 'rgba(245,248,251,0.8)', border: '1px solid rgba(191,205,218,0.28)', color: '#60788b', fontSize: 12, lineHeight: 1.6 }}>
                  Ask for a new scenario, a small adjustment to the current scene, or an explanation of the current vector map.
                </div>
              )}

              {history.slice(-6).map((item) => (
                <div
                  key={item.id}
                  style={{
                    alignSelf: item.role === 'assistant' ? 'stretch' : 'flex-end',
                    maxWidth: item.role === 'assistant' ? '100%' : '88%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      padding: '10px 11px',
                      borderRadius: item.role === 'assistant' ? '14px 14px 14px 6px' : '14px 14px 6px 14px',
                      background: item.role === 'assistant' ? 'rgba(255,255,255,0.84)' : 'rgba(235,243,252,0.94)',
                      border: '1px solid rgba(191,205,218,0.28)',
                      color: item.role === 'assistant' ? '#496174' : '#28445a',
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: item.role === 'assistant' ? '#73889b' : '#5f7991', marginBottom: 4 }}>
                      {item.role === 'assistant' ? 'Agent' : 'You'}
                    </div>
                    {item.text}
                  </div>

                  {item.role === 'assistant' && item.plan && draftPlan && activePlanMessageId === item.id && (
                    <div style={{ border: '1px solid rgba(166,184,198,0.3)', borderRadius: 14, padding: '12px 12px', background: 'rgba(255,255,255,0.82)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontSize: 10.5, color: '#788da0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Current Plan</div>
                        <div style={{ fontSize: 10.5, color: item.plan.intent === 'analysis' ? '#6d7f93' : '#496987', fontWeight: 700 }}>
                          {item.plan.intent === 'analysis' ? 'Analysis' : 'Scenario'}
                        </div>
                      </div>
                      {canApplyDraftPlan ? (
                        <div style={{ fontSize: 11.5, color: '#57708d', lineHeight: 1.5, padding: '9px 10px', borderRadius: 10, background: 'rgba(238,244,251,0.92)', border: '1px solid rgba(166,184,198,0.22)' }}>
                          This reply includes executable actions. Review them here, then apply if the plan looks right.
                        </div>
                      ) : (
                        <div style={{ fontSize: 11.5, color: '#61788d' }}>No state changes planned.</div>
                      )}
                      {item.plan.actions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {item.plan.actions.map((action, index) => (
                            <div key={`${action.type}-${index}`} style={{ fontSize: 11.5, color: '#486275', lineHeight: 1.5, padding: '8px 9px', borderRadius: 10, background: 'rgba(247,250,252,0.92)', border: '1px solid rgba(166,184,198,0.18)' }}>
                              {formatAgentAction(action)}
                            </div>
                          ))}
                        </div>
                      )}
                      {item.plan.suggestions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {item.plan.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => {
                                setSelectedTemplateId('general');
                                setPrompt(suggestion);
                                openPanel();
                              }}
                              style={{ borderRadius: 999, border: '1px solid rgba(166,184,198,0.32)', background: 'rgba(255,255,255,0.88)', color: '#4e667b', fontSize: 11, fontWeight: 700, padding: '6px 9px', cursor: 'pointer' }}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {canApplyDraftPlan && (
                          <button onClick={applyDraftPlan} style={{ ...PRIMARY_BUTTON, flex: 1, minHeight: 34, background: '#eef4fb', color: '#355d80', boxShadow: 'none' }}>
                            Apply
                          </button>
                        )}
                        <button onClick={discardDraftPlan} style={{ ...SECONDARY_BUTTON, minHeight: 34, padding: '0 11px', flex: canApplyDraftPlan ? undefined : 1 }}>
                          {canApplyDraftPlan ? 'Discard' : 'Close'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div
                  style={{
                    alignSelf: 'stretch',
                    maxWidth: '100%',
                    padding: '10px 11px',
                    borderRadius: '14px 14px 14px 6px',
                    background: 'rgba(255,255,255,0.84)',
                    border: '1px solid rgba(191,205,218,0.28)',
                    color: '#496174',
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#73889b', marginBottom: 4 }}>
                    Agent
                  </div>
                  Thinking...
                </div>
              )}

              {error && (
                <div style={{ borderRadius: 12, padding: '10px 11px', background: 'rgba(252, 242, 238, 0.9)', border: '1px solid rgba(214,164,144,0.32)', color: '#9a5d48', fontSize: 11.5, lineHeight: 1.5 }}>
                  {error}
                </div>
              )}
            </div>

            <div style={{ padding: '12px 14px 14px', borderTop: '1px solid rgba(191, 205, 218, 0.42)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.templateId)}
                    style={{
                      borderRadius: 999,
                      border: selectedTemplateId === action.templateId ? '1px solid rgba(102,131,175,0.38)' : '1px solid rgba(166,184,198,0.32)',
                      background: selectedTemplateId === action.templateId ? 'rgba(238,244,251,0.96)' : 'rgba(255,255,255,0.86)',
                      color: selectedTemplateId === action.templateId ? '#355d80' : '#4e667b',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '6px 9px',
                      cursor: 'pointer',
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: '#60788b', lineHeight: 1.5 }}>
                Active template: <strong style={{ color: '#355d80' }}>{summarizeTemplate(selectedTemplateId)}</strong>
              </div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handlePromptKeyDown}
                placeholder="Describe your request here. The selected template stays in the background."
                rows={3}
                style={{ width: '100%', resize: 'none', minHeight: 86, borderRadius: 12, border: '1px solid rgba(166,184,198,0.36)', background: 'rgba(255,255,255,0.92)', color: '#22384b', padding: '10px 11px', outline: 'none', fontSize: 12, lineHeight: 1.55 }}
              />
              <div style={{ fontSize: 11, color: '#6f8497', lineHeight: 1.4 }}>
                Press <strong>Enter</strong> to send. Use <strong>Shift + Enter</strong> for a new line.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => void handleSubmit()} style={{ ...PRIMARY_BUTTON, flex: 1 }}>
                  Send
                </button>
                {lastAppliedSnapshot && (
                  <button onClick={undoLastApply} style={{ ...SECONDARY_BUTTON, padding: '0 12px' }}>
                    Undo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
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
          onClick={() => setShowSettings(false)}
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
              <button onClick={() => setShowSettings(false)} style={{ ...SECONDARY_BUTTON, minHeight: 32, width: 32, padding: 0 }} aria-label="Close settings">
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 10, padding: '12px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.52)', border: '1px solid rgba(166,184,198,0.2)' }}>
                <div style={LABEL}>Connection Type</div>
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
                      {provider.kind === 'local' ? 'Local' : 'Remote'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: '#60788b', lineHeight: 1.55 }}>
                  Protocol: OpenAI-compatible. Remote providers usually need a base URL, API key, and a model id.
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10, padding: '12px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.52)', border: '1px solid rgba(166,184,198,0.2)' }}>
                <div style={LABEL}>Connection Details</div>
                <div style={{ display: 'grid', gap: 7 }}>
                  <label style={LABEL}>Base URL</label>
                  <input value={providerConfig.baseUrl} onChange={(event) => updateProviderConfig(selectedProviderId, { baseUrl: event.target.value })} placeholder={selectedProviderDescriptor.defaultBaseUrl} style={INPUT_STYLE} />
                </div>
                <div style={{ display: 'grid', gap: 7 }}>
                  <label style={LABEL}>Model</label>
                  <input value={providerConfig.model} onChange={(event) => updateProviderConfig(selectedProviderId, { model: event.target.value })} placeholder="Model name" style={INPUT_STYLE} />
                  <div style={{ fontSize: 11.5, color: '#60788b', lineHeight: 1.5 }}>
                    Required by most OpenAI-compatible APIs, including local servers and remote providers.
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
                  <button onClick={handleTestConnection} style={{ ...SECONDARY_BUTTON, padding: '0 12px', flexShrink: 0 }}>
                    {connectionTone === 'testing' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (typeof document === 'undefined') {
    return overlay;
  }

  return createPortal(overlay, document.body);
};
