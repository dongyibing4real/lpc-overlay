import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  WaferLayoutConfig,
  WaferDistortionParams,
  FieldDistortionParams,
  EPEConfig,
  ViewState,
  OverlayRecord,
  DistortedPosition,
  FieldCell,
  CornerOverlay,
  FieldTransformOverride,
  WaferSceneSnapshot,
} from '../types/wafer';
import { generateFieldGrid } from '../utils/waferGeometry';
import {
  computeFieldDistortion,
  interpolateDieResultsFromField,
} from '../utils/distortionMath';
import {
  applyCornerOverlayToQuadUm,
  applyFieldEditToFieldResult,
  applyFieldTransformToQuadUm,
  buildDistortedCornersFromOffsets,
  isZeroFieldTransform,
  isZeroOverlay,
} from '../utils/fieldEditGeometry';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_LAYOUT: WaferLayoutConfig = {
  waferDiameterMm: 300,
  edgeExclusionMm: 3,
  fieldWidthMm: 26,
  fieldHeightMm: 33,
  diesPerFieldX: 4,
  diesPerFieldY: 5,
  fieldOffsetX: 0,
  fieldOffsetY: 0,
};

const DEFAULT_WAFER: WaferDistortionParams = {
  Tx: 0, Ty: 0, theta: 0, M: 0, Sx: 0, Sy: 0,
};

const DEFAULT_FIELD: FieldDistortionParams = {
  FTx: 0, FTy: 0, Ftheta: 0, FM: 0, FSx: 0, FSy: 0,
};

const DEFAULT_EPE: EPEConfig = {
  mode: 'none', magnitude: 0, systematicAngle: 0, seed: 42,
};

const DEFAULT_VIEW: ViewState = {
  granularity: 'die',
  dataSource: 'parameters',
  arrowScaleFactor: 10000,
  showDisplacementVectors: true,
  showFieldBoundaries: true,
  showDieBoundaries: true,
  colorMapRange: [0, 1000],
};

const ZERO_OVERLAY: CornerOverlay = {
  cornerDx: [0, 0, 0, 0],
  cornerDy: [0, 0, 0, 0],
};

const ZERO_FIELD_TRANSFORM: FieldTransformOverride = {
  Tx: 0,
  Ty: 0,
  theta: 0,
  M: 0,
  Sx: 0,
  Sy: 0,
};

const SHOWCASE_WAFER: WaferDistortionParams = {
  Tx: 110,
  Ty: -90,
  theta: 1.4,
  M: 1.8,
  Sx: -1.2,
  Sy: 1.5,
};

const SHOWCASE_FIELD: FieldDistortionParams = {
  FTx: -42,
  FTy: 36,
  Ftheta: -0.8,
  FM: 0.9,
  FSx: 1.2,
  FSy: -0.7,
};

const SHOWCASE_EPE: EPEConfig = {
  mode: 'systematic',
  magnitude: 18,
  systematicAngle: 28,
  seed: 42,
};

const SHOWCASE_VIEW: Partial<ViewState> = {
  granularity: 'die',
  dataSource: 'parameters',
  arrowScaleFactor: 52000,
  showDisplacementVectors: true,
  showFieldBoundaries: true,
  showDieBoundaries: true,
  colorMapRange: [0, 320],
};

function createDefaultSceneSnapshot(): WaferSceneSnapshot {
  return structuredClone({
    layoutConfig: DEFAULT_LAYOUT,
    waferDistortion: DEFAULT_WAFER,
    fieldDistortion: DEFAULT_FIELD,
    epeConfig: DEFAULT_EPE,
    viewState: DEFAULT_VIEW,
    importedData: null,
    perCornerOverlays: {},
    selectedFieldId: null,
    perFieldTransformOverrides: {},
    perFieldCornerOverlays: {},
  });
}

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

function getResultQuad(result: DistortedPosition) {
  if (result.distortedCorners) return result.distortedCorners;
  if (result.designCorners && result.cornerDx && result.cornerDy) {
    return buildDistortedCornersFromOffsets(result.designCorners, result.cornerDx, result.cornerDy)!;
  }
  throw new Error(`Result ${result.entityId} is missing corner geometry`);
}

