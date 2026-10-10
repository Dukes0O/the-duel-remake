import assert from 'node:assert/strict';
import {
  analyseTrack, sampleCourse, detectCorners, detectCrests, longestStraight,
  namedPieces, nameFeatures, cornerSpeeds, markSlowCorners, referenceSpeedColour, trackSectors,
  cornerId, resolveTrackIntel, courseFingerprint, buildTrackDossier, analyseLap, trackSnapshotPose,
} from '../src/track-analysis.js';
import {buildReview, drawMap} from './track-review.mjs';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {getRouteVariants} from '../src/route-variants.js';
import {teamRoomMarkup, teamRoomMap} from '../src/screen-team-room.js';
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
function stadium({hump = true, shift = 0} = {}) {
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
      return {y: hump ? 6 * Math.exp(-(((phase(raw) - 350) / 40) ** 2)) : 0};
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
  lapTrace.map((row, i) => i === 2 ? {...row, gear: NaN} : row)]) {
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
equal(dossier.flags.filter(flag => flag.kind === 'crest').length, dossier.analysis.crests.length, 'Every crest has a selectable flag');
equal(dossier.flags.filter(flag => flag.kind === 'signature').length, 1, 'Exactly one generated signature is present');
check(dossier.flags.some(flag => flag.kind === 'overtaking'), 'A native approach supplies an overtaking flag');
equal(new Set(dossier.flags.map(flag => flag.id)).size, dossier.flags.length, 'Flag identities are unique');
check(dossier.flags.every(flag => flag.snapshotS >= 0 && flag.snapshotS < course.length), 'Every live snapshot has a bounded native approach position');
const firstCornerFlag = dossier.flags.find(flag => flag.id === 'c1');
const cameraPose = trackSnapshotPose(course, {snapshotS: 350, camera: {up: 1.2, ahead: 70}});
equal(cameraPose.position, {x: 0, y: 7.2, z: 350}, 'Driver-seat snapshot rests 1.2 m above the native ground at its actual approach');
near(cameraPose.target.z, 420, 1e-8, 'Snapshot looks ahead along the native course');
check(cameraPose.target.y < cameraPose.position.y, 'Snapshot aim follows the road down beyond a crest');
assert.throws(() => trackSnapshotPose(course, {snapshotS: NaN, camera: {up: 1.2, ahead: 70}}), /snapshot/i); checks++;
equal(firstCornerFlag.snapshotS, reference.corners[0].brakeS, 'Corner snapshot uses its actual reference braking point');
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
for (const definition of COURSE.filter(entry => entry.closed !== false)) {
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
