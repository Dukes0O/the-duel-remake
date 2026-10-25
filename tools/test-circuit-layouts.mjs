import {CIRCUIT_MANIFESTS, BASE_COURSE_COUNT} from '../src/circuit-manifests.js';
import {previewCircuitFlags} from './preview-flags.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { ALL_CIRCUITS, CIRCUITS, circuitsEnabled } from '../src/circuits/index.js';
import { PANORAMA_RIDGE } from '../src/circuits/panorama-ridge.js';
import { HARBOUR_LIGHTS } from '../src/circuits/harbour-lights.js';
import { TREMBLANT_WOODS } from '../src/circuits/tremblant-woods.js';
import { FEATURE_STATES, createFeatureFlags } from '../src/feature-flags.js';
import { COURSE_PRICES } from '../src/course-access.js';
import { GRAND_PRIX_COURSES } from '../src/race-field.js';
import { buildTrackScript } from '../src/track-script.js';
import { driveCircuit, lapTime } from './track-script-drive.mjs';
import { courseHasWinterSurfaces } from '../src/race-surfaces.js';

// The road layouts of Panorama Ridge, Harbour Lights and Tremblant Woods
// (docs/CIRCUITS.md section 5). Art, light, landmarks and the full field are
// Codex's cards; this checks the roads, walls, switches and a driven race.
const near = (a, b, tolerance, message = '') => assert.ok(Math.abs(a - b) <= tolerance, `${message} ${a} differs from ${b}`);
const piece = (road, name) => road.pieces.find(item => item.name === name);

