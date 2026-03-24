import { computeFieldDistortion, interpolateDieResultsFromField } from '../../utils/distortionMath.ts';
import {
  applyCornerOverlayToQuadUm,
  applyFieldEditToFieldResult,
  applyFieldTransformToQuadUm,
  buildDistortedCornersFromOffsets,
} from './fieldEditEngine.ts';
import type {
  CornerOverlay,
  DistortedPosition,
  FieldCell,
  OverlayRecord,
  WaferSceneSnapshot,
} from './model.ts';

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

export function buildImportedDistortionResults(data: OverlayRecord[]): DistortedPosition[] {
  return data.map((r, i) => ({
    entityId: `imported_${i}`,
    designPos: { x: r.x, y: r.y },
    distortedPos: { x: r.x + r.dx * 1e-3, y: r.y + r.dy * 1e-3 },
    dx: r.dx,
    dy: r.dy,
    magnitude: Math.sqrt(r.dx * r.dx + r.dy * r.dy),
  }));
}

export function recomputeDistortionResults(input: Pick<
  WaferSceneSnapshot,
  | 'layoutConfig'
  | 'waferDistortion'
  | 'fieldDistortion'
  | 'epeConfig'
  | 'viewState'
  | 'importedData'
  | 'perCornerOverlays'
  | 'perFieldTransformOverrides'
  | 'perFieldCornerOverlays'
> & { fields: FieldCell[] }): DistortedPosition[] {
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
  } = input;

  if (viewState.dataSource === 'imported' && importedData) {
    return buildImportedDistortionResults(importedData);
  }

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
      const cornerAdjustedFieldQuad = applyCornerOverlayToQuadUm(
        baseFieldQuad,
        perFieldCornerOverlays[result.entityId],
      );
      const finalFieldQuad = applyFieldTransformToQuadUm(
        cornerAdjustedFieldQuad,
        fieldHalfW,
        fieldHalfH,
        perFieldTransformOverrides[result.entityId],
        baseFieldQuad,
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

  if (Object.keys(perCornerOverlays).length > 0) {
    results = results.map((r) => applyOverlayToResult(r, perCornerOverlays[r.entityId]));
  }

  return results;
}
