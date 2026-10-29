import assert from 'node:assert/strict';
import {KOGANE_PASS, manifest} from '../src/circuits/kogane-pass.js';
import {buildTrackScript} from '../src/track-script.js';
import {Course} from '../src/course.js';
import {circuitsEnabled} from '../src/circuits/index.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {COURSE_PRICES} from '../src/course-access.js';
import {driveCircuit} from './track-script-drive.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizeKitPlacements} from '../src/track-kits.js';
import {renderedGroundHeight} from '../src/rendered-ground.js';
import {planWaterside} from '../src/waterside-scenery.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {destinationsFor, isDestination} from '../src/heli/heli-jobs.js';
import {courseSite} from '../src/heli/heli-session.js';
import {fireGrid, courseBurnCheck, startCells} from '../src/heli/heli-fire.js';
import {burnableCourses} from '../src/heli/heli-fire-run.js';
import {PLACES, placeOfCourse, KOGANE_PLACE, PLACE_ALTITUDES} from '../src/heli/pilot-map-data.js';

const road = buildTrackScript(KOGANE_PASS);
assert.equal(road.closed, false);
assert.equal(road.pieces.length, 28);
assert.ok(Math.abs(road.length - 4684) < 1);
assert.equal(road.heightAt(0), 320);
assert.equal(road.heightAt(road.length), 26);
assert.equal(KOGANE_PASS.gridStartS, 45);
assert.equal(KOGANE_PASS.stage, 22);
assert.equal(KOGANE_PASS.layoutVersion, 1);
assert.equal(KOGANE_PASS.layoutSeed, 1989);
assert.equal(KOGANE_PASS.fieldSize, 6);
assert.equal(KOGANE_PASS.grandPrixLaps, 1);
assert.ok(KOGANE_PASS.noCombat && KOGANE_PASS.noTraffic);

const hairpins = road.pieces.filter(piece => piece.name?.endsWith('Hairpin'));
assert.deepEqual(hairpins.map(piece => piece.radius), [15, 14, 16, 15]);
for (const piece of road.pieces) {
  assert.equal(piece.width, hairpins.includes(piece) ? 12 : 10);
  assert.equal(piece.walls, 'both');
}
for (const piece of hairpins) {
  const before = road.pieces[piece.index - 1];
  assert.equal(before.kind, 'straight');
  assert.ok(before.length >= 120 || before.s1 - before.s0 >= 120);
  assert.deepEqual(road.boards.filter(board => board.piece === piece.index).map(board => board.distance), [150, 100, 50]);
}
let closest = Infinity;
const points = road.samples.filter((_, i) => i % 4 === 0);
for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
  if (points[b].s - points[a].s <= 750) continue;
  closest = Math.min(closest, Math.hypot(points[a].x - points[b].x, points[a].z - points[b].z));
}
// Packet draft measures about 196 m; the approved safety floor is 165 m.
assert.ok(closest >= 195, `draft separation ${closest.toFixed(2)} m`);
const course = new Course(KOGANE_PASS, 1989);
for (let s = 0; s < course.length; s += 4) {
  const next = Math.min(s + 4, course.length);
  // The packet says about 10%; the unchanged script's eased maximum is 10.21%.
  assert.ok(Math.abs(course.at(next).y - course.at(s).y) / (next - s) <= .103, `grade at ${s}`);
  assert.ok(course.script.wallSide(s, 1) && course.script.wallSide(s, -1));
}
const allowed = new Set(['armco-white', 'concrete-wall', 'start-gantry', 'braking-board-150', 'braking-board-100', 'braking-board-50',
  'stone-retaining-wall', 'stone-retaining-wall-b', 'stone-retaining-wall-c', 'curve-mirror', 'chevron-board', 'tea-house', 'vending-row',
  'autumn-tree-copper', 'autumn-tree-golden', 'shopfront-a', 'shopfront-b', 'lantern-string',
  'torii', 'torii-small', 'stone-lantern', 'kogane-car-park']);
