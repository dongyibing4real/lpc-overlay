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
  DieCell,
  EntityOverlay,
  FieldTransformOverride,
} from '../types/wafer';
import { generateFieldGrid, generateDieGrid } from '../utils/waferGeometry';
import {
  computeDieDistortion,
  computeFieldDistortion,
} from '../utils/distortionMath';
import {
  applyCornerOverlayToQuadUm,
  applyFieldEditToDieResult,
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

const ZERO_OVERLAY: EntityOverlay = {
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

function getResultQuad(result: DistortedPosition) {
  if (result.distortedCorners) return result.distortedCorners;
  if (result.designCorners && result.cornerDx && result.cornerDy) {
    return buildDistortedCornersFromOffsets(result.designCorners, result.cornerDx, result.cornerDy)!;
  }
  throw new Error(`Result ${result.entityId} is missing corner geometry`);
}

function applyOverlayToResult(result: DistortedPosition, overlay?: EntityOverlay): DistortedPosition {
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

function removeOverlayFromResult(result: DistortedPosition, overlay?: EntityOverlay): DistortedPosition {
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
  dies: DieCell[];
  distortionResults: DistortedPosition[];
  importedData: OverlayRecord[] | null;
  perEntityOverlays: Record<string, EntityOverlay>;
  selectedFieldId: string | null;
  perFieldTransformOverrides: Record<string, FieldTransformOverride>;
  perFieldCornerOverlays: Record<string, EntityOverlay>;

  setLayoutConfig: (cfg: Partial<WaferLayoutConfig>) => void;
  setWaferDistortion: (params: Partial<WaferDistortionParams>) => void;
  setFieldDistortion: (params: Partial<FieldDistortionParams>) => void;
  setEPEConfig: (cfg: Partial<EPEConfig>) => void;
  setViewState: (vs: Partial<ViewState>) => void;
  setImportedData: (data: OverlayRecord[]) => void;
  clearImportedData: () => void;
  setEntityOverlay: (id: string, overlay: EntityOverlay) => void;
  clearEntityOverlays: () => void;
  selectField: (id: string | null) => void;
  setFieldTransformOverride: (id: string, patch: Partial<FieldTransformOverride>) => void;
  resetFieldTransformOverride: (id: string) => void;
  setFieldCornerOverlay: (id: string, overlay: EntityOverlay) => void;
  resetFieldCornerOverlay: (id: string) => void;
  resetModelState: () => void;
  recomputeLayout: () => void;
  recomputeDistortions: () => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

const initialFields = generateFieldGrid(DEFAULT_LAYOUT);
const initialDies = generateDieGrid(initialFields, DEFAULT_LAYOUT);
const initialFieldMap = new Map(initialFields.map((f) => [f.id, f]));
const initDieHalfW = (DEFAULT_LAYOUT.fieldWidthMm * 1000) / (2 * DEFAULT_LAYOUT.diesPerFieldX);
const initDieHalfH = (DEFAULT_LAYOUT.fieldHeightMm * 1000) / (2 * DEFAULT_LAYOUT.diesPerFieldY);
const initialResults = initialDies.map((die, idx) => {
  const field = initialFieldMap.get(die.fieldId)!;
  return computeDieDistortion(die, field, DEFAULT_WAFER, DEFAULT_FIELD, DEFAULT_EPE, idx, initDieHalfW, initDieHalfH);
});

export const useWaferStore = create<WaferState>()(
  immer((set, get) => ({
    layoutConfig: DEFAULT_LAYOUT,
    waferDistortion: DEFAULT_WAFER,
    fieldDistortion: DEFAULT_FIELD,
    epeConfig: DEFAULT_EPE,
    viewState: DEFAULT_VIEW,
    fields: initialFields,
    dies: initialDies,
    distortionResults: initialResults,
    importedData: null,
    perEntityOverlays: {} as Record<string, EntityOverlay>,
    selectedFieldId: null,
    perFieldTransformOverrides: {} as Record<string, FieldTransformOverride>,
    perFieldCornerOverlays: {} as Record<string, EntityOverlay>,

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

    setEntityOverlay(id, overlay) {
      set((s) => {
        const prevOverlay = s.perEntityOverlays[id];
        s.perEntityOverlays[id] = overlay;
        const idx = s.distortionResults.findIndex((r) => r.entityId === id);
        if (idx !== -1) {
          const baseResult = removeOverlayFromResult(s.distortionResults[idx], prevOverlay);
          s.distortionResults[idx] = applyOverlayToResult(baseResult, overlay);
        }
      });
    },

    clearEntityOverlays() {
      set((s) => {
        Object.keys(s.perEntityOverlays).forEach((k) => delete s.perEntityOverlays[k]);
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
      set((s) => {
        s.waferDistortion = { ...DEFAULT_WAFER };
        s.fieldDistortion = { ...DEFAULT_FIELD };
        s.epeConfig = { ...DEFAULT_EPE };
        s.importedData = null;
        s.viewState.dataSource = 'parameters';
        s.perEntityOverlays = {};
        s.selectedFieldId = null;
        s.perFieldTransformOverrides = {};
        s.perFieldCornerOverlays = {};
      });
      get().recomputeDistortions();
    },

    recomputeLayout() {
      const cfg = get().layoutConfig;
      const fields = generateFieldGrid(cfg);
      const dies = generateDieGrid(fields, cfg);
      const fieldIdSet = new Set(fields.map((field) => field.id));
      set((s) => {
        s.fields = fields;
        s.dies = dies;
        if (s.selectedFieldId && !fieldIdSet.has(s.selectedFieldId)) {
          s.selectedFieldId = null;
        }
      });
      get().recomputeDistortions();
    },

    recomputeDistortions() {
      const {
        dies,
        fields,
        layoutConfig,
        waferDistortion,
        fieldDistortion,
        epeConfig,
        viewState,
        importedData,
        perEntityOverlays,
        perFieldTransformOverrides,
        perFieldCornerOverlays,
      } = get();

      if (viewState.dataSource === 'imported' && importedData) return;

      const fieldMap = new Map(fields.map((f) => [f.id, f]));
      const dieHalfW = (layoutConfig.fieldWidthMm * 1000) / (2 * layoutConfig.diesPerFieldX);
      const dieHalfH = (layoutConfig.fieldHeightMm * 1000) / (2 * layoutConfig.diesPerFieldY);
      const fieldHalfW = layoutConfig.fieldWidthMm * 500;
      const fieldHalfH = layoutConfig.fieldHeightMm * 500;
      const baseFieldResults = fields.map((field) => computeFieldDistortion(
        field,
        waferDistortion,
        fieldDistortion,
        fieldHalfW,
        fieldHalfH,
      ));
      const baseFieldResultMap = new Map(baseFieldResults.map((result) => [result.entityId, result]));
      const baseFieldQuadMap = new Map(
        baseFieldResults.map((result) => [result.entityId, getResultQuad(result)]),
      );
      const finalFieldQuadMap = new Map(
        fields.map((field) => {
          const baseFieldQuad = baseFieldQuadMap.get(field.id)!;
          const transformedFieldQuad = applyFieldTransformToQuadUm(
            baseFieldQuad,
            fieldHalfW,
            fieldHalfH,
            perFieldTransformOverrides[field.id],
          );
          const finalFieldQuad = applyCornerOverlayToQuadUm(
            transformedFieldQuad,
            perFieldCornerOverlays[field.id],
          );
          return [field.id, finalFieldQuad] as const;
        }),
      );

      let results: DistortedPosition[];

      if (viewState.granularity === 'die') {
        results = dies.map((die, idx) => {
          const field = fieldMap.get(die.fieldId)!;
          const base = computeDieDistortion(die, field, waferDistortion, fieldDistortion, epeConfig, idx, dieHalfW, dieHalfH);
          const baseFieldQuad = baseFieldQuadMap.get(die.fieldId)!;
          const finalFieldQuad = finalFieldQuadMap.get(die.fieldId)!;
          return applyFieldEditToDieResult(
            base,
            die,
            baseFieldQuad,
            finalFieldQuad,
            dieHalfW,
            dieHalfH,
            fieldHalfW,
            fieldHalfH,
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
      const overlayKeys = Object.keys(perEntityOverlays);
      if (overlayKeys.length > 0) {
        results = results.map((r) => applyOverlayToResult(r, perEntityOverlays[r.entityId]));
      }

      set((s) => { s.distortionResults = results; });
    },
  }))
);

export { ZERO_OVERLAY };
