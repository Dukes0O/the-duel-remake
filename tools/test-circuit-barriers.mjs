import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { App } from '../src/app.js';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { DEFAULT_DRIVER } from '../src/drivers.js';
import { KIT_FOOTPRINTS } from '../src/kit-footprints.js';
import { TREMBLANT_WOODS } from '../src/circuits/tremblant-woods.js';
import { HARBOUR_LIGHTS } from '../src/circuits/harbour-lights.js';
import { PANORAMA_RIDGE } from '../src/circuits/panorama-ridge.js';
import {buildKitPlacements} from '../src/circuit-kit-layout.js';

// A barrier you can see is a barrier you hit. Found on Tremblant Woods: the
// armco, tyre walls and catch fence were drawn but had no collision, so a car
// drove through them. A circuit marks such a kit piece `solid: true`
// (src/track-script-course.js) and the piece becomes a box the size of the piece.
const manifest = JSON.parse(readFileSync(new URL('../public/assets/models/circuits/kits/manifest.json', import.meta.url), 'utf8'));
const koganeModels = [...JSON.parse(readFileSync(new URL('./blender/kogane/scenery.json', import.meta.url), 'utf8')).models,
  ...JSON.parse(readFileSync(new URL('./blender/eifel/scenery.json', import.meta.url), 'utf8')).models];
const course = new Course(TREMBLANT_WOODS, 1989), placements = TREMBLANT_WOODS.kitPlacements;
const BARRIERS = ['armco', 'tyre-wall', 'catch-fence'];
const half = s => course.roadHalfWidthAt(s);
const depthOf = piece => KIT_FOOTPRINTS[piece.id].depth * (Array.isArray(piece.scale) ? piece.scale[2] : piece.scale ?? 1);

test('the footprints are the sizes in the kit manifest', () => {
  for (const [id, foot] of Object.entries(KIT_FOOTPRINTS)) {
    const piece = manifest.pieces.find(item => item.id === id) ??
      koganeModels.find(item => item.id === id)?.files[0];
    // Kogane's and Eifel's measured recipe tables are the source for their new barrier sizes;
    // the original P4 manifest and its exact donor set remain unchanged.
    assert.ok(piece, `${id} has measured asset metadata`);
    for (const [i, key] of ['width', 'height', 'depth'].entries()) assert.ok(Math.abs(piece.size[i] - foot[key]) < .02, `${id} ${key}`);
  }
});

test('every barrier, post, wall, garage, stand and lift tower of Tremblant Woods is a solid box where it is drawn', () => {
  const solid = placements.filter(piece => piece.solid), boxes = course.features.kitSolids;
  assert.equal(boxes.length, solid.length);
  assert.ok(solid.length > 250);
  // The solid ones are exactly the pieces a car can reach: the trees, the lodge, the dock, boards and cables are not.
  const reachable = new Set(['armco', 'tyre-wall', 'catch-fence', 'pit-wall', 'pit-garage', 'grandstand', 'marshal-post', 'chairlift-tower']);
  for (const piece of placements) assert.equal(piece.solid === true, reachable.has(piece.id), `${piece.id} at s ${piece.s.toFixed(0)}`);
  assert.ok(boxes.every(box => course.features.obstacles.includes(box)), 'cars query them like any obstacle');
  assert.ok(!boxes.some(box => course.features.walls.includes(box)), 'they are not script walls, so nothing draws a concrete wall over the kit piece');
  // The face toward the road is the drawn face: the same distance from the road edge, within 5 cm.
  let checked = 0;
  solid.forEach((piece, i) => {
    const box = boxes[i];
    if (KIT_FOOTPRINTS[piece.id].depth > 1) return;
    const centre = course.nearest(box.x, box.z), road = course.at(centre.s).heading;
    // The thin side of the box runs across the road: its extent there, from the box's own axes.
    const across = Math.abs(Math.sin(box.heading) * Math.cos(road) - Math.cos(box.heading) * Math.sin(road));
    const extent = box.halfX * Math.abs(Math.cos(box.heading) * Math.cos(road) + Math.sin(box.heading) * Math.sin(road)) + box.halfZ * across;
    const face = centre.distance - extent - half(centre.s), drawn = Math.abs(piece.lateral) - half(piece.s) - depthOf(piece) / 2;
    assert.ok(Math.abs(face - drawn) < .05, `${piece.id} at s ${piece.s.toFixed(0)}: box face ${face.toFixed(2)} m from the edge, drawn face ${drawn.toFixed(2)} m`);
    assert.ok(face > 1.5, `${piece.id} at s ${piece.s.toFixed(0)} keeps off the road`);
    checked++;
  });
  assert.ok(checked > 200);
});

