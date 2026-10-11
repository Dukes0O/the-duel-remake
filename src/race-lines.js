// The racing line and speed profile that computer racers follow in a Grand
// Prix (docs/CIRCUITS.md 3.2). Pure geometry: nothing here reads or changes
// race state, so it can be built and checked without graphics.
//
// A course may carry its own line (`course.racingLine` with an `offsetAt(s)`
// function, which the track script builder provides). Every other course gets
// one computed here from its centreline samples.
import { DRIVE } from './config.js';

export const LINE = Object.freeze({
  step: 8,            // metres between line points
  margin: 1.5,        // the line stays this far inside the road edge
  sweeps: 1800,       // relaxation passes when the line is computed here
  relaxation: 1.75,   // over-relaxation, so long bends settle in few passes
});

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const MPH = DRIVE.mphToWorld;

export function halfWidthAt(course, s) {
  return course.roadHalfWidthAt?.(s) ?? DRIVE.roadHalfWidth;
}

function circuitPhase(course, s, closed) {
  return closed ? ((s % course.length) + course.length) % course.length : clamp(s, 0, course.length);
}

// Lateral offset of the line at each point. Without a provided line, the
// offsets minimise the bending of the path (the usual outside, apex, outside),
// kept inside the road by LINE.margin.
function solveOffsets(course, points, closed) {
  const { count, cx, cz, nx, nz, room } = points;
  const offset = new Float64Array(count);
  const provided = course.racingLine;
  if (provided && typeof provided.offsetAt === 'function') {
    for (let i = 0; i < count; i++) offset[i] = clamp(provided.offsetAt(i * points.step), -room[i], room[i]);
    return offset;
  }
  for (let sweep = 0; sweep < LINE.sweeps; sweep++) {
    let change = 0;
    for (let i = 0; i < count; i++) {
      if (!closed && (i === 0 || i === count - 1)) continue;
      const a = (i - 1 + count) % count, b = (i + 1) % count;
      const mx = (cx[a] + nx[a] * offset[a] + cx[b] + nx[b] * offset[b]) / 2 - cx[i];
      const mz = (cz[a] + nz[a] * offset[a] + cz[b] + nz[b] * offset[b]) / 2 - cz[i];
      const target = clamp(mx * nx[i] + mz * nz[i], -room[i], room[i]);
      const next = clamp(offset[i] + LINE.relaxation * (target - offset[i]), -room[i], room[i]);
      change = Math.max(change, Math.abs(next - offset[i]));
      offset[i] = next;
    }
    if (change < 1e-4) break;
  }
  return offset;
}

const lines = new WeakMap();

export function racingLineFor(course) {
  let line = lines.get(course);
  if (!line) lines.set(course, line = buildRacingLine(course));
  return line;
}

