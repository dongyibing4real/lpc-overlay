import assert from 'node:assert/strict';

import { DEFAULT_LAYOUT } from '../src/domain/wafer/defaults.ts';
import { recomputeDistortionResults } from '../src/domain/wafer/distortionEngine.ts';
import { mergeFieldTransformOverride } from '../src/domain/wafer/fieldEditEngine.ts';
import { createDefaultSceneSnapshot } from '../src/domain/wafer/sceneSnapshot.ts';
import { computeStats } from '../src/domain/wafer/stats.ts';
import { generateFieldGrid } from '../src/utils/waferGeometry.ts';

function run(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

run('createDefaultSceneSnapshot returns independent deep clones', () => {
  const first = createDefaultSceneSnapshot();
  const second = createDefaultSceneSnapshot();

  first.layoutConfig.fieldWidthMm = 40;
  first.viewState.colorMapRange[0] = 12;
  first.perCornerOverlays.example = {
    cornerDx: [1, 2, 3, 4],
    cornerDy: [5, 6, 7, 8],
  };

  assert.equal(second.layoutConfig.fieldWidthMm, DEFAULT_LAYOUT.fieldWidthMm);
  assert.deepEqual(second.viewState.colorMapRange, [0, 1000]);
  assert.deepEqual(second.perCornerOverlays, {});
});

run('mergeFieldTransformOverride drops zero-only transforms and keeps non-zero patches', () => {
  assert.equal(mergeFieldTransformOverride(undefined, {}), undefined);

  const merged = mergeFieldTransformOverride(undefined, { Tx: 125, Sy: -8 });
  assert.deepEqual(merged, {
    Tx: 125,
    Ty: 0,
    theta: 0,
    M: 0,
    Sx: 0,
    Sy: -8,
  });

  const cleared = mergeFieldTransformOverride(merged, { Tx: 0, Sy: 0 });
  assert.equal(cleared, undefined);
});

run('recomputeDistortionResults returns imported overlay records when imported data is active', () => {
  const snapshot = createDefaultSceneSnapshot();
  const fields = generateFieldGrid(snapshot.layoutConfig);

  snapshot.viewState.dataSource = 'imported';
  snapshot.importedData = [
    { x: 10, y: 20, dx: 30, dy: 40 },
    { x: -15, y: 5, dx: -25, dy: 10 },
  ];

  const results = recomputeDistortionResults({ ...snapshot, fields });

  assert.equal(results.length, 2);
  assert.equal(results[0].entityId, 'imported_0');
  assert.equal(results[0].distortedPos.x, 10.03);
  assert.equal(results[0].distortedPos.y, 20.04);
});

run('recomputeDistortionResults preserves expected result counts for field and die granularities', () => {
  const snapshot = createDefaultSceneSnapshot();
  const fields = generateFieldGrid(snapshot.layoutConfig);

  const fieldResults = recomputeDistortionResults({
    ...snapshot,
    fields,
    viewState: { ...snapshot.viewState, granularity: 'field' },
  });
  assert.equal(fieldResults.length, fields.length);
  assert.ok(fieldResults.every((result) => result.entityId.startsWith('f_')));
  assert.ok(fieldResults.every((result) => result.dx === 0 && result.dy === 0));

  const dieResults = recomputeDistortionResults({
    ...snapshot,
    fields,
    viewState: { ...snapshot.viewState, granularity: 'die' },
  });
  assert.equal(
    dieResults.length,
    fields.length * snapshot.layoutConfig.diesPerFieldX * snapshot.layoutConfig.diesPerFieldY,
  );
  assert.ok(dieResults.every((result) => result.fieldId));
});

run('computeStats summarizes overlay results', () => {
  const stats = computeStats([
    {
      entityId: 'a',
      designPos: { x: 0, y: 0 },
      distortedPos: { x: 0.001, y: 0.002 },
      dx: 1,
      dy: 2,
      magnitude: Math.sqrt(5),
    },
    {
      entityId: 'b',
      designPos: { x: 0, y: 0 },
      distortedPos: { x: 0.003, y: 0.004 },
      dx: 3,
      dy: 4,
      magnitude: 5,
    },
  ]);

  assert.ok(stats);
  assert.equal(stats?.count, 2);
  assert.equal(stats?.meanDx, 2);
  assert.equal(stats?.meanDy, 3);
  assert.equal(stats?.maxMagnitude, 5);
});
