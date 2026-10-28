// Authored circuits (docs/CIRCUITS.md section 3.1). A circuit is a list of
// straights and turns, like directions. This file turns that list into a road:
// a centreline with eased (clothoid) corners, a loop closed by stretching the
// straights, height with crests, a width at every point, wall, kerb and board
// positions, and a racing line with a speed profile for computer racers.
//
// The module is pure geometry. It reads no game rules, uses no randomness and
// needs no graphics, so a given script always builds the same road.
//
// Conventions match Course: heading 0 points along +z, x = sin(heading),
// z = cos(heading). Heading grows when the road turns LEFT, and lateral
// offsets are positive on the LEFT of the direction of travel.

import { SURFACE_KINDS } from './race-surfaces.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

export const TRACK_SCRIPT = Object.freeze({
  step: 2,                  // table spacing along the road, metres
  integrationStep: .25,     // micro step used to draw the centreline
  defaultWidth: 14,         // full road width; the current constant (7 m half width)
  minEase: 25,              // each eased join into or out of an arc, at least
  maxEase: 60,
  easeShare: .3,            // ease length as a share of radius * angle
  angleToleranceDeg: 2,     // turns must add up to a full lap within this
  straightChangeLimit: .15, // closing may stretch or shrink a straight this much
  blendLength: 40,          // a new width arrives over this many metres
  crestHalfSpan: 32,        // a crest is a smooth bump this far each side of the piece middle
  wallSetback: 1,           // walls stand this far outside the road edge
  wallThickness: 1,         // full thickness of a wall
  wallHeight: 1.15,         // solid height of a wall
  runoff: 12,               // clear grass or gravel beyond the edge where there is no wall
  kerbWidth: 1,
  boardRadius: 40,          // boards before every turn tighter than this
  boardDistances: Object.freeze([150, 100, 50]),
  lineMargin: 1.5,          // racing line stays this far inside the road edge
  apexShare: .55,           // apex sits a little past the middle of the corner
});

export class TrackScriptError extends Error {
  constructor(message) { super(message); this.name = 'TrackScriptError'; }
}

const STRAIGHT_OPTIONS = ['climb', 'width', 'crest', 'walls', 'surface', 'boards', 'name'];
const TURN_OPTIONS = [...STRAIGHT_OPTIONS, 'bank', 'kerbs'];
const WALL_VALUES = ['both', 'left', 'right', 'none'];

// ---------------------------------------------------------------------------
// 1. Reading the script
// ---------------------------------------------------------------------------

function label(id, index, name) { return `Track script "${id}" piece ${index + 1}${name ? ` (${name})` : ''}`; }

// Width, walls and surface stay in force from the piece that sets them until a
// later piece sets something else. Every piece comes out fully resolved, which
// is also what makes reversing exact.
export function resolvePieces(script, { id = 'script', defaults = {} } = {}) {
  if (!Array.isArray(script) || !script.length) throw new TrackScriptError(`Track script "${id}" has no pieces.`);
  let width = defaults.width ?? TRACK_SCRIPT.defaultWidth;
  let walls = defaults.walls ?? 'none';
  let surface = defaults.surface ?? 'asphalt';
  return script.map((entry, index) => {
    if (!Array.isArray(entry)) throw new TrackScriptError(`${label(id, index)} must be a list such as ['straight', 200, {}].`);
    const kind = entry[0];
    const turn = kind === 'turn';
    if (kind !== 'straight' && !turn) throw new TrackScriptError(`${label(id, index)} must start with 'straight' or 'turn', not ${JSON.stringify(kind)}.`);
    const opts = (turn ? entry[4] : entry[2]) ?? {};
    const name = opts.name ?? '';
    for (const key of Object.keys(opts)) {
      if (!(turn ? TURN_OPTIONS : STRAIGHT_OPTIONS).includes(key)) {
        throw new TrackScriptError(`${label(id, index, name)} has an unknown option "${key}". Allowed: ${(turn ? TURN_OPTIONS : STRAIGHT_OPTIONS).join(', ')}.`);
      }
    }
    const finite = (value, what) => {
      if (!Number.isFinite(value)) throw new TrackScriptError(`${label(id, index, name)}: ${what} must be a number.`);
      return value;
    };
    const piece = { index, kind, name };
    if (turn) {
      const side = entry[1];
      if (side !== 'L' && side !== 'R') throw new TrackScriptError(`${label(id, index, name)}: a turn goes 'L' or 'R', not ${JSON.stringify(side)}.`);
      piece.dir = side === 'L' ? 1 : -1;
      piece.degrees = finite(entry[2], 'the turn angle');
      piece.radius = finite(entry[3], 'the radius');
      if (piece.degrees <= 0 || piece.degrees >= 360) throw new TrackScriptError(`${label(id, index, name)}: the turn angle must be between 0 and 360 degrees.`);
      if (piece.radius <= 0) throw new TrackScriptError(`${label(id, index, name)}: the radius must be above zero.`);
      piece.bank = opts.bank === undefined ? 0 : finite(opts.bank, 'bank');
      if (piece.bank < 0) throw new TrackScriptError(`${label(id, index, name)}: bank is a positive number of degrees leaning into the turn.`);
      piece.kerbs = opts.kerbs !== false;
    } else {
      piece.dir = 0;
      piece.length = finite(entry[1], 'the length');
      if (piece.length <= 0) throw new TrackScriptError(`${label(id, index, name)}: the length must be above zero.`);
      piece.bank = 0;
      piece.kerbs = false;
    }
    piece.climb = opts.climb === undefined ? 0 : finite(opts.climb, 'climb');
    piece.crest = opts.crest === undefined ? 0 : finite(opts.crest, 'crest');
    if (piece.crest < 0) throw new TrackScriptError(`${label(id, index, name)}: a crest is a positive height; use climb for drops.`);
    if (opts.width !== undefined) {
      width = finite(opts.width, 'width');
      if (width < 4) throw new TrackScriptError(`${label(id, index, name)}: a road narrower than 4 m cannot be driven.`);
    }
    if (opts.walls !== undefined) {
      if (!WALL_VALUES.includes(opts.walls)) throw new TrackScriptError(`${label(id, index, name)}: walls must be one of ${WALL_VALUES.join(', ')}.`);
      walls = opts.walls;
    }
    if (opts.surface !== undefined) {
      if (!SURFACE_KINDS.includes(opts.surface)) throw new TrackScriptError(`${label(id, index, name)}: surface must be one of ${SURFACE_KINDS.join(', ')}.`);
      surface = opts.surface;
    }
    piece.width = width;
    piece.walls = walls;
    piece.surface = surface;
    piece.boards = opts.boards; // undefined: automatic
    return piece;
  });
}

