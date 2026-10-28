// Track review for Claude's finishing pass (docs/CIRCUITS.md section 11).
//
//   node tools/track-review.mjs <course-id> [--quality high|performance]
//        [--car ID] [--seed N] [--flags a,b] [--output-dir PATH] [--no-browser]
//
// One run gives, under .evidence/<date>/review/<course-id>/:
//   map.png      top-down centreline, numbered and named corners, crests, start
//   frames.jpg   16 chase-camera frames at named points (plus frames/NN-*.jpg)
//   speed.png    speed against distance for one test-driver lap, corner speeds
//   pack.png     the first corner with the field
//   review.json  lap time, corner speeds, top speed, steepest grade, tightest
//                radius and any frame that raised a browser error
//
// Part one runs headless: the production App and its scripted driver race the
// course on disposable memory saves. Part two replays those numbers in the
// private browser harness (tools/scenarios/track-review.mjs) for the pictures.
// Nothing here changes game code or touches real saves.
import {CIRCUIT_MANIFESTS} from '../src/circuit-manifests.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { heliOf } from '../src/heli/heli-save.js';

export const PROJECT_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
export const FRAME_COUNT = 16;
export const INPUT_ENV = 'DUEL_TRACK_REVIEW_INPUT';
const TAU = Math.PI * 2;
const usage = 'Usage: node tools/track-review.mjs <course-id> [--quality high|performance] [--car ID] [--seed N] [--flags a,b] [--output-dir PATH under .evidence] [--no-browser]';

// ---------------------------------------------------------------------------
// Arguments and output names (no browser needed)

export function parseArguments(args) {
  const options = { courseId: null, quality: 'high', car: 'falcone_f42', seed: 1989, flags: [], outputDir: null, browser: true };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    const value = () => {
      const next = args[++index];
      if (!next || next.startsWith('--')) throw Error(`${arg} needs a value. ${usage}`);
      return next;
    };
    if (arg === '--quality') options.quality = value();
    else if (arg.startsWith('--quality=')) options.quality = arg.slice(10);
    else if (arg === '--car') options.car = value();
    else if (arg === '--seed') options.seed = Number(value());
    else if (arg === '--flags') options.flags = value().split(',').filter(Boolean);
    else if (arg === '--output-dir') options.outputDir = value();
    else if (arg === '--no-browser') options.browser = false;
    else if (!arg.startsWith('--') && !options.courseId) options.courseId = arg;
    else throw Error(`Unknown argument: ${arg}. ${usage}`);
  }
  if (!options.courseId || !/^[a-z][a-z0-9-]*$/.test(options.courseId)) throw Error(`Give one course id such as pacific-canyon. ${usage}`);
  if (!['high', 'performance'].includes(options.quality)) throw Error(`--quality must be high or performance. ${usage}`);
  if (!Number.isSafeInteger(options.seed)) throw Error('--seed must be a whole number.');
  if (!/^[a-z0-9_]+$/.test(options.car)) throw Error('--car must be a simple car id.');
  if (options.flags.some(flag => !/^[a-z][a-z0-9-]*$/.test(flag))) throw Error('--flags must be simple switch names.');
  return options;
}