assert.ok(KOGANE_PASS.kitPlacements.every(row => allowed.has(row.id)));
assert.equal(normalizeKitPlacements(course, KOGANE_PASS.kitPlacements).length, KOGANE_PASS.kitPlacements.length);
for (const row of KOGANE_PASS.kitPlacements.filter(row => row.id === 'armco-white')) {
  assert.ok(Math.abs(Math.abs(row.lateral) - .349 / 2 - road.halfWidthAt(row.s) - 1) < 1e-6,
    'guardrail inner face matches the physical wall');
}
assert.equal(KOGANE_PASS.kitPlacements.filter(row => row.id === 'curve-mirror').length, 4);
assert.equal(KOGANE_PASS.kitPlacements.filter(row => row.id === 'chevron-board').length, 16);
for (const row of KOGANE_PASS.kitPlacements.filter(row => /curve-mirror|chevron-board/.test(row.id))) {
  assert.ok(Math.abs(row.lateral) >= road.halfWidthAt(row.s) + 3, 'hardware beyond wall and road');
}
const stoneWalls = KOGANE_PASS.kitPlacements.filter(row => row.id.startsWith('stone-retaining-wall'));
for (const row of stoneWalls) {
  const piece = road.pieceAt(row.s);
  assert.ok(piece.kind !== 'turn' || piece.radius >= 30, 'tall walls leave hairpin sightlines clear');
}
// KOGANE-WALL: three stone patterns that never repeat side by side, each piece close to the 4 m it was made
// for (the shared layout stretched them to 16 m), and concrete blocks laid end to end round the hairpins.
for (const side of [-1, 1]) {
  const run = stoneWalls.filter(row => Math.sign(row.lateral) === side).sort((x, y) => x.s - y.s);
  for (let i = 1; i < run.length; i++) assert.notEqual(run[i].id, run[i - 1].id, `stone pattern repeats at s ${run[i].s.toFixed(0)}`);
}
assert.deepEqual([...new Set(stoneWalls.map(row => row.id))].sort(),
  ['stone-retaining-wall', 'stone-retaining-wall-b', 'stone-retaining-wall-c']);
assert.ok(stoneWalls.every(row => row.scale[0] > .6 && row.scale[0] < 1.5), 'stone pieces are not stretched');
const blocks = KOGANE_PASS.kitPlacements.filter(row => row.id === 'concrete-wall');
const ends = blocks.map(row => {
  const at = course.groundAt(row.s, row.lateral), heading = at.heading + row.heading, half = 2 * row.scale[0];
  return {s: row.s, a: [at.x + Math.cos(heading) * half, at.z - Math.sin(heading) * half],
    b: [at.x - Math.cos(heading) * half, at.z + Math.sin(heading) * half]};
});
for (let i = 1; i < ends.length; i++) {
  if (ends[i].s - ends[i - 1].s > 6) continue;
  const gap = Math.min(...[[ends[i - 1].a, ends[i].a], [ends[i - 1].a, ends[i].b], [ends[i - 1].b, ends[i].a], [ends[i - 1].b, ends[i].b]]
    .map(([u, v]) => Math.hypot(u[0] - v[0], u[1] - v[1])));
  assert.ok(gap < .25, `concrete blocks leave a gap of ${gap.toFixed(2)} m at s ${ends[i].s.toFixed(0)}`);
}
assert.equal(KOGANE_PASS.markings, 'single-yellow', 'single Japanese centre line');
for (const row of KOGANE_PASS.kitPlacements.filter(row => row.id === 'concrete-wall')) {
  const piece = road.pieceAt(row.s);
  assert.ok(piece.kind === 'turn' && piece.radius < 30 &&
    Math.sign(row.lateral) === -piece.dir, 'concrete only outside tight hairpins');
}
const lamps = planWaterside(course).lamps;
assert.ok(lamps.length > 30);
assert.ok(lamps.every(row => row.s >= 3270 && row.s < course.length && row.colour === 0xffa23c));
const models = JSON.parse(readFileSync(new URL('./blender/kogane/scenery.json', import.meta.url))).models;
models.push(...JSON.parse(readFileSync(new URL('./blender/kogane/landmarks.json', import.meta.url))).models);
const budgets = {'armco-white': [156, 72], 'stone-retaining-wall': [600, 200],
  'stone-retaining-wall-b': [600, 200], 'stone-retaining-wall-c': [600, 200],
  'curve-mirror': [400, 150], 'chevron-board': [200, 100],
  'tea-house': [4500, 1400], 'vending-row': [1500, 500],
  'torii': [1800, 600], 'torii-small': [1800, 600], 'stone-lantern': [700, 250],
  'kogane-car-park': [150, 150]};
