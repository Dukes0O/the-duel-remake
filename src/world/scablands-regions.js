// The Scablands' regions, its dry river and its rises (SCABLANDS-LAND round 4, slice 2a). Everything here is data worked out from
// the land's names (src/world/scablands-names.js) and the road net (src/world/scablands-road.js): nothing is written as a bare
// position. It answers three questions, all pure, repeatable from the same point and cheap enough to ask every step of a drive:
//   scablandsDriveAt(x, z)   what the ground under a point is, and how it drives (top speed share, grip, roughness, the speed an
//                            ember is safe at, the colour of the dust a wheel throws);
//   riverDepthAt(x, z)       how far the dry river sinks the ground there (the river is drawn sunk, with banks);
//   riseHeightAt(x, z)       how high the rises stand there. A rise is drawn height only: gentle enough to drive over.
// The ground's shader (src/world/scrap-look.js) draws each region from the same data, so that the picture and the rules agree.
import {LAND} from './scablands-names.js';
import {SCABLANDS_PLACES} from './scablands.js';
import {ROAD_NET} from './scablands-road.js';
import {resampleRoad} from './scablands-road-geometry.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => { value = clamp(value); return value * value * (3 - 2 * value); };

// ---- The dry river -------------------------------------------------------------------------------------------------------------------
// The bed is 120 m wide and 8 m below the plain; its banks climb from the bed's foot (52 m from the middle) to the plain (78 m).
export const RIVER = Object.freeze({bedHalfWidth: 60, depth: 8, footHalfWidth: 52, lipHalfWidth: 78, reach: 110, nodes: 11});

// The eleven named nodes and the five crossings (each a named point on a stretch between two nodes), smoothed so that the river bends and never
// kinks: a curve that passes through every one of them, so that each crossing stands exactly on the river's line. Each stretch between two
// points is a cubic curve whose direction at each end is the average of the two chords that meet there, sampled about every 100 m.
export function riverLine(land) {
  const nodes = Array.from({length: RIVER.nodes}, (_, index) => land.at(`river-${index}`));
  const crossings = ['the-pipe', 'the-steps', 'girder-bridge', 'the-wash', 'south-ford'].map(id => land.at(id));
  const through = [];
  for (let i = 0; i < nodes.length; i++) {
    through.push(nodes[i]);
    if (i + 1 === nodes.length) break;
    const a = nodes[i], b = nodes[i + 1], dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
    const here = crossings.map(point => {
      const t = ((point.x - a.x) * dx + (point.z - a.z) * dz) / length;
      return {point, t, apart: Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t)};
    }).filter(item => item.t > 0 && item.t < 1 && item.apart < 1).sort((p, q) => p.t - q.t);
    for (const item of here) through.push(item.point);
  }
  const direction = (i) => {
    const before = through[Math.max(0, i - 1)], here = through[i], after = through[Math.min(through.length - 1, i + 1)];
    const unit = (from, to) => { const length = Math.hypot(to.x - from.x, to.z - from.z) || 1; return {x: (to.x - from.x) / length, z: (to.z - from.z) / length}; };
    const left = unit(before, here), right = unit(here, after), x = left.x + right.x, z = left.z + right.z, length = Math.hypot(x, z) || 1;
    return {x: x / length, z: z / length};
  };
  const points = [];
  for (let i = 0; i + 1 < through.length; i++) {
    const a = through[i], b = through[i + 1], span = Math.hypot(b.x - a.x, b.z - a.z), da = direction(i), db = direction(i + 1), steps = Math.max(2, Math.ceil(span / 100));
    for (let step = 0; step < steps; step++) {
      const u = step / steps, u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      points.push(Object.freeze({x: h00 * a.x + h10 * da.x * span + h01 * b.x + h11 * db.x * span, z: h00 * a.z + h10 * da.z * span + h01 * b.z + h11 * db.z * span}));
    }
  }
  points.push(Object.freeze({x: nodes.at(-1).x, z: nodes.at(-1).z}));
  const along = [0];
  for (let i = 1; i < points.length; i++) along.push(along[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  return Object.freeze({nodes: Object.freeze(nodes), points: Object.freeze(points), along: Object.freeze(along), length: along.at(-1)});
}

// The five crossings, each at a named point on the river. What each one does to the ground is in `depthAt` below.
//   bridge: a deck at the level of the plain across the bed (the Girder Bridge, two cars wide);
//   pipe:   a narrower deck, one car wide, with an old pipeline beside the road (the Pipe);
//   steps:  the banks cut into three rock ledges down and three up (the Steps);
//   wash:   a fallen bank: the gorge is two thirds filled, with soft sand at the bottom (the Wash);
//   ford:   shallow banks: the gorge is three quarters filled (the South Ford).
export const CROSSINGS = Object.freeze([
  Object.freeze({id: 'girder-bridge', name: 'The Girder Bridge', kind: 'bridge', deckHalfWidth: 7, reach: 150}),
  Object.freeze({id: 'the-steps', name: 'The Steps', kind: 'steps', reach: 90}),
  Object.freeze({id: 'the-wash', name: 'The Wash', kind: 'wash', fill: .66, reach: 120}),
  Object.freeze({id: 'the-pipe', name: 'The Pipe', kind: 'pipe', deckHalfWidth: 3.6, reach: 150}),
  Object.freeze({id: 'south-ford', name: 'The South Ford', kind: 'ford', fill: .76, reach: 170}),
]);

function riverIndex(line) {
  const CELL = 128, cells = new Map(), key = (i, j) => i * 100003 + j, reach = RIVER.reach;
  for (let index = 0; index + 1 < line.points.length; index++) {
    const a = line.points[index], b = line.points[index + 1];
    const i0 = Math.floor((Math.min(a.x, b.x) - reach) / CELL), i1 = Math.floor((Math.max(a.x, b.x) + reach) / CELL);
    const j0 = Math.floor((Math.min(a.z, b.z) - reach) / CELL), j1 = Math.floor((Math.max(a.z, b.z) + reach) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = key(i, j); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(index); }
  }
  // The nearest stretch of the river to (x, z) within its reach: {distance, along} (along is metres from the river's head).
  return (x, z) => {
    const list = cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!list) return null;
    let best = null;
    for (const index of list) {
      const a = line.points[index], b = line.points[index + 1], dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
      const t = length > 0 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / length) : 0;
      const distance = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
      if (distance <= reach && (!best || distance < best.distance)) best = {distance, along: line.along[index] + t * Math.sqrt(length)};
    }
    return best;
  };
}

