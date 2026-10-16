// Shared track geometry and reference-trace analysis. No renderer, storage,
// simulation advance or random draws. The extracted review math stays exact.
import {circuitIntel} from './circuit-intel/index.js';

export const wrap = (s, length) => ((s % length) + length) % length;
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function sampleCourse(course, step = 5) {
  const count = Math.round(course.length / step), rows = [];
  for (let i = 0; i < count; i++) {
    const s = i * course.length / count, at = course.at(s);
    rows.push({ s, x: at.x, z: at.z, y: course.groundAt(s, 0).y, heading: at.heading });
  }
  const spacing = course.length / count;
  // Curvature (radians per metre, left positive) from the heading change over
  // 4 samples, then the same smoothed over a little more.
  const raw = rows.map((row, i) => angleDiff(rows[(i + 2) % count].heading, rows[(i - 2 + count) % count].heading) / (4 * spacing));
  rows.forEach((row, i) => {
    let sum = 0;
    for (let j = -2; j <= 2; j++) sum += raw[(i + j + count) % count];
    row.k = sum / 5;
  });
  // Grade over 20 m and vertical curvature (negative second difference: positive on crests).
  const reach = Math.max(1, Math.round(10 / spacing)), wide = Math.max(2, Math.round(20 / spacing));
  rows.forEach((row, i) => {
    const a = rows[(i - reach + count) % count], b = rows[(i + reach) % count];
    row.grade = (b.y - a.y) / (2 * reach * spacing);
    const c = rows[(i - wide + count) % count], d = rows[(i + wide) % count];
    row.kv = -(d.y - 2 * row.y + c.y) / ((wide * spacing) ** 2);
  });
  return { rows, spacing, length: course.length };
}

// Contiguous runs of the cyclic array where test(row) holds, as [startIndex, endIndex] (end may pass the array end).
function cyclicRuns(rows, test) {
  const n = rows.length;
  if (rows.every(test)) return [[0, n - 1]];
  let begin = 0;
  while (test(rows[begin])) begin++;           // start at a gap so runs never straddle the seam
  const runs = [];
  let open = null;
  for (let step = 0; step < n; step++) {
    const i = begin + step, on = test(rows[i % n]);
    if (on && open === null) open = i;
    if (!on && open !== null) { runs.push([open, i - 1]); open = null; }
  }
  if (open !== null) runs.push([open, begin + n - 1]);
  return runs;
}

export const CORNER_RADIUS_LIMIT = 600;       // metres; gentler bends are not corners (the game's own corner boards start near 570 m)
export const STRAIGHT_RADIUS_LIMIT = 900;     // metres; straighter than this counts as straight

export function detectCorners(profile) {
  const { rows, spacing, length } = profile, n = rows.length, kEnter = 1 / CORNER_RADIUS_LIMIT;
  const runs = [];
  for (const sign of [1, -1]) {
    for (const [a, b] of cyclicRuns(rows, row => row.k * sign >= kEnter)) runs.push({ a, b, sign });
  }
  runs.sort((p, q) => p.a - q.a);
  // Join same-direction runs separated by less than 60 m (one long bend with a flat spot).
  const joined = [];
  for (const run of runs) {
    const last = joined.at(-1);
    if (last && last.sign === run.sign && (run.a - last.b - 1) * spacing < 60) last.b = Math.max(last.b, run.b);
    else joined.push({ ...run });
  }
  const first = joined[0], last = joined.at(-1);
  if (joined.length > 1 && first.sign === last.sign && (first.a + n - last.b - 1) * spacing < 60) {
    last.b = Math.max(last.b, first.b + n); joined.shift();
  }
  const corners = [];
  for (const run of joined) {
    let turned = 0, peak = 0, peakIndex = run.a;
    for (let i = run.a; i <= run.b; i++) {
      const row = rows[i % n];
      turned += row.k * run.sign * spacing;
      if (row.k * run.sign > peak) { peak = row.k * run.sign; peakIndex = i; }
    }
    const degrees = turned * 180 / Math.PI;
    if (degrees < 20) continue;
    // The apex is the middle of the tightest stretch, not its first sample.
    const tight = [];
    for (let i = run.a; i <= run.b; i++) if (rows[i % n].k * run.sign >= peak * 0.92) tight.push(i);
    peakIndex = tight[Math.floor(tight.length / 2)];
    const apexRow = rows[peakIndex % n];
    corners.push({
      direction: run.sign > 0 ? 'L' : 'R', degrees: Math.round(degrees), radius: Math.round(1 / peak),
      entryS: wrap(run.a * spacing, length), apexS: wrap(peakIndex * spacing, length), exitS: wrap((run.b + 1) * spacing, length),
      span: (run.b - run.a + 1) * spacing, x: apexRow.x, z: apexRow.z,
    });
  }
  corners.sort((p, q) => p.apexS - q.apexS);
  corners.forEach((corner, i) => { corner.number = i + 1; });
  return corners;
}

