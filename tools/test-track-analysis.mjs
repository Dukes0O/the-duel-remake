import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleCourseLightPath} from '../src/light-path.js';
import {snowWorldEnabled, winterLightingSettings} from '../src/snow-world.js';
import {
  analyseTrack, sampleCourse, detectCorners, detectCrests, longestStraight,
  namedPieces, nameFeatures, cornerSpeeds, markSlowCorners, referenceSpeedColour, trackSectors,
  cornerId, resolveTrackIntel, courseFingerprint, buildTrackDossier, analyseLap, trackSnapshotPose,
  SNAPSHOT_UP, SNAPSHOT_CHASE, SNAPSHOT_MAX_APPROACH, CREST_FOLD_BEFORE_M, CREST_FOLD_AFTER_M, angleDistance,
} from '../src/track-analysis.js';
import {buildReview, drawMap} from './track-review.mjs';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {buildTrackScript} from '../src/track-script.js';
import {getRouteVariants} from '../src/route-variants.js';
import {teamRoomMarkup, teamRoomMap, MAP_LABEL} from '../src/screen-team-room.js';
import {referenceLap} from '../src/reference-laps.js';
import {circuitIntel} from '../src/circuit-intel/index.js';
import {courseAccessPanel} from '../src/course-access-ui.js';
import {createProfile} from '../src/progression.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const near = (actual, expected, error, message) => check(Math.abs(actual - expected) <= error, message);
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

// A known stadium, independent of the game's course generator. The 6 m hump
// sits midway along a straight and the two semicircles each have radius 150 m.
function stadium({hump = true, shift = 0, humpAt = 350} = {}) {
  const straight = 700, radius = 150, arc = Math.PI * radius;
  const length = 2 * straight + 2 * arc;
  const phase = raw => ((raw + shift) % length + length) % length;
  return freeze({
    closed: true, length, def: {id: 'test-stadium', name: 'Test Stadium'},
    features: {ramps: []},
    at(raw) {
      const s = phase(raw);
      if (s < straight) return {x: 0, z: s, y: 0, heading: 0};
      if (s < straight + arc) {
        const a = (s - straight) / radius;
        return {x: radius - radius * Math.cos(a), z: straight + radius * Math.sin(a), y: 0, heading: a};
      }
      if (s < 2 * straight + arc)
        return {x: 2 * radius, z: straight - (s - straight - arc), y: 0, heading: Math.PI};
      const a = (s - 2 * straight - arc) / radius;
      return {x: radius + radius * Math.cos(a), z: -radius * Math.sin(a), y: 0, heading: Math.PI + a};
    },
    groundAt(raw) {
      return {y: hump ? 6 * Math.exp(-(((phase(raw) - humpAt) / 40) ** 2)) : 0};
    },
  });
}

const course = stadium();
const playerProfile = freeze(createProfile());
check(!courseAccessPanel(playerProfile).includes('data-team-room'), 'Team Room entry stays absent unless its real feature switch enables it');
const enabledEntries = courseAccessPanel(playerProfile, 0, '', {teamRoomEnabled: true});
check(/data-team-room="pacific-canyon"[^>]*>TEAM ROOM/.test(enabledEntries), 'An owned circuit gets a Team Room entry');
check(/data-team-room="high-country"[^>]*disabled/.test(enabledEntries), 'A locked circuit cannot open Team Room');
const profile = sampleCourse(course);
const corners = detectCorners(profile);
equal(corners.length, 2, 'Two semicircles yield two corners');
equal(corners.map(corner => corner.direction), ['L', 'L'], 'Heading convention stays left-positive');
for (const corner of corners) {
  near(corner.radius, 150, 12, 'The measured circle radius stays accurate');
  near(corner.degrees, 180, 12, 'The half-circle remains a half-circle');
}
near(corners[0].apexS, 700 + Math.PI * 75, 40, 'The apex sits midway through the arc');
equal(corners.map(corner => corner.number), [1, 2], 'Numbers follow lap order');
const crests = detectCrests(profile);
equal(crests.length, 1, 'One isolated hump produces one crest');
near(crests[0].s, 350, 20, 'Crest is at the actual hump');
equal(detectCrests(sampleCourse(stadium({hump: false}))), [], 'Flat road has no invented crest');
near(longestStraight(profile).length, 700, 60, 'Measured straight agrees with known geometry');

const seam = detectCorners(sampleCourse(stadium({shift: 700 + Math.PI * 75})));
equal(seam.length, 2, 'A corner crossing the start seam is not split or lost');
check(seam.some(corner => corner.entryS > corner.exitS), 'Seam fixture actually crosses the start line');
check(seam.every(corner => corner.apexS >= 0 && corner.apexS < course.length), 'Apex distance stays on the closed lap');

const sourcePieces = freeze({script: {pieces: [
  {kind: 'turn', name: 'Long Left', s0: 700, s1: 700 + Math.PI * 150},
  {kind: 'straight', name: 'Pit Straight', s0: 0, s1: 700},
  {kind: 'turn', name: 'Broken', s0: NaN, s1: 20},
]}});
const pieces = namedPieces(sourcePieces);
equal(pieces.map(piece => piece.name), ['Long Left', 'Pit Straight'], 'Only valid authored names enter the analysis');
nameFeatures({corners, crests, straight: null, pieces, length: course.length});
equal(corners.map(corner => corner.name), ['Long Left', null], 'Existing unnamed corners retain their fallback');
equal(corners[0].label, '1 Long Left', 'Authored name follows the stable corner number');

