import assert from 'node:assert/strict';
import test from 'node:test';
import {EIFEL_CROWN, manifest} from '../src/circuits/eifel-crown.js';
import {buildTrackScript} from '../src/track-script.js';
import {Course} from '../src/course.js';
import {COURSE, DRIVE} from '../src/config.js';
import {courseForGrandPrix} from '../src/race-field.js';
import {applyCircuits} from '../src/circuits/index.js';
import {registerCircuits, CIRCUIT_ENTRIES} from '../src/circuit-manifests.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {EXPANSION_COURSES} from '../src/expansion-courses.js';
import {GRAND_PRIX_COURSES} from '../src/grand-prix-career.js';
import {driveCircuit} from './track-script-drive.mjs';
import {traceCourse, buildPilotMap} from './build-pilot-map.mjs';
import {installReferenceFixture} from './build-reference-laps.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createTrackKits, normalizeKitPlacements} from '../src/track-kits.js';
import {KIT_FOOTPRINTS} from '../src/kit-footprints.js';
import {beechTreePlacements} from '../src/vegetation.js';
import * as THREE from 'three';
import {addCircuitLandmarks} from '../src/circuit-landmarks.js';
import {renderedGroundHeight} from '../src/rendered-ground.js';
import {hillHeight, hillReach, hillLocal} from '../src/circuit-hills.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {isDestination} from '../src/heli/heli-jobs.js';
import {courseSite} from '../src/heli/heli-session.js';
import {FIRE, BURNT_LOOKS, fireGrid, courseBurnCheck, startCells} from '../src/heli/heli-fire.js';
import {burnableCourses} from '../src/heli/heli-fire-run.js';
import {SOUND_BANK, AMBIENCE} from '../src/sound-bank.js';
import {measureLoudness} from './audio/measurements.mjs';

const road = buildTrackScript(EIFEL_CROWN);
const named = name => road.pieces.find(piece => piece.name === name);

