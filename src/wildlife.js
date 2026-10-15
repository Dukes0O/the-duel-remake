// Animals beside the road (docs/HELI_WILDLIFE.md section 3, card WILD-PLACE).
// Pure: no graphics, no storage, no clock. It says which species live beside
// each course and where one race's sighting spots, herds and animals stand.
//
// The seed is made from the course id, the play day and the race number of
// that day, and has its own generator (src/rng.js). Nothing here ever reads
// or advances the race's generator, so the race, its replays and its
// fingerprints stay exactly as they were. Drawing the animals is WILD-VIEW's
// job; the wildlife count (section 4) reuses `createPlacementChecker`.
import { makeRng } from './rng.js';
import { basinReach, shoreFactor } from './circuit-hills.js';
import { escapeFrame } from './escape-roads.js';
import { KIT_FOOTPRINTS } from './kit-footprints.js';

export const SPOT_SECONDS = 45;        // one sighting spot per this much reference lap
export const MIN_SPOTS = 1;
export const MAX_SPOTS = 8;
export const MIN_GAP_SECONDS = 25;     // reference-lap time between two spots
export const RARE_CHANCE = 1 / 5;      // one race in five holds the rare animal
export const MIN_EDGE = 15;            // metres from the road edge, nearest and furthest
export const MAX_EDGE = 70;
export const SHALLOWS_METRES = 3;      // beaver and moose may stand this far out in a lake
export const SEA_LEVEL = -15;          // the same level as src/coastal-water.js (a test keeps them equal)
// Open roads have no reference lap. Their pace is guessed from the length at
// about 160 km/h, near the average of the closed courses.
export const ESTIMATED_PACE = 45;

const TAU = Math.PI * 2;
const SLOT_GAP_SECONDS = MIN_GAP_SECONDS + 1;  // one second in hand, so another clock still reads 25 s
const MIN_SLOT_SECONDS = 2;            // the least lap time a spot may choose from
const OPEN_ROAD_MARGIN = 8;            // seconds left clear at each end of an open road
const LAKE_GAP = 1.5;                  // other animals stay this far from the water
const OBSTACLE_MARGIN = 1;
const RUNOFF_MARGIN = 3;
const ESCAPE_MARGIN = 6;
const PIT_BELT = 30;                   // metres along the road beyond a pit lane or paddock
const PADDOCK_SIDE_ROOM = 25;          // metres beyond the outermost paddock piece

// ---------------------------------------------------------------------------
// Species. `kind` is ground, bird or decal. A bird is marked perching: the
// drawing puts it on a tree, a post or a lamp post and lets it fly off.
// `edge` narrows the 15 to 70 m band; `lake` stands at a lake shore only;
// `shallows` is the chance of standing in the shallows when the course has a
// lake; `cubs` is a chance of 1 to 2 young with a single adult.
// ---------------------------------------------------------------------------
export const SPECIES = Object.freeze({
  // North woods
  'white-tailed-deer': { kind: 'ground' },
  'moose': { kind: 'ground', shallows: .3 },
  'black-bear': { kind: 'ground', cubs: { chance: .35, range: [1, 2] } },
  'beaver': { kind: 'ground', lake: true },
  'eastern-wolf': { kind: 'ground' },
  'wolf-tracks': { kind: 'decal' },
  // Australia
  'eastern-grey-kangaroo': { kind: 'ground' },
  'sulphur-crested-cockatoo': { kind: 'bird' },
  'kookaburra': { kind: 'bird' },
  'echidna': { kind: 'ground', edge: [15, 30] },
  // Western mountains
  'mule-deer': { kind: 'ground' },
  'elk': { kind: 'ground' },
  'coyote': { kind: 'ground' },
  'cougar': { kind: 'ground' },
  'yellow-bellied-marmot': { kind: 'ground' },
  'bighorn-sheep': { kind: 'ground' },
  'raven': { kind: 'bird' },
  // Europe
  'roe-deer': { kind: 'ground' },
  'red-deer': { kind: 'ground' },
  'wild-boar': { kind: 'ground' },
  'red-fox': { kind: 'ground' },
  'wildcat': { kind: 'ground' },
  'black-stork': { kind: 'bird' },
  'chamois': { kind: 'ground' },
  'ibex': { kind: 'ground' },
  'alpine-marmot': { kind: 'ground' },
  'golden-eagle': { kind: 'bird' },
  'gull': { kind: 'bird' },
  // Desert and coast
  'roadrunner': { kind: 'ground' },
  'jackrabbit': { kind: 'ground' },
  'desert-bighorn': { kind: 'ground' },
  'collared-lizard': { kind: 'ground' },
  'pelican': { kind: 'bird' },
  'condor': { kind: 'bird' },
  // Asia and cities
  'black-kite': { kind: 'bird' },
  'egret': { kind: 'bird' },
  'black-faced-spoonbill': { kind: 'bird' },
  'pigeon': { kind: 'bird' },
  'raccoon': { kind: 'ground' },
  'cat': { kind: 'ground' },
  'owl': { kind: 'bird' },
});
export const SPECIES_IDS = Object.freeze(Object.keys(SPECIES));