const trace = [];
for (let s = 0; s < course.length; s += 10) {
  const distance = Math.min(...corners.map(corner => Math.abs(s - corner.apexS)));
  const mph = distance < 60 ? 80 : distance < 300 ? 80 + (distance - 60) / 240 * 100 : 180;
  trace.push({s, mph, t: s / 50, lateral: 0, air: false, lap: 0});
}
freeze(trace);
cornerSpeeds(corners, trace, course.length);
markSlowCorners(corners, 180);
check(corners.every(corner => corner.slow && corner.braked && corner.minMph === 80), 'Slow flags use actual reference speed drops');
check(corners.every(corner => corner.brakeS < corner.apexS - 100), 'Reference braking is before the apex');

const before = JSON.stringify({course, sourcePieces, trace});
const originalRandom = Math.random;
let analysis;
try {
  Math.random = () => { throw Error('Analysis must not draw randomness'); };
  analysis = analyseTrack(course, {trace});
  equal(analyseTrack(course, {trace}), analysis, 'Repeated analysis is exact');
} finally { Math.random = originalRandom; }
equal(JSON.stringify({course, sourcePieces, trace}), before, 'Frozen course, names and trace are untouched');

const review = buildReview({course, courseDef: {...course.def, laps: 1}, trace,
  lapTimes: [course.length / 50], gridS: 0,
  options: {car: 'falcone_f42', seed: 1989, quality: 'high'}});
equal(analysis.profile, review._profile, 'The Team Room samples the exact review-tool centreline');
equal(analysis.corners, review._corners, 'Corner positions, speeds and labels agree with the review');
equal(analysis.crests, review._crests, 'Crest positions and reference observations agree with the review');
equal(analysis.straight, review._straight, 'The straight geometry agrees with the review');
equal(analysis.mapPoints.length, profile.rows.length, 'Every map segment has a sampled reference value');
check(analysis.mapPoints.every(point => Number.isFinite(point[2])), 'Supplied reference speed colours the whole map');
equal(analysis.reference.topMph, 180, 'Reference top speed comes from the supplied trace');

const unmeasured = analyseTrack(course);
equal(unmeasured.reference, null, 'Missing reference is explicitly unmeasured');
check(unmeasured.corners.every(corner => corner.minMph === null && corner.approachMph === null), 'No invented corner target speed');
check(unmeasured.mapPoints.every(point => point[2] === null), 'No invented zero-speed reference map');
equal(referenceSpeedColour(0, 0, 180), 'rgb(53,99,214)', 'Existing slow blue stays exact');
equal(referenceSpeedColour(60, 0, 180), 'rgb(41,184,190)', 'Existing cyan stop stays exact');
equal(referenceSpeedColour(120, 0, 180), 'rgb(240,214,64)', 'Existing yellow stop stays exact');
equal(referenceSpeedColour(180, 0, 180), 'rgb(232,86,52)', 'Existing fast red stays exact');
equal(referenceSpeedColour(-20, 0, 180), referenceSpeedColour(0, 0, 180), 'Colour clamps below the measured range');
equal(referenceSpeedColour(220, 0, 180), referenceSpeedColour(180, 0, 180), 'Colour clamps above the measured range');

equal(trackSectors(3000), [
  {number: 1, startS: 0, endS: 1000, lengthM: 1000},
  {number: 2, startS: 1000, endS: 2000, lengthM: 1000},
  {number: 3, startS: 2000, endS: 3000, lengthM: 1000},
], 'The approved fallback is three equal distance sectors');
const unevenSectors = trackSectors(course.length);
equal(unevenSectors[0].startS, 0, 'Sectors begin at the start line');
equal(unevenSectors.at(-1).endS, course.length, 'The final sector reaches the actual finish without rounding');
check(unevenSectors.every((sector, index) => index === 0 || sector.startS === unevenSectors[index - 1].endS),
  'A non-round lap length leaves no gaps or overlap');
equal(analyseTrack(course).sectors, unevenSectors, 'Runtime analysis carries the same distance sectors');
for (const badLength of [0, -1, NaN, Infinity]) {
  assert.throws(() => trackSectors(badLength), TypeError); checks++;
}
equal(trackSectors(3000, [800, 2100]).map(sector => [sector.startS, sector.endS]),
  [[0, 800], [800, 2100], [2100, 3000]], 'Authored starts replace both fallback boundaries');
for (const badStarts of [[20], [0, 200], [200, 100], [100, 3000], [100, NaN], [100, 100]]) {
  assert.throws(() => trackSectors(3000, badStarts), TypeError); checks++;
}
equal(cornerId({number: 2, name: 'Hell Gate'}), 'hell-gate', 'Named corner IDs match the approved slug schema');
equal(cornerId({number: 2, name: null}), 'c2', 'Unnamed corner IDs stay in lap order');