export function buildRacingLine(course) {
  const closed = course.closed !== false;
  const count = Math.max(8, Math.round(course.length / LINE.step)), step = course.length / count;
  const points = { count, step, cx: new Float64Array(count), cz: new Float64Array(count),
    nx: new Float64Array(count), nz: new Float64Array(count), room: new Float64Array(count) };
  const heading = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const s = i * step, frame = course.at(s);
    points.cx[i] = frame.x; points.cz[i] = frame.z;
    points.nx[i] = Math.cos(frame.heading); points.nz[i] = -Math.sin(frame.heading);
    points.room[i] = Math.max(0, halfWidthAt(course, s) - LINE.margin);
    heading[i] = frame.heading;
  }
  const offset = solveOffsets(course, points, closed);
  const px = new Float64Array(count), pz = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    px[i] = points.cx[i] + points.nx[i] * offset[i];
    pz[i] = points.cz[i] + points.nz[i] * offset[i];
  }
  const wrap = i => (closed ? (i + count) % count : clamp(i, 0, count - 1));
  const lineHeading = new Float64Array(count), relHeading = new Float64Array(count), curvature = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const a = wrap(i - 1), b = wrap(i + 1);
    lineHeading[i] = Math.atan2(px[b] - px[a], pz[b] - pz[a]);
    relHeading[i] = wrapAngle(lineHeading[i] - heading[i]);
  }
  for (let i = 0; i < count; i++) {
    const a = wrap(i - 1), b = wrap(i + 1);
    const distance = Math.hypot(px[i] - px[a], pz[i] - pz[a]) + Math.hypot(px[b] - px[i], pz[b] - pz[i]);
    curvature[i] = distance > 1e-6 ? wrapAngle(lineHeading[b] - lineHeading[a]) / distance : 0;
  }
  const phase = s => circuitPhase(course, s, closed);
  // Linear lookups, shared by every racer on this course.
  const at = (table, s) => {
    const p = phase(s) / step, i = Math.min(count - 1, Math.floor(p)), j = closed ? (i + 1) % count : Math.min(count - 1, i + 1);
    return table[i] + (table[j] - table[i]) * (p - i);
  };
  return Object.freeze({
    course, closed, count, step, length: course.length, offset, relHeading, curvature, px, pz,
    provided: !!(course.racingLine && typeof course.racingLine.offsetAt === 'function'),
    phase,
    offsetAt: s => at(offset, s),
    relHeadingAt: s => at(relHeading, s),
    curvatureAt: s => at(curvature, s),
    // Length of the line, which is a little shorter than the centreline.
    lengthAround: () => { let total = 0; for (let i = 0; i < count; i++) { const j = wrap(i + 1); total += Math.hypot(px[j] - px[i], pz[j] - pz[i]); } return total; },
  });
}

// ---- speed profile -------------------------------------------------------

// Acceleration (mph per second) at a speed. The player's gearbox gives less
// push as revs climb in each gear; this smooth curve matches that on average.
export function accelAt(spec, speedMph) {
  const share = clamp(speedMph / spec.topSpeed, 0, 1.2);
  return spec.accel * DRIVE.accelScale * Math.max(.2, 1 - .62 * share * share);
}

// A racer takes a crest inside a corner at a speed that keeps the car on the
// road: fast enough over it to leave the ground, the car lands off its line
// (a pile of cars at the Pine Drop crest, Tremblant Woods). Only authored
// circuits (a provided line) carry crests that matter; on a straight a racer
// may fly. Returns the speed limit in metres per second at each line point,
// or null where no crest in a corner limits anyone.
const CREST_SAFETY = .92, CREST_GRAVITY = 18, CREST_MIN_BEND = 1 / 500;
function crestLimits(line) {
  if (!line.provided) return null;
  const { course, count, step, offset, curvature, closed } = line;
  const height = new Float64Array(count);
  for (let i = 0; i < count; i++) height[i] = course.groundAt(i * step, offset[i]).y;
  const wrap = i => (closed ? (i + count) % count : clamp(i, 0, count - 1));
  let limits = null;
  for (let i = 0; i < count; i++) {
    const bend = (2 * height[i] - height[wrap(i - 1)] - height[wrap(i + 1)]) / (step * step);
    if (bend < .002 || Math.abs(curvature[i]) < CREST_MIN_BEND) continue;
    limits ??= new Float64Array(count).fill(Infinity);
    limits[i] = CREST_SAFETY * Math.sqrt(CREST_GRAVITY / bend);
  }
  return limits;
}