// [species, weight, fewest, most]. `night: true` rows appear on night courses only.
const row = (species, weight, fewest, most, extra = {}) => Object.freeze({ species, weight, herd: Object.freeze([fewest, most]), ...extra });
const course = (common, rare) => Object.freeze({ common: Object.freeze(common), rare });

const WESTERN = course([
  row('mule-deer', 4, 1, 3), row('elk', 3, 1, 4), row('black-bear', 2, 1, 1), row('coyote', 2, 1, 2),
], row('cougar', 1, 1, 1));
const CITY = (rare) => course([
  row('pigeon', 4, 3, 7), row('black-kite', 2, 1, 2), row('cat', 2, 1, 1, { night: true }), row('raccoon', 2, 1, 2, { night: true }),
], rare);

// The species table of docs/HELI_WILDLIFE.md section 3.1. Where the packet
// says "as the table", the course's group in docs/board/cards/WILD-ART-SRC.md
// gives the animals and the split between common and rare is chosen here.
// Titan arenas and any course not listed have no animals.
export const COURSE_SPECIES = Object.freeze({
  'tremblant-woods': course([
    row('white-tailed-deer', 4, 1, 3), row('moose', 3, 1, 2), row('black-bear', 2, 1, 1), row('beaver', 2, 1, 1),
  ], row('eastern-wolf', 1, 2, 4)),
  'tremblant-snow': course([
    row('white-tailed-deer', 4, 1, 3), row('moose', 3, 1, 1), row('wolf-tracks', 2, 1, 1),
  ], row('eastern-wolf', 1, 2, 3)),
  'panorama-ridge': course([
    row('eastern-grey-kangaroo', 5, 2, 6), row('sulphur-crested-cockatoo', 3, 4, 8), row('kookaburra', 3, 1, 2),
  ], row('echidna', 1, 1, 1)),
  'summit-run': course([
    row('yellow-bellied-marmot', 3, 1, 3), row('bighorn-sheep', 3, 2, 5), row('mule-deer', 3, 1, 3), row('raven', 2, 1, 2),
  ], row('cougar', 1, 1, 1)),
  'high-country': WESTERN,
  'ridge-rally': WESTERN,
  'timberline-rush': WESTERN,
  'cloudbreak-skyway': WESTERN,
  'ardennes-forest': course([
    row('roe-deer', 4, 1, 3), row('red-deer', 3, 1, 4), row('wild-boar', 3, 2, 5), row('red-fox', 2, 1, 1),
  ], row('wildcat', 1, 1, 1)),
  'eifel-crown': course([
    row('roe-deer', 4, 1, 3), row('red-deer', 3, 1, 4), row('wild-boar', 3, 2, 5), row('red-fox', 2, 1, 1),
  ], row('black-stork', 1, 1, 2)),
  'alpine-serpent': course([
    row('chamois', 4, 2, 5), row('ibex', 3, 2, 5), row('alpine-marmot', 3, 1, 3), row('red-deer', 2, 1, 3),
  ], row('golden-eagle', 1, 1, 1)),
  'azure-riviera': course([
    row('gull', 4, 3, 7), row('red-fox', 3, 1, 1), row('roe-deer', 3, 1, 2), row('wild-boar', 2, 2, 4),
  ], row('wildcat', 1, 1, 1)),
  'red-mesa': course([
    row('roadrunner', 3, 1, 2), row('jackrabbit', 4, 1, 3), row('desert-bighorn', 3, 2, 4), row('collared-lizard', 2, 1, 1),
  ], row('condor', 1, 1, 1)),
  'pacific-canyon': course([
    row('roadrunner', 3, 1, 2), row('jackrabbit', 4, 1, 3), row('coyote', 3, 1, 2), row('pelican', 2, 1, 3),
  ], row('condor', 1, 1, 1)),
  'harbour-lights': course([
    row('pigeon', 4, 4, 8), row('egret', 3, 1, 3), row('cat', 2, 1, 1, { night: true }), row('raccoon', 2, 1, 2, { night: true }),
  ], row('black-faced-spoonbill', 1, 1, 3)),
  'harbor-highlands': CITY(row('owl', 1, 1, 1)),
  'neon-docks': CITY(row('owl', 1, 1, 1)),
  'midnight-chase': CITY(row('owl', 1, 1, 1)),
  'neon-drift-trial': CITY(row('owl', 1, 1, 1)),
});