test('each circuit is registered, behind its own switch, priced, and on COURSE only while its switch is on', () => {
  // In release order, so a circuit switched on later joins the end of COURSE and released ones never move (RELEASE-HARBOUR).
  assert.deepEqual(ALL_CIRCUITS.map(circuit => circuit.id), CIRCUIT_MANIFESTS.map(row => row.id));
  // Tremblant Woods (RELEASE-TREMBLANT), Tremblant Snow (RELEASE-TREMBLANT-SNOW), Harbour Lights (RELEASE-HARBOUR) and Panorama Ridge (RELEASE-PANORAMA) are released.
  const released = CIRCUIT_MANIFESTS.filter(row => row.state === 'on').map(row => row.id);
  for (const circuit of ALL_CIRCUITS) {
    const manifest = CIRCUIT_MANIFESTS.find(row => row.id === circuit.id);
    assert.equal(FEATURE_STATES[circuit.flag], manifest.state);
    if (circuit.id === 'summit-time-attack') {
      // Release states and orders come from the manifests (QA-TEST-AUDIT): the solo child follows its parent's switch.
      assert.deepEqual([circuit.flag, manifest.flag, manifest.state, manifest.price, manifest.grandPrix],
        ['summit-run', 'summit-run', CIRCUIT_MANIFESTS.find(row => row.id === 'summit-run').state, 0, false]);
      assert.deepEqual(manifest.unlock, {kind: 'owned-course', defaultEventId: 'summit-run'});
      assert.equal(COURSE_PRICES[circuit.id], 0);
      assert.deepEqual([circuit.defaultMode, circuit.laps, circuit.grandPrixLaps, circuit.fieldSize, circuit.hasRival, circuit.noCombat],
        ['timetrial', 1, 1, 1, false, true]);
      assert.equal(GRAND_PRIX_COURSES.includes(circuit.id), false);
    } else if (manifest.unlock?.kind === 'spotted-from-air') {
      const expected = {
        'panorama-ridge-night': ['panorama-ridge'],
        'harbour-lights-dusk': ['harbour-lights'],
        'panorama-ridge-reverse': ['panorama-ridge'],
        'harbour-lights-reverse': ['harbour-lights'],
        'tremblant-woods-reverse': ['tremblant-woods'],
      }[circuit.id];
      assert.ok(expected,'only the five approved children are found from the air');
      assert.deepEqual(manifest.unlock,{kind:'spotted-from-air',defaultEventId:expected[0]});
      assert.deepEqual([manifest.price,COURSE_PRICES[circuit.id],manifest.grandPrix],[0,0,true]);
      assert.ok(manifest.releaseOrder > CIRCUIT_MANIFESTS.find(row => row.id === expected[0]).releaseOrder,
        'a child is released after its parent');
      assert.equal(circuit.flag,circuit.id);assert.equal(circuit.hasRival,true);
      assert.equal(circuit.stage,ALL_CIRCUITS.find(def=>def.id===expected[0]).stage);
    } else {
      assert.equal(circuit.flag, circuit.id);
      assert.ok(COURSE_PRICES[circuit.id] > 0);
      assert.equal(circuit.hasRival, true);
    }
    assert.equal(circuit.kind, 'circuit'); assert.equal(circuit.noTraffic, true);
    assert.ok(Object.isFrozen(circuit) && circuit.lengthU > 2500);
  }
  for (const manifest of CIRCUIT_MANIFESTS) assert.equal(COURSE_PRICES[manifest.id], manifest.price);
  const orders = CIRCUIT_MANIFESTS.map(row => row.releaseOrder);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b), 'manifests are listed in release order');
  assert.equal(new Set(orders).size, orders.length, 'each course has its own release order');
  assert.deepEqual(CIRCUITS.map(circuit => circuit.id), released, 'only the released circuits are on COURSE in the tests');
  assert.equal(COURSE.length, BASE_COURSE_COUNT + released.length);
  assert.deepEqual(COURSE.slice(0, 16).map(event => event.id).filter(id => ALL_CIRCUITS.some(circuit => circuit.id === id)), [], 'the sixteen earlier events are unchanged and in place');
  assert.deepEqual(COURSE.slice(BASE_COURSE_COUNT).map(row => row.id), released, 'enabled courses append in declared order');
  const originalDefinitions = ALL_CIRCUITS.filter(circuit => circuit.id !== 'summit-time-attack' &&
    CIRCUIT_MANIFESTS.find(row=>row.id===circuit.id).unlock?.kind !== 'spotted-from-air');
  assert.equal(new Set(originalDefinitions.map(circuit => circuit.stage)).size, originalDefinitions.length,
    'all non-Attack courses retain unique authored generation identities');
  assert.equal(ALL_CIRCUITS.find(circuit => circuit.id === 'summit-time-attack').stage,
    ALL_CIRCUITS.find(circuit => circuit.id === 'summit-run').stage, 'the solo child keeps the exact parent generation identity');
  assert.ok(ALL_CIRCUITS.every(circuit => circuit.stage > 15), 'appended after the existing events');
  const on = createFeatureFlags({ storage: null, qa: true, search: '?flags=harbour-lights,tremblant-woods' });
  assert.deepEqual(circuitsEnabled(on).map(circuit => circuit.id), CIRCUIT_MANIFESTS.filter(row => on.enabled(row.flag)).map(row => row.id), 'the requested circuit plus every released one, in release order');
  // A QA-enabled course keeps its manifest position even when later courses are released.
  const held = { ...FEATURE_STATES, 'panorama-ridge': 'dev' }, heldReleased = released.filter(id => id !== 'panorama-ridge');
  const withRidge = createFeatureFlags({ catalog: held, storage: null, qa: true, search: '?flags=panorama-ridge' });
  assert.deepEqual(circuitsEnabled(withRidge).map(circuit => circuit.id), released, 'QA enables Panorama at its declared release position');
  assert.deepEqual(circuitsEnabled(createFeatureFlags({ catalog: held, storage: null, qa: false, search: '?flags=panorama-ridge' })).map(circuit => circuit.id), heldReleased, 'players never see a dev circuit, only the released ones');
  const historicalReleased = ['tremblant-woods', 'tremblant-snow', 'harbour-lights'];
  const historicalCatalog = Object.fromEntries(Object.entries(FEATURE_STATES).map(([id, state]) =>
    [id, CIRCUIT_MANIFESTS.some(row => row.flag === id) ? (historicalReleased.includes(id) ? 'on' : 'dev') : state]));
  const historicalQA = createFeatureFlags({ catalog: historicalCatalog, storage: null, qa: true, search: '?flags=panorama-ridge' });
  assert.deepEqual(circuitsEnabled(historicalQA).map(circuit => circuit.id), [...historicalReleased, 'panorama-ridge'], 'in its original release catalog QA Panorama follows the three older circuits');
  assert.deepEqual(circuitsEnabled(createFeatureFlags({ catalog: historicalCatalog, storage: null, qa: false, search: '?flags=panorama-ridge' })).map(circuit => circuit.id), historicalReleased, 'the historical production catalog still excludes dev Panorama');
  const bat = readFileSync(new URL('../start-preview.bat', import.meta.url), 'utf8');
  assert.ok(bat.includes('preview-flags.mjs'), 'Preview obtains course flags from the course-owned manifests');
  for (const circuit of ALL_CIRCUITS) assert.ok(previewCircuitFlags().includes(circuit.flag), `the Preview turns ${circuit.id} on`);
});

