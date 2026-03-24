import { FIELD_EDIT_TRANSFORM_LIMITS } from '../../utils/fieldEditGeometry';

export { FIELD_EDIT_TRANSFORM_LIMITS };

export const WAFER_DISTORTION_LIMITS = {
  Tx: [-2000, 2000] as [number, number],
  Ty: [-2000, 2000] as [number, number],
  theta: [-400, 400] as [number, number],
  M: [-300, 300] as [number, number],
  Sx: [-300, 300] as [number, number],
  Sy: [-300, 300] as [number, number],
};

export const FIELD_DISTORTION_LIMITS = {
  FTx: [-1000, 1000] as [number, number],
  FTy: [-1000, 1000] as [number, number],
  Ftheta: [-300, 300] as [number, number],
  FM: [-200, 200] as [number, number],
  FSx: [-200, 200] as [number, number],
  FSy: [-200, 200] as [number, number],
};

export const AGENT_SCENE_LIMITS = {
  wafer: WAFER_DISTORTION_LIMITS,
  field: FIELD_DISTORTION_LIMITS,
  fieldEdit: FIELD_EDIT_TRANSFORM_LIMITS,
  cornerOverlayNm: [-1500, 1500] as [number, number],
  arrowScaleFactor: [1000, 100000] as [number, number],
  colorMaxNm: [1, 1000] as [number, number],
};
