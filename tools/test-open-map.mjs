// OPEN-MAP uses the shared worlds and its own position provider. Everything here stays in memory.
import assert from 'node:assert/strict';
import {groundPart} from '../src/world/open/parts/ground.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {squareAt, GROUND_SQUARE, GROUND_ROWS, GROUND_COLUMNS} from '../src/world/open/open-record.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {openMapMarks} from '../src/world/open/map-marks.js';
import {LAND} from '../src/world/scablands-names.js';
import {createLandPicture, landMarks} from '../src/world/scablands-picture.js';
import {drawSmallMap, drawBigMap, createKnowledge, smallView, wholeView, toScreen} from '../src/world/scablands-map.js';

const points = [0, 500, 1000].map(east => LAND.at('yard', east, 0));
const squares = points.map(p => squareAt(p.x, p.z));
let open = beginOpenLand({id: 'open-map', steps: [{kind: 'roam'}], open: {world: sampleWorld('first-night')}});
function tick(carPosition, onFoot, expectedChoices) {
  const view = {carPosition, onFoot};
  const choice = groundPart.step(open.parts.ground ?? {}, {view, world: open.world});
  assert.equal(choice?.choices?.length ?? 0, expectedChoices);
  const result = stepOpenLand(open, view, 1 / 60, [groundPart]);
  assert.equal(result.changes.length, expectedChoices);
  open = result.open;
}
for (const p of points) tick(p, true, 0);
assert.deepEqual(open.world.open.driven, []);
for (const p of points) {
  tick(p, false, 1);
  tick(p, false, 0);
}
tick(points[0], false, 0);
tick(LAND.at('yard', 7000), false, 0);
assert.deepEqual(open.world.open.driven, squares);

const positions = {
  glasshouse: LAND.at('ridge', 400, 500),
  'radio-hill': LAND.at('dry-dam', -750, 600),
  hangar: LAND.at('yard', 900, 600),
};
const helped = sampleWorld('helped-camp'), burned = sampleWorld('after-the-smoke');
const positionOf = (id, seed) => {
  assert.equal(seed, helped.open.landSeed);
  return positions[id];
};
assert.deepEqual(openMapMarks(helped, positionOf).sites, [{id: 'glasshouse', name: 'The Glasshouse', ...positions.glasshouse}]);
assert.equal(openMapMarks(burned, positionOf).sites[0].name, 'The Glasshouse (burned)');
const told = applyEffects(burned, {id: 'map/heard', effects: [{type: 'rumour', site: 'glasshouse'},
  {type: 'rumour', site: 'radio-hill'}, {type: 'ground', square: squares[0]}]}).world;
const marks = openMapMarks(told, positionOf);
assert.deepEqual(marks.driven, [squares[0]]);
assert.deepEqual(marks.rumours.map(item => item.id), ['radio-hill']);
const [circle] = marks.rumours;
assert.equal(circle.radius, 300);
const offset = Math.hypot(circle.x - positions['radio-hill'].x, circle.z - positions['radio-hill'].z);
assert.ok(offset > 0 && offset <= 200 && offset < circle.radius);
assert.deepEqual(openMapMarks(structuredClone(told), positionOf), marks);
const found = applyEffects(told, {id: 'map/found', effects: [{type: 'find', site: 'radio-hill'}, {type: 'find', site: 'hangar'}]}).world;
assert.deepEqual(openMapMarks(found, positionOf).rumours, []);
assert.deepEqual(openMapMarks(found, positionOf).sites.map(site => site.name), ['The Glasshouse (burned)', 'Radio Hill', 'The Hangar']);

// Read what each canvas draws, including the bounds and order of the translucent wash.
const base = landMarks(), picture = createLandPicture({marks: base});
assert.equal(landMarks({base}), base);
assert.deepEqual(landMarks({base, world: found, positionOf}).places.slice(0, base.places.length), base.places);
const dimensions = {width: 1400, height: 1000};
const frame = {picture, positionOf, canvas: {}, car: positions['radio-hill'], knowledge: createKnowledge()};
function draw(map, overrides = {}) {
  const calls = [];
  const ctx = new Proxy({measureText: text => ({width: text.length * 7})}, {
    get(target, key) {
      return target[key] ?? ((...args) => calls.push([key, ...args]));
    },
  });
  map(ctx, {...frame, ...overrides}, map === drawBigMap ? dimensions : undefined);
  return calls;
}
for (const map of [drawSmallMap, drawBigMap]) {
  const ordinary = draw(map);
  assert.deepEqual(draw(map, {worldJob: {job: {steps: []}}}), ordinary);
  assert.ok(!ordinary.some(call => call.includes(circle.name) || call.includes('The Glasshouse (burned)')));
  const drawn = draw(map, {worldJob: {open: {world: told}}});
  assert.ok(drawn.some(([op, name]) => op === 'fillText' && name === circle.name));
  const view = map === drawBigMap ? wholeView(picture, dimensions) : smallView(frame.car);
  const at = toScreen(view, circle.x, circle.z);
  assert.ok(drawn.some(([op, x, y, radius]) => op === 'arc' && x === at.x && y === at.y && radius === 300 * view.scale));
  const site = draw(map, {car: positions.glasshouse, worldJob: {open: {world: told}}});
  assert.ok(site.some(([op, name]) => op === 'fillText' && name === 'The Glasshouse (burned)'));
  const size = GROUND_SQUARE * view.scale;
  const pale = drawn.filter(([op,,, w, h]) => op === 'rect' && w === size && h === size);
  if (map === drawSmallMap) assert.deepEqual(pale, []);
  else {
    assert.equal(pale.length, GROUND_COLUMNS * GROUND_ROWS - 1);
    const known = toScreen(view, points[0].x, points[0].z);
    assert.ok(!pale.some(([,x,y]) => x === known.x && y === known.y));
    assert.ok(drawn.findIndex(([op]) => op === 'drawImage') < drawn.indexOf(pale[0]));
  }
}
console.log('open-map: ground choices, seeded rumours, found sites and both map canvases passed');