export const speciesFor = courseId => COURSE_SPECIES[courseId] ?? null;

// Every model id a course needs, common and rare (for WILD-ART-SRC's checklist).
export function modelIdsFor(courseId) {
  const table = speciesFor(courseId);
  return table ? [...table.common.map(item => item.species), table.rare.species] : [];
}

// The species a course may use, given the ids of the models that have passed
// WILD-ART-SRC's rounds (a Set or an array; nothing approved means nothing
// stands there). A course with no approved common animal has none at all.
export function availableSpecies(courseId, approvedModelIds, { night = false } = {}) {
  const table = speciesFor(courseId);
  const approved = new Set(approvedModelIds ?? []);
  if (!table) return { common: [], rare: null, any: false };
  const common = table.common.filter(item => approved.has(item.species) && (!item.night || night));
  const rare = common.length && approved.has(table.rare.species) ? table.rare : null;
  return { common, rare, any: common.length > 0 };
}

// ---------------------------------------------------------------------------
// The seed and its generators
// ---------------------------------------------------------------------------
function hash32(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export const wildlifeSeed = (courseId, playDay, raceNumber) => hash32(`wildlife|${courseId}|${playDay}|${raceNumber}`);

// A separate generator for one purpose (the wildlife count uses its own).
export const wildlifeRng = (courseId, playDay, raceNumber, purpose = 'race') =>
  makeRng(hash32(`wildlife|${courseId}|${playDay}|${raceNumber}|${purpose}`));

export function sightingSpotCount(lapSeconds) {
  return Math.max(MIN_SPOTS, Math.min(MAX_SPOTS, Math.round(lapSeconds / SPOT_SECONDS)));
}

// Reference-lap time at each distance, from the bundled trace
// ([metres, km/h] every 20 m, src/reference-laps.js). Without a trace the lap
// is treated as even pace; without a reference lap, as ESTIMATED_PACE.
export function lapClock(referenceLap, length, closed = true) {
  const lapSeconds = referenceLap?.lapMs > 0 ? referenceLap.lapMs / 1000 : length / ESTIMATED_PACE;
  const distances = [0], times = [0];
  const trace = referenceLap?.trace;
  if (Array.isArray(trace) && trace.length > 1) {
    for (let i = 1; i < trace.length; i++) {
      const metres = trace[i][0] - trace[i - 1][0];
      const speed = Math.max(5, (trace[i][1] + trace[i - 1][1]) / 2) / 3.6;
      if (metres <= 0) continue;
      distances.push(trace[i][0]); times.push(times.at(-1) + metres / speed);
    }
    const lastSpeed = Math.max(5, trace.at(-1)[1]) / 3.6;
    if (length > distances.at(-1)) { times.push(times.at(-1) + (length - distances.at(-1)) / lastSpeed); distances.push(length); }
  } else {
    distances.push(length); times.push(1);
  }
  const scale = lapSeconds / times.at(-1);
  for (let i = 0; i < times.length; i++) times[i] *= scale;
  const interpolate = (from, to, value) => {
    let low = 0, high = from.length - 1;
    if (value <= from[0]) return to[0];
    if (value >= from[high]) return to[high];
    while (high - low > 1) { const middle = (low + high) >> 1; if (from[middle] <= value) low = middle; else high = middle; }
    return to[low] + (to[high] - to[low]) * (value - from[low]) / (from[high] - from[low]);
  };
  const wrap = (value, size) => closed ? ((value % size) + size) % size : Math.max(0, Math.min(size, value));
  return Object.freeze({
    lapSeconds, closed, estimated: !(referenceLap?.lapMs > 0),
    timeAt: s => interpolate(distances, times, wrap(s, length)),
    distanceAt: t => interpolate(times, distances, wrap(t, lapSeconds)),
  });
}

// ---------------------------------------------------------------------------
// The plan for one race: how many spots, when each may be, which holds the
// rare animal. Needs no course, so it is cheap to run over many seeds.
// Each spot gets a slot of lap time; consecutive slots are SLOT_GAP_SECONDS
// apart, so any two spots are at least that far apart whatever they pick.
// ---------------------------------------------------------------------------
export function planWildlife({ courseId, playDay, raceNumber, lapSeconds, closed = true }) {
  const seed = wildlifeSeed(courseId, playDay, raceNumber);
  const start = closed ? 0 : Math.min(OPEN_ROAD_MARGIN, lapSeconds / 4);
  const span = closed ? lapSeconds : lapSeconds - 2 * start;
  // Every slot is a gap plus a little room, so a short lap has fewer spots rather than closer ones.
  const count = Math.max(1, Math.min(sightingSpotCount(lapSeconds), Math.floor(span / (SLOT_GAP_SECONDS + MIN_SLOT_SECONDS))));
  const rng = makeRng(seed);
  const rare = rng.chance(RARE_CHANCE);
  const rareIndex = rare ? rng.int(0, count - 1) : null;
  const shift = rng.float();
  const each = span / count;
  const phase = closed ? shift * each : 0;
  const slots = [];
  for (let index = 0; index < count; index++) {
    const from = start + phase + index * each + SLOT_GAP_SECONDS / 2;
    const width = Math.max(MIN_SLOT_SECONDS, each - SLOT_GAP_SECONDS);  // wider than the gap only matters for a lone spot
    slots.push(Object.freeze({ index, from, to: from + width }));
  }
  return Object.freeze({ seed, count, rareIndex, slots: Object.freeze(slots), lapSeconds, closed });
}

// ---------------------------------------------------------------------------
// Where an animal may stand. `createPlacementChecker(course)` reads only what
// the course already exposes: the road and its width, branches and shortcuts,
// the run-off beside scripted roads, escape roads, the pit lane, the walls,
// buildings and other solid things in `features.obstacles`, the kit pieces
// that are buildings, the paddock pieces, tunnels, the lake basins and the
// sea level. The wildlife count asks it about the same ground.
// ---------------------------------------------------------------------------
// Pieces whose footprint is not in src/kit-footprints.js (it lists only solid
// pieces). Width and depth in metres from public/assets/models/circuits/kits/manifest.json.
const EXTRA_FOOTPRINTS = Object.freeze({
  'start-gantry': { width: 17.76, depth: .93 }, 'ski-lodge': { width: 16, depth: 11 }, 'wooden-dock': { width: 3, depth: 7 },
  'summit-hut': { width: 7, depth: 6 }, 'observatory': { width: 12, depth: 12 }, 'lantern-tower': { width: 9.1, depth: 9.1 },
  'shopfront-a': { width: 6, depth: 5.775 }, 'shopfront-b': { width: 8, depth: 5.775 }, 'harbour-boat': { width: 2.4, depth: 5.2 },
  'gallery': { width: 13.3, depth: 6.1 },
});
const PADDOCK_PIECES = new Set(['start-gantry', 'pit-garage', 'pit-wall', 'grandstand']);

const circularGap = (a, b, length) => { const d = ((a - b) % length + length * 1.5) % length - length / 2; return d; };

function insideObstacle(o, x, z, margin) {
  const dx = x - o.x, dz = z - o.z, cos = Math.cos(o.heading ?? 0), sin = Math.sin(o.heading ?? 0);
  const local = { x: dx * cos - dz * sin, z: dx * sin + dz * cos };
  if (o.shape === 'ellipse') return (local.x / (o.halfX + margin)) ** 2 + (local.z / (o.halfZ + margin)) ** 2 < 1;
  return Math.abs(local.x) < o.halfX + margin && Math.abs(local.z) < o.halfZ + margin;
}

function branchRoads(course) {
  const roads = [];
  for (const cut of course.features?.shortcuts ?? []) {
    const points = [], count = Math.max(2, Math.ceil((cut.end - cut.start) / 6));
    for (let i = 0; i <= count; i++) {
      const s = cut.start + (cut.end - cut.start) * i / count, at = course.worldAt(s, course.shortcutOffset(cut, s));
      points.push({ x: at.x, z: at.z });
    }
    roads.push({ halfWidth: cut.halfWidth, points });
  }
  return roads;
}

function kitFootprints(course) {
  const circles = [], paddock = [];
  for (const piece of course.def.kitPlacements ?? []) {
    const s = course.phase(piece.s);
    if (PADDOCK_PIECES.has(piece.id)) paddock.push({ s, lateral: piece.lateral });
    const size = KIT_FOOTPRINTS[piece.id] ?? EXTRA_FOOTPRINTS[piece.id];
    if (!size) continue;
    const scale = Array.isArray(piece.scale) ? piece.scale : [piece.scale ?? 1, 1, piece.scale ?? 1];
    const at = course.worldAt(s, piece.lateral);
    circles.push({ x: at.x, z: at.z, radius: Math.hypot(size.width * scale[0], size.depth * scale[2]) / 2 + 1.5 });
  }
  let belt = null;
  if (paddock.length) {
    const reference = paddock[0].s, offsets = paddock.map(piece => circularGap(piece.s, reference, course.length));
    const sides = { '-1': 0, '1': 0 };
    for (const piece of paddock) {
      const reach = Math.abs(piece.lateral);
      for (const side of piece.lateral === 0 ? [-1, 1] : [Math.sign(piece.lateral)]) sides[side] = Math.max(sides[side], reach + PADDOCK_SIDE_ROOM);
    }
    belt = { reference, from: Math.min(...offsets) - PIT_BELT, to: Math.max(...offsets) + PIT_BELT, sides };
  }
  return { circles, belt };
}

// Every obstacle the course lists, filed by where it stands in the world (not
// by its place along the road: where two stretches of road run side by side,
// an obstacle filed under one stretch still stands beside the other).
const GRID_CELL = 64;
function hazardGrid(course) {
  const cells = new Map();
  for (const o of course.features?.obstacles ?? []) {
    const reach = Math.hypot(o.halfX, o.halfZ) + OBSTACLE_MARGIN + 1;
    for (let i = Math.floor((o.x - reach) / GRID_CELL); i <= Math.floor((o.x + reach) / GRID_CELL); i++)
      for (let j = Math.floor((o.z - reach) / GRID_CELL); j <= Math.floor((o.z + reach) / GRID_CELL); j++) {
        const key = i + ':' + j;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(o);
      }
  }
  return { near: (x, z) => cells.get(Math.floor(x / GRID_CELL) + ':' + Math.floor(z / GRID_CELL)) ?? [] };
}

// Places a real race builds beyond the road itself (src/game.js builds the
// course with these): Pacific Canyon's hidden road (`hiddenRoad`), High
// Country's Muddy Hollow zone (`muddyHollow`) and the Pacific Deep ramp
// (`deepRamp`, installed only with the deep providers, switch and kit). Each is
// read from the course when it is there and costs nothing when it is not.
const HIDDEN_ROAD_MARGIN = 6;
const HOLLOW_MARGIN = 10;
const DEEP_RAMP_MARGIN = 8;
function unreachable(course, x, z) {
  const hidden = course.hiddenRoad;
  if (hidden) {
    const near = hidden.nearest(x, z);
    if (near.distance <= hidden.widthAt(near.progress) + HIDDEN_ROAD_MARGIN) return true;
  }
  const hollow = course.muddyHollow;
  if (hollow) {
    if (hollow.contains(x, z)) return true;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (hollow.contains(x + dx * HOLLOW_MARGIN, z + dz * HOLLOW_MARGIN)) return true;
  }
  const ramp = course.deepRamp;
  if (ramp) {
    const first = ramp.points[0], last = ramp.points.at(-1), dx = x - first.x, dz = z - first.z;
    const along = dx * Math.sin(ramp.heading) + dz * Math.cos(ramp.heading), across = dx * Math.cos(ramp.heading) - dz * Math.sin(ramp.heading);
    if (along > -DEEP_RAMP_MARGIN && along < last.horizontal + 6 + DEEP_RAMP_MARGIN && Math.abs(across) < ramp.width / 2 + DEEP_RAMP_MARGIN) return true;
  }
  return false;
}

function pointToPolyline(points, x, z) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) best = Math.min(best, Math.hypot(points[i].x - x, points[i].z - z));
  return best;
}