// C3's full seeded field check is explicit because it is much longer than the
// road tests. From PowerShell:
//   node tools/test-circuit-eifel.mjs --pace [easy|medium|hard] [--races N]
// It runs the field-balance harness (tools/race-field-balance.mjs, as
// tools/ardennes-field-rate.mjs does) with the manifest's Stuttgart 959-S as
// the player, driven along the racing line at the manifest skill, and seven
// computer cars, memory-only saves. Then it exits without running the road
// tests. --races N is only for tuning; the acceptance is 30 per difficulty.
// The racing-line driver does not watch the car ahead, so on its own it drives
// into slower cars and the computer cars it hits count as computer crashes.
// This test gives it the same following limit the field-balance test driver
// uses (tools/race-field-balance.mjs): it never drives into the car ahead in
// its lane. No shared driver file changes.
function keepBehindCarAhead(app) {
  const racingLine = app._driveAutopilot;
  app._driveAutopilot = function(dt) {
    racingLine.call(this, dt);
    const duel = this.duel, state = duel.state;
    if (state.status !== 'racing' || state.impactTimer > 0) return;
    let cap = Infinity;
    for (const other of state.opponents) {
      if (other.finished || other.crushed) continue;
      const ahead = duel.relativeS(other.s, state.s) - state.s;
      if (ahead <= 0 || ahead > 160 || Math.abs(other.lateral - state.lateral) > 2.9) continue;
      const comfortable = DRIVE.brakeAccel * duel.car.braking * .62 * DRIVE.mphToWorld;
      const lead = other.speedMph * DRIVE.mphToWorld;
      const room = Math.max(0, ahead - 4.7 - 2.2) + lead * lead / (2 * comfortable * 1.15);
      cap = Math.min(cap, comfortable * (-.22 + Math.sqrt(.22 * .22 + 2 * room / comfortable)) / DRIVE.mphToWorld);
    }
    if (state.speedMph > cap)
      duel.setInput({throttle: 0, brake: Math.max(state.input.brake, Math.min(1, (state.speedMph - cap) / 12)),
        steer: state.input.steer, boost: false});
  };
}
if (process.argv.includes('--pace')) {
  const {runRace, summarize, checkTargets} = await import('./race-field-balance.mjs');
  const {App} = await import('../src/app.js');
  const {useRacingLine} = await import('./track-script-drive.mjs');
  const after = process.argv[process.argv.indexOf('--pace') + 1];
  const difficulties = after && !after.startsWith('--') ? [after] : ['easy', 'medium', 'hard'];
  assert.ok(difficulties.every(cpu => ['easy', 'medium', 'hard'].includes(cpu)));
  const raceArg = process.argv.indexOf('--races');
  const races = raceArg < 0 ? 30 : Number(process.argv[raceArg + 1]);
  assert.ok(Number.isInteger(races) && races > 0 && races <= 30);
  // The new road stands in slot 9 for the run, as the switch would put it.
  COURSE[9] = EIFEL_CROWN;
  let activeApp;
  const originalStart = App.prototype.startCampaign;
  App.prototype.startCampaign = function(options) { activeApp = this; return originalStart.call(this, options); };
  const rows = [];
  for (const cpuDifficulty of difficulties) {
    for (let index = 0; index < races; index++) {
      let crashes = 0, installed = false;
      const result = runRace(cpuDifficulty, index, {
        course: manifest.id, car: manifest.driver.car, fieldSize: 7,
        onStep: duel => {
          // The Grand Prix copy of the definition carries the pace row, so compare the road itself.
          assert.equal(duel.course.def.layoutVersion, 3, 'the race runs on the new road');
          assert.equal(duel.course.def.script, EIFEL_CROWN.script, 'the race runs on the new road');
          assert.equal(duel.state.field.size, 8, 'the player and seven computer cars');
          if (!installed) {
            assert.equal(duel.state.status, 'countdown', 'the driver is installed before go');
            assert.equal(duel, activeApp.duel);
            useRacingLine(activeApp, manifest.driver.skill);
            keepBehindCarAhead(activeApp);
            installed = true;
          }
          crashes = duel.state.field.stats.crashes.filter(row => row.index >= 0).length;
        },
      });
      rows.push({...result, computerCrashes: crashes});
      console.log(JSON.stringify({difficulty: cpuDifficulty, index, time: result.playerTime,
        position: result.position, finished: result.finished, passes: result.passes,
        computerCrashes: crashes, pileUp: result.pileUp, wallSec: result.wallSec}));
    }
  }
  const summary = summarize(rows);
  // The packet's 3 computer passes per Medium race is reported below, not asserted: it is not in this card's brief.
  const failures = checkTargets(summary).filter(line => !/passes between computer racers/.test(line));
  // Grand Prix balance asks a little more of Medium and Hard than the pilot track's bands: the overlap of both.
  const bands = {medium: .4, hard: .15};
  for (const [cpu, low] of Object.entries(bands))
    if (summary[cpu] && summary[cpu].winRate < low - 1e-9)
      failures.push(`${cpu}: the test driver won ${(summary[cpu].winRate * 100).toFixed(0)}% (Grand Prix balance asks at least ${low * 100}%)`);
  const detail = {};
  for (const cpu of difficulties) {
    const group = rows.filter(row => row.cpuDifficulty === cpu);
    const complete = group.filter(row => row.finished === row.racers).length;
    if (races === 30 && complete < 29) failures.push(`${cpu}: every computer must finish in at least 29 of 30 races (${complete})`);
    const crashes = group.reduce((sum, row) => sum + row.computerCrashes, 0);
    if (crashes > group.length / 10) failures.push(`${cpu}: ${crashes} computer crashes in ${group.length} races (at most 1 per 10)`);
    const times = group.map(row => row.playerTime);
    detail[cpu] = {complete, computerCrashes: crashes, wins: group.filter(row => row.won).length,
      playerTime: {min: Math.min(...times), max: Math.max(...times), mean: times.reduce((sum, time) => sum + time, 0) / times.length}};
  }
  App.prototype.startCampaign = originalStart;
  console.log(JSON.stringify({summary, detail, failures}));
  if (failures.length) console.log('MISSES TARGET:\n' + failures.join('\n'));
  process.exit(failures.length ? 1 : 0);
}

test('Eifel keeps its identity and closes the approved 34-piece road at 14 m wide', () => {
  assert.deepEqual([EIFEL_CROWN.id, EIFEL_CROWN.stage, EIFEL_CROWN.layoutSeed, EIFEL_CROWN.layoutVersion],
    ['eifel-crown', 9, 1989, 3]);
  assert.equal(road.pieces.length, 34);
  assert.equal(road.pieces.filter(piece => piece.kind === 'turn').length, 17);
  assert.ok(Math.abs(road.length - 5600) < 10);
  const first = road.samples[0], last = road.samples.at(-1);
  assert.ok(Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z) < .001);
  assert.ok(Math.abs(Math.sin(first.heading - last.heading)) < .001);
  for (let s = 0; s < road.length; s += 2) assert.equal(road.halfWidthAt(s), 7);
  assert.ok(road.report.straightChanges.every(row => Math.abs(row.percent) <= 1.2));
  assert.ok(road.report.highestGradePercent < 22);
  const heights = road.samples.map(p => p.y);
  assert.ok(Math.min(...heights) >= 13 && Math.max(...heights) > 110 && Math.max(...heights) < 113);
  assert.equal(named('Forest Dip').crest, 2.5);
  assert.deepEqual(EIFEL_CROWN.sections.map(s => [s.name, s.share, s.theme]), [
    ['Forest Esses', .42, 'alpine'], ['Crown Ridge', .35, 'alpine'], ['Valley Sweep', .23, 'alpine'],
  ]);
});

