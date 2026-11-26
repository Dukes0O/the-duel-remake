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
  const doc = {createElement(tag) {
    assert.equal(tag, 'canvas');
    const paint = {
      fillRect(...args) { calls.push(['wash', this.fillStyle, ...args]); },
      clearRect(...args) { calls.push(['clear', ...args]); },
    };
    return {getContext: () => paint};
  }};
  const ctx = new Proxy({canvas: {ownerDocument: doc}, imageSmoothingEnabled: true, imageSmoothingQuality: 'low',
    measureText: text => ({width: text.length * 7}),
    drawImage(...args) { calls.push(['drawImage', ...args, this.imageSmoothingEnabled, this.imageSmoothingQuality]); },
  }, {
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
  // The car stands clear of the site, just as in the laptop sheet.
  const car = {...positions.glasshouse, x: positions.glasshouse.x - 300};
  const site = draw(map, {car, worldJob: {open: {world: told}}});
  assert.ok(site.some(([op, name]) => op === 'fillText' && name === 'The Glasshouse (burned)'));
  function placeMark(calls, position, car) {
    const view = map === drawBigMap ? wholeView(picture, dimensions) : smallView(car);
    const at = toScreen(view, position.x, position.z);
    return calls.find(([op, x, y, w, h]) => op === 'rect' && w === h &&
      Math.abs(x + w / 2 - at.x) < 1e-6 && Math.abs(y + h / 2 - at.y) < 1e-6);
  }
  const yard = base.places[0];
  const yardMark = placeMark(draw(map, {car: yard}), yard, yard);
  const siteMark = placeMark(site, positions.glasshouse, car);
  assert.ok(siteMark && yardMark && siteMark[3] > 0 && siteMark[3] < yardMark[3], 'a smaller place mark at the found site');
  assert.equal(placeMark(draw(map, {car, worldJob: {open: {world: sampleWorld('nothing-found')}}}), positions.glasshouse, car), undefined);

  assert.equal(ordinary.filter(([op]) => op === 'drawImage').length, 1);
  const layers = drawn.filter(([op]) => op === 'drawImage');
  assert.equal(layers[0][1], frame.canvas);
  if (map === drawSmallMap) assert.equal(layers.length, 1);
  else {
    assert.equal(layers.length, 2);
    const [, mask, x, y, width, height, smooth, quality] = layers[1];
    const origin = toScreen(view, picture.x0, picture.z0);
    assert.deepEqual([x, y, width, height], [origin.x, origin.y, GROUND_COLUMNS * GROUND_SQUARE * view.scale, GROUND_ROWS * GROUND_SQUARE * view.scale]);
    assert.deepEqual([smooth, quality], [true, 'low']);
    const texels = mask.width / GROUND_COLUMNS;
    assert.equal(mask.height / GROUND_ROWS, texels);
    assert.ok(GROUND_SQUARE / texels >= 80 && GROUND_SQUARE / texels <= 125, 'the wash feathers over about 100 m');
    assert.deepEqual(drawn.filter(([op]) => op === 'wash'), [['wash', 'rgba(245, 232, 204, 0.44)', 0, 0, mask.width, mask.height]]);
    const hole = square => ['clear', (square % GROUND_COLUMNS) * texels, Math.floor(square / GROUND_COLUMNS) * texels, texels, texels];
    assert.deepEqual(drawn.filter(([op]) => op === 'clear'), [hole(squares[0])]);
    const strip = draw(map, {worldJob: {open}});
    assert.deepEqual(strip.filter(([op]) => op === 'clear'), squares.map(hole));
    assert.ok(drawn.indexOf(layers[1]) < drawn.findIndex(([op]) => op === 'stroke'), 'the wash sits under the ink');
  }
}
console.log('open-map: ground choices, seeded rumours, found sites and both map canvases passed');

// A site told of before its row has a place in this land is left off the map, and the map does not fail (merge of 25 November).
{
  const {openMapMarks: marksOf} = await import('../src/world/open/map-marks.js');
  const {sampleWorld: sample} = await import('../src/world/open/samples.js');
  const {applyEffects: apply} = await import('../src/world/open/open-effects.js');
  const told = apply(sample('helped-camp'), {id: 'test/rumours', effects: [{type: 'rumour', site: 'bus-ring'}]}).world;
  const marks = marksOf(told, id => (id === 'glasshouse' ? {x: 1, z: 2} : undefined));
  if (marks.rumours.length !== 0 || marks.sites.length !== 1) throw new Error('A site with no known place must be left off the map.');
}