export const CREST_MIN_BEND = 1 / 2500;       // vertical curvature (1/m); gentler humps are not crests
export function detectCrests(profile, ramps = []) {
  const { rows, spacing, length } = profile, n = rows.length, found = [];
  for (let i = 0; i < n; i++) {
    const row = rows[i];
    if (row.kv < CREST_MIN_BEND) continue;
    const window = Math.round(40 / spacing);
    let best = true;
    for (let j = -window; j <= window; j++) if (rows[(i + j + n) % n].kv > row.kv + 1e-12) { best = false; break; }
    if (!best) continue;
    const before = rows[(i - Math.round(30 / spacing) + n) % n], after = rows[(i + Math.round(30 / spacing)) % n];
    found.push({ kind: 'crest', s: wrap(i * spacing, length), x: row.x, z: row.z, height: row.y, bend: row.kv,
      radius: Math.round(1 / row.kv), gradeBefore: Math.round(before.grade * 1000) / 10, gradeAfter: Math.round(after.grade * 1000) / 10 });
  }
  for (const ramp of ramps) {
    const s = wrap((ramp.start + ramp.end) / 2, length), i = Math.round(s / spacing) % n;
    found.push({ kind: 'jump', s, x: rows[i].x, z: rows[i].z, height: rows[i].y, bend: 1, radius: 0, gradeBefore: 0, gradeAfter: 0, ramp: true });
  }
  // Two detections inside 60 m are one crest.
  found.sort((p, q) => q.bend - p.bend);
  const kept = [];
  for (const crest of found) {
    if (kept.every(other => Math.abs(angleDistance(other.s, crest.s, length)) > 60)) kept.push(crest);
  }
  kept.sort((p, q) => p.s - q.s);
  kept.forEach((crest, i) => { crest.number = i + 1; });
  return kept;
}
export function angleDistance(a, b, length) { const d = wrap(a - b, length); return d > length / 2 ? d - length : d; }

export function longestStraight(profile) {
  const { rows, spacing, length } = profile, limit = 1 / STRAIGHT_RADIUS_LIMIT;
  const runs = cyclicRuns(rows, row => Math.abs(row.k) <= limit);
  if (!runs.length) return null;
  let best = null;
  for (const [a, b] of runs) {
    const span = (b - a + 1) * spacing;
    if (!best || span > best.length) best = { startS: wrap(a * spacing, length), endS: wrap((b + 1) * spacing, length), length: span };
  }
  return best;
}

export function steepestGrade(profile) {
  let best = { percent: 0, s: 0 };
  for (const row of profile.rows) {
    const percent = Math.abs(row.grade) * 100;
    if (percent > best.percent) best = { percent: Math.round(percent * 10) / 10, s: Math.round(row.s) };
  }
  return best;
}

// Named pieces from a scripted circuit (P4-TRACK-SCRIPT). Accepts the shapes
// that build step is expected to leave on the course; anything else is ignored
// and corners fall back to "Corner N". The track script builder keeps
// course.script.pieces as {name, kind, s0, s1} in metres from the start line
// (s0 may be negative for the piece the line sits in); {start, end} and
// {s, length} are accepted too.
export function namedPieces(course) {
  const list = course.pieces ?? course.script?.pieces ?? course.track?.pieces ?? course.features?.pieces ?? null;
  if (!Array.isArray(list)) return [];
  const pieces = [];
  for (const piece of list) {
    const name = piece?.name ?? piece?.opts?.name ?? piece?.options?.name;
    const start = piece?.s0 ?? piece?.start ?? piece?.s, end = piece?.s1 ?? piece?.end ?? (Number.isFinite(piece?.length) ? start + piece.length : undefined);
    if (typeof name !== 'string' || !name || !Number.isFinite(start) || !Number.isFinite(end)) continue;
    pieces.push({ name, kind: String(piece.kind ?? piece.type ?? ''), start, end });
  }
  return pieces;
}
const pieceAt = (pieces, s, length) => pieces.find(p => {
  const a = wrap(p.start, length), span = p.end - p.start;
  return wrap(s - a, length) <= span;
});

