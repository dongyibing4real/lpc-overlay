import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  CornerOverlay,
  DistortedPosition,
  EPEConfig,
  FieldCell,
  FieldDistortionParams,
  FieldTransformOverride,
  OverlayRecord,
  ViewState,
  WaferDistortionParams,
  WaferLayoutConfig,
  WaferSceneSnapshot,
} from '../types/wafer';
import {
  DEFAULT_EPE,
  DEFAULT_FIELD,
  DEFAULT_LAYOUT,
  DEFAULT_VIEW,
  DEFAULT_WAFER,
  SHOWCASE_EPE,
  SHOWCASE_FIELD,
  SHOWCASE_VIEW,
  SHOWCASE_WAFER,
  ZERO_FIELD_TRANSFORM,
  ZERO_OVERLAY,
} from '../domain/wafer/defaults';
import { recomputeDistortionResults, buildImportedDistortionResults } from '../domain/wafer/distortionEngine';
import { createDefaultSceneSnapshot } from '../domain/wafer/sceneSnapshot';
import { generateFieldGrid } from '../utils/waferGeometry';
import { isZeroOverlay, mergeFieldTransformOverride } from '../utils/fieldEditGeometry';

function createShowcaseFieldTransforms(): Record<string, FieldTransformOverride> {
  const entries: Array<[string, FieldTransformOverride]> = [];

  for (let row = -2; row <= 2; row += 1) {
    for (let col = -2; col <= 2; col += 1) {
      const radius = Math.abs(col) + Math.abs(row);
      const falloff = Math.max(0.24, 1 - radius * 0.18);
      const waveA = Math.sin((col + 2.4) * 0.92 + row * 0.68);
      const waveB = Math.cos(row * 1.08 - col * 0.57);
      entries.push([
        `f_${col}_${row}`,
        {
          Tx: Math.round((36 * waveA + col * 22) * falloff),
          Ty: Math.round((31 * waveB + row * 20) * falloff),
          theta: Math.round((waveB * 1.02 - col * 0.18 + row * 0.11) * falloff * 100) / 100,
          M: Math.round((waveA * 1.18 + waveB * 0.34) * falloff * 100) / 100,
          Sx: Math.round((col * 0.82 + waveA * 0.94) * falloff * 100) / 100,
          Sy: Math.round((row * -0.76 + waveB * 0.88) * falloff * 100) / 100,
        },
      ]);
    }
  }

  return Object.fromEntries(entries);
}

function createShowcaseFieldCorners(): Record<string, CornerOverlay> {
  const entries: Array<[string, CornerOverlay]> = [];

  for (let row = -2; row <= 2; row += 1) {
    for (let col = -2; col <= 2; col += 1) {
      const radius = Math.abs(col) + Math.abs(row);
      const falloff = Math.max(0.22, 1 - radius * 0.16);
      const bendX = Math.sin((col + 1.2) * 1.08 + row * 0.62);
      const bendY = Math.cos((row - 0.4) * 0.95 - col * 0.71);
      const ampX = Math.round((126 + 112 * falloff) * bendX);
      const ampY = Math.round((118 + 104 * falloff) * bendY);

      entries.push([
        `f_${col}_${row}`,
        {
          cornerDx: [
            ampX,
            Math.round(ampX * 0.34 - ampY * 0.18),
            -ampX,
            Math.round(-ampX * 0.28 + ampY * 0.24),
          ],
          cornerDy: [
            ampY,
            Math.round(-ampY * 0.26 + ampX * 0.22),
            -ampY,
            Math.round(ampY * 0.3 - ampX * 0.18),
          ],
        },
      ]);
    }
  }

  return Object.fromEntries(entries);
}

interface WaferState {
  layoutConfig: WaferLayoutConfig;
  waferDistortion: WaferDistortionParams;
  fieldDistortion: FieldDistortionParams;
  epeConfig: EPEConfig;
  viewState: ViewState;
  fields: FieldCell[];
  distortionResults: DistortedPosition[];
  importedData: OverlayRecord[] | null;
  perCornerOverlays: Record<string, CornerOverlay>;
  selectedFieldId: string | null;
  perFieldTransformOverrides: Record<string, FieldTransformOverride>;
  perFieldCornerOverlays: Record<string, CornerOverlay>;