export function createPlacementChecker(course) {
  const branches = branchRoads(course);
  const { circles, belt } = kitFootprints(course);
  const basins = course.def.basins ?? [];
  const hazards = hazardGrid(course);

  // Metres into a lake (positive) or from its shore (negative), along the line
  // out from the lake's middle. Water that is deeper than the shore line is
  // measured in a straight line, so this never under-reports how far out a
  // point stands.
  function lakeOut(n) {
    let result = { out: -Infinity, basin: null };
    for (const basin of basins) {
      const du = course.phase(n.s) - basin.s, dv = n.lateral - basin.lateral;
      const reach = basinReach(basin, du, dv), radius = Math.hypot(du, dv);
      const out = reach <= 0 ? Infinity : reach < 1 ? radius * (1 / reach - 1) : -radius * (1 - 1 / reach);
      if (out > result.out) result = { out, basin };
    }
    return result;
  }

  // Everything that makes a spot a bad place to stand, or null; otherwise where it is.
  function inspect(x, z, { minEdge = MIN_EDGE, maxEdge = MAX_EDGE, lake = 'avoid' } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const n = course.nearest(x, z);
    if (!Number.isFinite(n.s) || !Number.isFinite(n.lateral)) return null;
    const phase = course.phase(n.s), side = Math.sign(n.lateral) || 1;
    const mainEdge = n.distance - course.roadHalfWidthAt(phase);
    let edge = mainEdge;
    for (const road of branches) edge = Math.min(edge, pointToPolyline(road.points, x, z) - road.halfWidth - 3);
    if (edge < minEdge || edge > maxEdge) return null;
    // Never on a road of any kind (the main road, a shortcut or branch, the pit lane).
    if (course.surfaceAt(phase, n.lateral).road) return null;
    if (course.script && mainEdge < course.script.runoffAt(phase, side) + RUNOFF_MARGIN) return null;
    if (course.tunnelAt(phase)) return null;
    for (const escape of course.escapeRoads ?? []) {
      const { u, v } = escapeFrame(escape, x, z);
      if (u > -ESCAPE_MARGIN && u < escape.run + ESCAPE_MARGIN + escape.tyreDepth && v > escape.inner - ESCAPE_MARGIN && v < escape.outer + ESCAPE_MARGIN + 1) return null;
    }
    const lane = course.pitLane;
    if (lane && Math.abs(circularGap(phase, (lane.entry + lane.exit) / 2, course.length)) < (lane.exit - lane.entry) / 2 + PIT_BELT && side === lane.side) return null;
    if (belt) {
      const along = circularGap(phase, belt.reference, course.length), room = belt.sides[side] ?? 0;
      if (along >= belt.from && along <= belt.to && Math.abs(n.lateral) <= room) return null;
    }
    for (const circle of circles) if (Math.hypot(circle.x - x, circle.z - z) < circle.radius) return null;
    for (const o of hazards.near(x, z)) if (insideObstacle(o, x, z, OBSTACLE_MARGIN)) return null;
    if (unreachable(course, x, z)) return null;
    const water = lakeOut(n);
    if (lake === 'avoid' && water.out > -LAKE_GAP) return null;
    if (lake === 'shallows' && water.out > SHALLOWS_METRES) return null;
    if (lake === 'shore' && (water.out > SHALLOWS_METRES || water.out < -6)) return null;
    const ground = course.groundAt(phase, n.lateral);
    if (!Number.isFinite(ground.y)) return null;
    if (course.sectionAt(phase).theme === 'coast' && ground.y <= SEA_LEVEL + .3) return null;
    return { x: ground.x, y: ground.y, z: ground.z, s: phase, lateral: n.lateral, edge, lakeOut: water.out };
  }
  return Object.freeze({ inspect, basins });
}

