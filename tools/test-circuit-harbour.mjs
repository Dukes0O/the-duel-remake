import assert from 'node:assert/strict';
import test from 'node:test';
import { Course } from '../src/course.js';
import { HARBOUR_LIGHTS } from '../src/circuits/harbour-lights.js';
import { GRAND_PRIX_COURSES, courseForGrandPrix, grandPrixCourse, FIELD } from '../src/race-field.js';
import { escapeFrame } from '../src/track-script-course.js';
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