assert.deepEqual(models.map(model => model.id), Object.keys(budgets));
for (const model of models) for (const [i, file] of model.files.entries()) {
  const bytes = readFileSync(new URL('../public/assets/models/circuits/kits/' + file.path, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, 'measured current asset');
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
    .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3, 0);
  assert.equal(triangles, file.triangles);
  assert.ok(triangles > 0 && triangles <= budgets[model.id][i], `${file.path}: approved triangle cap`);
  assert.ok(file.bytes < 250000, `${file.path}: kit file budget`);
}
const ground = groundFromCourse(course);
const lake = KOGANE_PASS.basins[0];
assert.ok(KOGANE_PASS.water, 'the existing reflective circuit water draws the lake');
assert.equal(KOGANE_PASS.effects.lake, undefined, 'no second flat lake sheet');
assert.ok(lake.lateral < 0, 'lake on the right');
const centre = course.worldAt(lake.s, lake.lateral);
assert.ok(Number.isFinite(ground.water(centre.x, centre.z)), 'bucket can scoop from the lake');
for (let s = 0; s < 730; s += 4) {
  const p = course.worldAt(s, 0);
  assert.equal(ground.water(p.x, p.z), null, 'lake never crosses the road');
}
const gate = KOGANE_PASS.kitPlacements.find(row => row.id === 'torii');
const foot = course.worldAt(gate.s, gate.lateral);
const water = ground.water(foot.x, foot.z);
assert.ok(Number.isFinite(water) && water-ground.height(foot.x,foot.z) > 0 &&
  water-ground.height(foot.x,foot.z) < 1, 'torii grounded in shallow water');
for (const row of KOGANE_PASS.kitPlacements.filter(row => /torii|stone-lantern/.test(row.id))) {
  assert.ok(Math.abs(row.lateral) > 12, 'landmarks clear of road and bend sightline');
}
// The far shore is wooded: cedar and maple stand on the slope, none in the water.
const shoreTrees = course.features.trees.filter(tree => tree.id.startsWith('shore-forest-'));
assert.ok(shoreTrees.length > 400, 'cedar slope across the lake');
assert.ok(shoreTrees.every(tree => ground.water(tree.x, tree.z) === null), 'no cedar in the water');
const farMaples = KOGANE_PASS.kitPlacements.filter(row => row.lateral < -200 && /autumn-tree/.test(row.id));
assert.ok(farMaples.length > 30, 'autumn maples across the lake');
for (const row of farMaples) {
  const p = course.worldAt(row.s, row.lateral);
  assert.equal(ground.water(p.x, p.z), null, 'no maple in the water');
}

// C6 finishing pass. Every tree stands on the ground that is drawn (on the steep switchbacks the course height formula
// is tens of metres off there), and no boulder is left standing in a slope.
for (const tree of course.features.trees) {
  assert.ok(Math.abs(tree.y - renderedGroundHeight(course, tree)) < .05, tree.id + ' stands on the drawn ground');
}
for (const rock of course.features.rocks) {
  const obstacle = course.features.obstacles.find(o => o.source === rock);
  assert.ok(obstacle && Math.abs(obstacle.y - renderedGroundHeight(course, obstacle)) <= 1, 'boulder sits on the drawn ground');
}
// Curve boards point into the turn: the arrow is left from the front and right from the back, the front
// faces the road on the right shore (outside of a left turn) and the back on the left shore.
for (const row of KOGANE_PASS.kitPlacements.filter(row => row.id === 'chevron-board')) {
  const piece = road.pieceAt(row.s);
  assert.equal(row.heading, Math.PI / 2);
  assert.equal(row.lateral < 0 ? 1 : -1, piece.dir, 'chevron arrow points into the turn at ' + row.s.toFixed(0));
}
// The finish is marked by the start gantry's twin, just before the end of the road, facing the oncoming cars.
const gantries = KOGANE_PASS.kitPlacements.filter(row => row.id === 'start-gantry');
assert.equal(gantries.length, 2);
assert.ok(gantries.some(row => row.s > road.length - 6 && row.s < road.length && row.heading === Math.PI && row.lateral === 0), 'finish gantry');
assert.ok(KOGANE_PASS.effects.backdrop.hills.length >= 4, 'wooded hills behind the far shore');
// Like Summit Run, Kogane Pass is a destination only through its own option.
const off = {pilotMap: true, summitRun: true}, on = {...off, koganePass: true};
assert.equal(destinationsFor(off)['kogane-pass'], undefined, 'off switch hides the map place');
assert.equal(destinationsFor({koganePass: true})['kogane-pass'], undefined, 'needs the pilot map too');
assert.ok(destinationsFor(on)['kogane-pass'], 'option lists the place');
assert.equal(destinationsFor(on)['kogane-pass'].baseAltitude, 1300);
assert.equal(destinationsFor(on)['kogane-pass'].mapKm, KOGANE_PLACE.drawAt);
assert.equal(placeOfCourse('kogane-pass'), KOGANE_PLACE);
assert.equal(PLACE_ALTITUDES['kogane-pass'], 1300);
assert.ok(!PLACES.includes(KOGANE_PLACE), 'the released place table is untouched');
const hiddenOwner = id => isDestination(id, off);
assert.deepEqual(burnableCourses({}, id => {if (id === 'kogane-pass') throw Error('hidden course loaded'); return null;},
  {enabled: true, owns: hiddenOwner}), [], 'off switch blocks fire eligibility');