const pad2 = number => String(number).padStart(2, '0');
export function localDay(date) { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`; }

// High quality keeps the plain course folder; Performance gets its own so the
// two never overwrite each other.
export function reviewOutputDir(courseId, quality = 'high', date = new Date(), root = PROJECT_ROOT) {
  if (!/^[a-z][a-z0-9-]*$/.test(courseId)) throw Error('Course id must be simple.');
  const folder = quality === 'high' ? courseId : `${courseId}-${quality}`;
  return join(root, '.evidence', localDay(date), 'review', folder);
}

export const OUTPUT_FILES = Object.freeze({
  map: 'map.png', frames: 'frames.jpg', speed: 'speed.png', pack: 'pack.png', review: 'review.json',
  trace: 'lap-trace.json', frameFolder: 'frames',
});

const slug = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28);
export function frameFileName(index, key) { return `${pad2(index + 1)}-${slug(key) || 'frame'}.jpg`; }

// ---------------------------------------------------------------------------
// Geometry from the course (pure; works from any object with these members:
// length, at(s), groundAt(s, lateral), and optionally pieces for scripted tracks)

import {
  wrap, angleDistance, sampleCourse, CORNER_RADIUS_LIMIT, STRAIGHT_RADIUS_LIMIT,
  detectCorners, CREST_MIN_BEND, detectCrests, longestStraight, steepestGrade,
  namedPieces, nameFeatures, laneOf, cornerSpeeds, markSlowCorners, markCrestLift,
} from '../src/track-analysis.js';
export {
  wrap, angleDistance, sampleCourse, CORNER_RADIUS_LIMIT, STRAIGHT_RADIUS_LIMIT,
  detectCorners, CREST_MIN_BEND, detectCrests, longestStraight, steepestGrade,
  namedPieces, nameFeatures, laneOf, cornerSpeeds, markSlowCorners, markCrestLift,
} from '../src/track-analysis.js';

// ---------------------------------------------------------------------------
// Which 16 points to photograph

// grid, longest straight's end, every slow-corner pair for the tightest five
// corners, the sharpest crests that still fit, then even fill so the sheet is
// always full. Returns the points in lap order.
export function pickFramePoints({ length, gridS = 0, corners = [], crests = [], straight = null }, count = FRAME_COUNT) {
  const points = [{ key: 'grid', label: 'Grid and start line', kind: 'grid', s: gridS, priority: 0 }];
  const taken = () => points.map(p => p.s);
  const clear = s => taken().every(other => Math.abs(angleDistance(other, s, length)) >= 25);
  const add = point => { if (points.length < count && clear(point.s)) { points.push(point); return true; } return false; };
  if (straight) add({ key: 'straight-end', label: `End of longest straight${straight.name ? ' (' + straight.name + ')' : ''}, ${Math.round(straight.length)} m`, kind: 'straight', s: wrap(straight.endS - 25, length), priority: 1 });
  const tight = [...corners].sort((p, q) => p.radius - q.radius).slice(0, 5);
  const crestSlots = Math.max(0, count - points.length - tight.length * 2);
  const wantedCrests = [...crests].sort((p, q) => q.bend - p.bend).slice(0, crestSlots);
  for (const corner of tight) {
    const name = corner.name ? ` ${corner.name}` : '';
    add({ key: `c${corner.number}-brake`, label: `Corner ${corner.number}${name} (${corner.direction}) braking point`, kind: 'brake', s: corner.brakeS, corner: corner.number, priority: 2 });
    add({ key: `c${corner.number}-apex`, label: `Corner ${corner.number}${name} (${corner.direction}) apex`, kind: 'apex', s: corner.apexS, corner: corner.number, priority: 2 });
  }
  for (const crest of wantedCrests) {
    // Frame the car just before the crest so the lift and the view over it show.
    add({ key: `crest-${crest.number}`, label: `${crest.label} approach`, kind: 'crest', s: wrap(crest.s - 18, length), crest: crest.number, priority: 3 });
  }
  while (points.length < count) {
    const ordered = [...points].sort((p, q) => p.s - q.s);
    let widest = { gap: -1, from: 0 };
    ordered.forEach((p, i) => {
      const next = ordered[(i + 1) % ordered.length];
      const gap = wrap(next.s - p.s, length) || length;
      if (gap > widest.gap) widest = { gap, from: p.s };
    });
    const s = wrap(widest.from + widest.gap / 2, length);
    points.push({ key: 'fill', label: 'Evenly spaced fill', kind: 'fill', s, priority: 4 });
  }
  const gridFirst = points.slice(1).sort((p, q) => p.s - q.s);
  const ordered = [points[0], ...gridFirst];
  return ordered.map((point, index) => ({ ...point, index, file: frameFileName(index, point.key) }));
}

// Crests that did not get a frame (only when more than fit), for the report.
export function unframedCrests(crests, points) {
  const used = new Set(points.filter(p => p.kind === 'crest').map(p => p.crest));
  return crests.filter(crest => !used.has(crest.number)).map(crest => crest.label);
}

// ---------------------------------------------------------------------------
// Headless test-driver lap (production App, scripted driver, memory saves)

export async function runHeadlessLaps(options) {
  const { App } = await import('../src/app.js');
  const { COURSE, DRIVE } = await import('../src/config.js');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
  const rows = new Map();
  let app;
  const restore = () => {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage); else delete globalThis.localStorage;
    if (previousCancel) Object.defineProperty(globalThis, 'cancelAnimationFrame', previousCancel); else delete globalThis.cancelAnimationFrame;
  };
  try {
    globalThis.localStorage = {
      get length() { return rows.size; }, key: i => [...rows.keys()][i] ?? null,
      getItem: k => rows.get(k) ?? null, setItem: (k, v) => rows.set(k, String(v)), removeItem: k => rows.delete(k),
    };
    globalThis.cancelAnimationFrame ??= () => {};
    app = new App();
    // An authored circuit whose switch is off joins COURSE for this run when --flags names it
    // (the browser step turns the same switches on in its own page).
    const { ALL_CIRCUITS } = await import('../src/circuits/index.js');
    for (const circuit of ALL_CIRCUITS) if (options.flags.includes(circuit.flag) && !COURSE.some(entry => entry.id === circuit.id)) COURSE.push(circuit);
    const stageIndex = COURSE.findIndex(entry => entry.id === options.courseId);
    if (stageIndex < 0) throw Error(`No course called ${options.courseId}. Known: ${COURSE.map(c => c.id).join(', ')}`);
    const unlock = CIRCUIT_MANIFESTS.find(row => row.id === options.courseId)?.unlock;
    app.profile = { ...app.profile, courses: { version: 1, unlocked: COURSE.map(c => c.id) },
      ...(unlock?.kind === 'default-gp-podium' ? {grandPrixPodiums:
        [...new Set([...(app.profile.grandPrixPodiums ?? []), unlock.defaultEventId])]} : {}),
      ...(unlock?.kind === 'spotted-from-air' ? { heli: { ...heliOf(app.profile), map: { version: 1, seen: [], found: [options.courseId], table: false } } } : {}) };
    app._saveProfile();
    // A course with snow or ice is reviewed on winter tyres, as a player would set up.
    const { courseHasWinterSurfaces } = await import('../src/race-surfaces.js');
    const winterTyre = courseHasWinterSurfaces(COURSE[stageIndex]);
    if (!app.startCampaign({ startStage: stageIndex, seed: options.seed, mode: 'duel', car: options.car, difficulty: 'casual', cpuDifficulty: 'medium', ...(winterTyre ? { tyre: 'winter' } : {}) }))
      throw Error('The course would not start (is its switch off? try --flags).');
    app.autopilot = true;
    app._scriptedCrashDone = true;         // no scripted shoulder excursion: a clean lap
    const duel = app.duel, state = duel.state, course = duel.course;
    const gridS = state.s, def = COURSE[stageIndex];
    const trace = [], laps = def.laps ?? 2;
    let frames = 0;
    const limit = 30 * 60 * 12;
    while (state.status !== 'stage_result' && state.status !== 'gameover' && state.status !== 'complete' &&
           state.completedLaps < laps && frames++ < limit) {
      app.advance(1 / 30, 1 / 30);
      if (state.status === 'racing') trace.push({ t: +state.stageTimeSec.toFixed(2), s: +state.s.toFixed(1), mph: +state.speedMph.toFixed(1),
        lateral: +state.lateral.toFixed(2), air: !!state.airborne, off: !!state.offRoad, lap: state.completedLaps });
    }
    return {
      course, gridS, stageIndex, winterTyre, trace, lapTimes: [...state.lapTimes], laps, status: state.status, completed: state.completedLaps >= laps,
      opponents: state.opponents?.length ?? 0, hasRival: !!def.hasRival, courseDef: { id: def.id, name: def.name, laps, kind: def.kind ?? 'race', reviewFrames: def.reviewFrames },
      mphToWorld: DRIVE.mphToWorld, dispose: () => { try { app.dispose(); } finally { restore(); } },
    };
  } catch (error) {
    try { app?.dispose(); } catch {}
    restore();
    throw error;
  }
}

// Pick the flying lap (the last full lap) out of the whole run, with distance
// measured from the start line.
export function flyingLap(trace, length, lapTimes) {
  const lapNumber = Math.max(0, lapTimes.length - 1);
  const rows = trace.filter(row => row.lap === lapNumber).map(row => ({ ...row, s: wrap(row.s, length) }));
  rows.sort((p, q) => p.t - q.t);
  return rows;
}

export const formatLap = seconds => {
  if (!Number.isFinite(seconds)) return 'n/a';
  const minutes = Math.floor(seconds / 60), rest = seconds - minutes * 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest.toFixed(2)}`;
};