// The river and its crossings for a land; `RIVER_LAND` is the game's own.
export function riverFor(land) {
  const line = riverLine(land), nearest = riverIndex(line);
  const crossings = CROSSINGS.map(crossing => {
    const point = land.at(crossing.id), hit = nearest(point.x, point.z) ?? {along: 0};
    return Object.freeze({...crossing, x: point.x, z: point.z, along: hit.along});
  });
  return Object.freeze({line, nearest, crossings});
}
export const RIVER_LAND = riverFor(LAND);

// The bank's profile with three ledges: flat treads joined by short risers, from the plain (0) to the bed (1).
const terrace = bank => { const scaled = bank * 3, step = Math.min(2, Math.floor(scaled)); return (step + smooth((scaled - step - .45) / .55)) / 3; };

// Depth in metres that the river sinks the ground at (x, z). `gorge` is true for the picture of the gorge (a deck is drawn above it,
// and the gorge runs on beneath it) and false for the ground a car drives on, where a deck is level with the plain.
function depthAt(x, z, gorge, river = RIVER_LAND) {
  const hit = river.nearest(x, z);
  if (!hit) return 0;
  const d = hit.distance;
  if (d >= RIVER.lipHalfWidth) return 0;
  const bank = 1 - smooth((d - RIVER.footHalfWidth) / (RIVER.lipHalfWidth - RIVER.footHalfWidth));
  let share = bank, deck = 0;
  for (const crossing of river.crossings) {
    const apart = Math.abs(hit.along - crossing.along);
    if (apart >= crossing.reach) continue;
    const near = 1 - smooth(apart / crossing.reach);
    if (crossing.kind === 'wash' || crossing.kind === 'ford') share *= 1 - crossing.fill * near;
    else if (crossing.kind === 'steps') share += (terrace(bank) - bank) * near;
    else if (!gorge) {
      // A deck is as wide as the road across the crossing (a car stays on it) and level with the plain.
      const road = ROAD_NET.nearest(x, z);
      if (road && road.distance < crossing.deckHalfWidth) deck = Math.max(deck, 1 - smooth((road.distance - crossing.deckHalfWidth + 1.2) / 1.2));
    }
  }
  return RIVER.depth * clamp(share) * (1 - deck);
}
export const riverDepthAt = (x, z) => depthAt(x, z, false);
export const riverGorgeDepthAt = (x, z) => depthAt(x, z, true);
export const riverDistanceAt = (x, z) => RIVER_LAND.nearest(x, z)?.distance ?? Infinity;