test('separate road stretches keep at least 468 m of centreline separation', () => {
  // Neighbours around a bend are one stretch. Compare points at least 750 m
  // apart along the lap, sampling every 8 m, as in the packet's fitted loop.
  const points = road.samples.filter((_, i) => i % 4 === 0);
  let separation = Infinity;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    const along = Math.abs(points[i].s - points[j].s);
    if (Math.min(along, road.length - along) < 750) continue;
    separation = Math.min(separation, Math.hypot(points[i].x - points[j].x, points[i].z - points[j].z));
  }
  assert.ok(separation >= 468, `closest separate stretches: ${separation} m`);
});

test('every turn has kerbs and the three braking corners have all three boards off the road', () => {
  for (const turn of road.pieces.filter(p => p.kind === 'turn')) {
    assert.ok(road.kerbs.some(kerb => kerb.piece === turn.index));
  }
  for (const name of ['Crag Corner', 'Castle Bend', 'Last Turn']) for (const distance of [150, 100, 50]) {
    const corner = named(name), s = road.phase(corner.s0 - distance);
    const board = EIFEL_CROWN.kitPlacements.find(row => row.id === `braking-board-${distance}` && Math.abs(row.s - s) < .001);
    assert.ok(board, `${name}: ${distance} m board`);
    assert.equal(Math.sign(board.lateral), -corner.dir);
    assert.ok(Math.abs(board.lateral) > road.halfWidthAt(s) + 2);
    assert.equal(board.solid, undefined);
  }
  assert.equal(EIFEL_CROWN.expansion, undefined);
  assert.equal(EIFEL_CROWN.noTraffic, undefined);
  assert.equal(EIFEL_CROWN.noCombat, undefined);
});

test('preview replaces only slot 9 and switch off retains the released road exactly', () => {
  const base = COURSE.slice(0, 16);
  base[9] = EXPANSION_COURSES.find(row => row.id === 'eifel-crown');
  const off = {enabled: flag => flag !== 'eifel-crown'};
  const on = {enabled: () => true};
  const before = applyCircuits(base, off), after = applyCircuits(base, on);
  assert.equal(manifest.state, 'dev');
  assert.equal(createFeatureFlags({storage: null, qa: false}).enabled('eifel-crown'), false);
  assert.equal(before[9], base[9]);
  assert.equal(after[9], EIFEL_CROWN);
  assert.equal(before.length, after.length);
  assert.deepEqual(after.map(row => row.id), before.map(row => row.id));
  for (let i = 0; i < before.length; i++) if (i !== 9) assert.equal(after[i], before[i]);
  assert.equal(after.filter(row => row.id === 'eifel-crown').length, 1);
  assert.equal(GRAND_PRIX_COURSES.filter(id => id === 'eifel-crown').length, 1);
  assert.deepEqual([manifest.slot, manifest.price, manifest.grandPrix], [9, 1400, true]);
  const module = {manifest, EIFEL_CROWN};
  for (const slot of [-1, 16, 1.5]) assert.throws(() => registerCircuits([{...module, manifest: {...manifest, slot}}]), /slot/i);
  assert.throws(() => applyCircuits(base, on, [{...CIRCUIT_ENTRIES.find(row => row.manifest.id === manifest.id), manifest: {...manifest, slot: 8}}]), /same course id/);
  for (const seed of [1989, 42]) {
    const course = new Course(after[9], seed);
    assert.equal(course.def, EIFEL_CROWN);
    assert.ok(course.racingLine);
  }
});

test('the Grand Prix pace row follows the new road only; the released road keeps its own row', () => {
  const released = courseForGrandPrix(EXPANSION_COURSES.find(row => row.id === 'eifel-crown'));
  const added = courseForGrandPrix(EIFEL_CROWN);
  assert.deepEqual(released.fieldPace, {easy: .934, medium: .903, hard: .881});
  assert.equal(released.fieldFollow, undefined);
  assert.deepEqual(added.fieldPace, {easy: .94, medium: .858, hard: .86});
  assert.equal(added.fieldAggression, 1.4);
  assert.equal(added.fieldFollow.firstLap.margin, 5);
  assert.equal(added.grandPrix, true);
});