const writtenIntel = freeze({
  sectors: [600, 1600],
  flags: [{id: 'signature-view', kind: 'signature', s: 350, title: 'The Hump', camera: {back: 18, up: 1.3, ahead: 55}}],
  notes: {c1: {gear: 3, line: 'Keep the exit open.', note: '<em>Plain text, not markup.</em>'}},
  routes: {route_b: {sectors: [500, 1500], notes: {c1: {gear: 4}},
    flags: [{id: 'signature-view', title: 'Route B Hump', camera: {back: 24}}]}},
});
const authoredCourse = freeze({...course, def: {...course.def, intel: writtenIntel}});
const resolved = resolveTrackIntel(authoredCourse, 'route_b');
equal(resolved.sectors, [500, 1500], 'Route boundaries override event boundaries');
equal(resolved.notes.c1, {gear: 4, line: 'Keep the exit open.', note: '<em>Plain text, not markup.</em>'},
  'Route notes override fields while preserving other authored fields');
equal(resolved.flags[0], {id: 'signature-view', kind: 'signature', s: 350, title: 'Route B Hump',
  camera: {back: 24, up: 1.3, ahead: 55}}, 'Route flag patches preserve base kind, position and camera fields');
equal(resolveTrackIntel(course, 'fixed', {notes: {c2: {line: 'Use the whole exit.'}}}).notes.c2.line,
  'Use the whole exit.', 'Existing-circuit registry data enters the same metadata path');

const fingerprint = courseFingerprint(course);
const lapTrace = freeze([...trace.map(row => ({...row, gear: 2})),
  {s: course.length, t: course.length / 50, mph: trace[0].mph, gear: 2}]);
const measuredLap = analyseLap(course, {trace: lapTrace, lapMs: Math.round(course.length / 50 * 1000)});
equal(measuredLap.courseFingerprint, fingerprint, 'Player and reference lap metrics use the same native geometry fingerprint');
equal(measuredLap.sectorMs.reduce((sum, time) => sum + time, 0), measuredLap.lapMs,
  'Measured sector times sum to the authoritative native lap time');
equal(measuredLap.trace.slice(0, 3).map(row => row[0]), [0, 20, 40], 'Shared compact trace uses 20 metre samples');
equal(measuredLap.trace[0][1], Math.round(lapTrace[0].mph * 1.609344), 'Shared compact trace stores kph');
equal(measuredLap.corners.map(row => row.id), ['c1', 'c2'], 'Shared corner metrics use lap-ordered stable identities');
check(measuredLap.corners.every(row => row.minKph === 129 && row.gear === 3),
  'Corner minimum speed is measured and native zero-based gear is displayed one-based');
equal(measuredLap.corners.map(row => row.elapsedMs), analysis.corners.map(corner => Math.round(corner.span / 50 * 1000)),
  'Corner elapsed time comes from actual entry and exit crossing timestamps');
const seamCourse = stadium({shift: 700 + Math.PI * 75});
const seamLap = analyseLap(seamCourse, {trace: lapTrace, lapMs: measuredLap.lapMs});
check(seamLap.corners.every(row => row.elapsedMs > 0 && row.elapsedMs < measuredLap.lapMs / 2),
  'A corner across the start line has a positive, bounded crossing time');
// Recorder output keeps final forward distance crossings: reverse travel adds
// elapsed time, and its signed native observations remain valid input.
const reversedTrace = freeze(lapTrace.map(row => ({...row,
  t: row.t + (row.s >= 1000 ? 5 : 0),
  mph: row.s === 940 ? -4 : row.mph, gear: row.s === 940 ? -1 : row.gear})));
const reverseBefore = JSON.stringify(reversedTrace);
const reversedLap = analyseLap(course, {trace: reversedTrace, lapMs: measuredLap.lapMs + 5000});
equal(reversedLap.corners[0].minKph, 6, 'Reverse speed contributes its magnitude to the corner minimum');
equal(reversedLap.corners[0].gear, 'R', 'Signed native reverse gear displays as R');
equal(reversedLap.trace.find(row => row[0] === 940)[1], 6, 'The speed plot uses reverse speed magnitude');
equal(reversedLap.corners[0].elapsedMs, measuredLap.corners[0].elapsedMs + 5000,
  'Time spent reversing remains inside the actual corner crossing time');
equal(reversedLap.sectorMs.reduce((sum, value) => sum + value, 0), measuredLap.lapMs + 5000,
  'Sector timing retains all elapsed reverse time');
equal(JSON.stringify(reversedTrace), reverseBefore, 'Signed player trace is never rewritten in place');
const reverseSeamTrace = freeze(lapTrace.map(row => ({...row,
  t: row.t + (row.s >= 100 ? 5 : 0), mph: row.s === 0 ? -4 : row.mph,
  gear: row.s === 0 ? -1 : row.gear})));
const reverseSeamLap = analyseLap(seamCourse, {trace: reverseSeamTrace, lapMs: measuredLap.lapMs + 5000});
const seamIndex = seam.findIndex(corner => corner.entryS > corner.exitS);
equal(reverseSeamLap.corners[seamIndex].elapsedMs, seamLap.corners[seamIndex].elapsedMs + 5000,
  'A seam corner includes reverse delay near the start line exactly once');
equal(reverseSeamLap.corners[seamIndex].gear, 'R', 'A seam corner preserves reverse gear at its minimum');
equal(analyseLap(course, {trace: lapTrace, lapMs: measuredLap.lapMs}), measuredLap,
  'Forward-only reference metrics remain exactly unchanged');
