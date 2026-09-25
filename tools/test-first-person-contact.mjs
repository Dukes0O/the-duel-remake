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
  requested:options.requested || {clip:'idle',progress:.25},
  actual:options.actual || options.requested || {clip:'idle',progress:.25},
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
  let stamp = 0;
  const frame = (clip, progress, tool, entries) => {
    const requested = {clip,progress}, sampleStamp = ++stamp;
    return {sampleStamp,requested,actual:{...requested},
      geometryHash:'legitimate-held-pose',contacts:entries.map(([handSide,region]) => ({
        tool,hand:handSide,region,measurement:sample(.11,{sampleStamp,requested}),
      }))};
  };
  const good = [];
  const rightRpg = [['R','palm'],['R','index'],['R','thumb']];
  for (const [clip, progress] of [['idle',.25],['aim',.25],['fire',.1]]) {
    good.push(frame(clip,progress,'rpg',[...rightRpg,['L','support']]));
  }
  for (const progress of [.18,.48,.76,.90,1]) {
    const contacts = [...rightRpg];
    if (progress === .48 || progress === .76)
      contacts.push(['L','rocket-guide']);
    if (progress >= .90) contacts.push(['L','support']);
    good.push(frame('reload',progress,'rpg',contacts));
  }
  good.push(frame('wrench-idle',.25,'wrench',[['R','palm'],['R','thumb']]));
  for (const progress of [.25,.5,.75,1])
    good.push(frame('repair',progress,'wrench',[['R','palm'],['R','thumb']]));
  const accepted = assessContactSequence({frames:good});
  assert.equal(accepted.passed, true, JSON.stringify(accepted.failures));
  const stale = good.map(row => ({...row}));
  stale[3].sampleStamp = stale[2].sampleStamp;
  assert.equal(assessContactSequence({frames:stale}).passed, false,
    'reused frame stamp cannot prove ordered continuous motion');
  const badGap = good.map(row => ({...row}));
  badGap[1] = {...badGap[1],contacts:badGap[1].contacts.map(contact =>
    contact.hand === 'R' && contact.region === 'palm' ? {...contact,
      measurement:sample(.125,{requested:badGap[1].requested,
        sampleStamp:badGap[1].sampleStamp})} : contact)};
  assert.equal(assessContactSequence({frames:badGap}).passed, false,
    'a 25 mm right grip miss must be detected');
  const wrongPhase = good.map(row => ({...row}));
  wrongPhase[2] = {...wrongPhase[2],actual:{clip:'idle',progress:.25}};
  assert.equal(assessContactSequence({frames:wrongPhase}).passed, false,
    'actual production clip must match the requested phase');
  const missingSupport = good.map(row => row.requested.clip === 'aim' ? {...row,
    contacts:row.contacts.filter(contact => contact.hand !== 'L')} : row);
  assert.equal(assessContactSequence({frames:missingSupport}).passed, false,
    'an otherwise good sequence cannot omit an entire required support pose');
  const openTarget = good.map(row => ({...row}));
  openTarget[0] = {...openTarget[0],contacts:openTarget[0].contacts.map((contact,index) =>
    index ? contact : {...contact,measurement:sample(.11,{
      open:true,requested:openTarget[0].requested,sampleStamp:openTarget[0].sampleStamp})})};
  assert.equal(assessContactSequence({frames:openTarget}).passed, false,
    'an unsupported open handle cannot satisfy a required grip');
  const embedded = good.map(row => ({...row}));
  embedded[0] = {...embedded[0],contacts:embedded[0].contacts.map((contact,index) =>
    index ? contact : {...contact,measurement:sample(.05,{
      requested:embedded[0].requested,sampleStamp:embedded[0].sampleStamp})})};
  assert.equal(assessContactSequence({frames:embedded}).passed, false,
    'a hand more than 5 mm inside the handle is not a valid grip');
});