  setLayoutConfig: (cfg: Partial<WaferLayoutConfig>) => void;
  setWaferDistortion: (params: Partial<WaferDistortionParams>) => void;
  setFieldDistortion: (params: Partial<FieldDistortionParams>) => void;
  setEPEConfig: (cfg: Partial<EPEConfig>) => void;
  setViewState: (vs: Partial<ViewState>) => void;
  setImportedData: (data: OverlayRecord[]) => void;
  clearImportedData: () => void;
  setCornerOverlay: (id: string, overlay: CornerOverlay) => void;
  clearCornerOverlays: () => void;
  selectField: (id: string | null) => void;
  setFieldTransformOverride: (id: string, patch: Partial<FieldTransformOverride>) => void;
  resetFieldTransformOverride: (id: string) => void;
  setFieldCornerOverlay: (id: string, overlay: CornerOverlay) => void;
  resetFieldCornerOverlay: (id: string) => void;
  resetModelState: () => void;
  applyVectorMapShowcase: () => void;
  getDefaultSceneSnapshot: () => WaferSceneSnapshot;
  getSceneSnapshot: () => WaferSceneSnapshot;
  replaceSceneSnapshot: (snapshot: WaferSceneSnapshot) => void;
  recomputeLayout: () => void;
  recomputeDistortions: () => void;
}

const initialFields = generateFieldGrid(DEFAULT_LAYOUT);