// The same road driven backwards: pieces in reverse order, turns flipped,
// climbs negated. Walls swap sides because left and right swap.
export function reversePieces(pieces) {
  const flip = { left: 'right', right: 'left', both: 'both', none: 'none' };
  return pieces.slice().reverse().map((piece, index) => ({
    ...piece, index, dir: -piece.dir, climb: -piece.climb, walls: flip[piece.walls],
  }));
}

// ---------------------------------------------------------------------------
// 2. Corners: turn angles, ease lengths, closing the loop
// ---------------------------------------------------------------------------

function prepareTurns(pieces, id) {
  for (const piece of pieces) {
    if (piece.kind !== 'turn') continue;
    piece.angle = piece.degrees * DEG;
    const arc = piece.radius * piece.angle;
    piece.ease = clamp(TRACK_SCRIPT.easeShare * arc, TRACK_SCRIPT.minEase, TRACK_SCRIPT.maxEase);
    if (piece.ease > arc + 1e-9) {
      throw new TrackScriptError(`${label(id, piece.index, piece.name)}: a ${piece.degrees} degree turn at ${piece.radius} m radius is only ${arc.toFixed(1)} m of bend, ` +
        `too short for a ${TRACK_SCRIPT.minEase} m eased join. Use a larger angle or radius.`);
    }
    piece.length = piece.ease + arc; // two eases of ease/2 turn each, plus the arc between
  }
}

// Left is positive. A closed circuit needs 360 (or -360 for a clockwise lap).
function fixTurnSum(pieces, id) {
  const turns = pieces.filter(piece => piece.kind === 'turn');
  const sum = turns.reduce((total, piece) => total + piece.dir * piece.degrees, 0);
  const target = sum < 0 ? -360 : 360;
  const off = target - sum;
  if (!turns.length || Math.abs(off) > TRACK_SCRIPT.angleToleranceDeg) {
    throw new TrackScriptError(`Track script "${id}": the turns add up to ${sum.toFixed(1)} degrees (left counts as plus, right as minus). ` +
      `A closed circuit needs 360 (or -360 going clockwise), within ${TRACK_SCRIPT.angleToleranceDeg} degrees. It is ${Math.abs(off).toFixed(1)} degrees off.`);
  }
  // The few leftover degrees are shared out in proportion to each turn, so the
  // road leaves the start line in the same direction it arrives.
  const total = turns.reduce((t, piece) => t + piece.degrees, 0);
  for (const piece of turns) piece.degrees += piece.dir * off * piece.degrees / total;
  return { sumDeg: sum, adjustDeg: off };
}

// Curvature along a piece, as flat elements: a line, or ease in, arc, ease out.
function elementsFor(pieces) {
  const elements = [];
  let s = 0;
  for (const piece of pieces) {
    piece.s0 = s;
    if (piece.kind === 'straight') {
      elements.push({ piece, type: 'line', s0: s, length: piece.length, k0: 0, k1: 0 });
      s += piece.length;
    } else {
      const k = piece.dir / piece.radius, arc = piece.radius * piece.angle - piece.ease;
      elements.push({ piece, type: 'ease-in', s0: s, length: piece.ease, k0: 0, k1: k });
      elements.push({ piece, type: 'arc', s0: s + piece.ease, length: arc, k0: k, k1: k });
      elements.push({ piece, type: 'ease-out', s0: s + piece.ease + arc, length: piece.ease, k0: k, k1: 0 });
      piece.arcStart = s + piece.ease;
      piece.arcEnd = s + piece.ease + arc;
      s += piece.length;
    }
    piece.s1 = s;
  }
  return { elements, length: s };
}

