import assert from 'node:assert/strict';
import {
  parseArguments, reviewOutputDir, frameFileName, OUTPUT_FILES, FRAME_COUNT, sampleCourse, detectCorners, detectCrests,
  longestStraight, namedPieces, nameFeatures, cornerSpeeds, markSlowCorners, pickFramePoints, unframedCrests,
  firstCornerAfter, formatLap, drawMap, drawSpeed,
} from './track-review.mjs';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };

// A stadium: two 700 m straights joined by two half circles of radius 150 m,
// with one hump on the first straight. Left turns, heading 0 = +z.
function stadium({ hump = true } = {}) {
  const straight = 700, radius = 150, arc = Math.PI * radius, length = 2 * straight + 2 * arc;
  const course = {
    length, features: { ramps: [] },
    at(raw) {
      const s = ((raw % length) + length) % length;
      let x, z, heading;
      if (s < straight) { x = 0; z = s; heading = 0; }
      else if (s < straight + arc) { const a = (s - straight) / radius; x = radius - radius * Math.cos(a); z = straight + radius * Math.sin(a); heading = a; }
      else if (s < 2 * straight + arc) { const t = s - straight - arc; x = 2 * radius; z = straight - t; heading = Math.PI; }
      else { const a = (s - 2 * straight - arc) / radius; x = radius + radius * Math.cos(a); z = -radius * Math.sin(a); heading = Math.PI + a; }
      return { x, z, heading, y: 0 };
    },
    groundAt(raw) {
      const s = ((raw % length) + length) % length;
      return { y: hump ? 6 * Math.exp(-(((s - 350) / 40) ** 2)) : 0 };
    },
  };
  return course;
}

// --- arguments and names ---
equal(parseArguments(['pacific-canyon']).quality, 'high', 'high quality is the default');
equal(parseArguments(['eifel-crown', '--quality', 'performance']).quality, 'performance', 'quality option');
equal(parseArguments(['eifel-crown', '--quality=performance', '--no-browser']).browser, false, 'no-browser option');
equal(parseArguments(['x-y', '--flags', 'a-b,c']).flags, ['a-b', 'c'], 'flag list');
for (const bad of [[], ['Pacific'], ['a', 'b'], ['a', '--quality', 'ultra'], ['a', '--wat'], ['a', '--seed', 'x']])
  assert.throws(() => parseArguments(bad)), checks++;
const date = new Date(2026, 9, 10, 12, 0, 0), root = 'C:\\game';
check(reviewOutputDir('pacific-canyon', 'high', date, root).replaceAll('\\', '/').endsWith('.evidence/2026-10-10/review/pacific-canyon'), 'output folder is .evidence/<date>/review/<course>');
check(reviewOutputDir('pacific-canyon', 'performance', date, root).replaceAll('\\', '/').endsWith('review/pacific-canyon-performance'), 'performance run gets its own folder');
assert.throws(() => reviewOutputDir('../x', 'high', date, root)); checks++;
equal(frameFileName(0, 'grid'), '01-grid.jpg', 'frame file name');
equal(frameFileName(9, 'C3 brake!'), '10-c3-brake.jpg', 'frame file name is simple');
equal(Object.keys(OUTPUT_FILES).filter(k => k !== 'frameFolder').map(k => OUTPUT_FILES[k]).sort(),
  ['frames.jpg', 'lap-trace.json', 'map.png', 'pack.png', 'review.json', 'speed.png'], 'the five outputs and the trace');
equal(formatLap(83.154), '1:23.15', 'lap time text'); equal(formatLap(50.386), '0:50.39', 'lap time under a minute');

// --- geometry ---
const course = stadium();
const profile = sampleCourse(course);
const corners = detectCorners(profile);
equal(corners.length, 2, 'two half circles are two corners');
check(corners.every(c => c.direction === 'L' && Math.abs(c.radius - 150) <= 12 && Math.abs(c.degrees - 180) <= 12), `corners are left, 150 m, 180 degrees: ${JSON.stringify(corners.map(c => [c.direction, c.radius, c.degrees]))}`);
check(Math.abs(corners[0].apexS - (700 + Math.PI * 75)) < 40, 'first apex is mid first arc');
equal(corners.map(c => c.number), [1, 2], 'corners numbered in lap order');
const crests = detectCrests(profile);
equal(crests.length, 1, 'one hump is one crest'); check(Math.abs(crests[0].s - 350) < 20, 'crest sits on the hump');
equal(detectCrests(sampleCourse(stadium({ hump: false }))).length, 0, 'a flat road has no crest');
const straight = longestStraight(profile);
check(Math.abs(straight.length - 700) < 60, `longest straight is about 700 m (${straight.length})`);
check(straight.endS > 600 && straight.endS < 760 || straight.endS > 1500, 'straight ends where a corner begins');

// --- names: numbered fallback, scripted pieces when present ---
equal(namedPieces(course), [], 'no pieces on an existing circuit');
nameFeatures({ corners, crests, straight, pieces: [], length: course.length });
equal(corners.map(c => c.label), ['1', '2'], 'numbered fallback');
const pieces = namedPieces({ pieces: [{ kind: 'turn', name: 'Hell Gate', start: 700, end: 936 }, { type: 'straight', name: 'Pit Straight', s: 0, length: 700 }, { kind: 'turn', start: 1, end: 2 }] });
equal(pieces.map(p => p.name), ['Hell Gate', 'Pit Straight'], 'only named pieces with a position are kept');
equal(namedPieces({ script: { pieces: [{ kind: 'turn', name: 'Hairpin', s0: -20, s1: 60 }, { kind: 'straight', name: '', s0: 60, s1: 300 }] } }).map(p => [p.name, p.start, p.end]), [['Hairpin', -20, 60]], 'track script pieces (s0, s1) are read, unnamed ones skipped');
nameFeatures({ corners, crests, straight, pieces, length: course.length });
equal(corners.map(c => c.name), ['Hell Gate', null], 'a corner takes the name of the turn piece it sits in');
equal(corners[0].label, '1 Hell Gate', 'label has number and name');
check(straight.name === 'Pit Straight' || straight.name === null, 'straight may be named');