test('pilot map retains the released outline and rebuilds the preview from the new road', () => {
  const map = buildPilotMap();
  assert.deepEqual(map.outlines['eifel-crown'], traceCourse(EXPANSION_COURSES.find(row => row.id === 'eifel-crown')));
  assert.equal(map.previews['eifel-crown'].flag, manifest.flag);
  assert.deepEqual(map.previews['eifel-crown'].outline, traceCourse(EIFEL_CROWN));
  assert.notDeepEqual(map.previews['eifel-crown'].outline, map.outlines['eifel-crown']);
});

test('one native lap stays on the road without crashes on Casual and Pro', () => {
  const original = COURSE[9], storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  COURSE[9] = EIFEL_CROWN;
  try {
    for (const difficulty of ['casual', 'pro']) {
      let fixture;
      const result = driveCircuit(EIFEL_CROWN, {car: 'stuttgart_959s', difficulty, seed: 1989, opponentCount: 0,
        mode: 'timetrial', stopAfterLaps: 1, maxSeconds: 240, onTick(state, duel) {
          // Existing isolated geometry-driver fixture removes traffic and police,
          // preserving all native physical steps, surfaces and lap legality.
          fixture ??= installReferenceFixture({duel}, {eventId: 'eifel-crown'});
        }});
      fixture?.dispose();
      assert.equal(result.laps, 1, difficulty);
      assert.equal(result.finite, true, difficulty);
      assert.equal(result.crashes, 0, difficulty);
      assert.ok(result.lapEdge[0] < 0, `${difficulty}: road edge ${result.lapEdge[0]}`);
    }
  } finally {
    COURSE[9] = original;
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
    else delete globalThis.localStorage;
  }
});

// ---------------------------------------------------------------------------
// C4 scenery, round 1

const KITS = new URL('../public/assets/models/circuits/kits/', import.meta.url);
const scenery = new Course(EIFEL_CROWN, 1989);
const placements = EIFEL_CROWN.kitPlacements;

test('the new wall and hedge are original recipe output inside their triangle and file budgets', () => {
  const budgets = {'drystone-wall': [600, 200], 'hedge-row': [500, 200]};
  const models = JSON.parse(readFileSync(new URL('./blender/eifel/scenery.json', import.meta.url), 'utf8')).models;
  assert.deepEqual(models.map(model => model.id), Object.keys(budgets));
  for (const model of models) for (const [i, file] of model.files.entries()) {
    const bytes = readFileSync(new URL(file.path, KITS));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path + ' is the recipe output');
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
    const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
      .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3, 0);
    assert.equal(triangles, file.triangles);
    assert.ok(triangles > 0 && triangles <= budgets[model.id][i], `${file.path}: triangle cap ${budgets[model.id][i]}`);
    assert.ok(file.bytes < 250000, `${file.path}: file budget`);
  }
  for (const id of Object.keys(budgets)) {
    const high = models.find(model => model.id === id).files[0].size;
    for (const [i, key] of ['width', 'height', 'depth'].entries())
      assert.ok(Math.abs(high[i] - KIT_FOOTPRINTS[id][key]) < .02, `${id} ${key} matches its solid box`);
  }
});

test('every scenery row uses an approved kit, stays off the road and run-off, and leaves corner exits open', () => {
  const allowed = new Set(['start-gantry', 'pit-garage', 'grandstand', 'armco', 'tyre-wall', 'marshal-post',
    'braking-board-150', 'braking-board-100', 'braking-board-50', 'drystone-wall', 'hedge-row',
    // C5 landmarks: the castle on its crag, the dam wall of the reservoir and the timber lodge.
    'eifel-castle', 'dam-wall', 'eifel-lodge', 'shore-rock', 'autumn-tree']);
  assert.ok(placements.every(row => allowed.has(row.id)));
  assert.equal(normalizeKitPlacements(scenery, placements).length, placements.length);
  for (const row of placements.filter(row => ['armco', 'tyre-wall', 'drystone-wall', 'hedge-row'].includes(row.id))) {
    // The run-off is 12 m: no rail, wall or hedge starts inside it (marshals and boards have their own checks).
    const inner = Math.abs(row.lateral) - road.halfWidthAt(row.s) - KIT_FOOTPRINTS[row.id].depth / 2;
    assert.ok(inner >= 12, `${row.id} at s ${row.s.toFixed(0)}: ${inner.toFixed(2)} m from the edge`);
    assert.equal(row.solid, true);
  }
  for (const row of placements.filter(row => ['drystone-wall', 'hedge-row'].includes(row.id) && row.heading !== 0)) {
    const piece = road.pieceAt(row.s);
    assert.ok(piece.kind !== 'turn' || piece.radius >= 150 || Math.sign(row.lateral) !== piece.dir,
      `${row.id} at s ${row.s.toFixed(0)} is not on the inside of a tight corner`);
  }
  // Every armco row is on the outside of a corner; the three long bends stay open.
  for (const row of placements.filter(row => row.id === 'armco')) {
    const near = road.pieces.filter(piece => piece.kind === 'turn' && piece.radius < 150 &&
      row.s >= piece.s0 - 16 && row.s <= piece.s1 + 56 && Math.sign(row.lateral) === -piece.dir);
    assert.ok(near.length, `armco at s ${row.s.toFixed(0)} follows a corner outside`);
  }
  const wide = ['Start Kink', 'Hatch Sweep', 'Valley Brow'].map(named);
  for (const piece of wide) assert.ok(!placements.some(row => row.id === 'armco' && row.s > piece.s0 + 10 && row.s < piece.s1 - 10 &&
    road.pieceAt(row.s) === piece), piece.name + ' has no rail of its own');
});