// The fastest speed the line allows at each point for one car, as the car can
// brake for corners and accelerate away. `skill` scales how close to the car's
// limits the racer drives (all 1 = the limit).
export function buildSpeedProfile(line, spec, skill = {}) {
  const { count, step, curvature, closed } = line;
  const cornerFactor = skill.cornerFactor ?? 1, brakeFactor = skill.brakeFactor ?? 1;
  const topFactor = skill.topFactor ?? 1, accelFactor = skill.accelFactor ?? 1;
  const top = spec.topSpeed * topFactor * MPH;
  const lateral = DRIVE.maxLateralAccel * spec.grip;
  const brake = DRIVE.brakeAccel * spec.braking * brakeFactor * MPH;
  const cornerSpeed = new Float64Array(count), v = new Float64Array(count);
  // A hairpin specialist carries a little more speed through the slow corners.
  const slowBonus = skill.slowBonus ?? 0;
  const crest = crestLimits(line);
  for (let i = 0; i < count; i++) {
    let corner = cornerFactor * Math.sqrt(lateral / Math.max(Math.abs(curvature[i]), 1e-5));
    if (slowBonus) corner *= 1 + slowBonus * clamp((140 - corner / MPH) / 60, 0, 1);
    cornerSpeed[i] = Math.min(top, corner, crest ? crest[i] : Infinity);
    v[i] = cornerSpeed[i];
  }
  const passes = closed ? 3 : 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let k = count - 1; k >= 0; k--) {
      const i = k, j = closed ? (k + 1) % count : Math.min(count - 1, k + 1);
      if (j !== i) v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * brake * step));
    }
    for (let k = 0; k < count; k++) {
      const j = k, i = closed ? (k - 1 + count) % count : Math.max(0, k - 1);
      if (i !== j) {
        const a = accelAt(spec, v[i] / MPH) * accelFactor * MPH;
        v[j] = Math.min(v[j], Math.sqrt(v[i] * v[i] + 2 * a * step));
      }
    }
  }
  const mph = new Float64Array(count);
  for (let i = 0; i < count; i++) mph[i] = v[i] / MPH;
  const phase = line.phase;
  const profile = {
    line, spec, skill, count, step, mph, cornerMph: Float64Array.from(cornerSpeed, value => value / MPH),
    topMph: top / MPH,
    at(s) {
      const p = phase(s) / step, i = Math.min(count - 1, Math.floor(p)), j = closed ? (i + 1) % count : Math.min(count - 1, i + 1);
      return mph[i] + (mph[j] - mph[i]) * (p - i);
    },
  };
  profile.corners = findCorners(profile);
  return Object.freeze(profile);
}

// Braking zones: places where the profile drops by a tenth or more into a
// slower stretch. Racers read these to decide when to attack and defend.
function findCorners(profile) {
  const { count, step, mph, line } = profile, closed = line.closed;
  const reach = Math.round(480 / step), near = Math.max(2, Math.round(80 / step));
  const index = i => (closed ? (i + count) % count : clamp(i, 0, count - 1));
  const corners = [];
  for (let i = 0; i < count; i++) {
    if (!closed && (i < near || i > count - near)) continue;
    let minimum = true;
    for (let k = 1; k <= near && minimum; k++) if (mph[index(i - k)] < mph[i] || mph[index(i + k)] < mph[i]) minimum = false;
    if (!minimum) continue;
    // keep the first of a flat bottom
    if (mph[index(i - 1)] === mph[i]) continue;
    let high = mph[i];
    for (let k = -reach; k <= reach; k++) high = Math.max(high, mph[index(i + k)]);
    if (mph[i] > high * .9) continue;
    let entry = i, steps = 0;
    while (steps++ < reach && mph[index(entry - 1)] > mph[index(entry)] + 1e-6) entry = index(entry - 1);
    let exit = i; steps = 0;
    while (steps++ < reach && mph[index(exit + 1)] > mph[index(exit)] + 1e-6) exit = index(exit + 1);
    const kappa = line.curvature[i];
    corners.push({ id: corners.length, apexS: i * step, entryS: entry * step, exitS: exit * step,
      speedMph: mph[i], entryMph: mph[entry], dir: kappa >= 0 ? 1 : -1, radius: 1 / Math.max(Math.abs(kappa), 1e-5) });
  }
  return corners;
}

// The next corner whose apex is still ahead of a lap position, with the
// distance to its apex and to the start of its braking (negative once the
// racer is already braking). Null on a corner-free circuit.
export function nextCorner(profile, position) {
  const corners = profile.corners;
  if (!corners.length) return null;
  const length = profile.line.length, closed = profile.line.closed, phase = profile.line.phase(position);
  let best = null, bestDistance = Infinity;
  for (const corner of corners) {
    let toApex = corner.apexS - phase;
    if (toApex < -4) toApex = closed ? toApex + length : Infinity;
    if (toApex < bestDistance) { best = corner; bestDistance = toApex; }
  }
  if (!best) return null;
  const span = ((best.apexS - best.entryS) % length + length) % length;
  return { corner: best, toApex: bestDistance, toEntry: bestDistance - span };
}
