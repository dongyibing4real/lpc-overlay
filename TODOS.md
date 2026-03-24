# TODOS

## TODO-001: Break up large components (AgentPanel, FieldGrid)

**What:** Decompose AgentPanel.tsx (744 lines) and FieldGrid.tsx (678 lines) into smaller, focused sub-components.

**Why:** AgentPanel mixes drag/resize logic, animation keyframes, FAB rendering, and panel rendering in one file. FieldGrid combines field rendering, selection, hover logic, and overlay computation. Both exceed reasonable single-file complexity.

**Pros:** Easier to reason about, test, and modify individual concerns. Better code navigation.

**Cons:** More files, more imports. Risk of over-decomposition if boundaries are drawn poorly.

**Context:** These are the two largest component files in the codebase. AgentPanel could split into: useDragResize hook, AgentFab component, AgentPanelWindow component. FieldGrid could split into: field rendering, selection logic, overlay computation.

**Depends on:** Structural file reorganization (moving AgentPanel into agent-panel/ folder) should happen first.

---

## TODO-002: Migrate agent panel styles to Tailwind

**What:** Convert agentPanelStyles.ts tokens and ~96 inline styles in AgentPanel, AgentConversation, AgentSettingsModal to Tailwind classes.

**Why:** After the UI panel Tailwind migration, the agent panel will be the last holdout using inline CSSProperties. Two style systems coexisting long-term is a maintenance burden.

**Pros:** Single style system across the entire codebase. Consistent DX.

**Cons:** Agent panel has a distinct overlay/glass aesthetic with complex gradients that may require many Tailwind arbitrary values.

**Context:** The agent panel was carved out of the initial Tailwind migration because it has a distinct visual identity (floating overlay cards, blur effects, glass borders). The migration should define agent-specific Tailwind theme tokens (e.g., `bg-agent-overlay`, `shadow-agent-card`) rather than using arbitrary values.

**Depends on:** UI panel Tailwind migration must be complete first to establish conventions.
