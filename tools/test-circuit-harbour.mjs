import assert from 'node:assert/strict';
import test from 'node:test';
import { Course } from '../src/course.js';
import { HARBOUR_LIGHTS } from '../src/circuits/harbour-lights.js';
import { GRAND_PRIX_COURSES, courseForGrandPrix, grandPrixCourse, FIELD } from '../src/race-field.js';
import { escapeFrame } from '../src/escape-roads.js';
import { buildTrackScript } from '../src/track-script.js';
import { racingLineFor, buildSpeedProfile } from '../src/race-lines.js';
import { racerSpec } from '../src/race-field.js';
import { DRIVE } from '../src/config.js';
import { PANORAMA_RIDGE } from '../src/circuits/panorama-ridge.js';

// Harbour Lights as a real Grand Prix circuit (docs/CIRCUITS.md 5.2): the run-off
// roads behind openings in the wall, night by default, the full field of eight.
const piece = (road, name) => road.pieces.find(item => item.name === name);
const course = new Course(HARBOUR_LIGHTS, 1989);

test('it is a Grand Prix circuit of four laps, at night all lap', () => {
  assert.ok(GRAND_PRIX_COURSES.includes('harbour-lights') && grandPrixCourse(HARBOUR_LIGHTS));
  const gp = courseForGrandPrix(HARBOUR_LIGHTS);
  assert.equal(gp.laps, 4);
  assert.equal(courseForGrandPrix({ id: 'pacific-canyon' }).laps, FIELD.laps, 'a circuit without its own length keeps three laps');
  assert.equal(HARBOUR_LIGHTS.lightPath.axis, 'distance');
  assert.equal(HARBOUR_LIGHTS.lightPath.keyframes[0].look, 'night');
});

test('Casino Corner and Lantern Hairpin each have an escape road behind an opening in the wall', () => {
  assert.deepEqual(course.escapeRoads.map(escape => escape.piece), ['Casino Corner', 'Lantern Hairpin']);
  const plain = new Course({ ...HARBOUR_LIGHTS, escapeRoads: [] }, 1989);
  assert.equal(plain.escapeRoads.length, 0);
  for (const escape of course.escapeRoads) {
    const turn = piece(course.script, escape.piece);
    assert.equal(escape.side, -turn.dir, 'on the outside of the turn');
    // The wall is open where the run-off road starts: no solid wall box in its opening...
    const inside = (x, z) => { const { u, v } = escapeFrame(escape, x, z); return u > 2 && u < 14 && v > escape.inner + 1 && v < escape.outer + .5; };
    const along = course.features.walls.filter(wall => !wall.escapeRoad && inside(wall.x, wall.z));
    assert.equal(along.length, 0, `${escape.id}: the wall is open`);
    // ...and the road's own outer wall is still there before it.
    const before = course.features.walls.filter(wall => !wall.escapeRoad && Math.abs(wall.s - (turn.s0 - 6)) < 4 && wall.side === escape.side);
    assert.ok(before.length > 0, `${escape.id}: wall before the opening`);
    // Beside the run-off road the outer wall carries straight on, and a tyre wall closes its end.
    const carried = course.features.walls.filter(wall => wall.escapeRoad === escape.id && !wall.tyreWall);
    assert.ok(carried.length >= Math.floor(escape.run / 4));
    const tyres = course.features.walls.filter(wall => wall.tyreWall && wall.escapeRoad === escape.id);
    assert.equal(tyres.length, 1);
    const end = escapeFrame(escape, tyres[0].x, tyres[0].z);
    assert.ok(Math.abs(end.u - (escape.run + escape.tyreDepth / 2)) < .01);
    assert.ok(tyres[0].maxY - tyres[0].minY > 1.2);
    // The tyre wall stays well inside the distance at which the marshals would reset a car.
    const found = course.nearest(tyres[0].x, tyres[0].z);
    assert.ok(found.distance < 60, `${escape.id}: tyre wall ${found.distance.toFixed(0)} m from the road`);
  }
  // Net effect on the wall count: the opening removes a few segments, the run-off roads add their own.
  assert.ok(course.features.walls.length > plain.features.walls.length);
});