export function nameFeatures({ corners, crests, straight, pieces = [], length }) {
  for (const corner of corners) {
    const piece = pieceAt(pieces.filter(p => p.kind !== 'straight'), corner.apexS, length);
    corner.name = piece?.name ?? null;
    corner.label = `${corner.number}${corner.name ? ' ' + corner.name : ''}`;
  }
  for (const crest of crests) {
    const piece = pieceAt(pieces, crest.s, length);
    crest.name = piece?.name ?? null;
    crest.label = crest.kind === 'jump' ? `Jump ${crest.number}` : `Crest ${crest.number}`;
    if (crest.name) crest.label += ` (${crest.name})`;
  }
  if (straight) {
    const piece = pieceAt(pieces.filter(p => p.kind === 'straight' || !p.kind), (straight.startS + straight.length / 2) % length, length);
    straight.name = piece?.name ?? null;
  }
  return { corners, crests, straight };
}

// ---------------------------------------------------------------------------
// The test-driver trace: rows of {s (lap distance), mph, lateral, air, y}

export function laneOf(trace, s, length) {
  if (!trace.length) return null;
  let best = trace[0], bestGap = Infinity;
  for (const row of trace) {
    const gap = Math.abs(angleDistance(row.s, s, length));
    if (gap < bestGap) { best = row; bestGap = gap; }
  }
  return best;
}

export function cornerSpeeds(corners, trace, length) {
  for (const corner of corners) {
    const from = corner.span ? corner.span / 2 + 10 : 40;
    let minimum = null, minimumS = null, approach = null, approachS = null;
    for (const row of trace) {
      const gap = angleDistance(row.s, corner.apexS, length);
      if (Math.abs(gap) <= from && (minimum === null || row.mph < minimum)) { minimum = row.mph; minimumS = row.s; }
      if (gap < 0 && gap >= -350 && (approach === null || row.mph > approach)) { approach = row.mph; approachS = row.s; }
    }
    corner.minMph = minimum === null ? null : Math.round(minimum);
    corner.minMphS = minimumS === null ? null : Math.round(minimumS);
    corner.approachMph = approach === null ? null : Math.round(approach);
    // Braking point: where the driver was fastest before the corner, if it really slowed.
    const slowed = approach !== null && minimum !== null && approach - minimum >= 8;
    corner.brakeS = slowed ? wrap(approachS, length) : wrap(corner.apexS - Math.min(90, Math.max(50, (corner.span || 100) / 2 + 40)), length);
    corner.braked = slowed;
  }
  return corners;
}

// A corner is slow when the driver took it well under the lap's top speed.
export function markSlowCorners(corners, topMph, fraction = 0.7) {
  for (const corner of corners) corner.slow = corner.minMph !== null && corner.minMph < topMph * fraction;
  return corners;
}

export function markCrestLift(crests, trace, length) {
  for (const crest of crests) {
    const near = trace.filter(row => Math.abs(angleDistance(row.s, crest.s, length)) <= 35);
    crest.airborne = near.some(row => row.air);
    crest.mph = near.length ? Math.round(near.reduce((sum, row) => sum + row.mph, 0) / near.length) : null;
  }
  return crests;
}

// The review's palette is repeated inside its self-contained drawMap function:
// that function is serialized into the browser without an import closure.
// Keep these exact stops in step; tests compare the actual drawing colours.
export function referenceSpeedColour(mph, minMph, topMph) {
  const t = Math.max(0, Math.min(1, (mph - minMph) / Math.max(1, topMph - minMph)));
  const stops = [[53, 99, 214], [41, 184, 190], [240, 214, 64], [232, 86, 52]];
  const at = t * 3, i = Math.min(2, Math.floor(at)), f = at - i;
  return `rgb(${stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f)).join(',')})`;
}