export const useWaferStore = create<WaferState>()(
  immer((set, get) => ({
    layoutConfig: DEFAULT_LAYOUT,
    waferDistortion: DEFAULT_WAFER,
    fieldDistortion: DEFAULT_FIELD,
    epeConfig: DEFAULT_EPE,
    viewState: DEFAULT_VIEW,
    fields: initialFields,
    distortionResults: [],
    importedData: null,
    perCornerOverlays: {} as Record<string, CornerOverlay>,
    selectedFieldId: null,
    perFieldTransformOverrides: {} as Record<string, FieldTransformOverride>,
    perFieldCornerOverlays: {} as Record<string, CornerOverlay>,

    setLayoutConfig(cfg) {
      set((s) => { Object.assign(s.layoutConfig, cfg); });
      get().recomputeLayout();
    },

    setWaferDistortion(params) {
      set((s) => { Object.assign(s.waferDistortion, params); });
      get().recomputeDistortions();
    },

    setFieldDistortion(params) {
      set((s) => { Object.assign(s.fieldDistortion, params); });
      get().recomputeDistortions();
    },

    setEPEConfig(cfg) {
      set((s) => { Object.assign(s.epeConfig, cfg); });
      get().recomputeDistortions();
    },

    setViewState(vs) {
      set((s) => { Object.assign(s.viewState, vs); });
      if (vs.granularity !== undefined) {
        get().recomputeDistortions();
      }
    },

    setImportedData(data) {
      set((s) => {
        s.importedData = data;
        s.viewState.dataSource = 'imported';
        s.distortionResults = buildImportedDistortionResults(data);
      });
    },

    clearImportedData() {
      set((s) => {
        s.importedData = null;
        s.viewState.dataSource = 'parameters';
      });
      get().recomputeDistortions();
    },

    setCornerOverlay(id, overlay) {
      set((s) => {
        s.perCornerOverlays[id] = overlay;
      });
      get().recomputeDistortions();
    },

    clearCornerOverlays() {
      set((s) => {
        Object.keys(s.perCornerOverlays).forEach((k) => delete s.perCornerOverlays[k]);
      });
      get().recomputeDistortions();
    },

    selectField(id) {
      set((s) => {
        s.selectedFieldId = id;
      });
    },

    setFieldTransformOverride(id, patch) {
      set((s) => {
        const next = mergeFieldTransformOverride(s.perFieldTransformOverrides[id], patch);
        if (!next) {
          delete s.perFieldTransformOverrides[id];
        } else {
          s.perFieldTransformOverrides[id] = next;
        }
      });
      get().recomputeDistortions();
    },

    resetFieldTransformOverride(id) {
      set((s) => {
        delete s.perFieldTransformOverrides[id];
      });
      get().recomputeDistortions();
    },

    setFieldCornerOverlay(id, overlay) {
      set((s) => {
        if (isZeroOverlay(overlay)) {
          delete s.perFieldCornerOverlays[id];
        } else {
          s.perFieldCornerOverlays[id] = overlay;
        }
      });
      get().recomputeDistortions();
    },

    resetFieldCornerOverlay(id) {
      set((s) => {
        delete s.perFieldCornerOverlays[id];
      });
      get().recomputeDistortions();
    },

    resetModelState() {
      get().replaceSceneSnapshot(createDefaultSceneSnapshot());
    },

    applyVectorMapShowcase() {
      const layoutConfig = { ...DEFAULT_LAYOUT };
      const fields = generateFieldGrid(layoutConfig);
      const fieldIdSet = new Set(fields.map((field) => field.id));
      const showcaseFieldTransforms = createShowcaseFieldTransforms();
      const showcaseFieldCorners = createShowcaseFieldCorners();
      const transformOverrides = Object.fromEntries(
        Object.entries(showcaseFieldTransforms).filter(([fieldId]) => fieldIdSet.has(fieldId)),
      ) as Record<string, FieldTransformOverride>;
      const cornerOverrides = Object.fromEntries(
        Object.entries(showcaseFieldCorners).filter(([fieldId]) => fieldIdSet.has(fieldId)),
      ) as Record<string, CornerOverlay>;

      set((s) => {
        s.layoutConfig = layoutConfig;
        s.fields = fields;
        s.waferDistortion = { ...SHOWCASE_WAFER };
        s.fieldDistortion = { ...SHOWCASE_FIELD };
        s.epeConfig = { ...SHOWCASE_EPE };
        s.viewState = {
          ...DEFAULT_VIEW,
          ...SHOWCASE_VIEW,
        };
        s.importedData = null;
        s.perCornerOverlays = {};
        s.selectedFieldId = fieldIdSet.has('f_0_0') ? 'f_0_0' : null;
        s.perFieldTransformOverrides = transformOverrides;
        s.perFieldCornerOverlays = cornerOverrides;
      });
      get().recomputeDistortions();
    },

    getDefaultSceneSnapshot() {
      return createDefaultSceneSnapshot();
    },

    getSceneSnapshot() {
      const {
        layoutConfig,
        waferDistortion,
        fieldDistortion,
        epeConfig,
        viewState,
        importedData,
        perCornerOverlays,
        selectedFieldId,
        perFieldTransformOverrides,
        perFieldCornerOverlays,
      } = get();

      return structuredClone({
        layoutConfig,
        waferDistortion,
        fieldDistortion,
        epeConfig,
        viewState,
        importedData,
        perCornerOverlays,
        selectedFieldId,
        perFieldTransformOverrides,
        perFieldCornerOverlays,
      });
    },

    replaceSceneSnapshot(snapshot) {
      const layoutConfig = structuredClone(snapshot.layoutConfig);
      const fields = generateFieldGrid(layoutConfig);
      const fieldIdSet = new Set(fields.map((field) => field.id));

      set((s) => {
        s.layoutConfig = layoutConfig;
        s.fields = fields;
        s.waferDistortion = { ...snapshot.waferDistortion };
        s.fieldDistortion = { ...snapshot.fieldDistortion };
        s.epeConfig = { ...snapshot.epeConfig };
        s.viewState = { ...snapshot.viewState, colorMapRange: [...snapshot.viewState.colorMapRange] as [number, number] };
        s.importedData = snapshot.importedData ? structuredClone(snapshot.importedData) : null;
        s.perCornerOverlays = structuredClone(snapshot.perCornerOverlays);
        s.selectedFieldId = snapshot.selectedFieldId && fieldIdSet.has(snapshot.selectedFieldId)
          ? snapshot.selectedFieldId
          : null;
        s.perFieldTransformOverrides = structuredClone(snapshot.perFieldTransformOverrides);
        s.perFieldCornerOverlays = structuredClone(snapshot.perFieldCornerOverlays);
      });

      get().recomputeDistortions();
    },

    recomputeLayout() {
      const cfg = get().layoutConfig;
      const fields = generateFieldGrid(cfg);
      const fieldIdSet = new Set(fields.map((field) => field.id));
      set((s) => {
        s.fields = fields;
        if (s.selectedFieldId && !fieldIdSet.has(s.selectedFieldId)) {
          s.selectedFieldId = null;
        }
      });
      get().recomputeDistortions();
    },

    recomputeDistortions() {
      const state = get();
      set((s) => {
        s.distortionResults = recomputeDistortionResults({
          fields: state.fields,
          layoutConfig: state.layoutConfig,
          waferDistortion: state.waferDistortion,
          fieldDistortion: state.fieldDistortion,
          epeConfig: state.epeConfig,
          viewState: state.viewState,
          importedData: state.importedData,
          perCornerOverlays: state.perCornerOverlays,
          perFieldTransformOverrides: state.perFieldTransformOverrides,
          perFieldCornerOverlays: state.perFieldCornerOverlays,
        });
      });
    },
  }))
);

useWaferStore.getState().recomputeDistortions();

export { ZERO_OVERLAY, ZERO_FIELD_TRANSFORM };