// ---- The rises -----------------------------------------------------------------------------------------------------------------------
// Low rises stand across each road 1,500 m from where it leaves a place (1,700 m from the yard), so that a place is not seen from
// the last one: 20 to 40 m high and 600 to 1,000 m across the road. A rise is height only and gentle enough to drive over (the
// steepest slope of one is under 10 percent). The places' own flat ground stays flat (SCABLANDS_PLACES carry their own height).
export const RISE = Object.freeze({height: 26, yardHeight: 20, halfAlong: 460, halfAcross: 1100, fromEnd: 1500, fromYard: 1700, shortest: 2400});
export function risesFor(net, land) {
  const yard = land.yard, rises = [];
  for (const road of net.roads) {
    if (road.length < RISE.shortest) continue;
    const samples = resampleRoad(road.points, 100);
    for (const end of [0, 1]) {
      // The rise stands where the road is 1,500 m (1,700 m from the yard) in a straight line from the place, so that it lies across the way
      // a car sees the place by, round a bend as well as on a straight; on a short road, 42 percent of the road's length.
      const ordered = end === 0 ? samples : [...samples].reverse(), start = ordered[0];
      const fromYard = Math.hypot(start.x - yard.x, start.z - yard.z) < 80;
      const metres = Math.min(fromYard ? RISE.fromYard : RISE.fromEnd, road.length * .42);
      const at = ordered.find(sample => Math.hypot(sample.x - start.x, sample.z - start.z) >= metres) ?? ordered.at(-1);
      rises.push(Object.freeze({road: road.id, end, x: at.x, z: at.z, heading: at.heading, height: fromYard ? RISE.yardHeight : RISE.height,
        cos: Math.cos(at.heading), sin: Math.sin(at.heading)}));
    }
  }
  return Object.freeze(rises);
}
export const RISES = risesFor(ROAD_NET, LAND);
const RISE_REACH = Math.hypot(RISE.halfAlong, RISE.halfAcross);

export function riseHeightAt(x, z, rises = RISES) {
  let height = 0;
  for (const rise of rises) {
    const dx = x - rise.x, dz = z - rise.z;
    if (dx > RISE_REACH || dx < -RISE_REACH || dz > RISE_REACH || dz < -RISE_REACH) continue;
    // Along the road's heading there and across it. The rise is long across the road and short along it.
    const along = dx * rise.sin + dz * rise.cos, across = dx * rise.cos - dz * rise.sin;
    const t = 1 - Math.hypot(along / RISE.halfAlong, across / RISE.halfAcross);
    if (t > 0) height = Math.max(height, rise.height * t * t * (3 - 2 * t));
  }
  return height;
}

// ---- Regions -------------------------------------------------------------------------------------------------------------------------
// How each region drives. `top` is a share of the top speed the Scablands floor gives a car (src/arena/venues.js arenaFloorSpeed),
// `grip` is the tyre grip on it, `scrub` and `roughness` the drag and the shake, `safeKmh` the speed at which the ember in Cinder's pot
// takes nothing from the ground (src/world/jobs/ember-rule.js), and `dust` the colour of what a wheel throws up.
const drive = (id, name, top, grip, scrub, roughness, safeKmh, dust, extra = {}) =>
  Object.freeze({id, name, top, grip, scrub, roughness, safeKmh, dust, soft: false, shake: 0, ...extra,
    // The sound cue played when a car drives on to this ground (src/sound-bank.js): one for each ground, soft sand of the river bed too.
    cue: `world.ground.${extra.soft ? 'river-soft' : id}`});
export const DRIVE = Object.freeze({
  road: drive('road', 'Road', 1, .95, .02, .05, Infinity, 0x9a8566),
  'salt-pan': drive('salt-pan', 'Salt pan', 1.25, .80, .02, .04, Infinity, 0xe9e5db),
  flats: drive('flats', 'Flats', .75, .90, .03, .12, 90, 0x8a7458),
  'scab-plates': drive('scab-plates', 'Scab plates', .45, .85, .05, .55, 50, 0x45403b, {shake: .16}),
  'river-bed': drive('river-bed', 'River bed', .60, .75, .04, .22, 70, 0x7d7a72, {shake: .05}),
  'river-bed-soft': drive('river-bed', 'River bed, soft sand', .30, .75, .09, .30, 70, 0x8f8b80, {soft: true, shake: .07}),
  sand: drive('sand', 'Sand', .35, .60, .08, .20, Infinity, 0xc9b27c, {shake: .04}),
  burn: drive('burn', 'The burn', .75, .90, .03, .14, 90, 0x2b2825),
  'wreck-fields': drive('wreck-fields', 'Wreck fields', .75, .90, .03, .16, 90, 0x7a4f35),
});
export const REGION_ORDER = Object.freeze(['road', 'river-bed', 'wreck-fields', 'sand', 'burn', 'salt-pan', 'scab-plates', 'flats']);