// Authored values are the start distances of sectors 2 and 3 (CIRCUITS 7b.1).
// These distance partitions contain no invented lap times.
export function trackSectors(length, starts = [length / 3, length * 2 / 3]) {
  if (!Number.isFinite(length) || length <= 0)
    throw new TypeError('Sectors need a positive finite lap length.');
  if (!Array.isArray(starts) || starts.length !== 2 || !starts.every(Number.isFinite) ||
      starts[0] <= 0 || starts[0] >= starts[1] || starts[1] >= length)
    throw new TypeError('Authored sectors need two increasing starts inside the lap.');
  const ends = [0, ...starts, length];
  return ends.slice(1).map((endS, index) => ({
    number: index + 1, startS: ends[index], endS, lengthM: endS - ends[index],
  }));
}

// The caller supplies one real lap, already selected and in lap coordinates.
// No trace means geometry only; null is never presented as measured zero mph.
export function analyseTrack(course, {trace = [], sectorStarts} = {}) {
  if (!course || course.closed === false || !Number.isFinite(course.length) || course.length < 25 ||
      typeof course.at !== 'function' || typeof course.groundAt !== 'function')
    throw new TypeError('Track analysis needs a closed course at least 25 metres long.');
  if (!Array.isArray(trace) || trace.some(row => !row || !Number.isFinite(row.s) || !Number.isFinite(row.mph)))
    throw new TypeError('Reference trace needs finite distance and speed samples.');
  const profile = sampleCourse(course), pieces = namedPieces(course), length = course.length;
  const corners = detectCorners(profile), crests = detectCrests(profile, course.features?.ramps ?? []);
  const straight = longestStraight(profile);
  nameFeatures({corners, crests, straight, pieces, length});
  // The extracted annotators change only our newly allocated features; they
  // read the caller's trace. Preserve the review's exact rounded top-speed rule.
  let top = {mph: 0, s: 0};
  for (const row of trace) if (row.mph > top.mph) top = {mph: Math.round(row.mph), s: Math.round(row.s)};
  cornerSpeeds(corners, trace, length);
  markSlowCorners(corners, top.mph);
  markCrestLift(crests, trace, length);
  const minMph = trace.length ? Math.floor(Math.max(0, Math.min(...trace.map(row => row.mph), top.mph)) / 10) * 10 : null;
  return {
    profile, pieces, corners, crests, straight, sectors: trackSectors(length, sectorStarts),
    grade: steepestGrade(profile),
    mapPoints: profile.rows.map(row => [row.x, row.z, laneOf(trace, row.s, length)?.mph ?? null]),
    reference: trace.length ? {topMph: top.mph, topAtS: top.s, minMph} : null,
  };
}