// Draws the centreline at a fine step. Heading and curvature are exact; the
// position is a midpoint walk at 25 cm, far finer than any later use.
function integrate(elements) {
  const s = [0], x = [0], z = [0], h = [0], k = [0];
  let px = 0, pz = 0, ph = 0, ps = 0;
  for (const element of elements) {
    if (element.length <= 0) continue;
    const n = Math.max(1, Math.ceil(element.length / TRACK_SCRIPT.integrationStep)), ds = element.length / n;
    const dk = element.k1 - element.k0, startHeading = ph;
    const heading = tau => startHeading + element.k0 * tau + dk * tau * tau / (2 * element.length);
    for (let j = 1; j <= n; j++) {
      const mid = heading((j - .5) * ds);
      px += Math.sin(mid) * ds; pz += Math.cos(mid) * ds;
      s.push(ps + j * ds); x.push(px); z.push(pz);
      h.push(heading(j * ds)); k.push(element.k0 + dk * j * ds / element.length);
    }
    ph = heading(element.length); ps += element.length;
  }
  return { s, x, z, h, k };
}

// Least squares closure: the smallest relative stretch of the straights that
// puts the end back on the start, no straight changing by more than the limit.
// For minimum sum of squares with a box limit, each change is
// clamp(m . lambda), where m is the straight's own length vector and lambda is
// a pair of numbers found by Newton steps until the end meets the start.
function solveClosure(straights, gap, limit, id) {
  const vectors = straights.map(straight => ({ x: straight.length * Math.sin(straight.heading), z: straight.length * Math.cos(straight.heading) }));
  const changeFor = (lx, lz) => vectors.map(m => clamp(m.x * lx + m.z * lz, -limit, limit));
  const missing = (lx, lz) => {
    const change = changeFor(lx, lz);
    let x = gap.x, z = gap.z;
    change.forEach((a, i) => { x += a * vectors[i].x; z += a * vectors[i].z; });
    return { x, z, size: Math.hypot(x, z) };
  };
  let lx = 0, lz = 0, now = missing(lx, lz);
  for (let iteration = 0; iteration < 200 && now.size > 1e-10; iteration++) {
    let jxx = 0, jxz = 0, jzz = 0;
    vectors.forEach(m => {
      const a = m.x * lx + m.z * lz;
      if (Math.abs(a) < limit) { jxx += m.x * m.x; jxz += m.x * m.z; jzz += m.z * m.z; }
    });
    const reg = 1e-9 * (jxx + jzz + 1);
    jxx += reg; jzz += reg;
    const det = jxx * jzz - jxz * jxz;
    // Move lambda so the missing vector shrinks; halve the step until it does.
    const dx = -(jzz * now.x - jxz * now.z) / det, dz = -(jxx * now.z - jxz * now.x) / det;
    let scale = 1, next = null;
    for (let tries = 0; tries < 40; tries++, scale *= .5) {
      next = missing(lx + dx * scale, lz + dz * scale);
      if (next.size < now.size) { lx += dx * scale; lz += dz * scale; now = next; break; }
      next = null;
    }
    if (!next) break;
  }
  if (now.size <= 1e-6) return changeFor(lx, lz);
  // Say what would be needed, so the author can change the right piece.
  let needed = '';
  try {
    const free = solveClosure(straights, gap, Infinity, id);
    needed = ' Without the limit the straights would change by: ' +
      straights.map((straight, i) => `piece ${straight.piece.index + 1} ${(free[i] * 100 >= 0 ? '+' : '')}${(free[i] * 100).toFixed(0)}%`).join(', ') + '.';
  } catch { /* nothing more to say */ }
  throw new TrackScriptError(`Track script "${id}" cannot close: the loop ends ${Math.hypot(gap.x, gap.z).toFixed(1)} m from where it started and ` +
    `stretching or shrinking any straight by up to ${Math.round(limit * 100)}% is not enough.${needed} Change a turn or lengthen a straight that runs across the gap.`);
}

// ---------------------------------------------------------------------------
// 3. Height, width and the tables
// ---------------------------------------------------------------------------

// Smooth height: each piece's climb joins its neighbours with matching slope,
// so the road never kinks. A piece's crest is a bump added in its middle.
function heightModel(pieces, closed, base) {
  const n = pieces.length, boundary = [], grade = pieces.map(piece => piece.climb / piece.length);
  let height = base;
  for (let i = 0; i <= n; i++) { boundary.push(height); if (i < n) height += pieces[i].climb; }
  const joinSlope = (a, b) => (a * b <= 0 ? 0 : 2 * a * b / (a + b));
  const slope = [];
  for (let j = 0; j <= n; j++) {
    if (j === 0) slope.push(closed ? joinSlope(grade[n - 1], grade[0]) : grade[0]);
    else if (j === n) slope.push(closed ? slope[0] : grade[n - 1]);
    else slope.push(joinSlope(grade[j - 1], grade[j]));
  }
  return (index, tau) => {
    const piece = pieces[index], len = piece.length, u = clamp(tau / len);
    const u2 = u * u, u3 = u2 * u;
    let y = (2 * u3 - 3 * u2 + 1) * boundary[index] + (u3 - 2 * u2 + u) * len * slope[index]
      + (-2 * u3 + 3 * u2) * boundary[index + 1] + (u3 - u2) * len * slope[index + 1];
    if (piece.crest > 0) {
      const half = Math.min(TRACK_SCRIPT.crestHalfSpan, len * .45), d = (tau - len / 2) / half;
      if (Math.abs(d) < 1) y += piece.crest * (1 + Math.cos(Math.PI * d)) * .5;
    }
    return y;
  };
}

