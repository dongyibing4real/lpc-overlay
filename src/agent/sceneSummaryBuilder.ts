import type { SceneContextSummary } from '../../shared/agent';
import { AGENT_SCENE_LIMITS } from '../domain/wafer/limits';
import { computeStats } from '../domain/wafer/stats';
import { useWaferStore } from '../store/useWaferStore';

export function captureSceneForAgent(): SceneContextSummary {
  const waferState = useWaferStore.getState();
  const fieldIds = waferState.fields.map((field) => field.id);
  return {
    layoutConfig: { ...waferState.layoutConfig },
    waferDistortion: { ...waferState.waferDistortion },
    fieldDistortion: { ...waferState.fieldDistortion },
    epeConfig: { ...waferState.epeConfig },
    viewState: { ...waferState.viewState, colorMapRange: [...waferState.viewState.colorMapRange] as [number, number] },
    selectedFieldId: waferState.selectedFieldId,
    stats: computeStats(waferState.distortionResults),
    activeFieldIds: fieldIds,
    editableFieldIds: fieldIds,
    limits: AGENT_SCENE_LIMITS,
  };
}