test('no other part of the road, and no scenery, lies on a run-off road', () => {
  for (const escape of course.escapeRoads) {
    for (let u = 0; u <= escape.run; u += 5) for (let v = escape.inner; v <= escape.outer; v += 2) {
      const x = escape.origin.x + escape.forward.x * u + escape.left.x * escape.side * v, z = escape.origin.z + escape.forward.z * u + escape.left.z * escape.side * v;
      const found = course.nearest(x, z), apart = Math.abs(((found.s - escape.s0 + course.length * 1.5) % course.length) - course.length / 2);
      assert.ok(apart < 120, `${escape.id}: the run-off road meets another stretch of road at ${found.s.toFixed(0)} m`);
    }
    for (const object of [...course.features.trees, ...course.features.rocks, ...course.features.buildings]) {
      const { u, v } = escapeFrame(escape, object.x, object.z);
      assert.ok(!(u > -2 && u < escape.run + 2 && v > escape.inner - 2 && v < escape.outer + 3), `${escape.id}: ${object.id ?? 'rock'} stands on the run-off road`);
    }
  }
});

test('the road and its walls are the same without escape roads, and other circuits are untouched', () => {
  const plain = buildTrackScript({ ...HARBOUR_LIGHTS, escapeRoads: [] });
  assert.equal(plain.length, course.script.length);
  assert.deepEqual(plain.walls, course.script.walls);
  const panorama = new Course(PANORAMA_RIDGE, 1989);
  assert.deepEqual(panorama.escapeRoads ?? [], []);
});

test('a bad escape road names its turn', () => {
  assert.throws(() => new Course({ ...HARBOUR_LIGHTS, escapeRoads: [{ id: 'x', piece: 'No Such Corner' }] }, 1989), /No Such Corner/);
});

test('racing line settings for walls only change this circuit', () => {
  const line = course.racingLine;
  const half = s => course.roadHalfWidthAt(s);
  for (let s = 0; s < course.length; s += 4) assert.ok(Math.abs(line.offsetAt(s)) <= half(s) - HARBOUR_LIGHTS.lineMargin + 1e-6, 'inside the wall margin');
  // A gentle bend sweeps less than a bend that bows far from its chord.
  const kink = piece(course.script, 'Lantern Kink'), casino = piece(course.script, 'Casino Corner');
  const sweep = turn => { let low = Infinity, high = -Infinity; for (let s = turn.s0; s <= turn.s1; s += 2) { const o = line.offsetAt(s); low = Math.min(low, o); high = Math.max(high, o); } return high - low; };
  assert.ok(sweep(kink) < sweep(casino) * .8, 'the Lantern Kink is crossed with less sweep than Casino Corner');
  // The racers keep to the road's own corner speeds, so no racer is asked for more than the reference car can do.
  const spec = racerSpec('falcone_f42', {}, 'club'), profile = buildSpeedProfile(racingLineFor(course), spec, {});
  for (let i = 0; i < profile.count; i++) assert.ok(profile.cornerMph[i] <= line.cornerSpeedAt(i * profile.step) / DRIVE.mphToWorld + 1e-6, `corner speed at ${i * profile.step} m`);
});

test('the same seed gives the same walls and scenery', () => {
  const again = new Course(HARBOUR_LIGHTS, 1989);
  assert.equal(again.features.walls.length, course.features.walls.length);
  assert.equal(again.features.trees.length, course.features.trees.length);
});

// ---------------------------------------------------------------------------
// The street: kit placements for the loader (src/circuit-kit-layout.js)

import { readFileSync } from 'node:fs';
import { PIECES } from '../src/circuit-kit-layout.js';
import { basinWeight } from '../src/basins.js';

const manifest = JSON.parse(readFileSync(new URL('../public/assets/models/circuits/kits/manifest.json', import.meta.url), 'utf8'));
const placements = HARBOUR_LIGHTS.kitPlacements;

test('the layout knows the sizes in the kit manifest', () => {
  for (const [id, info] of Object.entries(PIECES)) {
    const piece = manifest.pieces.find(item => item.id === id);
    assert.ok(piece, `${id} is in the manifest`);
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(piece.size[i] - info.size[i]) < .02, `${id} size ${i}`);
  }
});

