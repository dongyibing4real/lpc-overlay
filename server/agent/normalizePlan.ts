import {
  agentActionSchema,
  agentPlanSchema,
  type AgentAction,
  type AgentPlanDiagnostics,
  type AgentPlanResponse,
  type AgentRequest,
} from '../../shared/agent.js';

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

function readFieldIdCandidate(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (isRecord(value)) {
    if (typeof value.fieldId === 'string') return value.fieldId;
    if (typeof value.id === 'string') return value.id;
    if (typeof value.name === 'string') return value.name;
  }
  return null;
}

function getEntryArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getFieldCollectionEntries(rawAction: Record<string, unknown>) {
  const directEntries =
    getEntryArray(rawAction.items)
      .concat(getEntryArray(rawAction.fields))
      .concat(getEntryArray(rawAction.targets))
      .concat(getEntryArray(rawAction.fieldEdits))
      .concat(getEntryArray(rawAction.edits))
      .concat(getEntryArray(rawAction.fieldTransforms))
      .concat(getEntryArray(rawAction.overlays));

  if (directEntries.length > 0) {
    return directEntries.map((entry) => ({ key: null, value: entry }));
  }

  const keyedContainer =
    (isRecord(rawAction.byField) && rawAction.byField) ||
    (isRecord(rawAction.transforms) && rawAction.transforms) ||
    (isRecord(rawAction.patches) && rawAction.patches) ||
    (isRecord(rawAction.overlaysByField) && rawAction.overlaysByField) ||
    (isRecord(rawAction.fieldCornerOverlays) && rawAction.fieldCornerOverlays) ||
    (isRecord(rawAction.fieldTransformsById) && rawAction.fieldTransformsById);

  if (keyedContainer) {
    return Object.entries(keyedContainer).map(([key, value]) => ({ key, value }));
  }

  const fieldIds = getEntryArray(rawAction.fieldIds);
  if (fieldIds.length > 0) {
    return fieldIds.map((value) => ({ key: null, value }));
  }

  return [];
}

function readFieldIdCandidateFromAction(rawAction: Record<string, unknown>): unknown {
  return rawAction.fieldId ?? rawAction.id ?? rawAction.field ?? rawAction.targetFieldId ?? rawAction.target ?? rawAction.fieldRef;
}

function resolveFieldId(rawValue: unknown, fieldSet: Set<string>, editableFieldIds: string[]): string | null {
  const candidate = readFieldIdCandidate(rawValue);
  if (!candidate) return null;

  if (fieldSet.has(candidate)) return candidate;

  const normalized = candidate.trim().toLowerCase().replace(/\s+/g, '').replace(/^field[-_]/, 'f_');
  if (fieldSet.has(normalized)) return normalized;

  const normalizedByLowercase = editableFieldIds.find((fieldId) => fieldId.toLowerCase() === normalized);
  if (normalizedByLowercase) return normalizedByLowercase;

  const coords = normalized.match(/(-?\d+)[,_:x]+(-?\d+)/);
  if (coords) {
    const inferred = `f_${coords[1]}_${coords[2]}`;
    if (fieldSet.has(inferred)) return inferred;
  }

  return null;
}

function describeDroppedAction(rawAction: unknown, fieldSet: Set<string>, editableFieldIds: string[]): string {
  if (!isRecord(rawAction)) {
    return 'Action block is not an object.';
  }

  if (typeof rawAction.type !== 'string') {
    return 'Action block is missing a valid type.';
  }

  switch (rawAction.type) {
    case 'set_field_transform': {
      const fieldId = resolveFieldId(readFieldIdCandidateFromAction(rawAction), fieldSet, editableFieldIds);
      if (!fieldId) return 'Field transform did not include a valid fieldId from scene.editableFieldIds.';
      return 'Field transform did not include a valid transform patch.';
    }
    case 'set_field_corner_overlay': {
      const fieldId = resolveFieldId(readFieldIdCandidateFromAction(rawAction), fieldSet, editableFieldIds);
      if (!fieldId) return 'Field corner overlay did not include a valid fieldId from scene.editableFieldIds.';
      return 'Field corner overlay did not include a valid overlay with four numeric cornerDx and cornerDy values.';
    }
    case 'set_wafer_distortion':
      return 'Wafer distortion patch did not contain any supported numeric keys.';
    case 'set_field_distortion':
      return 'Field distortion patch did not contain any supported numeric keys.';
    case 'set_view_state':
      return 'View-state patch did not contain any supported view keys.';
    case 'select_field':
      return 'select_field did not include a valid fieldId or null.';
    case 'reset_model':
      return 'reset_model shape was malformed.';
    default:
      return `Unsupported action type "${rawAction.type}".`;
  }
}

function readEntryFieldId(source: Record<string, unknown>, entryKey: string | null, entryValue: unknown): unknown {
  return source.fieldId ?? source.id ?? source.field ?? source.targetFieldId ?? source.target ?? source.fieldRef ?? entryKey ?? entryValue;
}