// ---------------------------------------------------------------------------
// Placing one race's herds
// ---------------------------------------------------------------------------
function pickWeighted(rng, rows) {
  let roll = rng.float() * rows.reduce((sum, item) => sum + item.weight, 0);
  for (const item of rows) { roll -= item.weight; if (roll < 0) return item; }
  return rows.at(-1);
}

// How a species may stand relative to a lake.
function lakeRule(info, wantsShallows) {
  if (info.lake) return 'shore';
  return info.shallows && wantsShallows ? 'shallows' : 'avoid';
}

export function placeWildlife({ courseId, playDay, raceNumber, course, referenceLap = null, approvedModels = null }) {
  courseId ??= course.def.id;
  const clock = lapClock(referenceLap, course.length, course.closed);
  const plan = planWildlife({ courseId, playDay, raceNumber, lapSeconds: clock.lapSeconds, closed: course.closed });
  const result = { courseId, playDay, raceNumber, seed: plan.seed, lapSeconds: clock.lapSeconds, estimatedLap: clock.estimated, spotCount: plan.count, spots: [] };
  const night = course.def.timeOfDay === 'night';
  const available = availableSpecies(courseId, approvedModels, { night });
  if (!available.any || course.def.arena || course.def.pit || course.def.saltFlats || course.def.practice || !course.samples) return result;
  const checker = createPlacementChecker(course);

  for (const slot of plan.slots) {
    const rng = makeRng(hash32(`${plan.seed}|spot|${slot.index}`));
    const wantsRare = slot.index === plan.rareIndex && available.rare;
    const pool = [...available.common];
    const tries = wantsRare ? [available.rare] : [];
    while (pool.length) { const picked = pickWeighted(rng, pool); tries.push(picked); pool.splice(pool.indexOf(picked), 1); }
    for (const choice of tries) {
      const spot = placeHerd({ course, checker, clock, slot, rng, choice, rare: choice === available.rare });
      if (spot) { spot.index = slot.index; result.spots.push(spot); break; }
    }
  }
  return result;
}

