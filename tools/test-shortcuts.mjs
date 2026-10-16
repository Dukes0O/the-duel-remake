import assert from 'node:assert/strict';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { sweepObstacle } from '../src/collision.js';
import { clearAuthoredRoadScenery } from '../src/track-script-course.js';

// Measure rendered world paths independently at 1 m resolution. Course's saved
// measurements use a different sampling interval and cannot make this pass by
// merely reporting a positive saving.
const seeds = [1989, 42, 17, 1, 20, 35, 48, 333, 9999];
let authoredCuts = 0, cuts = 0, courses = 0, minimumSaving = 1, maximumSlope = 0, sweeps = 0;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
for (const seed of seeds) for (const definition of COURSE) {
  const course = new Course(definition, seed), branches = course.features.shortcuts;
  if (definition.arena) { assert.equal(branches.length, 0); continue; }
  if (definition.expansion || definition.script) {
    // An authored alternative is a declared road, not a solver's time-saving
    // shortcut. Check its geometry and clearance without inventing a saving.
    assert.deepEqual(branches, (definition.roadBranches ?? []).map(branch => ({...branch, offset: branch.offset * branch.side, transition: .15})), `${definition.id}/${seed}: exactly authored branches, no generated additions`);
    const summitOpen = ['summit-run', 'summit-time-attack'].includes(definition.id);
    if (summitOpen) assert.equal(branches.length, 1, `${definition.id}/${seed}: the approved Open Road is present exactly once`);
    if (summitOpen && seed === 1989) {
      assert.ok(!course.features.obstacles.some(obstacle => obstacle.id === 'rock-60'), `${definition.id}: measured obstructing rock-60 is removed with its collider`);
      assert.ok(!course.features.rocks.some(rock => rock.s === 10725.272529803233 && rock.off === -26.152646988630295), `${definition.id}: measured rock-60 geometry is removed too`);
      assert.ok(course.features.obstacles.some(obstacle => obstacle.sourceBounds === 'gallery-heavy-concrete-roof'), `${definition.id}: authored Gallery kit roofs remain`);
    }
    for (const cut of branches) {
      const label = `${definition.id}/${seed}/${cut.id}`;
      let snowJoinSamples = 0, ploughedSamples = 0;
      if (summitOpen) {
        assert.equal(cut.id, 'summit-open-road', `${label}: approved branch identity`);
        assert.equal(cut.surface, 'paved', `${label}: the declared branch remains paved`);
        assert.equal(cut.gripKind, 'asphalt', `${label}: the declared ploughed branch grip remains asphalt`);
      }
      assert.ok(cut.start >= 0 && cut.end > cut.start && cut.end <= course.length, `${label}: bounded branch range`);
      assert.ok(cut.halfWidth >= 1.4 + 2.8, `${label}: three Titan-width lanes fit`);
      for (const s of [cut.start, cut.end]) {
        assert.ok(Math.abs(course.shortcutOffset(cut, s)) < 1e-8, `${label}: joined position`);
        const near = s === cut.start ? s + .01 : s - .01;
        assert.ok(Math.abs(course.shortcutOffset(cut, near) / .01) < .001, `${label}: joined tangent`);
        assert.ok(distance(course.groundAt(s, 0), course.groundAt(s, course.shortcutOffset(cut, s))) < .001, `${label}: joined ground elevation`);
      }
      let previousOffset = 0;
      const samples = Math.ceil(cut.end - cut.start), step = (cut.end - cut.start) / samples;
      for (let i = 0; i <= samples; i++) {
        const s = cut.start + i * step, offset = course.shortcutOffset(cut, s), surface = course.surfaceAt(s, offset);
        assert.ok(surface.road && surface.shortcutId === cut.id, `${label}: continuous legal branch surface`);
        assert.equal(surface.mainRoad, cut.surface === 'paved', `${label}: declared pavement retained`);
        if (summitOpen) {
          // The real branch merges into the existing snow road at each end.
          // Its ploughed asphalt override begins only beyond that road's edge.
          assert.equal(course.script.surfaceAt(s), 'snow', `${label}: authored main-road snow coating retained`);
          assert.equal(course.gripKindAt(s, 0), 'snow', `${label}: actual main-road snow grip retained`);
          if (Math.abs(offset) <= course.script.halfWidthAt(s)) {
            assert.equal(course.gripKindAt(s, offset), 'snow', `${label}: shared join retains main-road snow`);
            snowJoinSamples++;
          } else {
            assert.equal(course.gripKindAt(s, offset), 'asphalt', `${label}: separated branch retains declared ploughed asphalt`);
            ploughedSamples++;
          }
        } else assert.equal(course.gripKindAt(s, offset), cut.gripKind ?? 'asphalt', `${label}: declared branch grip retained`);
        if (i) maximumSlope = Math.max(maximumSlope, Math.abs(offset - previousOffset) / step);
        previousOffset = offset;
      }
      if (summitOpen) {
        assert.ok(snowJoinSamples > 0 && ploughedSamples > 0, `${label}: both snowy shared joins and ploughed branch are exercised`);
        for (const s of [cut.start, cut.end]) assert.equal(course.gripKindAt(s, 0), 'snow', `${label}: each actual endpoint joins the snow road`);
      }
      for (const lane of [-2.8, 0, 2.8]) {
        let previous = course.groundAt(cut.start, lane);
        const count = Math.ceil((cut.end - cut.start) / 6);
        for (let i = 1; i <= count; i++) {
          const s = cut.start + (cut.end - cut.start) * i / count, p = course.groundAt(s, course.shortcutOffset(cut, s) + lane), heading = Math.atan2(p.x - previous.x, p.z - previous.z);
          for (const obstacle of course.obstaclesNear(s - 8, s + 8)) {
            const dimensions = {halfWidth: 1.4, halfLength: 2.6, ...(obstacle.verticalClearance ? {height: 1.35, useModelBounds: false} : {})};
            assert.equal(sweepObstacle(previous, p, obstacle, heading, dimensions), null, `${label}: authored lane ${lane} blocked by ${obstacle.id}`); sweeps++;
          }
          previous = p;
        }
      }
      authoredCuts++;
    }
    continue;
  }
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
// The final reservation may remove natural proposals only. These placements
// are deliberately frozen so mutation, refill and altered survivors cannot pass.
{
  const freeze = value => Object.freeze(value);
  const rock = (s, off) => freeze({s, off, scale: freeze([2, 1, 2]), angle: .3});
  const rockIn = rock(150, -26), rockJoin = rock(89, -18), rockOut = rock(150, -45), rockBefore = rock(87, -18);
  const treeIn = freeze({id: 'tree-in', s: 150, off: -18, scale: 1, tint: 0x775533});
  const treeOut = freeze({id: 'tree-out', s: 150, off: 25, scale: 1, tint: 0x335577});
  const buildingIn = freeze({id: 'building-in', s: 150, off: -18, halfX: 3, halfZ: 4, height: 15});
  const buildingOut = freeze({id: 'building-out', s: 150, off: 70, halfX: 3, halfZ: 4, height: 15});
  const mountainIn = freeze({id: 'mountain-in', s: 150, off: -18, halfX: 20, halfZ: 20, height: 40});
  const mountainOut = freeze({id: 'mountain-out', s: 150, off: 140, halfX: 20, halfZ: 20, height: 40});
  const wall = freeze({id: 'authored-wall', s: 150, off: -18, trackWall: true});
  const kit = freeze({id: 'authored-roof', s: 150, off: -18, sourceBounds: 'gallery-heavy-concrete-roof', verticalClearance: true});
  const rockInHull = freeze({id: 'rock-in', source: rockIn}), rockJoinHull = freeze({id: 'rock-join', source: rockJoin});
  const rockOutHull = freeze({id: 'rock-out', source: rockOut}), rockBeforeHull = freeze({id: 'rock-before', source: rockBefore});
  const branch = freeze({id: 'authored-cut', start: 100, end: 200, offset: -18, halfWidth: 6});
  const features = {shortcuts: [branch], rocks: [rockIn, rockOut, rockJoin, rockBefore], trees: [treeIn, treeOut],
    buildings: [buildingIn, buildingOut], mountains: [mountainIn, mountainOut],
    obstacles: [wall, rockInHull, rockOutHull, treeIn, treeOut, rockJoinHull, rockBeforeHull, buildingIn, buildingOut, mountainIn, mountainOut, kit]};
  const originalArrays = {...features}, originalBytes = JSON.stringify(features);
  const rng = {float() {throw new Error('Final reservation must not draw randomness');}, range() {throw new Error('Final reservation must not draw randomness');}};
  const course = {def: {roadBranches: [branch]}, features, rng, worldAt: (s, off) => ({x: off, z: s}),
    nearest: (x, z) => ({s: z, lateral: x}), shortcutOffset: () => -18};
  const ordinary = {...course, def: {roadBranches: []}, features: {...features}};
  assert.equal(clearAuthoredRoadScenery(ordinary), 0, 'A course without authored branches is an exact no-op');
  assert.equal(JSON.stringify(ordinary.features), originalBytes, 'Ordinary course placement bytes remain exact');
  for (const key of Object.keys(features)) assert.equal(ordinary.features[key], originalArrays[key], `Ordinary ${key} array identity remains exact`);
  const survivorBytes = new Map([rockOut, rockBefore, treeOut, buildingOut, mountainOut, wall, kit].map(item => [item, JSON.stringify(item)]));
  assert.equal(clearAuthoredRoadScenery(course), 5, 'Remove exactly the five intruding natural proposals, including the 12 m join reach');
  assert.deepEqual(features.rocks, [rockOut, rockBefore], 'Rock survivors retain original order and the station outside the reservation');
  assert.deepEqual(features.trees, [treeOut], 'Tree survivor keeps its original autumn tint');
  assert.deepEqual(features.buildings, [buildingOut], 'Building survivor is not replaced');
  assert.deepEqual(features.mountains, [mountainOut], 'Mountain survivor is not replaced');
  for (const [key, expected] of Object.entries({rocks: [rockOut, rockBefore], trees: [treeOut], buildings: [buildingOut], mountains: [mountainOut]}))
    for (const [index, placement] of expected.entries()) assert.equal(features[key][index], placement, `Surviving ${key} retain original object identity`);
  const keptHulls = [wall, rockOutHull, treeOut, rockBeforeHull, buildingOut, mountainOut, kit];
  assert.deepEqual(features.obstacles, keptHulls, 'Only matching natural colliders are removed; authored walls and kits retain their order');
  for (const [index, obstacle] of keptHulls.entries()) assert.equal(features.obstacles[index], obstacle, 'Surviving collider objects retain identity');
  for (const [item, bytes] of survivorBytes) assert.equal(JSON.stringify(item), bytes, 'Every surviving placement retains exact bytes');
  const settled = JSON.stringify(features), arrays = {...features};
  assert.equal(clearAuthoredRoadScenery(course), 0, 'A second pass removes nothing and never refills');
  assert.equal(JSON.stringify(features), settled, 'A second pass changes no placement bytes');
  for (const key of Object.keys(features)) assert.equal(features[key], arrays[key], `Stable ${key} retains array identity`);
}
assert.ok(maximumSlope < .8, `Maximum lateral slope ${maximumSlope} stays driveable`);
console.log(`Shortcuts: ${cuts} generated branches on ${courses} circuits and ${authoredCuts} authored branches; ${sweeps} clear obstacle sweeps. Minimum real 3D saving ${(minimumSaving * 100).toFixed(2)}%; maximum lateral slope ${maximumSlope.toFixed(3)}.`);