function normalizeFieldTransformActions(rawAction: Record<string, unknown>, fieldSet: Set<string>, editableFieldIds: string[]): AgentAction[] {
  const entries = getFieldCollectionEntries(rawAction);
  if (entries.length === 0) return [];

  return entries
    .map((entry) => {
      const source = isRecord(entry.value) ? entry.value : {};
      const fieldId = resolveFieldId(readEntryFieldId(source, entry.key, entry.value), fieldSet, editableFieldIds);
      const patch =
        isRecord(source.patch)
          ? source.patch
          : isRecord(source.transform)
            ? source.transform
            : isRecord(source.fieldEdit)
              ? source.fieldEdit
              : isRecord(entry.value)
                ? pickNumberPatch(source, ['Tx', 'Ty', 'theta', 'M', 'Sx', 'Sy'])
                : isRecord(rawAction.patch)
                  ? rawAction.patch
                  : pickNumberPatch(rawAction, ['Tx', 'Ty', 'theta', 'M', 'Sx', 'Sy']);

      const parsed = agentActionSchema.safeParse({
        type: 'set_field_transform' as const,
        fieldId,
        patch,
      });
      return parsed.success ? parsed.data : null;
    })
    .filter((action): action is NonNullable<typeof action> => action !== null);
}

function normalizeFieldCornerOverlayActions(rawAction: Record<string, unknown>, fieldSet: Set<string>, editableFieldIds: string[]): AgentAction[] {
  const entries = getFieldCollectionEntries(rawAction);
  if (entries.length === 0) return [];

  return entries
    .map((entry) => {
      const source = isRecord(entry.value) ? entry.value : {};
      const fieldId = resolveFieldId(readEntryFieldId(source, entry.key, entry.value), fieldSet, editableFieldIds);
      const overlay =
        coerceOverlay(source.overlay) ??
        coerceOverlay(source.patch) ??
        coerceOverlay(source.cornerOverlay) ??
        coerceOverlay(source.corners) ??
        coerceOverlay(entry.value) ??
        coerceOverlay(rawAction.overlay) ??
        coerceOverlay(rawAction.patch) ??
        coerceOverlay(rawAction.cornerOverlay) ??
        coerceOverlay(rawAction.corners);

      const parsed = agentActionSchema.safeParse({
        type: 'set_field_corner_overlay' as const,
        fieldId,
        overlay,
      });
      return parsed.success ? parsed.data : null;
    })
    .filter((action): action is NonNullable<typeof action> => action !== null);
}

function normalizeAction(rawAction: unknown, fieldSet: Set<string>, editableFieldIds: string[]): AgentAction[] {
  const direct = agentActionSchema.safeParse(rawAction);
  if (direct.success) {
    return [direct.data];
  }

  if (!isRecord(rawAction) || typeof rawAction.type !== 'string') {
    return [];
  }

  switch (rawAction.type) {
    case 'set_wafer_distortion': {
      const parsed = agentActionSchema.safeParse({
        type: 'set_wafer_distortion' as const,
        patch: isRecord(rawAction.patch) ? rawAction.patch : pickNumberPatch(rawAction, ['Tx', 'Ty', 'theta', 'M', 'Sx', 'Sy']),
      });
      return parsed.success ? [parsed.data] : [];
    }
    case 'set_field_distortion': {
      const parsed = agentActionSchema.safeParse({
        type: 'set_field_distortion' as const,
        patch: isRecord(rawAction.patch) ? rawAction.patch : pickNumberPatch(rawAction, ['FTx', 'FTy', 'Ftheta', 'FM', 'FSx', 'FSy']),
      });
      return parsed.success ? [parsed.data] : [];
    }
    case 'set_view_state': {
      const parsed = agentActionSchema.safeParse({
        type: 'set_view_state' as const,
        patch: isRecord(rawAction.patch)
          ? rawAction.patch
          : {
              ...pickNumberPatch(rawAction, ['arrowScaleFactor']),
              ...(rawAction.granularity === 'die' || rawAction.granularity === 'field' ? { granularity: rawAction.granularity } : {}),
              ...(Array.isArray(rawAction.colorMapRange) ? { colorMapRange: rawAction.colorMapRange } : {}),
            },
      });
      return parsed.success ? [parsed.data] : [];
    }
    case 'set_field_transform': {
      const batch = normalizeFieldTransformActions(rawAction, fieldSet, editableFieldIds);
      if (batch.length > 0) return batch;
      const parsed = agentActionSchema.safeParse({
        type: 'set_field_transform' as const,
        fieldId: resolveFieldId(readFieldIdCandidateFromAction(rawAction), fieldSet, editableFieldIds),
        patch:
          isRecord(rawAction.patch)
            ? rawAction.patch
            : isRecord(rawAction.transform)
              ? rawAction.transform
              : isRecord(rawAction.fieldEdit)
                ? rawAction.fieldEdit
                : pickNumberPatch(rawAction, ['Tx', 'Ty', 'theta', 'M', 'Sx', 'Sy']),
      });
      return parsed.success ? [parsed.data] : [];
    }
    case 'set_field_corner_overlay': {
      const batch = normalizeFieldCornerOverlayActions(rawAction, fieldSet, editableFieldIds);
      if (batch.length > 0) return batch;
      const parsed = agentActionSchema.safeParse({
        type: 'set_field_corner_overlay' as const,
        fieldId: resolveFieldId(readFieldIdCandidateFromAction(rawAction), fieldSet, editableFieldIds),
        overlay:
          coerceOverlay(rawAction.overlay) ??
          coerceOverlay(rawAction.patch) ??
          coerceOverlay(rawAction.cornerOverlay) ??
          coerceOverlay(rawAction.corners),
      });
      return parsed.success ? [parsed.data] : [];
    }
    case 'select_field': {
      const parsed = agentActionSchema.safeParse({
        type: 'select_field' as const,
        fieldId: rawAction.fieldId === null ? null : resolveFieldId(rawAction.fieldId ?? rawAction.id ?? rawAction.field, fieldSet, editableFieldIds),
      });
      return parsed.success ? [parsed.data] : [];
    }
    case 'reset_model': {
      const parsed = agentActionSchema.safeParse({ type: 'reset_model' as const });
      return parsed.success ? [parsed.data] : [];
    }
    default:
      return [];
  }
}