function pieceIndexAt(starts, sv) {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= sv) lo = mid; else hi = mid - 1; }
  return lo;
}

function halfWidthModel(pieces, closed) {
  const starts = pieces.map(piece => piece.s0);
  return sv => {
    const i = pieceIndexAt(starts, sv), piece = pieces[i];
    const previous = i > 0 ? pieces[i - 1] : closed ? pieces.at(-1) : null;
    const target = piece.width / 2;
    if (!previous || previous.width === piece.width) return target;
    const blend = Math.min(TRACK_SCRIPT.blendLength, piece.length * .6);
    return lerp(previous.width / 2, target, smooth((sv - piece.s0) / blend));
  };
}

// ---------------------------------------------------------------------------
// 4. Building the road
// ---------------------------------------------------------------------------

const geometryCache = new WeakMap();

// Public: build (and remember) the road for a course definition that carries a
// `script`. Definition fields read: id, script, closed, reverse, scriptStart
// (metres into the script where the start line sits), scriptDefaults
// ({width, walls, surface}), baseHeight.
export function buildTrackScript(def) {
  const key = def;
  if (typeof def === 'object' && geometryCache.has(key)) return geometryCache.get(key);
  const built = construct(def);
  if (typeof def === 'object') geometryCache.set(key, built);
  return built;
}

// Where the script ends when drawn exactly as written, with no closing. The fit
// tool uses this to find the smallest changes that make a draft close.
export function measureScript(def) {
  const id = def.id ?? 'script';
  let pieces = resolvePieces(def.script, { id, defaults: def.scriptDefaults ?? {} });
  if (def.reverse) pieces = reversePieces(pieces);
  prepareTurns(pieces, id);
  const layout = elementsFor(pieces), path = integrate(layout.elements);
  return { length: layout.length, x: path.x.at(-1), z: path.z.at(-1), heading: path.h.at(-1),
    turnSumDeg: pieces.reduce((t, piece) => t + piece.dir * (piece.degrees || 0), 0) };
}

export function defineScriptedCourse(def) {
  return Object.freeze({ ...def, lengthU: buildTrackScript(def).length });
}