// Region edges are uneven: every margin below is moved by this wave (metres, up to about 100), the same wave in the ground's
// shader, so that the edge a car feels is the edge a player sees. `phase` makes each region's edge differ.
export const edgeWarp = (x, z, phase = 0) =>
  58 * Math.sin(x * .0031 + z * .0023 + phase) + 31 * Math.sin(x * .0083 - z * .0057 + 1.9 + phase * 2) + 17 * Math.sin(x * .0191 + z * .0231 + 4.1 - phase);

// The areas of the other regions, from the land's names. A disc is centred on a place; a polygon is a list of points.
export function groundAreas(land) {
  const at = (id, dx = 0, dz = 0) => land.at(id, dx, dz), between = (...args) => land.between(...args);
  const plain = point => Object.freeze({x: point.x, z: point.z});
  return Object.freeze({
    discs: Object.freeze([
      Object.freeze({id: 'wreck-fields', ...plain(at('boneyard')), radius: 1300, phase: .6, wobble: 1}),
      Object.freeze({id: 'sand', ...plain(at('ships-in-sand')), radius: 1500, phase: 2.3, wobble: 1}),
      Object.freeze({id: 'burn', ...plain(at('everburn')), radius: 1600, phase: 4.4, wobble: 1.7}),
    ]),
    polygons: Object.freeze([
      // The salt pan: the north-east, between the river and the north edge, from the Pipe to the Ridge's foot.
      Object.freeze({id: 'salt-pan', phase: 1.1, points: Object.freeze([
        between('ridge', 'iron-line', 0.33, 40, 135), between('tin-town', 'dry-dam', 0.312, 45, -150), between('tin-town', 'ships-in-sand', 0.23, 80, -110),
        between('tin-town', 'ridge', 0.652, 550, -320), at('ridge', 1160, -1260), between('ships-in-sand', 'ridge', 0.195, 75, -245)].map(plain))}),
      // The scab plates: both banks of the river from the yard's east side to Tin Town, between the pan and the wreck fields.
      Object.freeze({id: 'scab-plates', phase: 3.2, points: Object.freeze([
        between('dry-dam', 'tin-town', 0.466, -30, 125), between('tin-town', 'ridge', 0.398, 500, -290), between('tin-town', 'boneyard', 0.472, 630, 365),
        between('iron-line', 'boneyard', 0.631, 40, -120)].map(plain))}),
    ]),
  });
}
export const GROUND_AREAS = groundAreas(LAND);

// Signed distance in metres into a polygon (negative outside).
export function polygonMargin(points, x, z) {
  let inside = false, edge = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j], b = points[i];
    if ((b.z > z) !== (a.z > z) && x < (a.x - b.x) * (z - b.z) / (a.z - b.z) + b.x) inside = !inside;
    const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz, t = length > 0 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / length) : 0;
    edge = Math.min(edge, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
  }
  return inside ? edge : -edge;
}

// Soft sand in the river bed: patches of about a hundred metres, and the bottom of the Wash.
export function riverSoftAt(x, z, river = RIVER_LAND) {
  const wash = river.crossings.find(crossing => crossing.kind === 'wash');
  if (wash && Math.hypot(x - wash.x, z - wash.z) < 90) return true;
  return Math.sin(x * .0153 + z * .0101) * Math.sin(x * .0121 - z * .0187 + 1.3) > .24;
}

// What the ground under (x, z) is, in the order the card sets: roads, the river bed, the wreck fields, the sand, the burn, the salt
// pan, the scab plates, then the flats. Returns one of the DRIVE records. Pure, and about a microsecond or two.
export function scablandsDriveAt(x, z, areas = GROUND_AREAS, river = RIVER_LAND) {
  if (ROAD_NET.nearest(x, z) !== null) return DRIVE.road;
  const hit = river.nearest(x, z);
  if (hit && RIVER.bedHalfWidth + edgeWarp(x, z, .5) * .25 - hit.distance > 0) return riverSoftAt(x, z, river) ? DRIVE['river-bed-soft'] : DRIVE['river-bed'];
  for (const disc of areas.discs) {
    const dx = x - disc.x, dz = z - disc.z;
    if (disc.radius + edgeWarp(x, z, disc.phase) * disc.wobble - Math.hypot(dx, dz) > 0) return DRIVE[disc.id];
  }
  for (const area of areas.polygons) if (polygonMargin(area.points, x, z) + edgeWarp(x, z, area.phase) > 0) return DRIVE[area.id];
  return DRIVE.flats;
}
export const scablandsRegionAt = (x, z) => scablandsDriveAt(x, z).id;

