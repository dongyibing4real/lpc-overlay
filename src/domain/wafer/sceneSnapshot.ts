import {
  DEFAULT_EPE,
  DEFAULT_FIELD,
  DEFAULT_LAYOUT,
  DEFAULT_VIEW,
  DEFAULT_WAFER,
} from './defaults.ts';
import type { CornerOverlay, FieldTransformOverride, WaferSceneSnapshot } from './model.ts';

export function createDefaultSceneSnapshot(): WaferSceneSnapshot {
  return structuredClone({
    layoutConfig: DEFAULT_LAYOUT,
    waferDistortion: DEFAULT_WAFER,
    fieldDistortion: DEFAULT_FIELD,
    epeConfig: DEFAULT_EPE,
    viewState: DEFAULT_VIEW,
    importedData: null,
    perCornerOverlays: {} as Record<string, CornerOverlay>,
    selectedFieldId: null,
    perFieldTransformOverrides: {} as Record<string, FieldTransformOverride>,
    perFieldCornerOverlays: {} as Record<string, CornerOverlay>,
  });
}

export function cloneSceneSnapshot(snapshot: WaferSceneSnapshot): WaferSceneSnapshot {
  return structuredClone(snapshot);
}
