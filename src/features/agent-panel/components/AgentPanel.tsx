import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAgentStore } from '../../../state/agentStore';
import { getViewport } from '../../../utils/viewport';
import { AgentConversation } from './AgentConversation';
import { AgentSettingsModal } from './AgentSettingsModal';
import { RobotBadge } from './RobotBadge';
import {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  FAB_ATTRACT_RADIUS,
  FAB_HEIGHT,
  FAB_WIDTH,
  FLOAT_MARGIN,
  MAX_WINDOW_HEIGHT,
  MAX_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  PANEL_ANIMATION_MS,
  POPUP_ICON_GAP,
  POPUP_ICON_SIZE,
} from '../lib/agentPanelLayout';
import { OVERLAY_CARD, SECONDARY_BUTTON } from '../lib/agentPanelStyles';
import { getAgentUiStatus, summarizeActiveProvider } from '../lib/agentPanelHelpers';

type PanelSize = {
  width: number;
  height: number;
};

type DragState = {
  mode: 'fab' | 'panel' | 'resize';
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const AGENT_PANEL_KEYFRAMES = `
@keyframes lpc-agent-fab-edge-glow {
  0%, 100% { opacity: 0.16; transform: scale(0.99); }
  50% { opacity: 0.42; transform: scale(1.035); }
}
@keyframes lpc-agent-fab-halo {
  0%, 100% { opacity: 0.14; transform: scale(0.98); }
  50% { opacity: 0.32; transform: scale(1.08); }
}
@keyframes lpc-agent-fab-aura {
  0%, 100% { opacity: 0.08; transform: scale(0.98); }
  50% { opacity: 0.2; transform: scale(1.12); }
}
@keyframes lpc-agent-status-lamp {
  0%, 100% { transform: scale(1); opacity: 0.95; }
  50% { transform: scale(1.08); opacity: 1; }
}
@keyframes lpc-agent-status-text {
  0%, 100% { opacity: 0.82; }
  50% { opacity: 1; }
}
`;

function clampFabPosition(x: number, y: number, viewport: { width: number; height: number }) {
  return {
    x: clamp(x, FLOAT_MARGIN, viewport.width - FAB_WIDTH - FLOAT_MARGIN),
    y: clamp(y, FLOAT_MARGIN, viewport.height - FAB_HEIGHT - FLOAT_MARGIN),
  };
}

function clampPanelSize(width: number, height: number, viewport: { width: number; height: number }): PanelSize {
  return {
    width: clamp(width, MIN_WINDOW_WIDTH, Math.max(MIN_WINDOW_WIDTH, Math.min(MAX_WINDOW_WIDTH, viewport.width - FLOAT_MARGIN * 2))),
    height: clamp(
      height,
      MIN_WINDOW_HEIGHT,
      Math.max(MIN_WINDOW_HEIGHT, Math.min(MAX_WINDOW_HEIGHT, viewport.height - FLOAT_MARGIN * 2 - POPUP_ICON_SIZE - POPUP_ICON_GAP)),
    ),
  };
}

function getOpenStackHeight(panelSize: PanelSize) {
  return POPUP_ICON_SIZE + POPUP_ICON_GAP + panelSize.height;
}

function clampPanelPosition(x: number, y: number, viewport: { width: number; height: number }, panelSize: PanelSize) {
  return {
    x: clamp(x, FLOAT_MARGIN, viewport.width - panelSize.width - FLOAT_MARGIN),
    y: clamp(y, FLOAT_MARGIN, viewport.height - getOpenStackHeight(panelSize) - FLOAT_MARGIN),
  };
}

function getDefaultFabPosition(viewport: { width: number; height: number }) {
  return clampFabPosition(358, 82, viewport);
}

function getPanelPositionFromFab(fabPosition: { x: number; y: number }, viewport: { width: number; height: number }, panelSize: PanelSize) {
  return clampPanelPosition(fabPosition.x, fabPosition.y, viewport, panelSize);
}

export const AgentPanel: React.FC = () => {
  const {
    prompt,
    isLoading,
    error,
    draftPlan,
    draftPlanDiagnostics,
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
  const [viewport, setViewport] = useState(getViewport);
  const [panelSize, setPanelSize] = useState<PanelSize>(() =>
    clampPanelSize(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT, getViewport()),
  );
  const [fabPosition, setFabPosition] = useState(() =>
    getDefaultFabPosition(getViewport()),
  );
  const [panelPosition, setPanelPosition] = useState(() => {
    const vp = getViewport();
    return clampPanelPosition(
      vp.width - DEFAULT_WINDOW_WIDTH - FLOAT_MARGIN,
      140,
      vp,
      clampPanelSize(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT, vp),
    );
  });

  const dragStateRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  const agentUiStatus = getAgentUiStatus({
    providerConfig,
    isLoading,
    error,
  });
  const statusTone = agentUiStatus.tone;
  const canApplyDraftPlan = !!draftPlan && draftPlan.actions.length > 0;
  const collapsedTranslateX = fabPosition.x - panelPosition.x;
  const collapsedTranslateY = fabPosition.y - panelPosition.y;
  const openStackHeight = getOpenStackHeight(panelSize);

  useEffect(() => {
    if (!showFabIntro) return;

    const handlePointerMove = (event: PointerEvent) => {
      const centerX = fabPosition.x + FAB_WIDTH / 2;
      const centerY = fabPosition.y + FAB_HEIGHT / 2;
      if (Math.hypot(event.clientX - centerX, event.clientY - centerY) <= FAB_ATTRACT_RADIUS) {
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
      setPanelSize((current) => {
        const nextSize = clampPanelSize(current.width, current.height, nextViewport);
        setPanelPosition((position) => clampPanelPosition(position.x, position.y, nextViewport, nextSize));
        return nextSize;
      });
      setFabPosition((current) => clampFabPosition(current.x, current.y, nextViewport));
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

      if (drag.mode === 'resize') {
        const nextSize = clampPanelSize(drag.originX + dx, drag.originY + dy, viewport);
        setPanelSize(nextSize);
        setPanelPosition((current) => clampPanelPosition(current.x, current.y, viewport, nextSize));
        return;
      }

      if (drag.mode === 'panel') {
        setPanelPosition(clampPanelPosition(drag.originX + dx, drag.originY + dy, viewport, panelSize));
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
  }, [panelSize, viewport]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const el = conversationRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [history.length]);

  const openPanel = () => {
    setShowFabIntro(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!mounted) {
      setPanelPosition(getPanelPositionFromFab(fabPosition, viewport, panelSize));
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

  const beginResizeDrag = (pointerId: number, clientX: number, clientY: number) => {
    dragStateRef.current = {
      mode: 'resize',
      pointerId,
      startX: clientX,
      startY: clientY,
      originX: panelSize.width,
      originY: panelSize.height,
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

  const handleQuickAction = (templateId: typeof selectedTemplateId) => {
    setSelectedTemplateId(templateId);
    openPanel();
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
      <style>{AGENT_PANEL_KEYFRAMES}</style>

      {!mounted && showFabIntro && (
        <>
          <div
            style={{
              position: 'fixed',
              left: fabPosition.x - 24,
              top: fabPosition.y - 24,
              width: FAB_WIDTH + 48,
              height: FAB_HEIGHT + 48,
              zIndex: 197,
              borderRadius: 34,
              background: 'radial-gradient(circle at 35% 40%, rgba(129, 196, 255, 0.18) 0%, rgba(129, 196, 255, 0.08) 46%, rgba(247, 208, 97, 0.02) 76%, rgba(247, 208, 97, 0) 100%)',
              filter: 'blur(12px)',
              pointerEvents: 'none',
              animation: 'lpc-agent-fab-aura 2.4s ease-out infinite',
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: fabPosition.x - 14,
              top: fabPosition.y - 14,
              width: FAB_WIDTH + 28,
              height: FAB_HEIGHT + 28,
              zIndex: 198,
              borderRadius: 30,
              background: 'radial-gradient(circle at 35% 40%, rgba(131, 199, 255, 0.24) 0%, rgba(131, 199, 255, 0.1) 48%, rgba(247, 208, 97, 0.06) 74%, rgba(247, 208, 97, 0) 100%)',
              filter: 'blur(4px)',
              pointerEvents: 'none',
              animation: 'lpc-agent-fab-halo 2s ease-out infinite',
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
              borderRadius: 26,
              border: '2px solid rgba(129, 196, 255, 0.45)',
              boxShadow: '0 0 0 5px rgba(208, 232, 255, 0.14), 0 0 18px rgba(129, 196, 255, 0.34)',
              pointerEvents: 'none',
              animation: 'lpc-agent-fab-edge-glow 1.6s ease-out infinite',
            }}
          />
        </>
      )}

      <button
        data-agent-fab="true"
        onClick={handleFabClick}
        onPointerDown={handleFabPointerDown}
        style={{
          position: 'fixed',
          left: fabPosition.x,
          top: fabPosition.y,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          width: FAB_WIDTH,
          minHeight: FAB_HEIGHT,
          padding: '0 12px 0 10px',
          borderRadius: 18,
          border: '1px solid rgba(130,164,202,0.38)',
          background:
            'linear-gradient(135deg, rgba(245,249,254,0.98) 0%, rgba(235,242,250,0.96) 48%, rgba(229,237,247,0.94) 100%)',
          color: '#29455e',
          boxShadow: showFabIntro
            ? 'inset 0 1px 0 rgba(255,255,255,0.88), 0 12px 24px rgba(52, 80, 116, 0.12), 0 0 0 1px rgba(255,255,255,0.2), 0 0 14px rgba(129, 196, 255, 0.12)'
            : 'inset 0 1px 0 rgba(255,255,255,0.88), 0 12px 24px rgba(52, 80, 116, 0.12), 0 0 0 1px rgba(255,255,255,0.2)',
          backdropFilter: 'blur(18px)',
          cursor: mounted ? 'default' : 'pointer',
          touchAction: 'none',
          transition: `opacity ${PANEL_ANIMATION_MS}ms ease, transform ${PANEL_ANIMATION_MS}ms ease`,
          opacity: expanded ? 0 : 1,
          transform: expanded ? 'scale(0.96)' : 'scale(1)',
          pointerEvents: mounted ? 'none' : 'auto',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          overflow: 'hidden',
        }}
        title="Drag to move. Click to open LPC Agent."
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 18,
              background:
                'linear-gradient(90deg, rgba(108,146,198,0.1) 0%, rgba(108,146,198,0.04) 22%, rgba(255,255,255,0) 52%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 1,
            borderRadius: 17,
            border: '1px solid rgba(255,255,255,0.44)',
            pointerEvents: 'none',
          }}
        />
        <RobotBadge />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, flex: 1, userSelect: 'none', WebkitUserSelect: 'none' }}>
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            LPC Agent
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              color: statusTone.text,
              fontSize: 9.5,
              fontWeight: 900,
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
            {agentUiStatus.label}
          </span>
        </div>
      </button>

      {mounted && (
        <div
          data-agent-panel-root="true"
          style={{
            position: 'fixed',
            left: panelPosition.x,
            top: panelPosition.y,
            width: panelSize.width,
            height: openStackHeight,
            zIndex: 190,
            isolation: 'isolate',
            transformOrigin: 'top left',
            transform: expanded
              ? 'translate(0px, 0px) scale(1, 1)'
              : `translate(${collapsedTranslateX}px, ${collapsedTranslateY}px) scale(${FAB_WIDTH / panelSize.width}, ${FAB_HEIGHT / openStackHeight})`,
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
              minWidth: POPUP_ICON_SIZE,
              height: POPUP_ICON_SIZE,
              borderRadius: 999,
              border: '1px solid rgba(146,174,202,0.36)',
              background: 'linear-gradient(180deg, rgba(242,248,255,0.98) 0%, rgba(232,242,252,0.96) 100%)',
              boxShadow: '0 10px 22px rgba(52, 80, 116, 0.12), inset 0 1px 0 rgba(255,255,255,0.88), 0 0 0 1px rgba(255,255,255,0.2)',
              backdropFilter: 'blur(18px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              padding: '0 15px 0 12px',
              cursor: 'pointer',
              touchAction: 'none',
              color: '#4a6988',
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
            aria-label="Collapse LPC Agent"
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(145deg, rgba(220,232,247,0.94) 0%, rgba(210,226,244,0.88) 100%)',
                border: '1px solid rgba(152,178,210,0.3)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72), 0 2px 6px rgba(52,85,133,0.08)',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 21 21" fill="none" aria-hidden="true">
                <rect x="4.5" y="5.5" width="12" height="10" rx="3.3" fill="#5C7FB5" />
                <rect x="7" y="9" width="2.3" height="2.6" rx="1.15" fill="#F8FBFF" />
                <rect x="11.7" y="9" width="2.3" height="2.6" rx="1.15" fill="#F8FBFF" />
                <path d="M8 13.2C8.65 14.1 9.45 14.55 10.5 14.55C11.55 14.55 12.35 14.1 13 13.2" stroke="#F8FBFF" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M10.5 3.3V5.7" stroke="#5C7FB5" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="10.5" cy="2.3" r="1.1" fill="#E7B94E" />
              </svg>
            </span>
            Collapse
          </button>

          <div
            onPointerDown={handlePanelPointerDown}
            style={{
              position: 'absolute',
              left: 0,
              top: POPUP_ICON_SIZE + POPUP_ICON_GAP,
              width: panelSize.width,
              height: panelSize.height,
              display: 'flex',
              flexDirection: 'column',
              cursor: 'grab',
              overflow: 'hidden',
              ...OVERLAY_CARD,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, #4f8bc9 0%, #728ea5 55%, #5878ad 100%)',
                borderRadius: '22px 22px 0 0',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', padding: '16px 16px 13px', background: 'linear-gradient(180deg, rgba(241,246,251,0.96) 0%, rgba(248,251,254,0.7) 100%)', borderBottom: '1px solid rgba(175, 196, 215, 0.24)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ position: 'absolute', left: 14, right: 14, bottom: -1, height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)', pointerEvents: 'none' }} />
              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flex: 1, userSelect: 'none', WebkitUserSelect: 'none' }}>
                <div style={{ width: 4, height: 24, background: '#5878ad', borderRadius: 99, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#243a4c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                    LPC Agent
                  </div>
                  <div style={{ fontSize: 11.5, color: '#708596', lineHeight: 1.45 }}>
                    AI-assisted scene editor
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    minHeight: 30,
                    padding: '0 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(176,193,208,0.22)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(245,249,254,0.68))',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                    color: '#4c6579',
                    fontSize: 10,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ color: '#4f687c' }}>{summarizeActiveProvider(selectedProviderId)}</span>
                  <span style={{ color: '#93a6b7' }}>|</span>
                    <span
                      style={{
                        display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: statusTone.text,
                      fontSize: 10.5,
                      fontWeight: 900,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: statusTone.dot,
                        boxShadow: `0 0 0 2px ${statusTone.glow}`,
                        animation: 'lpc-agent-status-lamp 1.2s ease-in-out infinite',
                      }}
                    />
                    {agentUiStatus.label}
                  </span>
                </div>
                <button onClick={() => setShowSettings(true)} style={{ ...SECONDARY_BUTTON, minHeight: 32, padding: '0 10px', flexShrink: 0 }}>
                  Settings
                </button>
              </div>
            </div>

            <AgentConversation
              conversationRef={conversationRef}
              history={history}
              draftPlan={draftPlan}
              draftPlanDiagnostics={draftPlanDiagnostics}
              activePlanMessageId={activePlanMessageId}
              canApplyDraftPlan={canApplyDraftPlan}
              isLoading={isLoading}
              error={error}
              selectedTemplateId={selectedTemplateId}
              prompt={prompt}
              lastAppliedSnapshotPresent={!!lastAppliedSnapshot}
              setPrompt={setPrompt}
              setSelectedTemplateId={setSelectedTemplateId}
              openPanel={openPanel}
              applyDraftPlan={applyDraftPlan}
              discardDraftPlan={discardDraftPlan}
              undoLastApply={undoLastApply}
              handleQuickAction={handleQuickAction}
              handlePromptKeyDown={handlePromptKeyDown}
              handleSubmit={handleSubmit}
            />

            <button
              type="button"
              aria-label="Resize LPC Agent"
              data-no-drag="true"
              onPointerDown={(event) => {
                event.stopPropagation();
                beginResizeDrag(event.pointerId, event.clientX, event.clientY);
              }}
              style={{
                position: 'absolute',
                right: 10,
                bottom: 10,
                width: 20,
                height: 20,
                border: 'none',
                background: 'transparent',
                cursor: 'nwse-resize',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M4.5 9.5L9.5 4.5" stroke="#8DA2B5" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M7 11L11 7" stroke="#8DA2B5" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M9.5 12.5L12.5 9.5" stroke="#8DA2B5" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <AgentSettingsModal
          selectedProviderId={selectedProviderId}
          providerConfig={providerConfig}
          setSelectedProviderId={setSelectedProviderId}
          updateProviderConfig={updateProviderConfig}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );

  if (typeof document === 'undefined') {
    return overlay;
  }

  return createPortal(overlay, document.body);
};