function construct(def) {
  const id = def.id ?? 'script', closed = def.closed !== false;
  const defaults = def.scriptDefaults ?? {};
  let pieces = resolvePieces(def.script, { id, defaults });
  if (def.reverse) pieces = reversePieces(pieces);
  prepareTurns(pieces, id);
  const report = { id, closed, reverse: def.reverse === true, turnSumDeg: 0, turnAdjustDeg: 0, closureGap: 0, straightChanges: [], elevationLeftover: 0 };
  const signedSum = pieces.reduce((t, piece) => t + piece.dir * (piece.degrees || 0), 0);
  report.turnSumDeg = signedSum;
  if (closed) {
    const fixed = fixTurnSum(pieces, id);
    report.turnSumDeg = fixed.sumDeg; report.turnAdjustDeg = fixed.adjustDeg;
    for (const piece of pieces) if (piece.kind === 'turn') piece.angle = piece.degrees * DEG;
    prepareTurns(pieces, id);
  }
  // First draw with the straights as written.
  let layout = elementsFor(pieces);
  let path = integrate(layout.elements);
  if (closed) {
    const gap = { x: path.x.at(-1), z: path.z.at(-1) };
    report.closureGap = Math.hypot(gap.x, gap.z);
    const straights = pieces.filter(piece => piece.kind === 'straight').map(piece => {
      const at = layout.elements.find(element => element.piece === piece);
      const i = path.s.findIndex(value => value >= at.s0 - 1e-9);
      return { piece, length: piece.length, heading: path.h[i] };
    });
    if (!straights.length && report.closureGap > 1e-6) {
      throw new TrackScriptError(`Track script "${id}" has no straights, so the loop cannot be closed. Add a straight.`);
    }
    if (straights.length) {
      const change = solveClosure(straights, gap, TRACK_SCRIPT.straightChangeLimit, id);
      straights.forEach((straight, i) => {
        const before = straight.piece.length;
        straight.piece.length = before * (1 + change[i]);
        report.straightChanges.push({ index: straight.piece.index, name: straight.piece.name, before, after: straight.piece.length, percent: change[i] * 100 });
      });
      layout = elementsFor(pieces);
      path = integrate(layout.elements);
      const left = Math.hypot(path.x.at(-1), path.z.at(-1));
      if (left > 1e-4) throw new TrackScriptError(`Track script "${id}" did not close (${left.toFixed(3)} m left after stretching the straights).`);
    }
  }
  // Heights: base level, then spread any leftover climb over the straights.
  const baseHeight = def.baseHeight ?? 14;
  if (closed) {
    const leftover = pieces.reduce((t, piece) => t + piece.climb, 0);
    report.elevationLeftover = leftover;
    if (Math.abs(leftover) > 1e-9) {
      const carriers = pieces.some(piece => piece.kind === 'straight') ? pieces.filter(piece => piece.kind === 'straight') : pieces;
      const total = carriers.reduce((t, piece) => t + piece.length, 0);
      for (const piece of carriers) piece.climb -= leftover * piece.length / total;
    }
  }
  const length = layout.length;
  const heightIn = heightModel(pieces, closed, baseHeight);
  const halfWidthIn = halfWidthModel(pieces, closed);
  const starts = pieces.map(piece => piece.s0);

  // Where the start line sits. Only a closed loop can be rotated.
  let startAt = closed ? (def.scriptStart ?? 0) : 0;
  if (closed && def.reverse && def.scriptStart) startAt = length - def.scriptStart;
  startAt = ((startAt % length) + length) % length;
  const totalTurn = closed ? Math.sign(signedSum) * TAU : 0;

  // Dense lookups on the unrotated script.
  const dense = path;
  let cursor = 0;
  const poseAt = sv => {
    let wrapped = 0;
    while (sv >= length - 1e-9 && closed) { sv -= length; wrapped++; }
    sv = clamp(sv, 0, length);
    if (dense.s[cursor] > sv) cursor = 0;
    while (cursor < dense.s.length - 2 && dense.s[cursor + 1] < sv) cursor++;
    const a = cursor, b = a + 1, t = (sv - dense.s[a]) / (dense.s[b] - dense.s[a] || 1);
    return { sv, x: lerp(dense.x[a], dense.x[b], t), z: lerp(dense.z[a], dense.z[b], t),
      h: lerp(dense.h[a], dense.h[b], t) + wrapped * totalTurn, k: lerp(dense.k[a], dense.k[b], t) };
  };
  const count = Math.max(2, Math.ceil(length / TRACK_SCRIPT.step)), step = length / count;
  const samples = [], halfWidth = new Float64Array(count + 1), slope = new Float64Array(count + 1), bank = new Float64Array(count + 1);
  const origin = poseAt(startAt);
  const heightScript = sv => {
    sv = closed ? ((sv % length) + length) % length : clamp(sv, 0, length);
    const i = Math.min(pieces.length - 1, pieceIndexAt(starts, sv));
    return heightIn(i, sv - pieces[i].s0);
  };
  for (let i = 0; i <= count; i++) {
    const sv = startAt + i * step, p = poseAt(sv);
    const svWrapped = closed ? ((sv % length) + length) % length : clamp(sv, 0, length);
    const piece = pieces[Math.min(pieces.length - 1, pieceIndexAt(starts, svWrapped))];
    const last = i === count;
    samples.push({
      s: i * step, x: (last && closed ? samples[0].x : p.x - origin.x), z: (last && closed ? samples[0].z : p.z - origin.z),
      y: heightScript(sv), heading: p.h, curvature: p.k,
    });
    halfWidth[i] = halfWidthIn(svWrapped);
    slope[i] = (heightScript(sv + .05) - heightScript(sv - .05)) / .1;
    bank[i] = piece.kind === 'turn' && piece.bank ? piece.bank * DEG * p.k * piece.radius : 0;
  }
  if (closed) {
    samples[count].y = samples[0].y; halfWidth[count] = halfWidth[0]; slope[count] = slope[0]; bank[count] = bank[0];
    samples[count].heading = samples[0].heading + totalTurn;
  }
  // Pieces in course coordinates: s0 may be negative (or s1 past the end) for the
  // piece the start line sits inside.
  const coursePieces = pieces.map(piece => {
    const wrap = closed && piece.s1 - startAt <= 0 ? length : 0, shift = value => value - startAt + wrap;
    return Object.freeze({ index: piece.index, kind: piece.kind, name: piece.name, dir: piece.dir, radius: piece.radius, degrees: piece.degrees,
      s0: shift(piece.s0), s1: shift(piece.s1),
      arcStart: piece.arcStart === undefined ? undefined : shift(piece.arcStart),
      arcEnd: piece.arcEnd === undefined ? undefined : shift(piece.arcEnd),
      ease: piece.ease, width: piece.width, boards: piece.boards, walls: piece.walls, surface: piece.surface, climb: piece.climb, crest: piece.crest, bank: piece.bank, kerbs: piece.kerbs });
  });

  // Optional local clear-ground bands leave the fitted road unchanged. Copy
  // and validate authored input once so later queries cannot read mutable data.
  const authoredRunoff = def.runoffBands;
  if (authoredRunoff !== undefined && !Array.isArray(authoredRunoff))
    throw new TrackScriptError(`Track script "${id}" runoff bands must be an array.`);
  const runoffBands = Object.freeze(Array.from(authoredRunoff ?? [], (band, index) => {
    const keys = ['s0', 's1', 'side', 'width', 'taper'];
    if (!band || typeof band !== 'object' || Array.isArray(band) ||
        Object.keys(band).some(key => !keys.includes(key)) ||
        ![band.s0, band.s1, band.width, band.taper].every(Number.isFinite) ||
        ![-1, 1].includes(band.side) || band.s0 < 0 || band.s1 > length || band.s1 <= band.s0 ||
        band.width <= 0 || band.taper < 0 || band.taper > (band.s1 - band.s0) / 2)
      throw new TrackScriptError(`Track script "${id}" runoff band ${index + 1} has invalid bounds or side.`);
    return Object.freeze({s0: band.s0, s1: band.s1, side: band.side, width: band.width, taper: band.taper});
  }));
  for (let i = 0; i < runoffBands.length; i++) for (let j = 0; j < i; j++) {
    const a = runoffBands[i], b = runoffBands[j];
    if (a.side === b.side && a.s0 < b.s1 && a.s1 > b.s0)
      throw new TrackScriptError(`Track script "${id}" runoff bands on the same side must not overlap.`);
  }
  const phase = s => (closed ? ((s % length) + length) % length : clamp(s, 0, length));
  const tableIndex = p => Math.min(count - 1, Math.floor(p / step));
  const pieceAt = s => {
    const p = phase(s), sv = closed ? (p + startAt) % length : p;
    return coursePieces[Math.min(pieces.length - 1, pieceIndexAt(starts, sv))];
  };
  const geometry = {
    id, closed, reverse: def.reverse === true, length, step, count, startAt, samples, pieces: coursePieces,
    report: finishReport(report, samples, slope, coursePieces),
    ...(runoffBands.length ? {runoffBands} : {}),
    halfWidthAt(s) { const p = phase(s), i = tableIndex(p); return lerp(halfWidth[i], halfWidth[i + 1], (p - i * step) / step); },
    heightAt(s) {
      const p = phase(s), i = tableIndex(p), u = (p - i * step) / step, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * samples[i].y + (u3 - 2 * u2 + u) * step * slope[i]
        + (-2 * u3 + 3 * u2) * samples[i + 1].y + (u3 - u2) * step * slope[i + 1];
    },
    bankAt(s) { const p = phase(s), i = tableIndex(p); return lerp(bank[i], bank[i + 1], (p - i * step) / step); },
    // Height added at a sideways position by banking. The road leans into the
    // turn; past the edge the tilt holds so the verge meets the road.
    bankLift(s, lateral) {
      const tilt = this.bankAt(s);
      if (!tilt) return 0;
      const limit = this.halfWidthAt(s) + 3;
      return -Math.tan(tilt) * clamp(lateral, -limit, limit);
    },
    pieceAt,
    surfaceAt(s) { return pieceAt(s).surface; },
    // Side: +1 left, -1 right. Metres of clear ground beyond the road edge.
    wallSide(s, side) { const walls = pieceAt(s).walls; return walls === 'both' || walls === (side > 0 ? 'left' : 'right'); },
    runoffWidthAt(s, side, legacyWidth = def.scriptDefaults?.runoff ?? TRACK_SCRIPT.runoff) {
      const p = phase(s);
      for (const band of runoffBands) {
        if (side !== band.side || p < band.s0 || p > band.s1) continue;
        const weight = band.taper === 0 ? 1 : smooth(Math.min((p - band.s0) / band.taper, (band.s1 - p) / band.taper));
        return lerp(legacyWidth, band.width, weight);
      }
      return legacyWidth;
    },
    runoffAt(s, side) { return this.wallSide(s, side) ? 0 : this.runoffWidthAt(s, side); },
    phase,
  };
  geometry.walls = wallSpans(geometry);
  geometry.kerbs = kerbList(geometry);
  geometry.boards = boardList(geometry);
  return Object.freeze(geometry);
}

