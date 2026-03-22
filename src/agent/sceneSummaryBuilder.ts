import type { SceneContextSummary } from '../../shared/agent';
import { computeStats } from '../utils/distortionMath';
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
