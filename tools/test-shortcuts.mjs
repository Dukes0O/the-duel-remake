import assert from 'node:assert/strict';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { sweepObstacle } from '../src/collision.js';

// Measure rendered world paths independently at 1 m resolution. Course's saved
// measurements use a different sampling interval and cannot make this pass by
// merely reporting a positive saving.
const seeds = [1989, 42, 17, 1, 20, 35, 48, 333, 9999];
let cuts = 0, courses = 0, minimumSaving = 1, maximumSlope = 0, sweeps = 0;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
for (const seed of seeds) for (const definition of COURSE) {
  const course = new Course(definition, seed), branches = course.features.shortcuts;
  if (definition.arena) { assert.equal(branches.length, 0); continue; }
  if (definition.expansion) { assert.equal(branches.length, 0, `${definition.id}/${seed}: authored expansion circuits have no generated shortcuts`); continue; }
  courses++;
  assert.ok(branches.length>=1&&branches.length<=2, `${definition.id}/${seed}: retain only useful branches`);
  assert.ok(branches.every(c=>definition.offroad?c.surface==='gravel':['gravel','paved'].includes(c.surface)));
  if(branches.length===2)assert.ok(branches[1].start - branches[0].end >= 90, 'Separated entrances and exits');
  for (const cut of branches) {
    const label = `${definition.id}/${seed}/${cut.id}`;
    assert.ok(cut.start >= 40 && cut.end <= course.length - 40, `${label}: start gate clearance`);
    assert.ok(cut.end - cut.start >= 600 && cut.end - cut.start <= 1340, `${label}: driveable branch length`);
    assert.ok(Math.abs(cut.offset) <= 112, `${label}: stays inside scenery and terrain envelope`);
    assert.ok(cut.predictedTimeSaving>=.023, `${label}: curvature-aware time benefit`);
    for (const gate of course.features.lapGates) assert.ok(gate.s < cut.start - 16 || gate.s > cut.end + 16, `${label}: lap gate remains on the common route`);
    for (const tunnel of course.features.tunnels) assert.ok(cut.start >= tunnel.end + 42 || cut.end <= tunnel.start - 42, `${label}: tunnel clearance`);
    for (const s of [cut.start, cut.end]) {
      assert.ok(Math.abs(course.shortcutOffset(cut, s)) < 1e-8, `${label}: joined position`);
      const near = s === cut.start ? s + .01 : s - .01;
      assert.ok(Math.abs(course.shortcutOffset(cut, near) / .01) < .001, `${label}: joined tangent`);
      assert.ok(distance(course.groundAt(s,0), course.groundAt(s, course.shortcutOffset(cut, s))) < .001, `${label}: joined ground elevation`);
    }
    let mainMeters = 0, cutMeters = 0, previousMain, previousCut, previousOffset;
    const count = Math.ceil(cut.end - cut.start), step = (cut.end - cut.start) / count;
    for (let i = 0; i <= count; i++) {
      const s = cut.start + i * step, offset = course.shortcutOffset(cut, s);
      const curvature=course.at(s).curvature;
      assert.ok(1-curvature*offset-Math.abs(curvature)*(cut.halfWidth+1.4)>.299,`${label}: route projection remains well conditioned across a Titan-width corridor`);
      const main = definition.offroad ? course.groundAt(s) : course.worldAt(s), branch = course.groundAt(s, offset);
      assert.ok(course.surfaceAt(s, offset).road, `${label}: continuous legal surface`);
      if (i) { mainMeters += distance(main, previousMain); cutMeters += distance(branch, previousCut); maximumSlope = Math.max(maximumSlope, Math.abs(offset - previousOffset) / step); }
      previousMain = main; previousCut = branch; previousOffset = offset;
    }
    const saving = 1 - cutMeters / mainMeters;
    assert.ok(saving >= .03, `${label}: actual saving is ${(100 * saving).toFixed(3)}%`);
    assert.ok(Math.abs(mainMeters - cut.mainMeters) < .05 && Math.abs(cutMeters - cut.cutMeters) < .05, `${label}: stored measurements match actual geometry`);
    minimumSaving = Math.min(minimumSaving, saving);
    const middle = (cut.start + cut.end) / 2, center = course.shortcutOffset(cut, middle), surface = course.surfaceAt(middle, center);
    assert.equal(surface.shortcutId, cut.id); assert.equal(surface.mainRoad, cut.surface === 'paved');
    assert.equal(course.surfaceAt(middle + course.length, center).shortcutId, cut.id, `${label}: next-lap surface`);
    // A monster-size hull follows three lanes through each branch. This catches
    // occupied pump courts and rotated rocks that scalar offset checks miss.
    for (const lane of [-2.8, 0, 2.8]) {
      let previous = course.groundAt(cut.start, lane);
      const count = Math.ceil((cut.end - cut.start) / 6);
      for (let i = 1; i <= count; i++) {
        const s = cut.start + (cut.end - cut.start) * i / count, p = course.groundAt(s, course.shortcutOffset(cut, s) + lane), heading = Math.atan2(p.x - previous.x, p.z - previous.z);
        for (const obstacle of course.obstaclesNear(s - 8, s + 8)) {
          assert.equal(sweepObstacle(previous, p, obstacle, heading, { halfWidth: 1.4, halfLength: 2.6 }), null, `${label}: branch lane ${lane} blocked by ${obstacle.id}`); sweeps++;
        }
        previous = p;
      }
    }
    cuts++;
  }
}
assert.ok(maximumSlope < .8, `Maximum lateral slope ${maximumSlope} stays driveable`);
console.log(`Shortcuts: ${cuts} branches on ${courses} circuits; ${sweeps} clear obstacle sweeps. Minimum real 3D saving ${(minimumSaving * 100).toFixed(2)}%; maximum lateral slope ${maximumSlope.toFixed(3)}.`);