const inSlot = (time, slot, lapSeconds, closed) => {
  const offset = closed ? ((time - slot.from) % lapSeconds + lapSeconds) % lapSeconds : time - slot.from;
  return offset >= 0 && offset <= slot.to - slot.from;
};

function placeHerd({ course, checker, clock, slot, rng, choice, rare }) {
  const info = SPECIES[choice.species];
  const band = info.edge ?? [MIN_EDGE, MAX_EDGE];
  const adults = rng.int(choice.herd[0], choice.herd[1]);
  const cubs = info.cubs && adults === 1 && rng.chance(info.cubs.chance) ? rng.int(...info.cubs.range) : 0;
  const total = adults + cubs;
  const shallows = checker.basins.length > 0 && rng.chance(info.shallows ?? 0);
  const rule = lakeRule(info, shallows);
  if (rule !== 'avoid' && !checker.basins.length) return null;
  const options = { minEdge: band[0], maxEdge: band[1], lake: rule };

  // Where an anchor for the herd could be, as world x and z.
  const roadCandidate = (time, side, edge) => {
    const s = clock.distanceAt(time), at = course.worldAt(s, side * (course.roadHalfWidthAt(s) + edge));
    return { x: at.x, z: at.z };
  };
  const shoreCandidate = () => {
    const basin = checker.basins[rng.int(0, checker.basins.length - 1)], angle = rng.range(0, TAU), factor = shoreFactor(angle);
    let du = Math.cos(angle) * factor * basin.along, dv = Math.sin(angle) * factor * basin.across;
    const length = Math.hypot(du, dv), shift = rng.range(-SHALLOWS_METRES, 5);
    du += du / length * shift; dv += dv / length * shift;
    const at = course.worldAt(basin.s + du, basin.lateral + dv);
    return { x: at.x, z: at.z };
  };
  const accept = point => {
    const found = checker.inspect(point.x, point.z, options);
    return found && inSlot(clock.timeAt(found.s), slot, clock.lapSeconds, clock.closed) ? found : null;
  };

  let anchor = null;
  const attempts = rule === 'avoid' ? 40 : 160;
  for (let i = 0; i < attempts && !anchor; i++) {
    const point = rule === 'avoid'
      ? roadCandidate(slot.from + rng.float() * (slot.to - slot.from), rng.chance(.5) ? 1 : -1, rng.range(band[0], band[1]))
      : shoreCandidate();
    anchor = accept(point);
  }
  // A thorough sweep of the slot, in case the random draws all landed badly.
  for (let time = slot.from; rule === 'avoid' && !anchor && time <= slot.to; time += .5)
    for (const side of [1, -1]) for (const edge of [band[0] + 2, (band[0] + band[1]) / 2, band[1] - 3]) anchor ||= accept(roadCandidate(time, side, edge));
  if (!anchor) return null;

  const animals = [];
  const radius = 3 + 1.4 * total;
  for (let member = 0; member < total; member++) {
    let found = member === 0 ? anchor : null;
    for (let i = 0; i < 14 && !found; i++) {
      const angle = rng.range(0, TAU), distance = Math.sqrt(rng.float()) * radius;
      found = checker.inspect(anchor.x + Math.cos(angle) * distance, anchor.z + Math.sin(angle) * distance, options);
    }
    if (!found) continue;
    animals.push({
      species: choice.species, kind: info.kind, perching: info.kind === 'bird', cub: member >= adults,
      x: found.x, y: found.y, z: found.z, s: found.s, lateral: found.lateral, edgeDistance: found.edge, lakeOut: found.lakeOut,
    });
  }
  if (!animals.length) return null;
  return {
    s: anchor.s, timeS: clock.timeAt(anchor.s), species: choice.species, kind: info.kind, rare,
    herdSize: animals.filter(animal => !animal.cub).length, cubs: animals.filter(animal => animal.cub).length,
    complete: animals.length === total, animals,
  };
}