test('the kits load from their real files and pass every triangle clearance rule', async () => {
  // The model reader looks for `self` (the browser's global); give it ours for this test only.
  const hadSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  globalThis.self ??= globalThis;
  const loader = new GLTFLoader();
  const owner = createTrackKits(scenery, {loadAsset: async path => {
    const bytes = readFileSync(new URL('../public' + path, import.meta.url));
    return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  }});
  try {
    assert.equal(await owner.ready, true, owner.error?.message);
    const beeches = beechTreePlacements(scenery).length;
    assert.equal(owner.placements.length, placements.length + beeches);
    assert.equal(owner.stats.clearance.runtimeSkipped, 0, 'no clearance exemption');
  } finally {
    owner.dispose();
    if (hadSelf) Object.defineProperty(globalThis, 'self', hadSelf); else delete globalThis.self;
  }
});

test('green and white kerbs, dark wet road, dull beech leaves and mixed forest are set; C5 rooms and the ridge meadows stay open', () => {
  assert.deepEqual(EIFEL_CROWN.kerbColours, [0x2f6b3c, 0xe8e6df]);
  assert.equal(EXPANSION_COURSES.find(row => row.id === 'eifel-crown').kerbColours, undefined);
  assert.equal(EIFEL_CROWN.effects.valleyMist.length, 4);
  assert.ok(EIFEL_CROWN.dampRoad.dampRoughness < EIFEL_CROWN.dampRoad.dryRoughness);
  const beeches = beechTreePlacements(scenery);
  assert.ok(beeches.length >= 150 && beeches.length <= 450, `beech count ${beeches.length}`);
  for (const row of beeches) assert.ok(Math.abs(row.lateral) >= road.halfWidthAt(row.s) + EIFEL_CROWN.scenery.forest.from, 'beeches stand in the wood, not on the run-off');
  assert.equal(EIFEL_CROWN.kitLook['ardennes-beech'].leafColour, 0x66755c);
  assert.ok(EIFEL_CROWN.groundLeaves.verge.from < EIFEL_CROWN.groundLeaves.verge.to);
  // The wood stands right behind the verge: spruce within 20 m of the road edge, and beech among it.
  const close = scenery.features.trees.filter(tree => !tree.farForest && Math.abs(tree.off) - road.halfWidthAt(tree.s) < 20);
  assert.ok(close.length > 700, `trees in the first 20 m: ${close.length}`);
  assert.ok(close.every(tree => Math.abs(tree.off) - road.halfWidthAt(tree.s) >= 12), 'nothing inside the run-off');
  assert.ok(beeches.some(row => Math.abs(row.lateral) - road.halfWidthAt(row.s) < 24), 'beech among the front rows');
  const near = scenery.features.trees.filter(tree => !tree.farForest).length;
  const far = scenery.features.trees.filter(tree => tree.farForest).length;
  assert.ok(near > 3000 && near <= 9000, `near trees ${near}`);
  assert.ok(far <= 5000, `far trees ${far}`);
  // Nothing planted in the rooms kept for the castle, village and reservoir (C5), nor the ridge meadows.
  const rooms = [
    // C5 narrowed the castle and reservoir rooms to the ground each really uses (the slopes beyond are wooded again)
    // and opened a window through the wood on the inside of Reservoir Right.
    [named('Castle Bend').s1 - 40, named('Wall Left').s1 + 40, -235, -90],
    [named('Castle Bend').s1 + 60, named('Beech Right').s0 + 80, -64, -12],
    [named('Reservoir Right').s0 - 120, named('Reservoir Right').s1 + 110, -150, -66],
    [named('Reservoir Right').s0 - 220, named('Reservoir Right').s1 + 110, -66, -12],
    [named('Crown Climb').s0 - 30, named('Ridge Top').s1 + 30, -44, 44],
  ];
  for (const tree of scenery.features.trees) for (const [s0, s1, from, to] of rooms)
    assert.ok(!(tree.s >= s0 && tree.s <= s1 && tree.off >= from && tree.off <= to), `tree ${tree.id} stands in a kept-open room`);
});

