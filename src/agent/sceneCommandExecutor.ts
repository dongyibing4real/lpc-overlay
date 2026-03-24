import type { AgentAction, AgentPlan } from '../../shared/agent';
import type { WaferSceneSnapshot } from '../types/wafer';
import { mergeFieldTransformOverride } from '../domain/wafer/fieldEditEngine';
import { createDefaultSceneSnapshot } from '../domain/wafer/sceneSnapshot';

export function applyAgentAction(snapshot: WaferSceneSnapshot, action: AgentAction) {
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
      const next = mergeFieldTransformOverride(snapshot.perFieldTransformOverrides[action.fieldId], action.patch);
      if (!next) {
        delete snapshot.perFieldTransformOverrides[action.fieldId];
      } else {
        snapshot.perFieldTransformOverrides[action.fieldId] = next;
      }
      return;
    }
    case 'set_field_corner_overlay':
      snapshot.perFieldCornerOverlays[action.fieldId] = structuredClone(action.overlay);
      return;
    case 'select_field':
      snapshot.selectedFieldId = action.fieldId;
      return;
    case 'reset_model': {
      const clean = createDefaultSceneSnapshot();
      snapshot.layoutConfig = clean.layoutConfig;
      snapshot.waferDistortion = clean.waferDistortion;
      snapshot.fieldDistortion = clean.fieldDistortion;
      snapshot.epeConfig = clean.epeConfig;
      snapshot.viewState = clean.viewState;
      snapshot.importedData = clean.importedData;
      snapshot.perCornerOverlays = clean.perCornerOverlays;
      snapshot.selectedFieldId = clean.selectedFieldId;
      snapshot.perFieldTransformOverrides = clean.perFieldTransformOverrides;
      snapshot.perFieldCornerOverlays = clean.perFieldCornerOverlays;
    }
  }
}

export function applyPlanToSnapshot(previousSnapshot: WaferSceneSnapshot, plan: AgentPlan) {
  const nextSnapshot = structuredClone(previousSnapshot);
  for (const action of plan.actions) {
    applyAgentAction(nextSnapshot, action);
  }
  return nextSnapshot;
}