test('every placement is a valid loader entry, in the same order every time', () => {
  const ids = new Set(manifest.pieces.map(piece => piece.id));
  assert.ok(placements.length > 1500);
  for (const entry of placements) {
    assert.ok(ids.has(entry.id), entry.id);
    assert.ok(Number.isFinite(entry.s) && entry.s >= 0 && entry.s <= course.length, `s of ${entry.id}`);
    assert.ok(Number.isFinite(entry.lateral) && Number.isFinite(entry.heading));
    const scale = Array.isArray(entry.scale) ? entry.scale : [entry.scale];
    assert.ok(scale.every(value => value > 0 && Number.isFinite(value)));
  }
  assert.equal(JSON.stringify(placements), JSON.stringify(new Course(HARBOUR_LIGHTS, 7).def.kitPlacements));
});

test('the street has everything the card asks for', () => {
  const count = id => placements.filter(entry => entry.id === id).length;
  for (const id of ['concrete-wall', 'catch-fence', 'tyre-wall', 'shopfront-a', 'shopfront-b', 'neon-sign', 'lantern-string', 'lantern-tower', 'harbour-boat', 'start-gantry', 'pit-garage', 'grandstand'])
    assert.ok(count(id) > 0, id);
  assert.equal(count('concrete-wall'), count('catch-fence'));
  assert.equal(count('start-gantry'), 1);
  // Strings of lanterns hang over the old town and over the Lantern Hairpin.
  const hairpin = piece(course.script, 'Lantern Hairpin');
  assert.ok(placements.some(entry => entry.id === 'lantern-string' && entry.s > hairpin.s0 - 60 && entry.s < hairpin.s1 + 60), 'lanterns above the hairpin');
  const oldTown = placements.filter(entry => entry.id === 'lantern-string' && entry.s > 1250 && entry.s < 1670);
  assert.ok(oldTown.length > 20, 'lanterns through the old town');
  // The Lantern Tower stands above Casino Corner.
  const tower = placements.find(entry => entry.id === 'lantern-tower'), casino = piece(course.script, 'Casino Corner');
  assert.ok(tower.s > casino.s0 && tower.s < casino.s1);
});

test('no building, sign or boat stands on the road, a run-off road or in the water', () => {
  const water = HARBOUR_LIGHTS.basins;
  for (const entry of placements) {
    if (['concrete-wall', 'catch-fence', 'tyre-wall', 'lantern-string', 'start-gantry', 'neon-sign', 'harbour-boat'].includes(entry.id)) continue;
    const world = course.worldAt(entry.s, entry.lateral), found = course.nearest(world.x, world.z);
    assert.ok(found.distance > course.roadHalfWidthAt(found.s) + 2.5, `${entry.id} at ${entry.s.toFixed(0)} m is off the road`);
    for (const escape of course.escapeRoads) {
      const { u, v } = escapeFrame(escape, world.x, world.z);
      assert.ok(!(u > -4 && u < escape.run + 6 && v > escape.inner - 4 && v < escape.outer + 5), `${entry.id} clear of ${escape.id}`);
    }
    for (const basin of water) assert.ok(basinWeight(basin, found.s, found.lateral) < .05, `${entry.id} out of the ${basin.id} water`);
  }
  for (const boat of placements.filter(entry => entry.id === 'harbour-boat')) {
    const found = course.nearest(...(() => { const w = course.worldAt(boat.s, boat.lateral); return [w.x, w.z]; })());
    assert.ok(water.some(basin => basinWeight(basin, found.s, found.lateral) > .9), `boat at ${boat.s.toFixed(0)} floats`);
  }
});

test('no wall stands in the openings of the escape roads, and the water holds the ground down', () => {
  for (const escape of course.escapeRoads) {
    const clash = placements.filter(entry => entry.id === 'concrete-wall').filter(entry => {
      const w = course.worldAt(entry.s, entry.lateral), { u, v } = escapeFrame(escape, w.x, w.z);
      return u > 2 && u < 14 && v > escape.inner + 1 && v < escape.outer + .25 && Math.abs(entry.s - escape.s0) < 120;
    });
    assert.equal(clash.length, 0, escape.id);
  }
  for (const basin of HARBOUR_LIGHTS.basins) {
    const mid = (basin.s0 + basin.s1) / 2, across = (basin.from + basin.to) / 2, ground = course.groundAt(mid, basin.side * across).y;
    assert.ok(Math.abs(ground - (basin.level - basin.deep)) < .05, `${basin.id}: the floor lies below the water`);
    assert.ok(ground < course.at(mid).y - 1, `${basin.id}: below the road`);
  }
});