// ---------------------------------------------------------------------------
// C5 landmarks, water and sound

const landmarkModels = JSON.parse(readFileSync(new URL('./blender/eifel/landmarks.json', import.meta.url), 'utf8')).models;

test('the castle, dam module and lodge are original recipe output inside their triangle and file budgets', () => {
  const budgets = {'eifel-castle': [7000, 2000], 'dam-wall': [2500, 800], 'eifel-lodge': [1500, 500], 'shore-rock': [600, 200]};
  assert.deepEqual(landmarkModels.map(model => model.id), Object.keys(budgets));
  for (const model of landmarkModels) for (const [i, file] of model.files.entries()) {
    const bytes = readFileSync(new URL(file.path, KITS));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path + ' is the recipe output');
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
    const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
      .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3, 0);
    assert.equal(triangles, file.triangles);
    assert.ok(triangles > 0 && triangles <= budgets[model.id][i], `${file.path}: triangle cap ${budgets[model.id][i]}`);
    assert.ok(file.bytes < 250000, `${file.path}: file budget`);
  }
});

test('the castle stands on a level crag hill outside Wall Left, 90 to 260 m out, off the road and its sightlines', () => {
  const castle = placements.find(row => row.id === 'eifel-castle');
  const hill = EIFEL_CROWN.hills[0], wall = named('Wall Left');
  assert.ok(castle.s > named('Castle Bend').s1 && castle.s < wall.s1, 'between Castle Bend and the end of Wall Left');
  assert.ok(castle.lateral < -90 && castle.lateral > -260, 'outside the left turn, 90 to 260 m out');
  assert.equal(castle.s, hill.s);
  assert.equal(castle.lateral, hill.lateral);
  assert.ok(castle.scale[0] >= 2 || [castle.scale].flat()[0] >= 2, 'the castle stands large enough for the keep to show over the trees');
  assert.ok(hill.height >= 20 && hill.height <= 50, 'the foothill is 20 to 50 m above the valley floor');
  // The hill's own top is level under the whole rock foot, and the castle's foot is bedded into it a little.
  const at = scenery.groundAt(hill.s, hill.lateral);
  const top = at.y + .06 + hillHeight(hill, 0, 0);
  const drawn = renderedGroundHeight(scenery, {...at, s: hill.s, off: hill.lateral}, {requireSurface: true});
  assert.equal(castle.hill, 0, 'lifted onto its hill by the game');
  const bed = drawn + hillHeight(hill, 0, 0) - castle.sink;
  assert.ok(bed < top && top - bed < 3.5, `rock foot ${(top - bed).toFixed(2)} m into the hill top`);
  for (const [du, dv] of [[0, 0], [14, 0], [-14, 0], [0, 14], [0, -14]])
    assert.ok(Math.abs(hillHeight(hill, du, dv) - hillHeight(hill, 0, 0)) < .001, 'level hill top');
  const foot = 22 * [castle.scale].flat()[0];
  assert.ok(foot < hill.pads[0].radius + hill.pads[0].blend * .5, 'the rock foot stands on the level top and its easing');
  // Nothing of the hill lies over the road's ribbon (64 m each side) or the run-off.
  assert.ok(Math.abs(hill.lateral) - hill.across > 40, 'hill foot well clear of the road');
  for (let s = hill.s - hill.along; s <= hill.s + hill.along; s += 10) {
    assert.ok(hillReach(hill, ...hillLocal(hill, s, -40)) >= 1, 'no hill in the first wood beside the road');
    assert.ok(hillHeight(hill, ...hillLocal(hill, s, -52)) < .5, 'the crag hill starts beyond 52 m, well off the road and its run-off');
  }
});