function applyOverlayToResult(result: DistortedPosition, overlay?: CornerOverlay): DistortedPosition {
  if (!overlay) return result;

  const baseCdx = result.cornerDx ?? [result.dx, result.dx, result.dx, result.dx];
  const baseCdy = result.cornerDy ?? [result.dy, result.dy, result.dy, result.dy];
  const newCornerDx: [number, number, number, number] = [
    baseCdx[0] + overlay.cornerDx[0],
    baseCdx[1] + overlay.cornerDx[1],
    baseCdx[2] + overlay.cornerDx[2],
    baseCdx[3] + overlay.cornerDx[3],
  ];
  const newCornerDy: [number, number, number, number] = [
    baseCdy[0] + overlay.cornerDy[0],
    baseCdy[1] + overlay.cornerDy[1],
    baseCdy[2] + overlay.cornerDy[2],
    baseCdy[3] + overlay.cornerDy[3],
  ];
  const newDx = (newCornerDx[0] + newCornerDx[1] + newCornerDx[2] + newCornerDx[3]) / 4;
  const newDy = (newCornerDy[0] + newCornerDy[1] + newCornerDy[2] + newCornerDy[3]) / 4;

  return {
    ...result,
    dx: newDx,
    dy: newDy,
    magnitude: Math.sqrt(newDx * newDx + newDy * newDy),
    cornerDx: newCornerDx,
    cornerDy: newCornerDy,
    distortedCorners: result.designCorners
      ? [
        { x: result.designCorners[0].x + newCornerDx[0] * 1e-3, y: result.designCorners[0].y + newCornerDy[0] * 1e-3 },
        { x: result.designCorners[1].x + newCornerDx[1] * 1e-3, y: result.designCorners[1].y + newCornerDy[1] * 1e-3 },
        { x: result.designCorners[2].x + newCornerDx[2] * 1e-3, y: result.designCorners[2].y + newCornerDy[2] * 1e-3 },
        { x: result.designCorners[3].x + newCornerDx[3] * 1e-3, y: result.designCorners[3].y + newCornerDy[3] * 1e-3 },
      ]
      : result.distortedCorners,
  };
}

function removeOverlayFromResult(result: DistortedPosition, overlay?: CornerOverlay): DistortedPosition {
  if (!overlay) return result;

  const baseCdx = result.cornerDx ?? [result.dx, result.dx, result.dx, result.dx];
  const baseCdy = result.cornerDy ?? [result.dy, result.dy, result.dy, result.dy];
  const newCornerDx: [number, number, number, number] = [
    baseCdx[0] - overlay.cornerDx[0],
    baseCdx[1] - overlay.cornerDx[1],
    baseCdx[2] - overlay.cornerDx[2],
    baseCdx[3] - overlay.cornerDx[3],
  ];
  const newCornerDy: [number, number, number, number] = [
    baseCdy[0] - overlay.cornerDy[0],
    baseCdy[1] - overlay.cornerDy[1],
    baseCdy[2] - overlay.cornerDy[2],
    baseCdy[3] - overlay.cornerDy[3],
  ];
  const newDx = (newCornerDx[0] + newCornerDx[1] + newCornerDx[2] + newCornerDx[3]) / 4;
  const newDy = (newCornerDy[0] + newCornerDy[1] + newCornerDy[2] + newCornerDy[3]) / 4;

  return {
    ...result,
    dx: newDx,
    dy: newDy,
    magnitude: Math.sqrt(newDx * newDx + newDy * newDy),
    cornerDx: newCornerDx,
    cornerDy: newCornerDy,
    distortedCorners: result.designCorners
      ? [
        { x: result.designCorners[0].x + newCornerDx[0] * 1e-3, y: result.designCorners[0].y + newCornerDy[0] * 1e-3 },
        { x: result.designCorners[1].x + newCornerDx[1] * 1e-3, y: result.designCorners[1].y + newCornerDy[1] * 1e-3 },
        { x: result.designCorners[2].x + newCornerDx[2] * 1e-3, y: result.designCorners[2].y + newCornerDy[2] * 1e-3 },
        { x: result.designCorners[3].x + newCornerDx[3] * 1e-3, y: result.designCorners[3].y + newCornerDy[3] * 1e-3 },
      ]
      : result.distortedCorners,
  };
}

