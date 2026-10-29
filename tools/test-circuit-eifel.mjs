import assert from 'node:assert/strict';
import test from 'node:test';
import {EIFEL_CROWN, manifest} from '../src/circuits/eifel-crown.js';
import {buildTrackScript} from '../src/track-script.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {applyCircuits} from '../src/circuits/index.js';
import {registerCircuits, CIRCUIT_ENTRIES} from '../src/circuit-manifests.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {EXPANSION_COURSES} from '../src/expansion-courses.js';
import {GRAND_PRIX_COURSES} from '../src/grand-prix-career.js';
import {driveCircuit} from './track-script-drive.mjs';
import {traceCourse, buildPilotMap} from './build-pilot-map.mjs';
import {installReferenceFixture} from './build-reference-laps.mjs';

const road = buildTrackScript(EIFEL_CROWN);
const named = name => road.pieces.find(piece => piece.name === name);

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