test('the reservoir is reflective circuit water over a basin on the inside of Reservoir Right, never across the road', () => {
  const lake = EIFEL_CROWN.basins[0], bend = named('Reservoir Right');
  assert.ok(EIFEL_CROWN.water && EIFEL_CROWN.effects.lake === undefined, 'the existing reflective circuit water, no flat sheet');
  assert.ok(lake.lateral < 0 && lake.lateral + lake.across * 1.2 < -60 && lake.lateral - lake.across * 1.2 > -260, 'on the right, 60 to 260 m out');
  assert.ok(lake.s > bend.s0 - 100 && lake.s < bend.s1 + 120);
  assert.ok(lake.along >= 140 && lake.across >= 50, 'a long reservoir filling the valley floor');
  assert.ok(EIFEL_CROWN.water.ripple <= .25, 'calm water: little swell, so the reflection is not cut into bands');
  const ground = groundFromCourse(scenery);
  const centre = scenery.worldAt(lake.s, lake.lateral);
  const level = ground.water(centre.x, centre.z);
  assert.ok(Number.isFinite(level), 'the bucket can scoop from the reservoir');
  for (let s = 0; s < scenery.length; s += 4) {
    const p = scenery.worldAt(s, 0);
    assert.equal(ground.water(p.x, p.z), null, 'water never crosses the road');
  }
  assert.ok(level - ground.height(centre.x, centre.z) > 3, 'a basin a few metres deep');
  // The dam closes the far end: its modules stand end to end across the shore, facing the water.
  const dam = placements.filter(row => row.id === 'dam-wall');
  assert.ok(dam.length >= 3 && dam.every(row => row.s === dam[0].s && row.heading === Math.PI));
  assert.ok(dam[0].s > lake.s + lake.along * .8 && dam[0].s < lake.s + lake.along * 1.2, 'at the far (downstream) end');
  const laterals = dam.map(row => row.lateral).sort((a, b) => a - b);
  for (let i = 1; i < laterals.length; i++) assert.ok(Math.abs(laterals[i] - laterals[i - 1] - 13.7) < .01, 'modules join end to end');
  for (const row of dam) {
    assert.ok(Math.abs(row.lateral) > road.halfWidthAt(row.s) + 60, 'the dam is far from the road');
    const bedAt = renderedGroundHeight(scenery, {...scenery.groundAt(row.s, row.lateral), s: row.s, off: row.lateral}, {requireSurface: true});
    assert.ok(Math.abs(bedAt - level) < 6, 'standing on ground near the water level');
  }
});

test('the half-timbered village lies right of Village Street, 12 to 64 m out, with a church and garden walls', () => {
  const town = EIFEL_CROWN.circuitLandmarks.find(row => row.type === 'town'), church = EIFEL_CROWN.circuitLandmarks.find(row => row.type === 'church');
  assert.equal(town.houseStyle, 'half-timber');
  assert.ok(town.houses.length >= 12 && town.houses.length <= 120, `houses ${town.houses.length}`);
  assert.equal(town.streets.length, 2, 'two short streets');
  const wall = named('Wall Left'), street = named('Village Street');
  for (const house of town.houses) {
    assert.ok(house.s >= wall.s0 && house.s <= street.s1, 'along Wall Left and Village Street');
    assert.ok(house.lateral < -22 && house.lateral > -90, `house ${house.lateral.toFixed(1)} m out, inside the cleared strip`);
    assert.ok(house.storeys === 1 || house.storeys === 2);
  }
  assert.equal(church.churchStyle, 'stone');
  assert.ok(church.lateral < -30 && church.lateral > -90);
  assert.ok(church.height >= 34, 'a tall spire, standing above the house roofs');
  // The drawn world: houses, timbers and church ground themselves on the real surface and clear every road segment.
  const world = new THREE.Group();
  addCircuitLandmarks(world, scenery);
  const drawn = world.getObjectByName('eifel-village');
  assert.equal(drawn.getObjectByName('town houses').count, town.houses.length);
  assert.ok(drawn.getObjectByName('town oak timbers').count > town.houses.length * 3, 'oak timbers on the gables, doors and windows');
  assert.ok(world.getObjectByName('eifel-church'));
  const walls = placements.filter(row => row.id === 'drystone-wall' && row.s > wall.s0 + 100 && row.s < street.s1 && row.lateral < -22 && row.lateral > -90);
  const hedges = placements.filter(row => row.id === 'hedge-row' && row.s > wall.s0 + 100 && row.s < street.s1 && row.lateral < -22 && row.lateral > -90);
  const trees = placements.filter(row => row.id === 'autumn-tree' && row.s > wall.s0 + 100 && row.s < street.s1 && row.lateral < -22 && row.lateral > -90);
  assert.ok(walls.length >= 8 && hedges.length >= 8 && trees.length >= 10, `gardens: ${walls.length} walls, ${hedges.length} hedges, ${trees.length} trees`);
  for (const row of [...walls, ...hedges]) assert.equal(row.solid, true);
  // Not a fence: setbacks differ by 8 m or more, and the houses face every which way.
  const setbacks = town.houses.map(house => Math.abs(house.lateral));
  assert.ok(Math.max(...setbacks) - Math.min(...setbacks) > 20, 'varied setbacks');
  assert.ok(new Set(town.houses.map(house => Math.round(house.heading * 4))).size >= 6, 'houses turned in many directions');
});