assert.deepEqual(burnableCourses({}, id => {throw Error('unowned course loaded: ' + id);},
  {enabled: true, owns: () => false}), [], 'unowned course is never loaded');
// With the option on, the helicopter site, landing circle and fire work.
const site = courseSite(course, ground, 'kogane-pass', on);
for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
  const p = course.worldAt(lake.s + Math.cos(angle) * lake.along, lake.lateral + Math.sin(angle) * lake.across);
  assert.ok(p.x >= site.area.minX && p.x <= site.area.maxX && p.z >= site.area.minZ && p.z <= site.area.maxZ,
    'lake inside flying area');
}
assert.equal(ground.water(site.zone.x, site.zone.z), null, 'landing circle is dry');
for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
  assert.ok(Math.abs(ground.height(site.zone.x + Math.cos(angle) * site.zone.radius,
    site.zone.z + Math.sin(angle) * site.zone.radius) - site.zone.y) <= 1.5, 'landing circle level');
}
const grid = fireGrid(course, ground, site);
assert.ok(courseBurnCheck(course, ground, grid).ok, 'course can burn');
assert.ok(startCells(course, ground, grid).length > 0, 'connected forest can host a fire');
assert.equal(burnableCourses({}, id => id === 'kogane-pass' ? {course, ground, grid} : null,
  {enabled: true, owns: id => isDestination(id, on)}).join(), 'kogane-pass');
assert.equal(manifest.state, 'dev');
assert.equal(manifest.grandPrix, true);
assert.equal(COURSE_PRICES['kogane-pass'], 2200);
const flags = overrides => createFeatureFlags({storage: null, qa: true, search: '', overrides});
assert.ok(!circuitsEnabled(flags({'kogane-pass': false})).some(def => def.id === 'kogane-pass'));
assert.equal(circuitsEnabled(flags({'kogane-pass': true})).at(-1), KOGANE_PASS);
assert.ok(!circuitsEnabled(flags({})).includes(KOGANE_PASS), 'dev is hidden by default');

// Both handling modes drive the actual open endpoint with disposable memory storage.
for (const difficulty of ['casual', 'pro']) {
  const result = driveCircuit(KOGANE_PASS, {difficulty, maxSeconds: 240,
    onTick: (state, duel) => {
      if (state.status === 'racing') assert.ok(duel.course.surfaceAt(state.s, state.lateral).road,
        `${difficulty}: stays on the road at ${state.s}`);
    }});
  assert.ok(result.completed, `${difficulty}: native finish ${JSON.stringify(result)}`);
  assert.equal(result.crashes, 0, `${difficulty}: no crashes`);
  assert.equal(result.boundaryResets, 0);
  assert.equal(result.checkpointResets, 0);
  assert.equal(result.finite, true);
  console.log(`${difficulty}: ${result.timeSec.toFixed(2)} s, no crashes or resets`);
}
console.log(`Kogane road, registration, boards and ${closest.toFixed(2)} m separation passed.`);