// ---------------------------------------------------------------------------
// Everything Claude needs, as plain data

export function buildReview({ course, courseDef, trace, lapTimes, gridS, options }) {
  const profile = sampleCourse(course);
  const pieces = namedPieces(course);
  const length = course.length;
  const corners = detectCorners(profile);
  const crests = detectCrests(profile, course.features?.ramps ?? []);
  const straight = longestStraight(profile);
  nameFeatures({ corners, crests, straight, pieces, length });
  const lap = flyingLap(trace, length, lapTimes);
  let top = { mph: 0, s: 0 };
  for (const row of lap) if (row.mph > top.mph) top = { mph: Math.round(row.mph), s: Math.round(row.s) };
  cornerSpeeds(corners, lap, length);
  markSlowCorners(corners, top.mph);
  markCrestLift(crests, lap, length);
  const points = pickFramePoints({ length, gridS, corners, crests, straight });
  // A circuit may name views it wants photographed (`reviewFrames: [{ key, label, s }]`, for water,
  // a landmark or a lit street): they take the place of the evenly spaced fill frames.
  const named = (courseDef.reviewFrames ?? []).filter(frame => Number.isFinite(frame.s) && frame.key && frame.label);
  const fills = points.filter(point => point.kind === 'fill');
  named.slice(0, fills.length).forEach((frame, index) => Object.assign(fills[index], { key: frame.key, label: frame.label, kind: 'named', s: wrap(frame.s, length) }));
  if (named.length) {
    const ordered = [points[0], ...points.slice(1).sort((p, q) => p.s - q.s)];
    ordered.forEach((point, index) => { point.index = index; point.file = frameFileName(index, point.key); });
    points.splice(0, points.length, ...ordered);
  }
  for (const point of points) {
    const row = point.kind === 'grid' ? null : laneOf(lap, point.s, length);
    point.mph = point.kind === 'grid' ? 0 : row ? Math.round(row.mph) : 60;
    point.lateral = point.kind === 'grid' ? null : row?.lateral ?? 0;
  }
  const tightest = corners.length ? corners.reduce((a, b) => (b.radius < a.radius ? b : a)) : null;
  const lapTime = lapTimes.length ? lapTimes[Math.max(0, lapTimes.length - 1)] : null;
  return {
    course: { id: courseDef.id, name: courseDef.name, lengthM: Math.round(length), laps: courseDef.laps, car: options.car, seed: options.seed, quality: options.quality },
    lap: { timeSec: lapTime, time: formatLap(lapTime), lapTimes, flying: lapTimes.length > 1, topMph: top.mph, topAtS: top.s },
    grade: steepestGrade(profile),
    tightestRadius: tightest ? { metres: tightest.radius, corner: tightest.label } : null,
    longestStraight: straight && { startS: Math.round(straight.startS), endS: Math.round(straight.endS), lengthM: Math.round(straight.length), name: straight.name },
    corners: corners.map(({ number, name, label, direction, degrees, radius, entryS, apexS, exitS, minMph, approachMph, brakeS, braked, slow }) =>
      ({ number, name, label, direction, degrees, radius, entryS: Math.round(entryS), apexS: Math.round(apexS), exitS: Math.round(exitS), brakeS: Math.round(brakeS), approachMph, minMph, braked, slow })),
    crests: crests.map(({ number, label, name, kind, s, height, radius, gradeBefore, gradeAfter, airborne, mph }) =>
      ({ number, label, name, kind, s: Math.round(s), height: Math.round(height * 10) / 10, radius, gradeBefore, gradeAfter, airborne, mph })),
    frames: points.map(point => ({ index: point.index, key: point.key, label: point.label, kind: point.kind, s: Math.round(point.s), mph: point.mph, file: `${OUTPUT_FILES.frameFolder}/${point.file}` })),
    unframedCrests: unframedCrests(crests, points),
    namedPieces: pieces.length,
    // Internal handles for the picture step; not written to review.json.
    _profile: profile, _points: points, _corners: corners, _crests: crests, _straight: straight, _lap: lap,
  };
}