export function cornerId(corner) {
  const slug = String(corner.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || `c${corner.number}`;
}

// The Team Room picture is an elevated chase view, like the race camera pulled
// up and back: the eye floats `up` metres above the road and CHASE metres behind
// the viewing point (the braking point for a corner), looking down the road at
// the feature. A corner is aimed at its apex; a crest or passing zone looks
// `ahead` metres past the viewing point. Nothing in this file touches race state.
export const SNAPSHOT_UP = 9;          // metres above the road
export const SNAPSHOT_CHASE = 18;      // metres behind the viewing point
export const SNAPSHOT_CLEARANCE = 9;     // metres the eye stays above any other road passing close by (a deck over the road below)
export const SNAPSHOT_FOV = 58;         // vertical field of view in degrees, a little wider than the race camera
export const SNAPSHOT_MAX_APPROACH = 60; // furthest the apex may be from the viewing point, so the corner stays big in frame

// Another stretch of the same lap can pass right beside this one on higher ground (the road below a
// hairpin runs under the approach to it). Report the highest road within `radius` metres sideways
// that is not just the neighbouring road metres along this one.
function highestNearbyRoad(course, eye, s, radius = 32) {
  let top = -Infinity;
  for (let along = 0; along < course.length; along += 8) {
    const gap = Math.abs(wrap(along - s + course.length / 2, course.length) - course.length / 2);
    if (gap < 90) continue;
    const point = course.at(along);
    if (Math.hypot(point.x - eye.x, point.z - eye.z) < radius) top = Math.max(top, course.groundAt(along, 0).y);
  }
  return top;
}

export function trackSnapshotPose(course, flag) {
  const {snapshotS, camera} = flag ?? {};
  if (![snapshotS, camera?.up, camera?.ahead].every(Number.isFinite) || camera.up <= 0 || camera.ahead <= 0)
    throw Error('Track snapshot needs a finite approach position and positive camera height/look-ahead.');
  const s = wrap(snapshotS - SNAPSHOT_CHASE, course.length), aimS = wrap(snapshotS + camera.ahead, course.length);
  const eye = course.at(s), target = course.at(aimS);
  // Inside a tunnel the eye stays under the roof.
  const roof = course.tunnelAt?.(s)?.height, up = roof ? Math.min(camera.up, roof - 1.5) : camera.up;
  const ground = course.groundAt(s, 0).y, above = highestNearbyRoad(course, eye, s) + SNAPSHOT_CLEARANCE;
  return {position: {x: eye.x, y: Math.max(ground + up, roof ? -Infinity : above), z: eye.z},
    target: {x: target.x, y: course.groundAt(aimS, 0).y, z: target.z},
    heading: eye.heading, s, viewS: wrap(snapshotS, course.length)};
}

// Interpolate an actual forward crossing. The caller keeps the native lap
// timestamps; this only locates distance boundaries between observations.
export function lapCrossing(trace, distance) {
  for (let i = 0; i < trace.length; i++) {
    const row = trace[i];
    // The last row of a lap sits on the line to within rounding (a lap's distance minus its start).
    if (Math.abs(row.s - distance) < 1e-6) return {...row, s: distance};
    const next = trace[i + 1];
    if (!next || row.s > distance || next.s < distance || next.s <= row.s) continue;
    const mix = (distance - row.s) / (next.s - row.s);
    return {s: distance, t: row.t + (next.t - row.t) * mix,
      mph: row.mph + (next.mph - row.mph) * mix,
      gear: mix < .5 ? row.gear : next.gear};
  }
  throw Error(`Lap trace has no complete crossing at ${distance} metres.`);
}

export function compactLapTrace(lap) {
  const rows = [];
  for (let distance = 0; distance < lap.length; distance += 20)
    rows.push([distance, Math.round(lapCrossing(lap.trace, distance).mph * 1.609344)]);
  return rows;
}

export function lapSectorTimes(lap, sectors) {
  const boundaries = sectors.map(sector => Math.round(lapCrossing(lap.trace, sector.endS).t * 1000));
  boundaries[boundaries.length - 1] = lap.lapMs;
  return boundaries.map((time, index) => time - (index ? boundaries[index - 1] : 0));
}

// Both the shipped reference and the player's telemetry enter here with one
// complete native lap, rebased to s=0/t=0, including the finish-line sample.
// Native forward gears are zero-based; reverse is -1. The recorder supplies
// final forward distance crossings, retaining elapsed time spent reversing.
export function analyseLap(course, {trace, lapMs, route = 'fixed', authored} = {}) {
  if (!Array.isArray(trace) || trace.length < 2 || !Number.isInteger(lapMs) || lapMs <= 0 ||
      trace[0].s !== 0 || trace[0].t !== 0 || Math.abs(trace.at(-1).s - course.length) > 1e-6 ||
      Math.abs(trace.at(-1).t * 1000 - lapMs) > 1 ||
      trace.some((row, index) => ![row.s, row.t, row.mph, row.gear].every(Number.isFinite) ||
        row.s < 0 || row.s > course.length || !Number.isInteger(row.gear) || row.gear < -1 ||
        (index > 0 && row.t < trace[index - 1].t)))
    throw Error('Lap analysis needs a complete native trace with finite times, speeds and gears.');
  // Speed is a magnitude in plots/targets; controls retain their signed gear.
  trace = trace.map(row => ({...row, mph: Math.abs(row.mph)}));
  const intel = resolveTrackIntel(course, route, authored);
  const analysis = analyseTrack(course, {trace, sectorStarts: intel.sectors});
  const lap = {length: course.length, trace, lapMs};
  const speedAt = distance => Math.round(lapCrossing(trace, wrap(distance, course.length)).mph * 1.609344);
  const corners = analysis.corners.map(corner => {
    const radius = corner.span ? corner.span / 2 + 10 : 40;
    const near = trace.filter(row => Math.abs(angleDistance(row.s, corner.apexS, course.length)) <= radius);
    const minimum = near.reduce((best, row) => !best || row.mph < best.mph ? row : best, null)
      ?? lapCrossing(trace, corner.apexS);
    const entryTime = lapCrossing(trace, wrap(corner.entryS, course.length)).t;
    const exitTime = lapCrossing(trace, wrap(corner.exitS, course.length)).t;
    const elapsedMs = Math.round((exitTime - entryTime +
      (corner.exitS <= corner.entryS ? trace.at(-1).t : 0)) * 1000);
    if (elapsedMs <= 0) throw Error('Complete lap trace has no positive elapsed time through a corner.');
    return {id: cornerId(corner), s: corner.apexS, brakeS: corner.brakeS,
      entryKph: speedAt(corner.entryS), minKph: Math.round(minimum.mph * 1.609344),
      exitKph: speedAt(corner.exitS), gear: minimum.gear === -1 ? 'R' : minimum.gear + 1, elapsedMs};
  });
  return {lapMs, sectorMs: lapSectorTimes(lap, analysis.sectors), trace: compactLapTrace(lap),
    corners, courseFingerprint: courseFingerprint(course, {route, authored})};
}

function mergeIntel(base = {}, patch = {}) {
  const notes = {...base.notes};
  for (const [id, note] of Object.entries(patch.notes ?? {})) notes[id] = {...notes[id], ...note};
  const flags = new Map((base.flags ?? []).map(flag => [flag.id, {...flag, camera: {...flag.camera}}]));
  for (const flag of patch.flags ?? []) {
    const previous = flags.get(flag.id);
    flags.set(flag.id, {...previous, ...flag, camera: {...previous?.camera, ...flag.camera}});
  }
  return {...base, ...patch, notes, flags: [...flags.values()]};
}

export function resolveTrackIntel(course, route = 'fixed', authored = circuitIntel(course.def?.id) ?? {}) {
  const inline = course.intel ?? course.def?.intel ?? {};
  const base = mergeIntel(authored, inline);
  const routePatch = mergeIntel(authored.routes?.[route], inline.routes?.[route]);
  return mergeIntel(base, routePatch);
}

// A portable deterministic fingerprint of the actual sampled road, width,
// ground, surfaces, named geometry and sector partition. No clocks or RNG.
// Sector boundaries are included because the same geometry with new timing
// lines also needs a rebuilt reference record.
export function courseFingerprint(course, {route = 'fixed', authored} = {}) {
  const profile = sampleCourse(course), intel = resolveTrackIntel(course, route, authored);
  let hash = 0x811c9dc5;
  const add = value => {
    const text = typeof value === 'number' ? Number(value.toFixed(6)).toString() : String(value);
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
    hash = Math.imul(hash ^ 124, 0x01000193);
  };
  add(course.closed !== false); add(course.length);
  for (const row of profile.rows) {
    const width = course.halfWidthAt?.(row.s) ?? course.roadHalfWidthAt?.(row.s) ?? 7;
    for (const value of [row.s, row.x, row.z, row.y, row.heading, width,
      course.groundAt(row.s, -width).y, course.groundAt(row.s, width).y]) add(value);
    const surface = course.surfaceAt?.(row.s, 0);
    if (surface) for (const key of Object.keys(surface).sort()) { add(key); add(surface[key]); }
  }
  for (const piece of namedPieces(course)) { add(piece.name); add(piece.kind); add(piece.start); add(piece.end); }
  for (const sector of trackSectors(course.length, intel.sectors)) { add(sector.startS); add(sector.endS); }
  return `track-v1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function engineerNote(corner, measured, written = {}) {
  const direction = corner.direction === 'L' ? 'left' : 'right';
  return {
    brakeBoard: written.brakeBoard ?? null,
    gear: written.gear ?? measured?.gear ?? null,
    targetKph: written.targetKph ?? measured?.minKph ??
      (Number.isFinite(corner.minMph) ? Math.round(corner.minMph * 1.609344) : null),
    line: written.line ?? `Set up wide for this ${direction} turn. Let the car open its line on exit.`,
    note: written.note ?? `Brake in a straight line before turning ${direction}.`,
    authored: Object.keys(written).length > 0,
  };
}

// A generated crest flag is dropped when it only repeats something nearby: a corner whose apex is up to
// CREST_FOLD_BEFORE_M after it or CREST_FOLD_AFTER_M before it (that corner's note covers the crest), or
// the signature view standing on the same crest. Crests on open road, and every written flag, stay.
export const CREST_FOLD_BEFORE_M = 150;
export const CREST_FOLD_AFTER_M = 60;
export const CREST_FOLD_SIGNATURE_M = 15;
function foldCrestFlags(flags, analysis, length) {
  const apexes = new Map(analysis.corners.map(corner => [cornerId(corner), corner.apexS]));
  const corners = [...flags.values()].filter(flag => flag.kind === 'corner').map(flag => apexes.get(flag.id) ?? flag.s);
  const signatures = [...flags.values()].filter(flag => flag.kind === 'signature').map(flag => flag.s);
  for (const [id, flag] of [...flags]) {
    if (flag.kind !== 'crest' || !flag.generated) continue;
    const beforeCorner = corners.some(apex => {
      const gap = angleDistance(apex, flag.s, length);
      return gap >= -CREST_FOLD_AFTER_M && gap <= CREST_FOLD_BEFORE_M;
    });
    const onSignature = signatures.some(s => Math.abs(angleDistance(s, flag.s, length)) < CREST_FOLD_SIGNATURE_M);
    if (beforeCorner || onSignature) flags.delete(id);
  }
}

export function buildTrackDossier(course, {route = 'fixed', reference, authored} = {}) {
  if (!reference || reference.eventId !== course.def.id || reference.route !== route)
    throw Error('Matching event and route reference missing. Run node tools/build-reference-laps.mjs.');
  const fingerprint = courseFingerprint(course, {route, authored});
  if (reference.courseFingerprint !== fingerprint)
    throw Error('Track reference is stale. Rebuild with node tools/build-reference-laps.mjs.');
  const intel = resolveTrackIntel(course, route, authored);
  const trace = reference.trace.map(([s, kph]) => ({s, mph: kph / 1.609344}));
  const analysis = analyseTrack(course, {trace, sectorStarts: intel.sectors});
  const measured = new Map(reference.corners.map(corner => [corner.id, corner]));
  const notes = new Map(analysis.corners.map(corner => [cornerId(corner),
    engineerNote(corner, measured.get(cornerId(corner)), intel.notes[cornerId(corner)])]));
  // A corner is viewed from its braking point, but never from so far back that it shrinks to a speck,
  // and always aimed at its real apex (an authored flag may sit earlier on the road than the apex).
  const cornerViews = new Map(analysis.corners.map(corner => {
    const brakeS = measured.get(cornerId(corner))?.brakeS ?? corner.brakeS;
    const braking = wrap(corner.apexS - brakeS, course.length), approach = Math.min(braking, SNAPSHOT_MAX_APPROACH);
    return [cornerId(corner), {approach, viewS: braking > approach ? wrap(corner.apexS - approach, course.length) : wrap(brakeS, course.length)}];
  }));
  const generated = [];
  for (const corner of analysis.corners) {
    const id = cornerId(corner);
    if (!corner.slow) continue;
    generated.push({id, kind: 'corner', s: corner.apexS, title: corner.name || `Corner ${corner.number}`,
      engineer: notes.get(id), generated: true});
  }
  for (const crest of analysis.crests) generated.push({id: `crest-${crest.number}`, kind: 'crest',
    s: crest.s, title: crest.label, engineer: {note: 'Settle the car before the crest. Keep steering smooth as the road drops away.'}, generated: true});
  const mostBraking = [...analysis.corners].sort((a, b) =>
    (b.approachMph - b.minMph) - (a.approachMph - a.minMph))[0];
  generated.push({id: 'overtaking', kind: 'overtaking',
    s: analysis.straight?.endS ?? mostBraking?.brakeS ?? analysis.reference.topAtS,
    title: analysis.straight?.name || (analysis.straight ? 'Longest straight approach' : 'Passing approach'),
    engineer: {note: 'Build your run on the approach. Complete the pass before turning in.'}, generated: true});
  const signatureCrest = [...analysis.crests].sort((a, b) => b.bend - a.bend)[0];
  const signatureCorner = [...analysis.corners].sort((a, b) => a.radius - b.radius)[0];
  generated.push({id: 'signature', kind: 'signature',
    s: signatureCrest?.s ?? signatureCorner?.apexS ?? 0,
    title: signatureCrest?.name || signatureCorner?.name ||
      (signatureCrest ? 'Main crest' : signatureCorner ? 'Tightest turn' : 'Start-line view'),
    engineer: {note: signatureCrest ? 'Learn the view over this crest before pushing the pace.'
      : signatureCorner ? 'This is the tightest turn. Prioritise a clean exit.' : 'Check the start-line direction before your first lap.'}, generated: true});

  const authoredFlags = intel.flags;
  if (authoredFlags.filter(flag => flag.kind === 'signature').length > 1 ||
      authoredFlags.filter(flag => flag.kind === 'overtaking').length > 2)
    throw Error('Authored intel allows one signature and at most two overtaking flags.');
  const flags = new Map(generated.filter(flag =>
    !(['signature', 'overtaking'].includes(flag.kind) && authoredFlags.some(item => item.kind === flag.kind)))
    .map(flag => [flag.id, flag]));
  for (const written of authoredFlags) {
    const previous = flags.get(written.id);
    // A corner flag shows its corner's note. Any other written flag (a passing zone, the signature view)
    // shows the note written under its own id, over whatever the shared analysis would have said.
    const authoredNote = notes.has(written.id) ? null : intel.notes[written.id];
    flags.set(written.id, {...previous, ...written, generated: false,
      camera: {...previous?.camera, ...written.camera},
      engineer: authoredNote ? {...previous?.engineer, ...authoredNote}
        : previous?.engineer ?? notes.get(written.id) ?? {note: written.title}});
  }
  foldCrestFlags(flags, analysis, course.length);
  const list = [...flags.values()].map(flag => {
    if (!flag.id || !['corner', 'crest', 'signature', 'overtaking'].includes(flag.kind) || !Number.isFinite(flag.s))
      throw Error('Authored flag needs an id, known kind and finite lap position.');
    // Any flag that stands for an analysed corner (even a signature view of a hairpin) is aimed at its apex.
    const cornerView = cornerViews.get(flag.id) ?? null;
    const writtenCamera = authoredFlags.some(item => item.id === flag.id && Object.keys(item.camera ?? {}).length > 0);
    if (cornerView && !writtenCamera) return {...flag, s: wrap(flag.s, course.length), snapshotS: cornerView.viewS,
      camera: {back: cornerView.approach, up: SNAPSHOT_UP, ahead: cornerView.approach, ...flag.camera}};
    // Anything else looks `ahead` metres past its viewing point.
    const camera = {back: 30, up: SNAPSHOT_UP, ahead: 70, ...flag.camera};
    if (![camera.back, camera.up, camera.ahead].every(Number.isFinite) || camera.back < 0 || camera.up <= 0 || camera.ahead <= 0)
      throw Error('Snapshot camera needs non-negative back and positive height/look-ahead distances.');
    const hasWrittenView = authoredFlags.some(item => item.id === flag.id &&
      (Number.isFinite(item.s) || Object.keys(item.camera ?? {}).length > 0));
    const snapshotS = hasWrittenView || !Number.isFinite(flag.snapshotS)
      ? wrap(flag.s - camera.back, course.length) : flag.snapshotS;
    return {...flag, s: wrap(flag.s, course.length), camera, snapshotS};
  }).sort((a, b) => a.s - b.s || a.id.localeCompare(b.id));
  return {courseId: course.def.id, name: course.def.name, route, analysis, reference,
    flags: list, notes: Object.fromEntries(notes), intel};
}
