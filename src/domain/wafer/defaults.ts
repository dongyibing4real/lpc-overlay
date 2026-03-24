import type {
  CornerOverlay,
  EPEConfig,
  FieldDistortionParams,
  FieldTransformOverride,
  ViewState,
  WaferDistortionParams,
  WaferLayoutConfig,
} from './model.ts';

export const DEFAULT_LAYOUT: WaferLayoutConfig = {
  waferDiameterMm: 300,
  edgeExclusionMm: 3,
  fieldWidthMm: 26,
  fieldHeightMm: 33,
  diesPerFieldX: 4,
  diesPerFieldY: 5,
  fieldOffsetX: 0,
  fieldOffsetY: 0,
};

export const DEFAULT_WAFER: WaferDistortionParams = {
  Tx: 0, Ty: 0, theta: 0, M: 0, Sx: 0, Sy: 0,
};

export const DEFAULT_FIELD: FieldDistortionParams = {
  FTx: 0, FTy: 0, Ftheta: 0, FM: 0, FSx: 0, FSy: 0,
};

export const DEFAULT_EPE: EPEConfig = {
  mode: 'none', magnitude: 0, systematicAngle: 0, seed: 42,
};

export const DEFAULT_VIEW: ViewState = {
  granularity: 'die',
  dataSource: 'parameters',
  arrowScaleFactor: 10000,
  showDisplacementVectors: true,
  showFieldBoundaries: true,
  showDieBoundaries: true,
  colorMapRange: [0, 1000],
};

export const ZERO_OVERLAY: CornerOverlay = {
  cornerDx: [0, 0, 0, 0],
  cornerDy: [0, 0, 0, 0],
};

export const ZERO_FIELD_TRANSFORM: FieldTransformOverride = {
  Tx: 0,
  Ty: 0,
  theta: 0,
  M: 0,
  Sx: 0,
  Sy: 0,
};

export const SHOWCASE_WAFER: WaferDistortionParams = {
  Tx: 110,
  Ty: -90,
  theta: 1.4,
  M: 1.8,
  Sx: -1.2,
  Sy: 1.5,
};

export const SHOWCASE_FIELD: FieldDistortionParams = {
  FTx: -42,
  FTy: 36,
  Ftheta: -0.8,
  FM: 0.9,
  FSx: 1.2,
  FSy: -0.7,
};

export const SHOWCASE_EPE: EPEConfig = {
  mode: 'systematic',
  magnitude: 18,
  systematicAngle: 28,
  seed: 42,
};

export const SHOWCASE_VIEW: Partial<ViewState> = {
  granularity: 'die',
  dataSource: 'parameters',
  arrowScaleFactor: 52000,
  showDisplacementVectors: true,
  showFieldBoundaries: true,
  showDieBoundaries: true,
  colorMapRange: [0, 320],
};