// ---------------------------------------------------------------------------
// Drawing. Each function is self-contained (no outside names) because the
// browser scenario sends its source into the page and runs it on a canvas.

export function drawMap(ctx, W, H, d) {
  ctx.fillStyle = '#10181d'; ctx.fillRect(0, 0, W, H);
  const TABLE = 520, M = 70, mapW = W - TABLE - M * 2, mapH = H - M * 2 - 30;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of d.points) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]); }
  const scale = Math.min(mapW / (maxX - minX || 1), mapH / (maxZ - minZ || 1));
  const ox = M + (mapW - (maxX - minX) * scale) / 2 - minX * scale, oz = M + 30 + (mapH - (maxZ - minZ) * scale) / 2 - minZ * scale;
  const X = x => ox + x * scale, Z = z => oz + z * scale;     // x right, z down: not mirrored
  ctx.font = 'bold 26px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#f2ead3'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(d.title, 28, 40);
  ctx.font = '15px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#9fb3ba';
  ctx.fillText(d.subtitle, 28, 64);
  const colour = mph => {                  // slow blue, fast red; relative to the lap top speed
    const t = Math.max(0, Math.min(1, (mph - d.minMph) / Math.max(1, d.topMph - d.minMph)));
    const stops = [[53, 99, 214], [41, 184, 190], [240, 214, 64], [232, 86, 52]], at = t * 3, i = Math.min(2, Math.floor(at)), f = at - i;
    return `rgb(${stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f)).join(',')})`;
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#05080a'; ctx.lineWidth = 15; ctx.beginPath();
  d.points.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Z(p[1])) : ctx.moveTo(X(p[0]), Z(p[1]))));
  ctx.closePath(); ctx.stroke();
  ctx.lineWidth = 9;
  for (let i = 0; i < d.points.length; i++) {
    const a = d.points[i], b = d.points[(i + 1) % d.points.length];
    ctx.strokeStyle = colour(a[2]); ctx.beginPath(); ctx.moveTo(X(a[0]), Z(a[1])); ctx.lineTo(X(b[0]), Z(b[1])); ctx.stroke();
  }
  // Start line and direction arrow
  const s0 = d.start, sx = X(s0.x), sz = Z(s0.z), fx = Math.sin(s0.heading), fz = Math.cos(s0.heading);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.beginPath();
  ctx.moveTo(sx - fz * 14, sz + fx * 14); ctx.lineTo(sx + fz * 14, sz - fx * 14); ctx.stroke();
  const ax = sx + fx * 46, az = sz + fz * 46;
  ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(sx + fx * 8, sz + fz * 8); ctx.lineTo(ax, az); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ax + fx * 12, az + fz * 12); ctx.lineTo(ax - fz * 8, az + fx * 8); ctx.lineTo(ax + fz * 8, az - fx * 8); ctx.closePath(); ctx.fill();
  {
    // Put the label on the inside of the circuit, away from corner badges.
    const mx = (X(minX) + X(maxX)) / 2 - sx, mz = (Z(minZ) + Z(maxZ)) / 2 - sz, ml = Math.hypot(mx, mz) || 1;
    ctx.font = 'bold 14px system-ui, Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('START', sx + mx / ml * 38, sz + mz / ml * 22); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  // Crests as triangles
  for (const c of d.crests) {
    const x = X(c.x), z = Z(c.z);
    ctx.fillStyle = c.airborne ? '#ffd23f' : '#cfd8dc'; ctx.strokeStyle = '#05080a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, z - 10); ctx.lineTo(x + 9, z + 7); ctx.lineTo(x - 9, z + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // Corner numbers, pushed outward from the middle of the circuit
  const cx = (X(minX) + X(maxX)) / 2, cz = (Z(minZ) + Z(maxZ)) / 2;
  for (const c of d.corners) {
    const x = X(c.x), z = Z(c.z), dx = x - cx, dz = z - cz, len = Math.hypot(dx, dz) || 1;
    const bx = x + dx / len * 26, bz = z + dz / len * 26;
    ctx.strokeStyle = '#8aa0a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, z); ctx.lineTo(bx, bz); ctx.stroke();
    ctx.fillStyle = c.slow ? '#e84a3a' : '#f2ead3'; ctx.beginPath(); ctx.arc(bx, bz, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.slow ? '#ffffff' : '#10181d'; ctx.font = 'bold 14px system-ui, Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(c.number), bx, bz + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (c.name) {
      ctx.font = '13px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#d6e0e3';
      const w = ctx.measureText(c.name).width, left = dx < 0;
      ctx.fillText(c.name, left ? bx - 19 - w : bx + 19, bz + 4);
    }
  }
  // Table on the right
  let y = 100; const tx = W - TABLE + 10;
  ctx.font = 'bold 15px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#f2ead3';
  ctx.fillText('Corners (red = slow for this lap)', tx, y); y += 24;
  ctx.font = '13px system-ui, Segoe UI, sans-serif';
  ctx.fillStyle = '#7f949b'; ctx.fillText('No  Name', tx, y); ctx.fillText('Dir', tx + 230, y); ctx.fillText('Radius', tx + 268, y); ctx.fillText('Angle', tx + 332, y); ctx.fillText('Min mph', tx + 392, y); y += 20;
  for (const c of d.corners) {
    if (y > H - 190) { ctx.fillStyle = '#7f949b'; ctx.fillText(`... ${d.corners.length - d.corners.indexOf(c)} more corners in review.json`, tx, y); y += 20; break; }
    ctx.fillStyle = c.slow ? '#ff8a7a' : '#d6e0e3';
    ctx.fillText(String(c.number).padStart(2, ' ') + '  ' + (c.name || `Corner ${c.number}`).slice(0, 26), tx, y);
    ctx.fillText(c.direction, tx + 236, y); ctx.fillText(c.radius + ' m', tx + 268, y); ctx.fillText(c.degrees + '°', tx + 332, y); ctx.fillText(c.minMph == null ? '-' : String(c.minMph), tx + 400, y); y += 19;
  }
  y += 10; ctx.font = 'bold 15px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#f2ead3'; ctx.fillText('Crests and jumps', tx, y); y += 22;
  ctx.font = '13px system-ui, Segoe UI, sans-serif';
  for (const c of d.crests) {
    if (y > H - 80) { ctx.fillStyle = '#7f949b'; ctx.fillText('... more in review.json', tx, y); break; }
    ctx.fillStyle = c.airborne ? '#ffd23f' : '#d6e0e3';
    ctx.fillText(`${c.label}  at ${c.s} m${c.airborne ? '  (car leaves the ground)' : ''}`.slice(0, 62), tx, y); y += 19;
  }
  if (!d.crests.length) { ctx.fillStyle = '#7f949b'; ctx.fillText('none found', tx, y); y += 19; }
  // Speed legend
  const ly = H - 38, lx = 28, lw = 260;
  for (let i = 0; i < lw; i++) { ctx.fillStyle = colour(d.minMph + (d.topMph - d.minMph) * i / lw); ctx.fillRect(lx + i, ly, 1, 12); }
  ctx.fillStyle = '#9fb3ba'; ctx.font = '12px system-ui, Segoe UI, sans-serif';
  ctx.fillText(`${d.minMph} mph`, lx, ly + 28); ctx.fillText(`${d.topMph} mph (test driver's speed)`, lx + lw - 120, ly + 28);
  ctx.fillText('Yellow triangle: the car leaves the ground. White bar and arrow: start line and direction.', lx + lw + 30, ly + 10);
}

export function drawSpeed(ctx, W, H, d) {
  ctx.fillStyle = '#10181d'; ctx.fillRect(0, 0, W, H);
  const L = 80, R = W - 40, T = 124, B = H - 250, EL = H - 190, EB = H - 40;
  ctx.font = 'bold 26px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#f2ead3'; ctx.fillText(d.title, 28, 40);
  ctx.font = 'bold 40px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'right';
  ctx.fillText(d.lapTime, W - 40, 50); ctx.textAlign = 'left';
  ctx.font = '15px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#9fb3ba';
  ctx.fillText(d.subtitle, 28, 66);
  ctx.fillText(d.lapNote, 28, 88);
  const top = Math.ceil(d.topMph / 20) * 20, X = s => L + (s / d.length) * (R - L), Y = v => B - (v / top) * (B - T);
  ctx.strokeStyle = '#25343b'; ctx.lineWidth = 1; ctx.fillStyle = '#7f949b'; ctx.font = '12px system-ui, Segoe UI, sans-serif';
  for (let v = 0; v <= top; v += 20) { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(R, Y(v)); ctx.stroke(); ctx.fillText(String(v), L - 34, Y(v) + 4); }
  const stepS = d.length > 6000 ? 1000 : 500;
  for (let s = 0; s <= d.length; s += stepS) { ctx.beginPath(); ctx.moveTo(X(s), T); ctx.lineTo(X(s), B); ctx.stroke(); ctx.fillText(s + ' m', X(s) - 14, B + 18); }
  ctx.fillStyle = '#7f949b'; ctx.fillText('mph', 24, T - 14);
  // Corner bands
  for (const c of d.corners) {
    ctx.fillStyle = c.slow ? 'rgba(232,74,58,0.16)' : 'rgba(242,234,211,0.07)';
    if (c.exitS > c.entryS) ctx.fillRect(X(c.entryS), T, Math.max(2, X(c.exitS) - X(c.entryS)), B - T);
    else { ctx.fillRect(X(c.entryS), T, X(d.length) - X(c.entryS), B - T); ctx.fillRect(X(0), T, Math.max(2, X(c.exitS) - X(0)), B - T); }
  }
  // Trace
  ctx.strokeStyle = '#5ec8e5'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath();
  let started = false, last = -1;
  for (const p of d.samples) { if (p[0] < last) started = false; last = p[0]; if (!started) { ctx.moveTo(X(p[0]), Y(p[1])); started = true; } else ctx.lineTo(X(p[0]), Y(p[1])); }
  ctx.stroke();
  // Corner minimums
  ctx.textAlign = 'center';
  d.corners.forEach((c, i) => {
    if (c.minMph == null) return;
    const x = X(c.minMphS ?? c.apexS), y = Y(c.minMph);
    ctx.fillStyle = c.slow ? '#e84a3a' : '#f2ead3'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    const row = i % 2, ly = Math.min(B - 6, y + 22 + row * 16);
    ctx.font = 'bold 13px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = c.slow ? '#ff8a7a' : '#f2ead3';
    ctx.fillText(`${c.number} ${c.minMph}`, x, ly);
  });
  ctx.textAlign = 'left';
  // Crest markers
  for (const c of d.crests) {
    const x = X(c.s); ctx.strokeStyle = c.airborne ? '#ffd23f' : '#6f858d'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, B); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = c.airborne ? '#ffd23f' : '#9fb3ba'; ctx.beginPath(); ctx.moveTo(x, T + 2); ctx.lineTo(x + 6, T + 13); ctx.lineTo(x - 6, T + 13); ctx.closePath(); ctx.fill();
  }
  // Top speed
  ctx.fillStyle = '#e84a3a'; ctx.font = '13px system-ui, Segoe UI, sans-serif'; ctx.fillText(`top ${d.topMph} mph at ${d.topAtS} m`, X(d.topAtS) + 8, Y(d.topMph) - 6);
  // Height profile
  let lo = Infinity, hi = -Infinity;
  for (const p of d.heights) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
  const HY = h => EB - ((h - lo) / Math.max(1, hi - lo)) * (EB - EL);
  ctx.fillStyle = 'rgba(120,160,120,0.35)'; ctx.beginPath(); ctx.moveTo(X(0), EB);
  for (const p of d.heights) ctx.lineTo(X(p[0]), HY(p[1]));
  ctx.lineTo(X(d.length), EB); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8fc98f'; ctx.lineWidth = 2; ctx.beginPath();
  d.heights.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), HY(p[1])) : ctx.moveTo(X(p[0]), HY(p[1])))); ctx.stroke();
  ctx.fillStyle = '#7f949b'; ctx.font = '12px system-ui, Segoe UI, sans-serif';
  ctx.fillText(`Road height: ${Math.round(lo)} m to ${Math.round(hi)} m (steepest ${d.gradeText})`, L, EL - 8);
  ctx.fillText('Red bands are slow corners. Numbers are corner then lowest speed in mph. Triangles are crests; yellow means the car left the ground.', L, H - 12);
}

