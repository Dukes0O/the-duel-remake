import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {RouteMap, buildRouteMapGeometry, projectRoutePoint} from '../src/route-map.js';
import {CoursePreview, buildCoursePreview} from '../src/course-preview.js';
import {disposeTree} from '../src/world.js';

let hints;
try { hints = await import('../src/hidden-road-hints.js'); } catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  hints = {};
}
let checks = 0;
const failures = [];
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
const snapshot = (changes = {}) => Object.freeze({playerId: 'driver-a', enabled: true,
  discoveredGate: false, pacificFinishes: 0, ...changes});
const course = new Course(COURSE[0], 1989, {hiddenRoad: true});
const ordinary = new Course(COURSE[0], 1989);
const hidden = snapshot(), found = snapshot({discoveredGate: true});
function api(name) {assert.equal(typeof hints[name], 'function', `${name} exists`); return hints[name];}

check('five/ten completion thresholds and discovery suppress hints without revealing early menu/path', () => {
  const select = api('hiddenRoadHints');
  for (const count of [0, 4, 5, 9, 10]) {
    const input = snapshot({pacificFinishes: count}), before = structuredClone(input), view = select(input);
    assert.equal(view.showMenu, false); assert.equal(view.showPath, false);
    assert.equal(typeof view.garageTip === 'string' && view.garageTip.length > 0, count >= 5);
    if (count >= 5) assert.match(view.garageTip, /dry wash/i);
    assert.equal(view.dustDevil, count >= 10); assert.deepEqual(input, before);
  }
  const discovered = select(snapshot({discoveredGate: true, pacificFinishes: 10}));
  assert.equal(discovered.showMenu, true); assert.equal(discovered.showPath, true);
  assert.equal(discovered.garageTip, null); assert.equal(discovered.dustDevil, false);
});
check('flags, malformed counters, missing identity and future player changes cannot leak hints', () => {
  const select = api('hiddenRoadHints'), key = api('hiddenRoadMapKey');
  for (const input of [null, snapshot({enabled: false, discoveredGate: true}), snapshot({playerId: ''}),
    snapshot({pacificFinishes: '10'}), snapshot({pacificFinishes: NaN})]) {
    const view = select(input);
    assert.equal(view.showMenu, false); assert.equal(view.showPath, false);
    assert.equal(view.garageTip, null); assert.equal(view.dustDevil, false);
  }
  assert.notEqual(key(found), key(hidden));
  assert.notEqual(key(found), key(snapshot({playerId: 'driver-b', discoveredGate: true})));
  assert.notEqual(key(found), key(snapshot({enabled: false, discoveredGate: true})));
  assert.equal(key(found), key({...found}));
});
check('revealed map follows real spur; undiscovered and flag-off geometry retain original controls', () => {
  const base = buildRouteMapGeometry(course);
  assert.deepEqual(buildRouteMapGeometry(course, 400, 280, 28, {discovery: hidden}), base);
  assert.deepEqual(buildRouteMapGeometry(course, 400, 280, 28, {discovery: snapshot({enabled: false, discoveredGate: true})}), base);
  const shown = buildRouteMapGeometry(course, 400, 280, 28, {discovery: found});
  assert.ok(shown.hiddenRoad?.points?.length >= 4, 'discovery adds a distinct spur path');
  const gate = projectRoutePoint(shown, course.hiddenRoad.poseAt(course.hiddenRoad.length));
  assert.ok(Math.hypot(shown.hiddenRoad.gate.x - gate.x, shown.hiddenRoad.gate.y - gate.y) < .001);
  const points = shown.hiddenRoad.points;
  assert.ok(Math.hypot(points.at(-2) - gate.x, points.at(-1) - gate.y) < .001, 'dotted path reaches actual gate');
  assert.ok(points.every((value, index) => Number.isFinite(value) && value >= 0 && value <= (index % 2 ? shown.height : shown.width)));
  assert.deepEqual(buildRouteMapGeometry(ordinary, 400, 280, 28, {discovery: found}), buildRouteMapGeometry(ordinary));
  assert.ok(buildCoursePreview(course, 320, 200, found).map.hiddenRoad);
  assert.equal(buildCoursePreview(course, 320, 200, hidden).map.hiddenRoad, undefined);
});