const ring = {closed: true, length: Math.PI * 300, def: {id: 'ring'}, features: {},
  at: s => ({x: 150 * Math.sin(s / 150), z: 150 * Math.cos(s / 150), heading: s / 150}),
  groundAt: () => ({y: 0})};
const ringLap = analyseLap(ring, {lapMs: 60000, trace: [
  {s: 0, t: 0, mph: 80, gear: 3}, {s: ring.length, t: 60, mph: 80, gear: 3}]});
equal(ringLap.corners.map(row => row.elapsedMs), [60000],
  'A continuous full-lap corner has the whole lap time, not zero at its coincident entry and exit');
const unequalSectors = analyseLap(course, {trace: lapTrace, lapMs: measuredLap.lapMs,
  authored: {sectors: [500, 1500]}});
equal(unequalSectors.sectorMs, [10000, 20000, measuredLap.lapMs - 30000],
  'Shared lap timing interpolates authored distance boundaries');
for (const invalid of [lapTrace.slice(1), lapTrace.slice(0, -1),
  lapTrace.map((row, i) => i === 2 ? {...row, t: -1} : row),
  lapTrace.map((row, i) => i === 2 ? {...row, gear: NaN} : row),
  lapTrace.map((row, i) => i === 2 ? {...row, gear: -2} : row)]) {
  assert.throws(() => analyseLap(course, {trace: invalid, lapMs: measuredLap.lapMs}), /complete|trace|gear/i); checks++;
}
equal(courseFingerprint(stadium()), fingerprint, 'Equivalent native geometry fingerprints match');
check(courseFingerprint(stadium({hump: false})) !== fingerprint, 'A changed crest makes the reference stale');
check(courseFingerprint({...course, roadHalfWidthAt: () => 9}) !== fingerprint, 'Road width changes make the reference stale');
equal(courseFingerprint({...course, def: {...course.def, name: 'Other menu title'}}), fingerprint,
  'A cosmetic event title does not pretend to change its geometry');

const reference = {eventId: course.def.id, route: 'fixed', seed: 1989, car: 'stuttgart_959s', driver: 'club', cpu: 'medium',
  fixtureVersion: 1, courseFingerprint: fingerprint, lapMs: 100000, sectorMs: [33333, 33333, 33334],
  trace: trace.map(row => [row.s, Math.round(row.mph * 1.609344)]),
  corners: analysis.corners.map(corner => ({id: cornerId(corner), s: corner.apexS, brakeS: corner.brakeS,
    entryKph: 240, minKph: 129, exitKph: 170, gear: 3}))};
freeze(reference);
const dossier = buildTrackDossier(course, {reference});
const room = teamRoomMarkup({...dossier, name: '<img src=x onerror=fail>'});
check(room.includes('&lt;img src=x onerror=fail&gt;') && !room.includes('<img src=x'),
  'Dossier titles remain escaped text rather than executable markup');
check(room.includes('Reference lap: Stuttgart 959-S') && room.includes('data-team-flag="signature"'),
  'Dossier exposes the fixed reference identity and a selectable signature');