// ---------------------------------------------------------------------------
// Run the whole review

// The corner the field reaches first from the grid, in lap order.
export function firstCornerAfter(corners, gridS, length) {
  if (!corners.length) return null;
  return corners.reduce((best, corner) => (wrap(corner.entryS - gridS, length) < wrap(best.entryS - gridS, length) ? corner : best));
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  const outputDir = options.outputDir ? resolveUnderEvidence(options.outputDir) : reviewOutputDir(options.courseId, options.quality);
  mkdirSync(join(outputDir, OUTPUT_FILES.frameFolder), { recursive: true });
  console.log(`Track review: ${options.courseId} (${options.quality}). Running the test driver headless...`);
  const lap = await runHeadlessLaps(options);
  let review;
  try {
    review = buildReview({ course: lap.course, courseDef: lap.courseDef, trace: lap.trace, lapTimes: lap.lapTimes, gridS: lap.gridS, options });
    if (!lap.completed) review.warnings = [`The test driver did not finish the race (${lap.status}); numbers cover what it drove.`];
  } finally { lap.dispose(); }
  const summary = ` lap ${review.lap.time}${review.lap.flying ? ' (flying lap)' : ''}, top ${review.lap.topMph} mph, ${review.corners.length} corners, ${review.crests.length} crests.`;
  console.log('Headless lap done:' + summary);
  review.pack = null; review.browserErrors = []; review.warnings = review.warnings ?? [];
  const data = {
    outputDir, options, files: OUTPUT_FILES,
    title: `${review.course.name} (${review.course.id})`,
    subtitle: `${review.course.lengthM} m, ${review.course.laps} laps, ${review.course.car}, seed ${review.course.seed}, ${options.quality} quality`,
    lapNote: review.lap.flying ? `Lap time is the second (flying) lap of a scripted test driver on Medium; the first lap, from the grid, took ${formatLap(review.lap.lapTimes[0])}.` : 'Lap time is the first lap from the grid.',
    lapTime: review.lap.time, topMph: review.lap.topMph, topAtS: review.lap.topAtS, length: review.course.lengthM,
    defaultEventId: CIRCUIT_MANIFESTS.find(row => row.id === review.course.id)?.unlock?.defaultEventId ?? null,
    // A secret found from the air is entered through the pilot's map record, as the headless lap does.
    fixtureHeli: CIRCUIT_MANIFESTS.find(row => row.id === review.course.id)?.unlock?.kind === 'spotted-from-air'
      ? { ...heliOf({}), map: { version: 1, seen: [], found: [review.course.id], table: false } } : null,
    courseId: review.course.id, courseIndex: lap.stageIndex, winterTyre: lap.winterTyre === true, mphToWorld: lap.mphToWorld, gridS: lap.gridS, hasField: lap.opponents > 0,
    startHeading: lap.course.at(0).heading,
    points: review._profile.rows.map(row => [row.x, row.z, laneOf(review._lap, row.s, lap.course.length)?.mph ?? 0]),
    mapStart: { x: review._profile.rows[0].x, z: review._profile.rows[0].z, heading: review._profile.rows[0].heading },
    corners: review._corners.map(c => ({ number: c.number, name: c.name, direction: c.direction, radius: c.radius, degrees: c.degrees, minMph: c.minMph,
      minMphS: c.minMphS, entryS: c.entryS, exitS: c.exitS, apexS: c.apexS, brakeS: c.brakeS, slow: c.slow, x: c.x, z: c.z })),
    crests: review._crests.map(c => ({ number: c.number, label: c.label, s: c.s, x: c.x, z: c.z, airborne: c.airborne })),
    samples: review._lap.map(row => [row.s, row.mph, row.air ? 1 : 0, row.lateral]),
    heights: review._profile.rows.map(row => [row.s, row.y]),
    gradeText: `${review.grade.percent}% at ${review.grade.s} m`,
    frames: review._points.map(p => ({ index: p.index, key: p.key, label: p.label, kind: p.kind, s: p.s, mph: p.mph, lateral: p.lateral, file: p.file })),
    firstCorner: firstCornerAfter(review._corners, lap.gridS, lap.course.length),
    minMph: Math.max(0, Math.min(...review._lap.map(r => r.mph), review.lap.topMph)),
  };
  data.minMph = Math.floor(data.minMph / 10) * 10;
  const topCopy = review.lap.topMph;
  data.topMph = topCopy;
  writeFileSync(join(outputDir, OUTPUT_FILES.trace), JSON.stringify({ lapTimes: lap.lapTimes, gridS: lap.gridS, trace: lap.trace }));

  // Both the standalone wrapper and the all-scenario sweep consume the same
  // actual headless preparation, including when this run uses --no-browser.
  const inputPath = join(outputDir, 'review-input.json');
  writeFileSync(inputPath, JSON.stringify(data));
  let exitCode = 0;
  if (options.browser) {
    process.env[INPUT_ENV] = inputPath;
    const { main: runHarness } = await import('./browser-harness.mjs');
    const relative = outputDir.slice(PROJECT_ROOT.length).replace(/^[\\/]+/, '');
    const code = await runHarness(['scenario', 'track-review', '--output-dir', relative]);
    if (code !== 0) { review.warnings.push('The browser step reported a failure; see report.json in the output folder.'); exitCode = 1; }
    try {
      const browser = JSON.parse(readFileSync(join(outputDir, 'browser-result.json'), 'utf8'));
      review.pack = browser.pack ?? null;
      review.browserErrors = browser.browserErrors ?? [];
      for (const frame of review.frames) frame.browserErrors = browser.frameErrors?.[frame.index] ?? [];
      review.warnings.push(...(browser.warnings ?? []));
    } catch { review.warnings.push('The browser step left no result file, so there are no pictures.'); exitCode = 1; }
  }
  const publish = { ...review };
  for (const key of Object.keys(publish)) if (key.startsWith('_')) delete publish[key];
  publish.outputs = Object.fromEntries(Object.entries(OUTPUT_FILES).filter(([key]) => key !== 'frameFolder').map(([key, name]) => [key, name]));
  writeFileSync(join(outputDir, OUTPUT_FILES.review), JSON.stringify(publish, null, 2) + '\n');
  if (review.browserErrors.length) console.log(`WARNING: ${review.browserErrors.length} browser error(s): ${review.browserErrors.slice(0, 3).join(' | ')}`);
  for (const warning of review.warnings) console.log(`Note: ${warning}`);
  console.log(`Review: ${join(outputDir, OUTPUT_FILES.review)}`);
  return exitCode;
}

function resolveUnderEvidence(path) {
  const target = resolve(PROJECT_ROOT, path), evidence = resolve(PROJECT_ROOT, '.evidence');
  if (!target.startsWith(evidence + '\\') && !target.startsWith(evidence + '/')) throw Error('Raw output must stay below .evidence/.');
  return target;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(`Track review: ${error.message}`); process.exitCode = 2; });
}