test('the planted trees stand exactly where they did before the barriers became solid', () => {
  const without = new Course({ ...TREMBLANT_WOODS, kitPlacements: placements.map(({ solid, ...piece }) => piece) }, 1989);
  assert.equal(without.features.kitSolids.length, 0);
  assert.deepEqual(course.features.trees.map(tree => [tree.id, tree.x, tree.z]), without.features.trees.map(tree => [tree.id, tree.x, tree.z]));
  assert.deepEqual(course.features.walls, without.features.walls);
  assert.equal(course.features.obstacles.length, without.features.obstacles.length + course.features.kitSolids.length);
});

// ---- driving into the barrier ----------------------------------------------

const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
function startDuel() {
  const app = new App();
  app._refreshPlayer(); app.seed = 1989;
  app.duel.startCampaign({ mode: 'duel', car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium', driverId: DEFAULT_DRIVER,
    startStage: COURSE.findIndex(item => item.id === 'tremblant-woods'), seed: 1989, opponentCount: 0, playerId: app.player.id, upgrades: {} });
  for (let frames = 0; app.duel.state.status !== 'racing' && frames < 2000; frames++) app.advance(1 / 60, 1 / 60);
  assert.equal(app.duel.state.status, 'racing');
  return app.duel;
}

// Puts the car on the road at `s`, three metres in from the edge on the barrier's side, aimed at the barrier,
// foot down, and drives it for four seconds. Returns how far past the road edge its centre ever gets.
function driveInto(duel, s, side, mph) {
  const state = duel.state;
  Object.assign(state, { s, lateral: side * (half(s) - 3), headingError: side * .3, speedMph: mph, airborne: false, airHeight: 0, _jumpY: null, _verticalSpeed: 0 });
  state.prevS = state.s; state.prevLateral = state.lateral;
  duel._terrainPose();
  duel.setInput({ throttle: 1, brake: 0, steer: 0, boost: false });
  let farthest = -Infinity;
  for (let frame = 0; frame < 240; frame++) {
    duel.step(1 / 60);
    farthest = Math.max(farthest, side * state.lateral - half(state.s));
    // The marshals put the car back on the road after a crash; the first hit is what counts.
    if (state.impactTimer > 0) break;
  }
  return farthest;
}

// The distance from the road edge to the face of the nearest drawn barrier on that side.
function faceGap(s, side) {
  const piece = placements.filter(item => BARRIERS.includes(item.id) && Math.sign(item.lateral) === side)
    .reduce((best, item) => Math.abs(item.s - s) < Math.abs(best.s - s) ? item : best);
  return { id: piece.id, gap: Math.abs(piece.lateral) - half(piece.s) - depthOf(piece) / 2 };
}

const named = (name, nth = 0) => course.script.pieces.filter(item => item.name === name)[nth];
const middle = (piece, share = .5) => piece.s0 + (piece.s1 - piece.s0) * share;
const fenceSide = (s0, s1) => Math.sign(placements.find(item => item.id === 'catch-fence' && item.s > s0 && item.s < s1).lateral);
const CASES = [
  // The corner in Kyle's picture: the straight into Beaver Hairpin, tyre wall on the outside.
  ['Beaver Hairpin, tyre wall', middle(named('Beaver Hairpin'), .4), -named('Beaver Hairpin').dir],
  ['Ridge Corner, tyre wall', middle(named('Ridge Corner')), -named('Ridge Corner').dir],
  ['Pine Drop, armco', middle(named('Pine Drop')), -named('Pine Drop').dir],
  ['Lakeside Plunge, armco', middle(named('Lakeside Plunge')), -named('Lakeside Plunge').dir],
  ['Lodge Bend, armco', middle(named('Lodge Bend')), -named('Lodge Bend').dir],
  ['Final Turn, armco', middle(named('Final Turn')), -named('Final Turn').dir],
  // The catch fence between the spur and Timber Straight faces each road across the divide.
  ['The Spur, catch fence', 1770, fenceSide(1700, 1809)],
  ['Timber Straight, catch fence', named('Timber Straight').s0 + 60, fenceSide(named('Timber Straight').s0, named('Timber Straight').s0 + 140)],
];

for (const mph of [70, 110]) {
  test(`a car driven at the barriers at ${mph} mph stops against them`, () => {
    for (const [name, s, side] of CASES) {
      // A new race for each, so one crash does not carry into the next.
      const { gap, id } = faceGap(s, side), farthest = driveInto(startDuel(), s, side, mph);
      assert.ok(farthest > 0, `${name}: the car did reach the edge`);
      // The car's centre cannot pass the face; its own half width (1 m) keeps it at least that far short.
      assert.ok(farthest <= gap - .5, `${name}: the car got ${farthest.toFixed(1)} m past the road edge; the ${id} face stands ${gap.toFixed(1)} m out`);
    }
  });
}

