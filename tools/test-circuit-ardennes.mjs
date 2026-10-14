import assert from 'node:assert/strict';
import test from 'node:test';
import {ARDENNES_FOREST, manifest} from '../src/circuits/ardennes-forest.js';
import {CIRCUIT_ENTRIES, CIRCUIT_MANIFESTS, BASE_COURSE_COUNT} from '../src/circuit-manifests.js';
import {ALL_CIRCUITS, CIRCUITS, circuitsEnabled} from '../src/circuits/index.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {COURSE_PRICES} from '../src/course-access.js';
import {COURSE} from '../src/config.js';
import {buildTrackScript} from '../src/track-script.js';
import {Course} from '../src/course.js';

// Ardennes Forest road layout (docs/CIRCUITS.md section 5.5, P4-ARDENNES-ROAD).
// Art, light, landmarks, the safety kit and the full field are later cards.
const near = (a, b, tolerance, message = '') => assert.ok(Math.abs(a - b) <= tolerance, `${message} ${a} differs from ${b}`);
const road = buildTrackScript(ARDENNES_FOREST), report = road.report;
const piece = name => road.pieces.find(item => item.name === name);

test('the fitted script closes, runs 6.6 to 6.8 km and keeps every grade at or under 25%', () => {
  assert.equal(road.pieces.length, 35, 'the 35 pieces of the section 5.5 table');
  assert.ok(road.length > 6600 && road.length < 6800, `length ${road.length.toFixed(1)} m`);
  assert.equal(road.length, ARDENNES_FOREST.lengthU);
  assert.ok(report.closureGap < 2, `gap before closing ${report.closureGap.toFixed(2)} m`);
  for (const change of report.straightChanges) assert.ok(Math.abs(change.percent) <= .1, `piece ${change.index + 1} changes ${change.percent.toFixed(3)}%`);
  near(Math.abs(report.turnSumDeg), 360, 2, 'turns add up to one lap');
  near(report.elevationLeftover, 0, 1e-9, 'climbs add up');
  const first = road.samples[0], last = road.samples.at(-1);
  near(Math.hypot(first.x - last.x, first.z - last.z), 0, 1e-6, 'first and last sample meet');
  assert.ok(report.highestGradePercent <= 25, `steepest ${report.highestGradePercent.toFixed(1)}%`);
  assert.ok(report.highestGradePercent > 22, 'The Wall is the steep one');
  assert.ok(report.highestGradeAt > piece('The Wall').s0 && report.highestGradeAt < piece('Wall Crest').s1, 'the steepest grade is on The Wall');
  assert.ok(road.pieces.filter(item => item.kind === 'turn').every(item => item.radius >= 16), 'tightest radius is 16 m');
});

test('the named corners are all there, in lap order', () => {
  const named = road.pieces.map(item => item.name).filter(Boolean);
  const order = ['Pit Straight', 'La Fontaine', 'The Plunge', 'Red Water', 'The Wall', 'Wall Crest', 'Kestrel Straight',
    'Les Combes', 'Combes Exit', 'Malmedy', 'Riverside', 'Woodland Left', 'Long Left', 'Fagnes', 'Fagnes Exit', 'Campus',
    'Stavelot', 'Forest Run', 'Woodcutter', 'Whitewood', 'Bus Stop', 'Bus Stop 2', 'Bus Stop Exit'];
  assert.deepEqual(named, order);
  const at = order.map(name => piece(name).s0);
  for (let i = 1; i < at.length; i++) assert.ok(at[i] > at[i - 1], `${order[i]} comes after ${order[i - 1]}`);
  assert.equal(piece('La Fontaine').radius, 16); assert.equal(piece('La Fontaine').dir, -1, 'a right-hander');
  assert.equal(piece('Whitewood').radius, 400); assert.equal(piece('Whitewood').dir, 1, 'a left');
  assert.equal(piece('Wall Crest').crest, 2.5);
  assert.ok(piece('Kestrel Straight').s1 - piece('Kestrel Straight').s0 > 1000, 'the long climb to Les Combes');
  assert.equal(road.startAt, 60); assert.equal(road.pieceAt(0).name, 'Pit Straight');
});

test('widths: 15 m, 16 m on Kestrel Straight, 13 m through the Bus Stop; no full-length walls', () => {
  const widths = Object.fromEntries(road.pieces.map(item => [item.index + 1, item.width]));
  // Table pieces 1 to 7: 15 m, then Kestrel Straight (7) at 16 m; 8 to 30 back at 15 m; 31 to 34 (Bus Stop to its exit) at 13 m; 35 at 15 m.
  for (let n = 1; n <= 35; n++) assert.equal(widths[n], n === 7 ? 16 : n >= 31 && n <= 34 ? 13 : 15, `piece ${n} width`);
  near(road.halfWidthAt(piece('Pit Straight').s0 + 150) * 2, 15, 1e-9);
  const kestrel = piece('Kestrel Straight');
  near(road.halfWidthAt((kestrel.s0 + kestrel.s1) / 2) * 2, 16, 1e-9);
  near(road.halfWidthAt(piece('Malmedy').s0 + 20) * 2, 15, 1e-9, 'back to 15 m well after Les Combes');
  near(road.halfWidthAt(piece('Bus Stop 2').s0 + 20) * 2, 13, 1e-9, 'through the Bus Stop');
  assert.equal(road.walls.length, 0, 'no wall spans');
  assert.ok(road.pieces.every(item => item.walls === 'none'));
  near(road.runoffAt(100, 1), 12, 0); near(road.runoffAt(100, -1), 12, 0);
  // The only wall-shaped boxes are the pit lane's own divider on Pit Straight.
  assert.equal(new Course(ARDENNES_FOREST, 1989).features.walls.filter(wall => !wall.pitWall).length, 0);
});