globalThis.Path2D = class {moveTo() {} lineTo() {}};
const context = () => new Proxy({}, {get(target, key) {return key in target ? target[key] : () => {};},
  set(target, key, value) {target[key] = value; return true;}});
const ownerDocument = {createElement() {return {getContext: context};}};
const canvas = () => ({width: 400, height: 280, ownerDocument, dataset: {}, getContext: context,
  setAttribute(name, value) {this[name] = value;}});
check('live map cache switches named-player discovery immediately and reuses unchanged frames', () => {
  let discovery = found;
  const view = new RouteMap(canvas(), {getDiscovery: () => discovery});
  const state = {s: 20, lateral: 0, currentLap: 1};
  view.update(course, state, 0); assert.ok(view.current.hiddenRoad);
  const cached = view.current; view.update(course, state, 70); assert.equal(view.current, cached);
  discovery = snapshot({playerId: 'driver-b'});
  view.update(course, state, 71); assert.equal(view.current.hiddenRoad, undefined, 'identity change bypasses draw throttle');
  discovery = found; view.update(course, state, 72); assert.ok(view.current.hiddenRoad);
  view.dispose(); assert.equal(view.current, null);
});
check('preview cache cannot carry discovered path into another named player', () => {
  const view = new CoursePreview(canvas());
  assert.ok(view.update(course, 'Route A', found).map.hiddenRoad);
  const hiddenView = view.update(course, 'Route A', snapshot({playerId: 'driver-b'}));
  assert.equal(hiddenView.map.hiddenRoad, undefined);
  assert.equal(view.update(course, 'Route A', hidden).map.hiddenRoad, undefined);
  assert.ok(view.update(course, 'Route A', found).map.hiddenRoad);
  view.dispose(); assert.equal(view.current, null);
});
check('dust frame is bounded, finite, deterministic and independent of random generators', () => {
  const frame = api('dustDevilFrame'), original = Math.random;
  Math.random = () => {throw new Error('presentation must not consume random values');};
  try {
    const first = frame(2.5); frame(90);
    assert.deepEqual(frame(2.5), first, 'rewinding presentation time reconstructs the same swirl');
    assert.ok(Array.isArray(first) && first.length > 0 && first.length <= 64);
    for (const point of first) {
      for (const coordinate of ['x', 'y', 'z']) assert.ok(Number.isFinite(point[coordinate]));
      assert.ok(Math.hypot(point.x, point.z) <= 3 && point.y >= 0 && point.y <= 9, 'agreed entrance-local visual envelope');
    }
    assert.notDeepEqual(frame(3.5), first, 'visual time animates the hint');
  } finally {Math.random = original;}
});
check('dust lifecycle is race-only, owner-specific, pauses cleanly and never changes simulation data', () => {
  const create = api('createHiddenRoadHint'), group = create(course);
  const state = {status: 'racing', paused: false, playerId: 'driver-a',
    hiddenRoadDiscovery: snapshot({pacificFinishes: 10})};
  const before = structuredClone(state);
  group.userData.sync(state); group.userData.animate(1);
  assert.equal(group.visible, true);
  const points = []; group.traverse(node => {if (node.isPoints) points.push(node);});
  assert.equal(points.length, 1); assert.ok(points[0].geometry.attributes.position.count <= 64);
  assert.deepEqual(state, before);
  for (const change of [{paused: true}, {status: 'menu'}, {playerId: 'driver-b'},
    {hiddenRoadDiscovery: found}, {hiddenRoadDiscovery: hidden}]) {
    group.userData.sync({...state, ...change}); group.userData.animate(4);
    assert.equal(group.visible, false);
  }
  let disposed = 0; points[0].geometry.addEventListener('dispose', () => disposed++);
  disposeTree(group); assert.equal(disposed, 1);
  const absent = create(ordinary); assert.equal(absent.visible, false); disposeTree(absent);
});

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Hidden Road hints: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