function finishReport(report, samples, slope, pieces) {
  let steepest = 0, steepAt = 0;
  slope.forEach((value, i) => { if (Math.abs(value) > steepest) { steepest = Math.abs(value); steepAt = i; } });
  const turns = pieces.filter(piece => piece.kind === 'turn');
  const tightest = turns.reduce((best, piece) => (!best || piece.radius < best.radius ? piece : best), null);
  const last = samples.at(-1).s;
  return Object.freeze({
    ...report, length: last,
    highestGradePercent: steepest * 100, highestGradeAt: steepAt ? samples[steepAt].s : 0,
    tightestRadius: tightest ? { radius: tightest.radius, name: tightest.name, index: tightest.index } : null,
    straightChanges: Object.freeze(report.straightChanges),
  });
}

// ---------------------------------------------------------------------------
// 5. Walls, kerbs and boards (positions only; Course makes the solids)
// ---------------------------------------------------------------------------

// Split a span that crosses the start line into two.
function splitSpan(span, length, closed) {
  if (!closed) return [{ ...span, s0: clamp(span.s0, 0, length), s1: clamp(span.s1, 0, length) }].filter(v => v.s1 > v.s0);
  let { s0, s1 } = span;
  while (s0 < 0) { s0 += length; s1 += length; }
  while (s0 >= length) { s0 -= length; s1 -= length; }
  if (s1 <= length) return [{ ...span, s0, s1 }];
  return [{ ...span, s0, s1: length }, { ...span, s0: 0, s1: s1 - length }];
}