// ─── Store Interface ───────────────────────────────────────────────────────────

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

// ─── Store ─────────────────────────────────────────────────────────────────────

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
        s.distortionResults = data.map((r, i) => ({
          entityId: `imported_${i}`,
          designPos: { x: r.x, y: r.y },
          distortedPos: { x: r.x + r.dx * 1e-3, y: r.y + r.dy * 1e-3 },
          dx: r.dx,
          dy: r.dy,
          magnitude: Math.sqrt(r.dx * r.dx + r.dy * r.dy),
        }));
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
        const prevOverlay = s.perCornerOverlays[id];
        s.perCornerOverlays[id] = overlay;
        const idx = s.distortionResults.findIndex((r) => r.entityId === id);
        if (idx !== -1) {
          const baseResult = removeOverlayFromResult(s.distortionResults[idx], prevOverlay);
          s.distortionResults[idx] = applyOverlayToResult(baseResult, overlay);
        }
      });
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
        const current = s.perFieldTransformOverrides[id] ?? ZERO_FIELD_TRANSFORM;
        const next = { ...current, ...patch };
        if (isZeroFieldTransform(next)) {
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
      const {
        fields,
        layoutConfig,
        waferDistortion,
        fieldDistortion,
        epeConfig,
        viewState,
        importedData,
        perCornerOverlays,
        perFieldTransformOverrides,
        perFieldCornerOverlays,
      } = get();

      if (viewState.dataSource === 'imported' && importedData) return;

      const fieldHalfW = layoutConfig.fieldWidthMm * 500;
      const fieldHalfH = layoutConfig.fieldHeightMm * 500;
      const diesPerField = layoutConfig.diesPerFieldX * layoutConfig.diesPerFieldY;

      const baseFieldResults = fields.map((field) => computeFieldDistortion(
        field,
        waferDistortion,
        fieldDistortion,
        fieldHalfW,
        fieldHalfH,
      ));
      const baseFieldResultMap = new Map(baseFieldResults.map((result) => [result.entityId, result]));

      const finalFieldQuadMap = new Map(
        baseFieldResults.map((result) => {
          const baseFieldQuad = getResultQuad(result);
          const transformedFieldQuad = applyFieldTransformToQuadUm(
            baseFieldQuad,
            fieldHalfW,
            fieldHalfH,
            perFieldTransformOverrides[result.entityId],
          );
          const finalFieldQuad = applyCornerOverlayToQuadUm(
            transformedFieldQuad,
            perFieldCornerOverlays[result.entityId],
          );
          return [result.entityId, finalFieldQuad] as const;
        }),
      );

      let results: DistortedPosition[];

      if (viewState.granularity === 'die') {
        results = fields.flatMap((field, fieldIndex) => {
          const finalQuad = finalFieldQuadMap.get(field.id)!;
          const fieldResult = baseFieldResultMap.get(field.id)!;
          return interpolateDieResultsFromField(
            field,
            finalQuad,
            fieldResult,
            epeConfig,
            layoutConfig,
            fieldHalfW,
            fieldHalfH,
            fieldIndex * diesPerField,
          );
        });
      } else {
        results = fields.map((field) => {
          const base = baseFieldResultMap.get(field.id)!;
          return applyFieldEditToFieldResult(
            base,
            finalFieldQuadMap.get(field.id)!,
            fieldHalfW,
            fieldHalfH,
          );
        });
      }

      // Apply per-entity corner overlays on top of parametric results
      const overlayKeys = Object.keys(perCornerOverlays);
      if (overlayKeys.length > 0) {
        results = results.map((r) => applyOverlayToResult(r, perCornerOverlays[r.entityId]));
      }

      set((s) => { s.distortionResults = results; });
    },
  }))
);

// Populate initial distortion results.
useWaferStore.getState().recomputeDistortions();

export { ZERO_OVERLAY, ZERO_FIELD_TRANSFORM };
