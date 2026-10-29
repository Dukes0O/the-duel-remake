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
import {planWaterside} from '../src/waterside-scenery.js';

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
  'stone-retaining-wall', 'curve-mirror', 'chevron-board', 'tea-house', 'vending-row',
  'autumn-tree-copper', 'autumn-tree-golden', 'shopfront-a', 'shopfront-b', 'lantern-string']);
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
for (const row of KOGANE_PASS.kitPlacements.filter(row => row.id === 'stone-retaining-wall')) {
  const piece = road.pieceAt(row.s);
  assert.ok(piece.kind !== 'turn' || piece.radius >= 30, 'tall walls leave hairpin sightlines clear');
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
const budgets = {'armco-white': [156, 72], 'stone-retaining-wall': [600, 200],
  'curve-mirror': [400, 150], 'chevron-board': [200, 100],
  'tea-house': [4500, 1400], 'vending-row': [1500, 500]};
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
  let computerCrashes = 0;
  for (const cpuDifficulty of difficulties) {
    for (let index = 0; index < 30; index++) {
      let crashes = 0;
      const result = runRace(cpuDifficulty, index, {
        course: manifest.id, car: manifest.driver.car, fieldSize: KOGANE_PASS.fieldSize - 1,
        onStep: duel => {
          assert.equal(duel.state.field.size, 6, 'the packet specifies six cars including the player');
          crashes = duel.state.field.stats.crashes.filter(row => row.index >= 0).length;
        },
      });
      computerCrashes += crashes;
      rows.push({...result, computerCrashes: crashes});
      console.log(JSON.stringify({difficulty: cpuDifficulty, index, time: result.playerTime,
        position: result.position, finished: result.finished, passes: result.passes, computerCrashes: crashes}));
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
  for (const row of rows.filter(row => row.cpuDifficulty === 'medium' && row.passes < 3))
    failures.push('Medium race ' + row.index + ': only ' + row.passes + ' computer passes');
  if (computerCrashes) failures.push(`${computerCrashes} computer-driver crashes, target zero`);
  const reference = rows.find(row => row.cpuDifficulty === 'medium' && row.index === 0);
  if (reference && !(reference.playerTime >= 98 && reference.playerTime <= 106))
    failures.push(`Medium reference run ${reference.playerTime} s, target 98 to 106 s`);
  console.log(JSON.stringify({summary, times, computerCrashes, failures}));
  assert.deepEqual(failures, [], 'Kogane C3 field pace acceptance');
}