// --- speeds ---
const trace = [];
for (let s = 0; s < course.length; s += 10) {
  const phase = corners.map(c => Math.abs(s - c.apexS)).reduce((a, b) => Math.min(a, b));
  trace.push({ s, mph: phase < 60 ? 80 : phase < 300 ? 80 + (phase - 60) / 240 * 100 : 180, lateral: 0, air: false });
}
cornerSpeeds(corners, trace, course.length); markSlowCorners(corners, 180);
check(corners.every(c => c.minMph <= 82 && c.slow && c.braked), 'corner minimums and braking found from the trace');
check(corners.every(c => c.brakeS < c.apexS - 100), 'braking point is well before the apex');

// --- which 16 frames ---
const many = [];
for (let i = 0; i < 9; i++) many.push({ number: i + 1, name: i === 2 ? 'Hell Gate' : null, direction: 'R', radius: 40 + i * 30, apexS: 400 + i * 450, brakeS: 330 + i * 450, entryS: 380 + i * 450, exitS: 430 + i * 450, span: 50, label: String(i + 1) });
const bumps = [];
for (let i = 0; i < 7; i++) bumps.push({ number: i + 1, label: `Crest ${i + 1}`, kind: 'crest', s: 600 + i * 560, bend: 0.001 * (i + 1) });
const L = 5000;
const picked = pickFramePoints({ length: L, gridS: 0, corners: many, crests: bumps, straight: { startS: 4400, endS: 4900, length: 500, name: 'Pit Straight' } });
equal(picked.length, FRAME_COUNT, 'always exactly 16 frames');
equal(picked[0].kind, 'grid', 'grid first');
check(picked.slice(1).every((p, i, a) => !i || a[i - 1].s <= p.s), 'frames after the grid are in lap order');
const kinds = picked.map(p => p.kind);
equal(kinds.filter(k => k === 'brake').length, 5, 'braking point for the five tightest corners');
equal(kinds.filter(k => k === 'apex').length, 5, 'apex for the five tightest corners');
check(picked.filter(p => p.kind === 'brake').every(p => [1, 2, 3, 4, 5].includes(p.corner)), 'the tightest corners are chosen by radius');
equal(kinds.filter(k => k === 'straight').length, 1, 'the longest straight is framed');
equal(kinds.filter(k => k === 'crest').length, 4, 'four crests fit beside five corner pairs');
check(picked.filter(p => p.kind === 'crest').every(p => p.crest >= 4), 'sharpest crests win the slots');
equal(unframedCrests(bumps, picked), ['Crest 1', 'Crest 2', 'Crest 3'], 'unframed crests are reported');
check(picked.some(p => p.label.includes('Hell Gate')) || !picked.some(p => p.corner === 3), 'frame labels carry corner names');
check(picked.every(p => /^\d\d-[a-z0-9-]+\.jpg$/.test(p.file)) && new Set(picked.map(p => p.file)).size === FRAME_COUNT, 'unique simple file names');
check(picked.every((p, _, all) => all.every(q => q === p || Math.abs(q.s - p.s) >= 20)), 'no two frames on the same spot');
const sparse = pickFramePoints({ length: 4000, gridS: 0, corners: [], crests: [], straight: null });
equal(sparse.length, FRAME_COUNT, 'a course with no features still gets 16 frames');
check(sparse.slice(1).every(p => p.kind === 'fill'), 'evenly spaced fill');
const few = pickFramePoints({ length: 4000, gridS: 0, corners: many.slice(0, 2), crests: bumps, straight: null });
equal(few.filter(p => p.kind === 'crest').length, 7, 'with few corners every crest gets a frame');
equal(firstCornerAfter(many, 1000, 5000).number, 3, 'first corner after the grid in lap order');
equal(firstCornerAfter([], 0, 100), null, 'no corners, no first corner');

// --- drawing runs with a recording canvas and carries the names ---
function recorder() {
  const texts = [], ctx = new Proxy({}, {
    get(target, key) {
      if (key === 'fillText') return text => { texts.push(String(text)); };
      if (key === 'measureText') return () => ({ width: 40 });
      if (key in target) return target[key];
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, texts };
}
const mapView = recorder();
drawMap(mapView.ctx, 1700, 1000, { title: 'Test', subtitle: 'sub', points: profile.rows.map(r => [r.x, r.z, 120]), start: { x: 0, z: 0, heading: 0 },
  corners: corners.map(c => ({ ...c, name: c.name })), crests: [{ number: 1, label: 'Crest 1', s: 350, x: 0, z: 350, airborne: true }], topMph: 180, minMph: 80 });
check(mapView.texts.includes('Hell Gate') && mapView.texts.includes('START'), 'map writes corner names and START');
const speedView = recorder();
drawSpeed(speedView.ctx, 1700, 900, { title: 'Test', subtitle: 's', lapNote: 'n', lapTime: '1:23.15', length: course.length, samples: trace.map(r => [r.s, r.mph, 0]),
  corners, crests: [{ s: 350, airborne: false }], topMph: 180, topAtS: 100, heights: profile.rows.map(r => [r.s, r.y]), gradeText: '1%' });
check(speedView.texts.includes('1:23.15'), 'speed trace prints the lap time');
check(speedView.texts.some(t => t.startsWith('1 8')), 'speed trace labels corner minimum speeds');

console.log(`Track review: ${checks} checks.`);