function wallSpans(geometry) {
  const spans = [];
  for (const piece of geometry.pieces) {
    for (const side of [1, -1]) {
      if (!(piece.walls === 'both' || piece.walls === (side > 0 ? 'left' : 'right'))) continue;
      spans.push(...splitSpan({ side, s0: piece.s0, s1: piece.s1, piece: piece.index }, geometry.length, geometry.closed));
    }
  }
  return Object.freeze(spans);
}

function kerbList(geometry) {
  const kerbs = [];
  for (const piece of geometry.pieces) {
    if (piece.kind !== 'turn' || !piece.kerbs) continue;
    // Inside kerb round the apex; outside kerb where the car runs wide on exit.
    const inside = { side: piece.dir, kind: 'apex', s0: piece.s0 + piece.ease * .3, s1: piece.s1 - piece.ease * .3 };
    const outside = { side: -piece.dir, kind: 'exit', s0: piece.arcEnd, s1: piece.s1 };
    for (const kerb of [inside, outside]) {
      if (kerb.s1 - kerb.s0 < 2) continue;
      kerbs.push(...splitSpan({ ...kerb, width: TRACK_SCRIPT.kerbWidth, piece: piece.index }, geometry.length, geometry.closed));
    }
  }
  return Object.freeze(kerbs);
}

// Braking boards stand on the outside edge before every turn tighter than the
// board radius, on straight road only.
function boardList(geometry) {
  const boards = [];
  for (const piece of geometry.pieces) {
    if (piece.kind !== 'turn') continue;
    const wanted = piece.boards === undefined ? piece.radius < TRACK_SCRIPT.boardRadius : piece.boards !== false;
    if (!wanted) continue;
    for (const distance of TRACK_SCRIPT.boardDistances) {
      let s = piece.s0 - distance;
      if (!geometry.closed && s < 0) continue;
      if (geometry.closed) s = ((s % geometry.length) + geometry.length) % geometry.length;
      if (geometry.pieceAt(s).kind !== 'straight') continue;
      boards.push({ s, side: -piece.dir, distance, piece: piece.index, name: piece.name });
    }
  }
  return Object.freeze(boards);
}

// ---------------------------------------------------------------------------
// 6. Racing line and speed profile
// ---------------------------------------------------------------------------

export const REFERENCE_DYNAMICS = Object.freeze({
  lateralAccel: 20,  // m/s squared the reference car holds in a corner
  yawRate: 1.1,      // radians per second the reference car can turn at full lock
  minRadius: 12.7,   // the tightest circle the reference car can drive, metres
  brake: 20,         // m/s squared of braking
  accel: 9,          // m/s squared of acceleration
  topSpeed: 90,      // m/s
});

