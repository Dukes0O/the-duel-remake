import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectBindContactPatch, measureContactFrame, assessContactSequence,
} from './first-person-contact.mjs';

// A closed 100 mm cube is an actual triangulated handle. Its upper face is
// z=.1, so a hand surface at .11 has a known 10 mm exterior gap.
const cube = () => {
  const v = [
    [-.05,-.05,0], [.05,-.05,0], [.05,.05,0], [-.05,.05,0],
    [-.05,-.05,.1], [.05,-.05,.1], [.05,.05,.1], [-.05,.05,.1],
  ];
  const indices = [
    [0,2,1],[0,3,2], [4,5,6],[4,6,7],
    [0,1,5],[0,5,4], [1,2,6],[1,6,5],
    [2,3,7],[2,7,6], [3,0,4],[3,4,7],
  ];
  return indices.map((face, id) => ({id, vertices:face.map(index => v[index])}));
};
const hand = z => Object.fromEntries([
  [-.025,-.02,z], [0,-.02,z], [.025,-.02,z],
  [-.025,.02,z], [0,.02,z], [.025,.02,z],
].map((point, id) => [id, point]));
const patch = {
  vertexIds:[0,1,2,3,4,5], handleTriangleIds:[2,3],
  bounds:{min:[-.025,-.02,.11],max:[.025,.02,.11]}, selectionHash:'fixed-bind-selection',
};
const sample = (z, options = {}) => measureContactFrame({
  patch, skinnedVertexPositions:hand(z), posedHandleTriangles:cube(),
  posedClosedHandleFaces:options.open ? cube().slice(1) : cube(),
  requested:{clip:'idle',progress:.25}, actual:options.actual || {clip:'idle',progress:.25},
  sampleStamp:options.sampleStamp ?? 1, geometryHash:`hand-z-${z}`,
});

test('bind selection fixes connected contact-facing surface and tool triangle IDs', () => {
  const points = hand(.11);
  const regionVertices = Object.entries(points).map(([id,position]) => ({id:Number(id),position}));
  const regionFaces = [
    {id:0,vertexIds:[0,3,1]}, {id:1,vertexIds:[1,3,4]},
    {id:2,vertexIds:[1,4,2]}, {id:3,vertexIds:[2,4,5]},
  ];
  const chosen = selectBindContactPatch({regionVertices,regionFaces,
    handleTriangles:cube(),closedHandleFaces:cube(),minVertices:6});
  assert.deepEqual([...chosen.vertexIds].sort((a,b) => a-b), [0,1,2,3,4,5]);
  assert.ok(chosen.handleTriangleIds.length >= 1);
  assert.ok(chosen.handleTriangleIds.every(id => id === 2 || id === 3),
    'bind patch must target the upper surface, not an arbitrary remote handle face');
  assert.ok(chosen.selectionHash, 'bind selection identity must be recorded once');
});

test('closed triangulated handle distinguishes 10 mm grip, 25 mm miss, and deep penetration', () => {
  const near = sample(.11);
  assert.equal(near.closed, true);
  assert.ok(Math.abs(near.p90Gap - .01) < .001, `expected 10 mm, got ${near.p90Gap}`);
  assert.ok(near.maxPenetration <= .001);
  const missed = sample(.125);
  assert.ok(missed.p90Gap > .02, '25 mm gap must fail a 15 mm right-grip limit');
  const inside = sample(.05);
  assert.ok(inside.insideCount >= 6, 'all synthetic hand points are inside the closed handle');
  assert.ok(inside.maxPenetration > .005, 'deeply embedded fingers cannot count as contact');
  const open = sample(.11, {open:true});
  assert.equal(open.closed, false, 'open target has no valid inside/outside test');
  assert.ok(open.unsupported || open.maxPenetration == null,
    'an open target must be reported as unsupported, never a clean pass');
  assert.throws(() => sample(.11, {actual:{clip:'fire',progress:.25}}),
    /phase|clip|actual|requested/i, 'measurement cannot silently relabel the production pose');
});

test('ordered phase assessment rejects stale samples and bad contacts but permits held poses', () => {
  const item = (stamp, clip, progress, z, region='palm', tool='rpg', handSide='R') => ({
    tool, hand:handSide, region,
    requested:{clip,progress}, actual:{clip,progress}, sampleStamp:stamp,
    geometryHash:'legitimate-held-pose', measurement:sample(z, {sampleStamp:stamp}),
  });
  const good = [
    item(1,'idle',.25,.11), item(2,'aim',.25,.11), item(3,'fire',.10,.11),
    item(4,'reload',.18,.11), item(5,'reload',.48,.11),
    item(6,'reload',.76,.11), item(7,'reload',.90,.11),
    item(8,'reload',1,.11), item(9,'wrench-idle',.25,.11,'palm','wrench'),
    item(10,'repair',.5,.11,'palm','wrench'),
  ];
  const accepted = assessContactSequence({frames:good});
  assert.equal(accepted.passed, true, JSON.stringify(accepted.failures));
  const stale = good.map(row => ({...row}));
  stale[3].sampleStamp = stale[2].sampleStamp;
  assert.equal(assessContactSequence({frames:stale}).passed, false,
    'reused frame stamp cannot prove ordered continuous motion');
  const badGap = good.map(row => ({...row}));
  badGap[1] = {...badGap[1],measurement:sample(.125)};
  assert.equal(assessContactSequence({frames:badGap}).passed, false,
    'a 25 mm right grip miss must be detected');
  const wrongPhase = good.map(row => ({...row}));
  wrongPhase[2] = {...wrongPhase[2],actual:{clip:'idle',progress:.25}};
  assert.equal(assessContactSequence({frames:wrongPhase}).passed, false,
    'actual production clip must match the requested phase');
});