// C3's full seeded field check is explicit because it is much longer than
// the road test. Run with LINE_SKILL=.95 and --pace [easy|medium|hard].
if (process.argv.includes('--pace')) {
  assert.equal(Number(process.env.LINE_SKILL), manifest.driver.skill,
    'set LINE_SKILL to the manifest test-driver skill before the field check');
  const {runRace, summarize, checkTargets} = await import('./race-field-balance.mjs');
  const selected = process.argv[process.argv.indexOf('--pace') + 1];
  const difficulties = selected ? [selected] : ['easy', 'medium', 'hard'];
  assert.ok(difficulties.every(cpu => ['easy', 'medium', 'hard'].includes(cpu)));
  const rows = [];
  for (const cpuDifficulty of difficulties) {
    for (let index = 0; index < 30; index++) {
      // A computer crash is its own when no other car, the test driver
      // included, is within 9 m as it happens. A computer the test driver
      // runs into at a hairpin is counted apart, as a driver contact.
      let crashes = 0, contacts = 0, seen = 0;
      const result = runRace(cpuDifficulty, index, {
        course: manifest.id, car: manifest.driver.car, fieldSize: KOGANE_PASS.fieldSize - 1,
        onStep: duel => {
          assert.equal(duel.state.field.size, 6, 'the packet specifies six cars including the player');
          const list = duel.state.field.stats.crashes;
          for (; seen < list.length; seen++) {
            if (list[seen].index < 0) continue;
            const car = duel.state.opponents[list[seen].index];
            const apart = other => Math.hypot(duel.relativeS(other.s, car.s) - car.s, (other.lateral - car.lateral) * 1.5);
            if (apart(duel.state) < 9) contacts++; else crashes++;
          }
        },
      });
      rows.push({...result, computerCrashes: crashes, driverContacts: contacts});
      console.log(JSON.stringify({difficulty: cpuDifficulty, index, time: result.playerTime,
        position: result.position, finished: result.finished, passes: result.passes,
        computerCrashes: crashes, driverContacts: contacts}));
    }
  }
  const summary = summarize(rows);
  const times = Object.fromEntries(difficulties.map(cpu => {
    const values = rows.filter(row => row.cpuDifficulty === cpu).map(row => row.playerTime);
    assert.ok(values.every(Number.isFinite), `${cpu}: the test driver finishes every run`);
    return [cpu, {min: Math.min(...values), max: Math.max(...values),
      mean: values.reduce((sum, time) => sum + time, 0) / values.length}];
  }));
  const failures = checkTargets(summary);
  for (const cpu of difficulties) {
    const group = rows.filter(row => row.cpuDifficulty === cpu);
    if (group.filter(row => row.finished === 5).length < 29)
      failures.push(cpu + ': the entire field must finish in at least 29 of 30 races');
  }
  // The three-passes target is a mean per race, as in every other course.
  // Crashes of a computer's own are at most one race in ten per difficulty.
  const crashTotals = Object.fromEntries(difficulties.map(cpu => {
    const group = rows.filter(row => row.cpuDifficulty === cpu);
    const own = group.reduce((sum, row) => sum + row.computerCrashes, 0);
    if (own > 3) failures.push(`${cpu}: ${own} computer crashes of their own in 30 races, target at most 3`);
    return [cpu, {own, driverContacts: group.reduce((sum, row) => sum + row.driverContacts, 0)}];
  }));
  // A solo run of the manifest test driver, road clear. A six-car run cannot
  // time it: the driver starts behind slower cars and cannot overtake them freely.
  const solo = driveCircuit(KOGANE_PASS, {car: manifest.driver.car, difficulty: 'pro',
    skill: manifest.driver.skill, maxSeconds: 240});
  if (!solo.completed || solo.crashes || !(solo.timeSec >= 98 && solo.timeSec <= 106))
    failures.push(`solo test-driver run ${JSON.stringify(solo)}, target a clean 98 to 106 s`);
  const reference = rows.find(row => row.cpuDifficulty === 'medium' && row.index === 0);
  console.log(JSON.stringify({summary, times, crashTotals, soloSeconds: solo.timeSec,
    mediumIndex0Seconds: reference?.playerTime, failures}));
  assert.deepEqual(failures, [], 'Kogane C3 field pace acceptance');
}