// Outside, apex, outside through every turn, never closer than lineMargin to
// the road edge, then the fastest speed the curvature, braking and
// acceleration allow. Computer racers scale this for their own car and skill.
//
// A circuit may shape the line with two optional numbers in its `racingLine`
// block. `roadShare` (0 to 1) is how much of the room to each road edge the
// line uses; below 1 it stays clear of the kerbs. `maxSlope` is how many
// metres across the road the line may move per metre of road: a quick swing
// between two corners that the car cannot follow is shared out between the
// apexes. Both are off unless a circuit asks for them.
export function buildRacingLine(geometry, dynamics = REFERENCE_DYNAMICS) {
  const { length, closed, count, step, samples } = geometry;
  const turns = geometry.pieces.filter(piece => piece.kind === 'turn');
  // A circuit with walls asks for more room (`lineMargin` on its definition).
  const margin = dynamics.lineMargin ?? TRACK_SCRIPT.lineMargin;
  const room = s => Math.max(0, geometry.halfWidthAt(s) - margin);
  const keys = [];
  for (const piece of turns) {
    const apex = piece.s0 + (piece.s1 - piece.s0) * TRACK_SCRIPT.apexShare;
    // The apex goes to the inside edge unless the corner is tighter than the car
    // can turn: then the line runs wide to give the car a bigger circle.
    const inside = clamp((piece.radius - (dynamics.minRadius ?? 0)) / Math.max(.1, room(apex)), -1, 1);
    // A gentle bend between walls needs only a small sweep across the road: with `lineSwing` the
    // line crosses no more than that share of the bend's sagitta (how far its arc bows from the chord).
    const sagitta = piece.radius * (1 - Math.cos(piece.degrees * Math.PI / 360));
    const swing = dynamics.lineSwing ? clamp(dynamics.lineSwing * sagitta / Math.max(.1, room(apex)), .2, 1) : 1;
    keys.push({ s: piece.s0, side: -piece.dir * swing }, { s: apex, side: piece.dir * inside * swing }, { s: piece.s1, side: -piece.dir * swing });
  }
  keys.sort((a, b) => a.s - b.s);
  const merged = [];
  for (const key of keys) {
    const last = merged.at(-1);
    if (last && key.s - last.s < 1) { last.side = (last.side * last.n + key.side) / (last.n + 1); last.n++; }
    else merged.push({ s: key.s, side: key.side, n: 1 });
  }
  const frames = merged.map(key => ({ s: closed ? ((key.s % length) + length) % length : clamp(key.s, 0, length), lat: key.side * room(key.s) * (dynamics.roadShare ?? 1) }));
  frames.sort((a, b) => a.s - b.s);
  if (dynamics.maxSlope) {
    const n = frames.length, slope = dynamics.maxSlope;
    for (let pass = 0; pass < 8; pass++) for (let i = 0; i < n * 2; i++) {
      const a = frames[i % n], b = frames[(i + 1) % n];
      if (!closed && (i % n) === n - 1) continue;
      const ds = ((b.s - a.s) % length + length) % length || length, limit = slope * ds, diff = b.lat - a.lat;
      if (Math.abs(diff) > limit) { const cut = (Math.abs(diff) - limit) / 2; a.lat += Math.sign(diff) * cut; b.lat -= Math.sign(diff) * cut; }
    }
  }
  const offsetAt = s => {
    if (!frames.length) return 0;
    const p = geometry.phase(s);
    const next = frames.findIndex(frame => frame.s > p);
    let a, b, sa, sb;
    if (next === -1) { a = frames.at(-1); b = closed ? frames[0] : frames.at(-1); sa = a.s; sb = closed ? b.s + length : a.s; }
    else if (next === 0) { a = closed ? frames.at(-1) : frames[0]; b = frames[0]; sa = closed ? a.s - length : b.s; sb = b.s; }
    else { a = frames[next - 1]; b = frames[next]; sa = a.s; sb = b.s; }
    if (sb <= sa) return a.lat;
    return lerp(a.lat, b.lat, smooth((p - sa) / (sb - sa)));
  };
  const offset = new Float64Array(count + 1), px = new Float64Array(count + 1), pz = new Float64Array(count + 1);
  for (let i = 0; i <= count; i++) {
    const frame = samples[i], s = i * step;
    offset[i] = clamp(offsetAt(s), -room(s), room(s));
    px[i] = frame.x + Math.cos(frame.heading) * offset[i]; pz[i] = frame.z - Math.sin(frame.heading) * offset[i];
  }
  // Curvature of the line itself, from three neighbouring points.
  const wrap = i => (closed ? (i + count) % count : clamp(i, 0, count));
  const cornerSpeed = new Float64Array(count + 1), gaps = new Float64Array(count + 1);
  for (let i = 0; i <= count; i++) {
    const a = wrap(i - 1), b = i === count && closed ? 0 : i, c = wrap(i + 1);
    const abx = px[b] - px[a], abz = pz[b] - pz[a], bcx = px[c] - px[b], bcz = pz[c] - pz[b], acx = px[c] - px[a], acz = pz[c] - pz[a];
    const lab = Math.hypot(abx, abz), lbc = Math.hypot(bcx, bcz), lac = Math.hypot(acx, acz);
    const k = lab * lbc * lac > 1e-9 ? 2 * Math.abs(abx * bcz - abz * bcx) / (lab * lbc * lac) : 0;
    // Grip limits the corner, and so does how fast the car can swing its nose round.
    cornerSpeed[i] = Math.min(dynamics.topSpeed, Math.sqrt(dynamics.lateralAccel / Math.max(k, 1e-6)), (dynamics.yawRate ?? Infinity) / Math.max(k, 1e-6));
    gaps[i] = Math.max(.01, lbc);
  }
  if (closed) cornerSpeed[count] = cornerSpeed[0];
  const speed = Float64Array.from(cornerSpeed);
  const passes = closed ? 2 : 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let i = count - 1; i >= 0; i--) {
      const j = i + 1 > count ? 0 : i + 1;
      speed[i] = Math.min(speed[i], Math.sqrt(speed[j] ** 2 + 2 * dynamics.brake * gaps[i]));
    }
    if (closed) speed[count] = Math.min(speed[count], speed[0]), speed[0] = speed[count];
    for (let i = 1; i <= count; i++) speed[i] = Math.min(speed[i], Math.sqrt(speed[i - 1] ** 2 + 2 * dynamics.accel * gaps[i - 1]));
    if (closed) speed[0] = Math.min(speed[0], speed[count]);
  }
  const at = (table, s) => { const p = geometry.phase(s), i = Math.min(count - 1, Math.floor(p / step)); return lerp(table[i], table[i + 1], (p - i * step) / step); };
  return Object.freeze({
    step, count, dynamics, offset, speed, cornerSpeed,
    offsetAt: s => at(offset, s), speedAt: s => at(speed, s), cornerSpeedAt: s => at(cornerSpeed, s),
  });
}