// ---- the other circuits ------------------------------------------------------

test('Harbour Lights: every kit barrier stands at one of the circuit walls, and Panorama Ridge uses its actual pit kit divider', () => {
  const harbour = new Course(HARBOUR_LIGHTS, 1989), boxes = harbour.features.obstacles.filter(item => item.barrier);
  const reach = (x, z) => boxes.reduce((best, box) => {
    const dx = x - box.x, dz = z - box.z, c = Math.cos(box.heading), s = Math.sin(box.heading);
    return Math.min(best, Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - box.halfX), Math.max(0, Math.abs(dx * s + dz * c) - box.halfZ)));
  }, Infinity);
  let worst = 0;
  for (const piece of HARBOUR_LIGHTS.kitPlacements.filter(item => ['concrete-wall', 'catch-fence', 'tyre-wall'].includes(item.id))) {
    const at = piece.worldPosition ?? harbour.groundAt(piece.s, piece.lateral);
    worst = Math.max(worst, reach(at.x, at.z));
  }
  // The pieces beside the run-off roads are cut to their own lengths and stand within a metre and a half of a wall box.
  assert.ok(worst < 1.5, `a barrier piece stands ${worst.toFixed(2)} m from the nearest solid wall`);
  assert.equal(harbour.features.kitSolids.length, 0, 'it marks no piece solid: its walls are the script walls');
  const panorama = new Course(PANORAMA_RIDGE, 1989);
  const pitPieces = PANORAMA_RIDGE.kitPlacements.filter(piece => piece.id === 'pit-wall');
  assert.ok(pitPieces.length > 0 && pitPieces.every(piece => piece.solid === true));
  // Claude 12 October: the Hell Gate concrete wall is the one other solid run.
  const hellPieces = PANORAMA_RIDGE.kitPlacements.filter(piece => piece.id === 'concrete-wall');
  assert.ok(hellPieces.length > 0 && hellPieces.every(piece => piece.solid === true));
  assert.ok(PANORAMA_RIDGE.kitPlacements.filter(piece => !['pit-wall', 'concrete-wall'].includes(piece.id)).every(piece => piece.solid !== true),
    'only the approved Panorama pit divider and Hell Gate wall become kit solids');
  assert.equal(panorama.features.kitSolids.length, pitPieces.length + hellPieces.length);
  assert.ok(panorama.features.kitSolids.every(box => box.id.endsWith('-pit-wall') || box.id.endsWith('-concrete-wall')));
  assert.equal(panorama.features.walls.filter(wall => wall.pitWall).length, 0);
});


test('Harbour escape linings carry actual world positions and keep physical walls unchanged when disabled', () => {
  const harbour = new Course(HARBOUR_LIGHTS, 1989);
  const pins = HARBOUR_LIGHTS.kitPlacements.filter(row => row.worldPosition);
  assert.ok(pins.length > 0, 'both escape roads retain actual world-coordinate rows');
  assert.ok(pins.every(row => ['concrete-wall', 'catch-fence', 'tyre-wall'].includes(row.id)));
  for (const escape of harbour.escapeRoads) {
    assert.ok(pins.some(row => {
      const dx = row.worldPosition.x - escape.origin.x, dz = row.worldPosition.z - escape.origin.z;
      const u = dx * escape.forward.x + dz * escape.forward.z;
      return u > 0 && u < escape.run;
    }), 'the authored escape has pinned linings');
  }
  const old = new Course({...HARBOUR_LIGHTS, completeTerrainRibbon: false}, 1989);
  assert.deepEqual(harbour.features.walls, old.features.walls, 'drawing corrections do not move a physical wall');
});


test('wall layout options preserve exact old defaults and reject unknown escape turns', () => {
  const walls = {wall: 'concrete-wall', fence: 'catch-fence', tyres: 'tyre-wall', openToWater: true};
  assert.deepEqual(buildKitPlacements(HARBOUR_LIGHTS, {walls: {...walls, alignEscapeTurns: []}}),
    buildKitPlacements(HARBOUR_LIGHTS, {walls}), 'absent and empty options have the exact old output');
  for (const alignEscapeTurns of [true, ['Not an escape'], ['Lantern Hairpin', 'Lantern Hairpin']])
    assert.throws(() => buildKitPlacements(HARBOUR_LIGHTS, {walls: {...walls, alignEscapeTurns}}), /existing escape turns/);
});