test('every closed layout closes within the rules and says what it changed', () => {
  for (const circuit of ALL_CIRCUITS.filter(def=>def.closed!==false)) {
    const road = buildTrackScript(circuit), report = road.report;
    assert.equal(road.length, circuit.lengthU);
    assert.ok(Math.abs(Math.abs(report.turnSumDeg) - 360) <= 2, `${circuit.id}: turns add up to a lap`);
    assert.ok(report.closureGap < 20, `${circuit.id}: the script is within 20 m of closing before the builder stretches it`);
    for (const change of report.straightChanges) assert.ok(Math.abs(change.percent) <= 2, `${circuit.id} piece ${change.index + 1} changes only ${change.percent.toFixed(2)}%`);
    near(report.elevationLeftover, 0, 1e-9, `${circuit.id}: climbs add up`);
    const first = road.samples[0], last = road.samples.at(-1);
    near(Math.hypot(first.x - last.x, first.z - last.z), 0, 1e-6);
    assert.ok(report.highestGradePercent < 25, `${circuit.id}: steepest ${report.highestGradePercent.toFixed(1)}%`);
    for (const turn of road.pieces.filter(item => item.kind === 'turn')) assert.ok(turn.radius >= 14 || turn.name === 'Lantern Hairpin', `${turn.name}: only the Lantern Hairpin is tighter than 14 m`);
  }
});

test('Panorama Ridge: widths, the walled ridge, crests, boards', () => {
  const road = buildTrackScript(PANORAMA_RIDGE), cutting = piece(road, 'The Cutting'), conrod = piece(road, 'Conrod Straight');
  near(road.length, 4842, 5);
  assert.equal(PANORAMA_RIDGE.laps, 3);
  near(road.halfWidthAt(piece(road, 'Pit Straight').s1 - 100) * 2, 15, 1e-9);
  near(road.halfWidthAt(cutting.s1 + 100) * 2, 13, 1e-9, 'the approved ridge width carries on past The Cutting');
  near(road.halfWidthAt((conrod.s0 + conrod.s1) / 2) * 2, 16, 1e-9);
  assert.equal(piece(road, 'Mountain Straight').walls, 'both'); assert.equal(piece(road, 'Forrest Elbow').walls, 'both');
  assert.equal(conrod.walls, 'none'); assert.equal(piece(road, 'Hell Gate').walls, 'none');
  assert.equal(piece(road, 'Summit Park').crest, 2.5); assert.equal(piece(road, 'Skyline').crest, 2.4);
  assert.equal(road.startAt, 80); assert.equal(road.pieceAt(0).name, 'Pit Straight');
  const boarded = new Set(road.boards.map(board => road.pieces[board.piece].name));
  for (const name of ['Hell Gate', 'The Cutting', 'Forrest Elbow', 'Murray Corner']) assert.ok(boarded.has(name), `boards before ${name}`);
  assert.ok(!boarded.has('The Chase'));
  assert.ok(conrod.s1 - conrod.s0 > 1100, 'the longest straight');
});

test('Harbour Lights: walls everywhere, the Lantern Hairpin, night', () => {
  const road = buildTrackScript(HARBOUR_LIGHTS), course = new Course(HARBOUR_LIGHTS, 1989), hairpin = piece(road, 'Lantern Hairpin');
  assert.equal(HARBOUR_LIGHTS.laps, 4); assert.equal(HARBOUR_LIGHTS.timeOfDay, 'night'); assert.equal(HARBOUR_LIGHTS.theme, 'city');
  assert.ok(road.pieces.every(item => item.walls === 'both'));
  assert.equal(hairpin.radius, 10); assert.ok(hairpin.degrees > 170);
  assert.ok(road.halfWidthAt((hairpin.s0 + hairpin.s1) / 2) >= 6, 'at least 12 m wide at the hairpin');
  near(road.halfWidthAt(piece(road, 'Seafront Straight').s0 + 300) * 2, 14, 1e-9);
  assert.ok(course.features.walls.length > 600);
  assert.ok(road.boards.some(board => road.pieces[board.piece].name === 'Lantern Hairpin' && board.distance === 150));
  const approach = piece(road, 'Hairpin Approach');
  assert.ok(approach.s1 - approach.s0 >= 120, 'at least 120 m of straight before the hairpin');
  // The line runs wide round the hairpin: a car cannot turn a 9 m circle.
  assert.ok(course.racingLine.offsetAt((hairpin.s0 + hairpin.s1) / 2) * hairpin.dir < 0, 'outside line at the hairpin');
});

