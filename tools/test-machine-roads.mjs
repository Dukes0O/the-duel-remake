import assert from 'node:assert/strict';
import {createRoadWork, roadCell, roadCondition, workRoadCell} from '../src/machines/roads.js';

function buildRoad() {
  let work = createRoadWork();
  work.cells['0:0'] = {...roadCell(work, 0, 0), height:2};
  work.cells['0:1'] = {...roadCell(work, 0, 1), height:-1};
  work = workRoadCell(work, {kind:'dozer', x:0, z:0, bladeHeight:0}).work;
  assert.equal(work.bladeLoad, 2);
  work = workRoadCell(work, {kind:'dozer', x:0, z:1, bladeHeight:0}).work;
  assert.equal(work.bladeLoad, 1, 'Filling a ditch uses material from the blade.');
  work = workRoadCell(work, {kind:'paver', x:0, z:1, speedMps:2, edgeOffsetM:0.5}).work;
  assert.equal(roadCondition(roadCell(work, 0, 1)), 'soft');
  for (let i = 0; i < 3; i++) work = workRoadCell(work, {kind:'roller', x:0, z:1}).work;
  work = workRoadCell(work, {kind:'paver', x:0, z:1, speedMps:2, edgeOffsetM:0.5}).work;
  assert.equal(roadCondition(roadCell(work, 0, 1)), 'rough');
  work = workRoadCell(work, {kind:'paver', x:0, z:1, speedMps:0.5, edgeOffsetM:0}).work;
  assert.equal(roadCondition(roadCell(work, 0, 1)), 'good');
  return work;
}
assert.deepEqual(buildRoad(), buildRoad(), 'The same work produces the same road.');
assert.equal(roadCondition(roadCell(createRoadWork(), 0, 0)), 'unfinished');
console.log('Road work rules pass.');