test('separate stretches of road stay at least 90 m apart, centre to centre', () => {
  const samples = road.samples, length = road.length;
  let closest = Infinity, where = null;
  for (let i = 0; i < samples.length; i++) for (let j = i + 1; j < samples.length; j++) {
    const along = Math.min(samples[j].s - samples[i].s, length - (samples[j].s - samples[i].s));
    if (along <= 400) continue;
    const gap = Math.hypot(samples[i].x - samples[j].x, samples[i].z - samples[j].z);
    if (gap < closest) { closest = gap; where = [samples[i].s, samples[j].s]; }
  }
  assert.ok(closest >= 90, `closest separate stretches ${closest.toFixed(1)} m apart at s ${where?.map(Math.round)}`);
});

test('the pit lane runs along the right of Pit Straight', () => {
  const course = new Course(ARDENNES_FOREST, 1989);
  assert.deepEqual([ARDENNES_FOREST.pitLane.straight, ARDENNES_FOREST.pitLane.side], ['Pit Straight', 'right']);
  assert.equal(course.pitLane.straight, 'Pit Straight'); assert.equal(course.pitLane.side, -1);
  assert.ok(course.pitLane.exit - course.pitLane.entry > 300);
});

test('Ardennes Forest is a dev circuit: registered last, priced, off by default, and COURSE is unchanged without its switch', () => {
  assert.equal(ARDENNES_FOREST.id, 'ardennes-forest'); assert.equal(ARDENNES_FOREST.flag, 'ardennes-forest');
  assert.equal(ARDENNES_FOREST.name, 'Ardennes Forest'); assert.equal(ARDENNES_FOREST.kind, 'circuit');
  assert.equal(ARDENNES_FOREST.closed, true); assert.equal(ARDENNES_FOREST.laps, 2); assert.equal(ARDENNES_FOREST.layoutVersion, 1);
  assert.equal(ARDENNES_FOREST.noTraffic, true); assert.equal(ARDENNES_FOREST.noCombat, true);
  assert.equal(ARDENNES_FOREST.hasRival, true); assert.equal(ARDENNES_FOREST.hasRadar, false);
  assert.equal(ARDENNES_FOREST.markings, 'circuit'); assert.equal(ARDENNES_FOREST.scriptStart, 60);
  assert.equal(ARDENNES_FOREST.stage, 21, 'generation identity after Summit Run (20)');
  assert.deepEqual(ARDENNES_FOREST.sections.map(row => row.name), ['Pit and Plunge', 'Kestrel and Combes', 'Forest Descent', 'Forest Run']);
  near(ARDENNES_FOREST.sections.reduce((sum, row) => sum + row.share, 0), 1, 1e-9, 'section shares');
  assert.ok(Object.isFrozen(manifest) && Object.isFrozen(manifest.driver));
  assert.deepEqual([manifest.id, manifest.flag, manifest.state, manifest.price, manifest.grandPrix],
    ['ardennes-forest', 'ardennes-forest', 'dev', 2000, true]);
  assert.equal(COURSE_PRICES['ardennes-forest'], 2000);
  assert.equal(FEATURE_STATES['ardennes-forest'], 'dev');
  const entry = CIRCUIT_ENTRIES.find(row => row.manifest.id === 'ardennes-forest');
  assert.equal(entry.definition, ARDENNES_FOREST, 'registry keeps the exact authored definition');
  assert.equal(entry.generationStage, 21);
  assert.equal(CIRCUIT_MANIFESTS.at(-1).id, 'ardennes-forest', 'last in release order');
  assert.equal(CIRCUIT_MANIFESTS.at(-2).id, 'summit-run', 'straight after Summit Run');
  assert.ok(CIRCUIT_MANIFESTS.every(row => row.id === 'ardennes-forest' || row.releaseOrder < manifest.releaseOrder), 'released courses keep their places');
  assert.equal(ALL_CIRCUITS.at(-1), ARDENNES_FOREST);
  // Switch off: players and tests see COURSE exactly as before.
  const released = CIRCUIT_MANIFESTS.filter(row => row.state === 'on').map(row => row.id);
  assert.ok(!CIRCUITS.some(circuit => circuit.id === 'ardennes-forest'));
  assert.ok(!COURSE.some(event => event.id === 'ardennes-forest'));
  assert.equal(COURSE.length, BASE_COURSE_COUNT + released.length);
  assert.deepEqual(COURSE.slice(BASE_COURSE_COUNT).map(row => row.id), released, 'COURSE is the base events plus the released circuits only');
  const player = createFeatureFlags({storage: null, qa: false, search: '?flags=ardennes-forest'});
  assert.equal(player.enabled('ardennes-forest'), false, 'a player build ignores the dev switch');
  assert.deepEqual(circuitsEnabled(player).map(circuit => circuit.id), released);
  // Switch on in a QA build: it joins the end of the list after every released course.
  const qa = createFeatureFlags({storage: null, qa: true, search: '?flags=ardennes-forest'});
  assert.equal(qa.enabled('ardennes-forest'), true);
  assert.deepEqual(circuitsEnabled(qa).map(circuit => circuit.id), [...released, 'ardennes-forest']);
});