test('Tremblant Woods: open road, forest runoff, the long straight', () => {
  const road = buildTrackScript(TREMBLANT_WOODS), course = new Course(TREMBLANT_WOODS, 1989);
  // Timber Straight is three pieces (one crest each on the first two); the length is the sum.
  const timberPieces = road.pieces.filter(item => item.name === 'Timber Straight');
  assert.equal(TREMBLANT_WOODS.laps, 3);
  assert.equal(road.walls.length, 0); assert.equal(course.features.walls.length, 0);
  assert.ok(road.pieces.every(item => item.width === 14));
  near(road.runoffAt(100, 1), 12, 0);
  assert.equal(timberPieces.length, 3);
  near(timberPieces.at(-1).s1 - timberPieces[0].s0, 1305, 3); assert.deepEqual(timberPieces.map(item => item.crest), [1.5, 2.5, 0]);
  assert.equal(piece(road, 'Ridge Run').crest, 2.5);
  assert.equal(piece(road, 'Pine Drop').crest, 2); assert.equal(piece(road, 'Beaver Hairpin').radius, 22);
});

test('scenery stays off the road, out of the runoff and off the inside of corners', () => {
  for (const circuit of ALL_CIRCUITS) {
    const course = new Course(circuit, 1989), road = course.script, f = course.features;
    assert.ok(f.trees.length + f.buildings.length > 20 && f.rocks.length > 3, `${circuit.id} has scenery`);
    for (const object of [...f.trees, ...f.rocks, ...f.mountains, ...f.buildings]) {
      const world = course.worldAt(object.s, object.off), found = course.nearest(world.x, world.z), side = Math.sign(found.lateral) || 1;
      assert.ok(found.distance > road.halfWidthAt(found.s) + Math.max(3, road.runoffAt(found.s, side)), `${circuit.id}: ${object.id ?? 'rock'} clear of the runoff`);
      const bend = road.pieceAt(found.s);
      if (bend.kind === 'turn' && side === bend.dir) assert.ok(found.distance > road.halfWidthAt(found.s) + 30, `${circuit.id}: inside of ${bend.name} stays open`);
    }
    assert.equal(new Course(circuit, 1989).features.trees.length, f.trees.length, 'the same seed gives the same scenery');
  }
});

for (const circuit of ALL_CIRCUITS.filter(def=>def.closed!==false)) {
  test(`${circuit.name}: the test driver completes every lap on Medium without a crash or getting stuck`, () => {
    // A winter circuit's reverse build is not driven here: its ice patches, boards and pit lane belong to the
    // forward road, and the reversed Beaver Hairpin on packed snow is a different corner (P4-VARIANTS builds
    // and tests reversed winter circuits with their own surfaces).
    for (const reverse of courseHasWinterSurfaces(circuit) ? [false] : [false, true]) {
      const def = reverse ? { ...circuit, id: `${circuit.id}-reverse-test`, reverse: true } : circuit;
      // The reverse build is driven alone: the existing rival was never taught a hairpin (P4-FIELD).
      // A winter circuit is driven on winter tyres, as a player would choose them on the setup.
      const run = driveCircuit(def, { cpuDifficulty: 'medium', opponentCount: reverse ? 0 : 1, tyre: courseHasWinterSurfaces(circuit) ? 'winter' : null });
      const label = `${def.id}: ${run.lapTimes.map(lapTime).join(' ')}`;
      assert.ok(run.finite && run.completed && run.laps === circuit.laps, label);
      assert.equal(run.crashes, 0, label); assert.equal(run.boundaryResets, 0, label); assert.equal(run.checkpointResets, 0, label);
      assert.ok(run.maxStuckSeconds < 1, label);
      // At least 90% of laps without touching a wall (centre kept on the road).
      const clean = run.lapEdge.slice(0, circuit.laps).filter(edge => edge < -.02).length;
      assert.ok(clean / circuit.laps >= .9, `${label} clean laps ${clean}/${circuit.laps}`);
      assert.ok(run.lapTimes.slice(1).every(time => time > 55 && time < 165), label);
    }
  });
}

test('the Lantern Hairpin is driveable: slow, wide and clean', () => {
  const run = driveCircuit(HARBOUR_LIGHTS, { cpuDifficulty: 'medium', opponentCount: 0 });
  const slowest = Math.min(...run.lapMinMph.slice(1));
  assert.ok(slowest > 12 && slowest < 35, `slowest speed on a flying lap ${slowest.toFixed(0)} mph`);
  assert.equal(run.crashes, 0);
  assert.ok(run.lapEdge.every(edge => edge < -.02), 'no lap touches a wall');
});
