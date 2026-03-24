// Coordinate system:
// - Physical positions use micrometers (um) unless noted otherwise.
// - SVG canvas coordinates use pixels.

export interface Point {
  x: number; // um
  y: number; // um
}

export interface WaferLayoutConfig {
  waferDiameterMm: number;
  edgeExclusionMm: number;
  fieldWidthMm: number;
  fieldHeightMm: number;
  diesPerFieldX: number;
  diesPerFieldY: number;
  fieldOffsetX: number; // um phase offset
  fieldOffsetY: number;
}

export interface WaferDistortionParams {
  Tx: number; // nm
  Ty: number; // nm
  theta: number; // urad
  M: number; // ppm
  Sx: number; // ppm
  Sy: number; // ppm
}

export interface FieldDistortionParams {
  FTx: number; // nm
  FTy: number; // nm
  Ftheta: number; // urad
  FM: number; // ppm
  FSx: number; // ppm
  FSy: number; // ppm
}

export type EPEMode = 'none' | 'random' | 'systematic';

export interface EPEConfig {
  mode: EPEMode;
  magnitude: number; // nm amplitude
  systematicAngle: number; // degrees
  seed: number;
}

export interface FieldCell {
  id: string;
  col: number;
  row: number;
  centerDesign: Point;
  isActive: boolean;
}

export interface DistortedPosition {
  entityId: string;
  designPos: Point;
  distortedPos: Point;
  designCorners?: [Point, Point, Point, Point];
  distortedCorners?: [Point, Point, Point, Point];
  dx: number; // nm
  dy: number; // nm
  magnitude: number; // nm
  // Corner displacements use [TL, TR, BR, BL] in visual order.
  cornerDx?: [number, number, number, number];
  cornerDy?: [number, number, number, number];
  // Present on die-level results derived from fields.
  fieldId?: string;
  localPos?: Point;
}

export interface CornerOverlay {
  // Per-corner offsets in nm, added on top of parametric distortion.
  cornerDx: [number, number, number, number];
  cornerDy: [number, number, number, number];
}

export interface FieldTransformOverride {
  Tx: number; // nm
  Ty: number; // nm
  theta: number; // urad
  M: number; // ppm
  Sx: number; // ppm
  Sy: number; // ppm
}

export interface OverlayRecord {
  x: number; // um wafer X
  y: number; // um wafer Y
  dx: number; // nm overlay X
  dy: number; // nm overlay Y
}

export type GranularityMode = 'die' | 'field';
export type DataSource = 'parameters' | 'imported';

export interface ViewState {
  granularity: GranularityMode;
  dataSource: DataSource;
  arrowScaleFactor: number;
  showDisplacementVectors: boolean;
  showFieldBoundaries: boolean;
  showDieBoundaries: boolean;
  colorMapRange: [number, number];
}

export interface OverlayStats {
  meanDx: number;
  meanDy: number;
  stdDx: number;
  stdDy: number;
  maxMagnitude: number;
  p99Magnitude: number;
  count: number;
}

export interface WaferSceneSnapshot {
  layoutConfig: WaferLayoutConfig;
  waferDistortion: WaferDistortionParams;
  fieldDistortion: FieldDistortionParams;
  epeConfig: EPEConfig;
  viewState: ViewState;
  importedData: OverlayRecord[] | null;
  perCornerOverlays: Record<string, CornerOverlay>;
  selectedFieldId: string | null;
  perFieldTransformOverrides: Record<string, FieldTransformOverride>;
  perFieldCornerOverlays: Record<string, CornerOverlay>;
}