function buildDiagnostics(rawActions: unknown[], normalizedEntries: AgentAction[][], fieldSet: Set<string>, editableFieldIds: string[]): AgentPlanDiagnostics {
  const droppedEntries = rawActions
    .map((action, index) => ({ action, index }))
    .filter(({ index }) => normalizedEntries[index].length === 0);
  const normalizedActionCount = normalizedEntries.reduce((count, entry) => count + entry.length, 0);
  const droppedActionTypes = droppedEntries.map(({ action }) =>
    isRecord(action) && typeof action.type === 'string' ? action.type : 'unknown',
  );
  const droppedActions = droppedEntries.map(({ action, index }) => ({
    index,
    type: isRecord(action) && typeof action.type === 'string' ? action.type : 'unknown',
    reason: describeDroppedAction(action, fieldSet, editableFieldIds),
  }));
  const warnings: string[] = [];

  if (droppedEntries.length > 0) {
    warnings.push(`${droppedEntries.length} returned action block(s) were skipped because they did not match the supported interface.`);
  }

  if (normalizedActionCount > rawActions.length) {
    warnings.push('Some returned action blocks expanded into multiple per-field executable actions.');
  }

  return {
    droppedActions,
    rawActionCount: rawActions.length,
    normalizedActionCount,
    finalActionCount: normalizedActionCount,
    droppedActionCount: droppedEntries.length,
    droppedActionTypes,
    warnings,
  };
}

export function normalizePlan(rawPlan: unknown, request: AgentRequest): AgentPlanResponse {
  if (!isRecord(rawPlan)) {
    throw new Error('Model response was not a JSON object.');
  }

  const editableFieldIds = request.scene.editableFieldIds;
  const fieldSet = new Set(editableFieldIds);
  const rawActions = Array.isArray(rawPlan.actions) ? rawPlan.actions : [];
  const normalizedEntries = rawActions.map((action) => normalizeAction(action, fieldSet, editableFieldIds));
  const actions = normalizedEntries.flat();
  const diagnostics = buildDiagnostics(rawActions, normalizedEntries, fieldSet, editableFieldIds);

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
  if (result.success) {
    return { plan: result.data, diagnostics };
  }

  const fallback = {
    planVersion: 'v1' as const,
    intent: request.intent,
    summary:
      typeof rawPlan.summary === 'string' && rawPlan.summary.trim()
        ? rawPlan.summary
        : 'Response received, but executable actions were omitted to keep the plan safe.',
    ...(typeof rawPlan.analysis === 'string' && rawPlan.analysis.trim()
      ? {
          analysis: `${rawPlan.analysis}\n\nSome returned actions were ignored because they did not match the supported interface.`,
        }
      : {
          analysis: 'Some returned actions were ignored because they did not match the supported interface.',
        }),
    actions: [],
    suggestions,
    providerId: request.provider.id,
    requiresConfirmation: true,
  };

  const fallbackResult = agentPlanSchema.safeParse(fallback);
  if (!fallbackResult.success) {
    throw new Error(`Model returned an invalid plan: ${result.error.message}`);
  }

  const fallbackDiagnostics: AgentPlanDiagnostics = {
    ...diagnostics,
    finalActionCount: 0,
    warnings: diagnostics.warnings.concat('Executable actions were reduced to an empty safe fallback because the normalized plan still failed schema validation.'),
  };

  return { plan: fallbackResult.data, diagnostics: fallbackDiagnostics };
}