test('the timber lodge stands on the open ground left of the start straight, clear of the heli landing circle', () => {
  const lodge = placements.find(row => row.id === 'eifel-lodge');
  assert.ok(lodge.s > 40 && lodge.s < 150 && lodge.lateral > 30 && lodge.lateral < 70);
  assert.equal(lodge.heading, -Math.PI / 2, 'facing the road');
  assert.ok(placements.some(row => row.id === 'grandstand'), 'the stands stay');
  assert.equal(placements.filter(row => row.id === 'ski-lodge').length, 0, 'the snow-roofed ski lodge is not used');
});

test('the forest burns: the course meets every fire rule, reservoir water included; the released road does not', () => {
  const ground = groundFromCourse(scenery);
  const flags = {pilotMap: true, summitRun: true};
  assert.ok(isDestination('eifel-crown', flags), 'Eifel Crown is already a place on the pilot map');
  const site = courseSite(scenery, ground, 'eifel-crown', flags);
  assert.equal(ground.water(site.zone.x, site.zone.z), null, 'a dry landing circle');
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8)
    assert.ok(Math.abs(ground.height(site.zone.x + Math.cos(angle) * site.zone.radius, site.zone.z + Math.sin(angle) * site.zone.radius) - site.zone.y) <= 1.5,
      'a level landing circle');
  assert.ok(site.zone.radius >= 12);
  const grid = fireGrid(scenery, ground, site);
  assert.ok(grid.forest >= FIRE.minForestCells, `forest cells ${grid.forest}`);
  const check = courseBurnCheck(scenery, ground, grid);
  assert.deepEqual({forest: check.forest, destination: check.destination, water: check.water, look: check.look},
    {forest: true, destination: true, water: true, look: true});
  assert.ok(check.ok);
  assert.ok(BURNT_LOOKS.includes('eifel-crown'));
  assert.ok(startCells(scenery, ground, grid).length > 0, 'connected forest can host a fire');
  assert.equal(burnableCourses({}, id => id === 'eifel-crown' ? {course: scenery, ground, grid} : null,
    {enabled: true, owns: id => isDestination(id, flags)}).join(), 'eifel-crown');
  // The released road has no reservoir: it can never burn, however the switches are set.
  const released = new Course(EXPANSION_COURSES.find(row => row.id === 'eifel-crown'), 1989), releasedGround = groundFromCourse(released);
  const releasedCheck = courseBurnCheck(released, releasedGround, fireGrid(released, releasedGround, courseSite(released, releasedGround, 'eifel-crown', flags)));
  assert.equal(releasedCheck.water, false);
  assert.equal(releasedCheck.ok, false);
});

test('Eifel has its own forest and birds bed and one church bell, named like the other courses, at the forest bed level', () => {
  assert.equal(EIFEL_CROWN.ambience, 'eifel');
  assert.deepEqual(AMBIENCE.eifel && [AMBIENCE.eifel.file, AMBIENCE.eifel.gain, AMBIENCE.eifel.flag], ['ambience-eifel.flac', .15, 'eifel-crown']);
  const bell = SOUND_BANK['landmark.village-bell'];
  assert.deepEqual([bell.file, bell.flag], ['landmark-village-bell.flac', 'eifel-crown']);
  assert.equal(EXPANSION_COURSES.find(row => row.id === 'eifel-crown').ambience, undefined, 'the released road keeps the forest bed');
  const town = EIFEL_CROWN.circuitLandmarks.find(row => row.type === 'town');
  assert.equal(EIFEL_CROWN.landmarkSound.cue, 'landmark.village-bell');
  assert.equal(EIFEL_CROWN.landmarkSound.reach, 150);
  assert.ok(Math.abs(EIFEL_CROWN.landmarkSound.s - town.s) < 1, 'heard within 150 m of the village middle');
  const reference = measureLoudness(readFileSync(new URL('../public/assets/audio/ambience-forest.flac', import.meta.url)));
  const bed = measureLoudness(readFileSync(new URL('../public/assets/audio/ambience-eifel.flac', import.meta.url)));
  assert.ok(Math.abs(bed.integratedLufs - reference.integratedLufs) <= 1, 'within 1 dB of the forest bed at the same gain');
  assert.ok(bed.truePeakDbtp <= -.4);
  const bellLevel = measureLoudness(readFileSync(new URL('../public/assets/audio/landmark-village-bell.flac', import.meta.url)));
  // A soft bell: at its cue volume at least 12 dB under the engine bed's -16 LUFS loudness target (the packet's rule),
  // and still audible, no more than 20 dB under the forest bed at its own gain.
  const bellDelivered = bellLevel.integratedLufs + 20 * Math.log10(bell.volume);
  assert.ok(bellDelivered <= -16 - 12, `bell ${bellDelivered.toFixed(1)} LUFS at its cue volume`);
  assert.ok(bellDelivered >= reference.integratedLufs + 20 * Math.log10(.15) - 20 - 1e-9, 'audible against the bed');
});