const map = teamRoomMap(dossier);
equal(map.corners.length, analysis.corners.length, 'The dossier map includes every numbered corner');
equal(map.flags.length, dossier.flags.length, 'Every hot-spot flag appears on the map');
check(map.segments.every(segment => /^rgb\(/.test(segment.colour)), 'Map segments use actual reference-speed colours');
equal(dossier.flags.filter(flag => flag.kind === 'corner').length, dossier.analysis.corners.filter(corner => corner.slow).length,
  'Every slow corner has a selectable flag');
// Changed in P4-FINISH-TEAMROOM (crest folding): a crest on the same spot as the signature view no longer gets a
// second flag, so the check is now that every crest has a flag standing on it, a crest flag or the signature view.
check(dossier.analysis.crests.every(crest => dossier.flags.some(flag =>
  ['crest', 'signature'].includes(flag.kind) && Math.abs(angleDistance(flag.s, crest.s, course.length)) < 1)),
'Every crest has a selectable flag, or the signature view standing on it');
equal(dossier.flags.filter(flag => flag.kind === 'signature').length, 1, 'Exactly one generated signature is present');
check(dossier.flags.some(flag => flag.kind === 'overtaking'), 'A native approach supplies an overtaking flag');
equal(new Set(dossier.flags.map(flag => flag.id)).size, dossier.flags.length, 'Flag identities are unique');
check(dossier.flags.every(flag => flag.snapshotS >= 0 && flag.snapshotS < course.length), 'Every live snapshot has a bounded native approach position');
const firstCornerFlag = dossier.flags.find(flag => flag.id === 'c1');
// The Team Room picture is an elevated chase view (Kyle, 11 October 2026, replacing the driver's-seat view).
const cameraPose = trackSnapshotPose(course, {snapshotS: 350, camera: {up: SNAPSHOT_UP, ahead: 70}});
near(cameraPose.position.z, 350 - SNAPSHOT_CHASE, 1e-8, 'Snapshot eye stands behind the viewing point on the road');
near(cameraPose.position.y, course.groundAt(350 - SNAPSHOT_CHASE).y + SNAPSHOT_UP, 1e-8, 'Snapshot eye floats above the native ground at its actual position');
check(SNAPSHOT_UP >= 8 && SNAPSHOT_UP <= 10 && SNAPSHOT_CHASE >= 15 && SNAPSHOT_CHASE <= 20, 'Elevated chase view is 8 to 10 m up and 15 to 20 m back');
near(cameraPose.target.z, 420, 1e-8, 'Snapshot looks ahead along the native course');
near(cameraPose.target.y, course.groundAt(420).y, 1e-8, 'Snapshot aims at the road surface, not at eye height');
check(cameraPose.target.y < cameraPose.position.y - 5, 'Snapshot looks down at the road from above');
assert.throws(() => trackSnapshotPose(course, {snapshotS: NaN, camera: {up: 1.2, ahead: 70}}), /snapshot/i); checks++;
// Execute the snapshot's real renderer call against the native path sampler.
// A menu-status App must still inspect the light at the selected road position.
const rendererSource = readFileSync(new URL('../src/render3d.js', import.meta.url), 'utf8');
const snapshotSource = rendererSource.slice(rendererSource.indexOf('function drawTrackSnapshot('),
  rendererSource.indexOf('let ready = false'));
const lightingCall = snapshotSource.match(/lighting\.apply\((\{[\s\S]*?\})\);/)[1];
const lightCourse = freeze({...course, raceLength: course.length * 3,
  def: {...course.def, theme: 'coast', lightPath: {axis: 'distance',
    keyframes: [{at: 0, look: 'day'}, {at: 800, look: 'night'}]}},
  themeAt: () => 'coast', tunnelAt: () => false});
const menuApp = freeze({duel: {state: {status: 'menu', s: 12}}, profile: {name: 'Memory player'}, lightingMood: 'clear'});
const menuBefore = JSON.stringify(menuApp);
const winterEnabled = next => snowWorldEnabled(next, menuApp._switches?.() ?? menuApp.duel.featureFlags);
const snapshotInputs = new Function('course', 'app', 'distance', 'winterEnabled', 'winterLightingSettings',
  `return (${lightingCall});`)(lightCourse, menuApp, 900, winterEnabled, winterLightingSettings);
equal(sampleCourseLightPath(lightCourse, snapshotInputs).settings.nightAmount, 1,
  'A late-course snapshot samples actual night lighting despite menu race status');
equal(sampleCourseLightPath(lightCourse, {...snapshotInputs, distance: 0}).settings.nightAmount, 0,
  'The same authored path remains daytime at the start');
equal(JSON.stringify(menuApp), menuBefore, 'Snapshot lighting input leaves race and profile unchanged');
const firstCorner = reference.corners[0];
equal(firstCornerFlag.snapshotS, firstCorner.s - SNAPSHOT_MAX_APPROACH,
  'A corner braked for from far back is viewed from no further than the maximum approach, so the corner stays in frame');
equal(firstCornerFlag.camera.ahead, SNAPSHOT_MAX_APPROACH, 'A corner view is aimed at its apex');
const shortBrake = buildTrackDossier(course, {reference: {...reference, corners: reference.corners.map(row => ({...row, brakeS: row.s - 40}))}});
equal(shortBrake.flags.find(flag => flag.id === 'c1').snapshotS, firstCorner.s - 40,
  'A corner braked for from close by is viewed from its actual reference braking point');
equal(firstCornerFlag.engineer.targetKph, 129, 'Generated target speed comes from the actual reference corner');
equal(firstCornerFlag.engineer.gear, 3, 'Generated gear comes from the actual reference corner');
equal(firstCornerFlag.engineer.brakeBoard, null, 'Generated notes do not invent a braking board');
const authoredDossier = buildTrackDossier(authoredCourse, {route: 'route_b',
  reference: {...reference, route: 'route_b', courseFingerprint: courseFingerprint(authoredCourse, {route: 'route_b'})}});
equal(authoredDossier.flags.filter(flag => flag.kind === 'signature').map(flag => flag.title), ['Route B Hump'],
  'The authored signature replaces the generated signature');
equal(authoredDossier.flags.find(flag => flag.id === 'c1').engineer.gear, 4, 'Authored note fields override measured defaults');
equal(authoredDossier.flags.find(flag => flag.id === 'c1').engineer.targetKph, 129, 'Generated data only fills missing authored fields');
equal(authoredDossier.flags.find(flag => flag.id === 'c1').engineer.note, '<em>Plain text, not markup.</em>',
  'Author text is retained as data for safe rendering');
assert.throws(() => buildTrackDossier(course, {reference: {...reference, courseFingerprint: 'stale'}}), /rebuild|stale/i); checks++;
assert.throws(() => buildTrackDossier(course, {route: 'route_b', reference}), /route|reference/i); checks++;

// Crest folding (P4-FINISH-TEAMROOM): a generated crest flag that only repeats a nearby corner or the signature
// view is dropped; a crest on open road, and any written flag, stays.
{
  const apex = analysis.corners[0].apexS, seen = {folded: 0, kept: 0};
  const startView = {flags: [{id: 'start-view', kind: 'signature', s: 100, title: 'Start view'}]};
  const dossierWith = (hill, authored) => buildTrackDossier(hill, {authored,
    reference: {...reference, courseFingerprint: courseFingerprint(hill, {authored})}});
  for (const humpAt of [apex - 100, apex - 140, apex - 175, apex - 30, apex + 40, apex + 90, 350]) {
    const hill = stadium({humpAt}), result = dossierWith(hill, startView);
    const crest = result.analysis.crests[0];
    const near = result.analysis.corners.filter(corner => corner.slow).some(corner => {
      const gap = angleDistance(corner.apexS, crest.s, hill.length);
      return gap >= -CREST_FOLD_AFTER_M && gap <= CREST_FOLD_BEFORE_M;
    });
    const flagged = result.flags.some(flag => flag.kind === 'crest' && flag.id === `crest-${crest.number}`);
    equal(flagged, !near, `A crest at ${Math.round(crest.s)} m is ${near ? 'folded into its corner' : 'kept on open road'}`);
    seen[near ? 'folded' : 'kept']++;
  }
  check(seen.folded >= 3 && seen.kept >= 2, 'The folding check covers crests both inside and outside the corner window');
  const onCorner = stadium({humpAt: apex - 100});
  const written = dossierWith(onCorner, {flags: [...startView.flags, {id: 'crest-1', kind: 'crest', s: apex - 100, title: 'Written crest'}]});
  check(written.flags.some(flag => flag.id === 'crest-1' && flag.title === 'Written crest' && flag.generated === false),
    'A written crest flag is never folded away');
  const onSignature = dossierWith(stadium(), undefined);
  equal(onSignature.flags.filter(flag => flag.kind === 'crest').length, 0, 'A generated crest on the signature view is not flagged twice');
  check(onSignature.flags.some(flag => flag.kind === 'signature' && Math.abs(flag.s - onSignature.analysis.crests[0].s) < 1),
    'The signature view stays on the crest it stands for');
}

// Written notes for the older courses (P4-FINISH-TEAMROOM): every note lands on a real corner or a written flag,
// every corner flag has a written line and note, and the words follow the house voice.
{
  const olderCourses = COURSE.filter(entry => entry.closed !== false && !ALL_CIRCUITS.some(circuit => circuit.id === entry.id));
  check(olderCourses.length >= 16, 'The older closed courses are all found');
  const texts = [];
  let written = 0;
  for (const definition of olderCourses) {
    const intel = circuitIntel(definition.id);
    check(intel, `${definition.id} has engineer notes registered`);
    const routes = getRouteVariants(definition);
    for (const route of routes) {
      const routeKey = routes.length > 1 ? route.id : 'fixed';
      const reference = referenceLap(definition.id, routeKey);
      check(reference, `${definition.id}|${routeKey} has a reference lap`);
      const native = new Course(definition, reference.seed);
      const dossier = buildTrackDossier(native, {route: routeKey, reference});
      const resolved = dossier.intel, label = `${definition.id}|${routeKey}`;
      const flagIds = new Set(dossier.flags.map(flag => flag.id)), cornerIds = new Set(dossier.analysis.corners.map(cornerId));
      for (const id of Object.keys(resolved.notes))
        check(cornerIds.has(id) || flagIds.has(id), `${label}: note "${id}" lands on a real corner or flag`);
      for (const flag of resolved.flags) {
        check(Number.isFinite(flag.s) && flag.s >= 0 && flag.s < native.length, `${label}: written flag ${flag.id} sits on the lap`);
        if (flag.kind === 'corner') check(cornerIds.has(flag.id), `${label}: written corner flag ${flag.id} is a real corner`);
      }
      equal(resolved.sectors, undefined, `${label}: written notes leave the sectors, and so the reference lap, alone`);
      for (const flag of dossier.flags.filter(item => item.kind === 'corner' || item.generated === false)) {
        const engineer = flag.engineer;
        check(typeof engineer.line === 'string' && engineer.line.length > 20 && typeof engineer.note === 'string' && engineer.note.length > 20,
          `${label}: ${flag.id} has a written line and note`);
        if (flag.kind === 'corner') check(engineer.authored === true, `${label}: corner flag ${flag.id} uses the written note`);
        check(!Number.isFinite(engineer.brakeBoard), `${label}: ${flag.id} names no brake board where none stands`);
        texts.push(engineer.line, engineer.note, flag.title);
        written++;
      }
      check(dossier.flags.filter(flag => flag.kind === 'signature').length === 1 &&
        dossier.flags.some(flag => flag.kind === 'overtaking' && flag.generated === false), `${label}: signature and passing zone are written`);
    }
  }
  check(written >= 60, 'The written notes cover a large number of flags');
  for (const text of texts) {
    check(!/—/.test(text), `No em dash in: ${text}`);
    check(!/load-bearing|\bquiet|\bsilent/i.test(text), `Word rule kept in: ${text}`);
  }
}

// Written notes for the reverse variants (TEAMROOM-VARIANT-NOTES): the same checks as the older courses, keyed to the
// variant's own corners (met in the opposite order and direction), plus: a brake board is named only where one
// stands in the world, and the dusk and night variants show exactly their parent's notes.
{
  const wrapS = (s, length) => ((s % length) + length) % length;
  const texts = [];
  let written = 0;
  for (const id of ['tremblant-woods-reverse', 'harbour-lights-reverse', 'panorama-ridge-reverse']) {
    const definition = ALL_CIRCUITS.find(circuit => circuit.id === id), reference = referenceLap(id);
    check(circuitIntel(id), `${id} has engineer notes registered`);
    check(reference, `${id} has a reference lap`);
    const native = new Course(definition, reference.seed), road = buildTrackScript(definition);
    const dossier = buildTrackDossier(native, {reference}), resolved = dossier.intel;
    const flagIds = new Set(dossier.flags.map(flag => flag.id)), cornerIds = new Set(dossier.analysis.corners.map(cornerId));
    for (const key of Object.keys(resolved.notes))
      check(cornerIds.has(key) || flagIds.has(key), `${id}: note "${key}" lands on a real corner or flag`);
    for (const corner of dossier.analysis.corners.filter(item => item.slow))
      check(resolved.notes[cornerId(corner)], `${id}: slow corner ${cornerId(corner)} has a written note`);
    equal(resolved.sectors, undefined, `${id}: written notes leave the sectors, and so the reference lap, alone`);
    equal(Object.keys(resolved).filter(key => key === 'sectors'), [], `${id}: no sectors key at all`);
    for (const flag of resolved.flags) {
      check(Number.isFinite(flag.s) && flag.s >= 0 && flag.s < native.length, `${id}: written flag ${flag.id} sits on the lap`);
      if (flag.kind === 'corner') check(cornerIds.has(flag.id), `${id}: written corner flag ${flag.id} is a real corner`);
    }
    for (const flag of dossier.flags.filter(item => item.kind === 'corner' || item.generated === false)) {
      const engineer = flag.engineer;
      check(typeof engineer.line === 'string' && engineer.line.length > 20 && typeof engineer.note === 'string' && engineer.note.length > 20,
        `${id}: ${flag.id} has a written line and note`);
      if (flag.kind === 'corner') check(engineer.authored === true, `${id}: corner flag ${flag.id} uses the written note`);
      texts.push(engineer.line, engineer.note, flag.title);
      written++;
    }
    check(dossier.flags.filter(flag => flag.kind === 'signature').length === 1, `${id}: one written signature view`);
    const passing = dossier.flags.filter(flag => flag.kind === 'overtaking');
    check(passing.length >= 1 && passing.length <= 2 && passing.every(flag => flag.generated === false), `${id}: passing zones are written`);
    // A named board must stand that far before the corner, as a script board or a placed board.
    for (const corner of dossier.analysis.corners) {
      const board = resolved.notes[cornerId(corner)]?.brakeBoard;
      if (!Number.isFinite(board)) continue;
      const piece = road.pieces.find(item => item.kind === 'turn' && item.name === corner.name);
      check(piece, `${id}: ${cornerId(corner)} names a board and is a scripted turn`);
      const stands = road.boards.some(item => item.name === piece.name && item.distance === board) ||
        definition.kitPlacements.some(item => item.id === `braking-board-${board}` && Math.abs(item.s - wrapS(piece.s0 - board, road.length)) < 1);
      check(stands, `${id}: a ${board} m board stands before ${corner.name}`);
    }
  }
  check(written >= 40, 'The reverse variants carry written notes');
  for (const text of texts) {
    check(!/—/.test(text), `No em dash in: ${text}`);
    check(!/load-bearing|\bquiet|\bsilent/i.test(text), `Word rule kept in: ${text}`);
  }
  // Same road, same direction: the dusk and night variants carry their parent's notes and flags unchanged.
  for (const [id, parentId] of [['harbour-lights-dusk', 'harbour-lights'], ['panorama-ridge-night', 'panorama-ridge']]) {
    const variant = ALL_CIRCUITS.find(circuit => circuit.id === id), parent = ALL_CIRCUITS.find(circuit => circuit.id === parentId);
    const variantIntel = resolveTrackIntel(new Course(variant, referenceLap(id).seed)), parentIntel = resolveTrackIntel(new Course(parent, referenceLap(parentId).seed));
    check(Object.keys(parentIntel.notes).length > 5, `${parentId} has written notes`);
    equal(variantIntel.notes, parentIntel.notes, `${id} shows the notes of ${parentId}`);
    equal(variantIntel.flags, parentIntel.flags, `${id} shows the flags of ${parentId}`);
    equal(variantIntel.sectors, parentIntel.sectors, `${id} keeps the sectors of ${parentId}`);
  }
}

// Map labels (P4-FINISH-TEAMROOM): no corner name sits under a flag, a numbered circle, the START mark or another name.
{
  const woods = ALL_CIRCUITS.find(circuit => circuit.id === 'tremblant-woods'), reference = referenceLap('tremblant-woods');
  const dossier = buildTrackDossier(new Course(woods, reference.seed), {reference}), map = teamRoomMap(dossier);
  const touch = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const box = (x, y, half) => ({x0: x - half, y0: y - half, x1: x + half, y1: y + half});
  const named = map.corners.filter(corner => corner.authoredName), shown = named.filter(corner => !corner.label.hidden);
  check(named.length === 11, 'Tremblant Woods names all eleven corners on the map');
  check(shown.length >= 9, 'Most Tremblant Woods corner names fit beside their circles');
  const rects = shown.map(corner => corner.label.rect);
  shown.forEach((corner, index) => {
    const rect = rects[index], name = corner.authoredName;
    check(rect.x1 - rect.x0 >= name.length * MAP_LABEL.charWidth && rect.x0 >= 0 && rect.x1 <= 1000 && rect.y0 >= 0 && rect.y1 <= 690,
      `${name}: label is wide enough for its text and stays on the map`);
    for (const flag of map.flags) check(!touch(rect, box(flag.x, flag.y, MAP_LABEL.flag)), `${name}: label is clear of the ${flag.title} flag`);
    for (const other of map.corners) if (other !== corner) check(!touch(rect, box(other.x, other.y, MAP_LABEL.circle)), `${name}: label is clear of circle ${other.number}`);
    check(!touch(rect, box(corner.x, corner.y, MAP_LABEL.circle)), `${name}: label is clear of its own circle`);
    check(!touch(rect, {x0: map.start.x - 10, y0: map.start.y - 7, x1: map.start.x + 60, y1: map.start.y + 7}), `${name}: label is clear of the START mark`);
    rects.forEach((other, otherIndex) => { if (otherIndex !== index) check(!touch(rect, other), `${name}: label is clear of ${shown[otherIndex].authoredName}`); });
  });
  // No flag pin sits over a numbered circle on any course, so every circle can still be pressed at its centre.
  let pins = 0;
  for (const definition of [...new Map([...COURSE, ...ALL_CIRCUITS].map(entry => [entry.id, entry])).values()].filter(entry => entry.closed !== false)) {
    const routes = getRouteVariants(definition);
    for (const route of routes) {
      const routeKey = routes.length > 1 ? route.id : 'fixed', lap = referenceLap(definition.id, routeKey);
      const everyMap = teamRoomMap(buildTrackDossier(new Course(definition, lap.seed), {route: routeKey, reference: lap}));
      for (const corner of everyMap.corners) for (const flag of everyMap.flags) {
        check(Math.abs(flag.x - corner.x) > MAP_LABEL.flag || Math.abs(flag.y - corner.y) > MAP_LABEL.flag,
          `${definition.id}|${routeKey}: the ${flag.title} flag does not cover circle ${corner.number}`);
        pins++;
      }
    }
  }
  check(pins > 1000, 'The circle check covered every course and route');
  const markup = teamRoomMarkup(dossier);
  check((markup.match(/class="team-map-name/g) ?? []).length === 11, 'Every named corner keeps a label in the markup, hidden ones included');
}

// The review browser sends drawMap as source, not as an imported closure.
// Exercise that exact transport and compare the drawn segment colours.
const segmentColours = [];
const ctx = new Proxy({}, {
  get(target, key) {
    if (key === 'measureText') return () => ({width: 40});
    return key in target ? target[key] : () => {};
  },
  set(target, key, value) {
    if (key === 'strokeStyle' && String(value).startsWith('rgb(')) segmentColours.push(value);
    target[key] = value;
    return true;
  },
});
const standaloneDraw = new Function('return ' + drawMap.toString())();
const mapSpeeds = [0, 17, 60, 91, 120, 153, 180];
standaloneDraw(ctx, 1700, 1000, {title: 'Test', subtitle: '',
  points: mapSpeeds.map((mph, index) => [index * 10, index % 2 * 20, mph]),
  start: {x: 0, z: 0, heading: 0}, corners: [], crests: [], minMph: 0, topMph: 180});
equal(segmentColours, mapSpeeds.map(mph => referenceSpeedColour(mph, 0, 180)),
  'Serialized native review map and runtime reference colours agree at intermediate speeds');

for (const invalid of [null, {...course, closed: false}, {...course, length: 0}]) {
  assert.throws(() => analyseTrack(invalid), TypeError); checks++;
}
assert.throws(() => analyseTrack(course, {trace: [{s: 0, mph: NaN}]}), TypeError); checks++;
const rampSource = freeze({...course, features: {ramps: [{start: 40, end: 80}]}});
const rampBefore = JSON.stringify(rampSource);
check(analyseTrack(rampSource).crests.some(crest => crest.kind === 'jump' && crest.s === 60), 'Native ramp coordinates enter the same crest analysis');
equal(JSON.stringify(rampSource), rampBefore, 'Ramp metadata is not annotated in place');

// Every existing closed event and each offered route must work with native
// geometry. This needs no simulation advance, graphics, saved laps or browser.
let nativeRoutes = 0;
const allDefinitions = [...new Map([...COURSE, ...ALL_CIRCUITS].map(entry => [entry.id, entry])).values()];
for (const definition of allDefinitions.filter(entry => entry.closed !== false)) {
  for (const route of getRouteVariants(definition)) {
    const native = new Course(definition, route.seed);
    const nativeBefore = JSON.stringify({definition, samples: native.samples, ramps: native.features.ramps});
    const dossier = analyseTrack(native);
    check(dossier.profile.rows.length > 0 && dossier.profile.rows.every(row =>
      ['x', 'z', 'y', 's', 'heading', 'k', 'kv', 'grade'].every(key => Number.isFinite(row[key]))),
    `${definition.id}/${route.id} supplies finite native map geometry`);
    equal(dossier.reference, null, `${definition.id}/${route.id} cannot claim an absent measured lap`);
    equal(JSON.stringify({definition, samples: native.samples, ramps: native.features.ramps}), nativeBefore,
      `${definition.id}/${route.id} native geometry remains unchanged`);
    nativeRoutes++;
  }
}

console.log(`Track analysis: ${checks} checks, ${nativeRoutes} native closed event/routes.`);
