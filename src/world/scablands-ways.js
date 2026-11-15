// The ways between two places of the Scablands, and what is known of each (SCABLANDS-LAND round 4, slice 4). Everything is worked out
// from the land's own data, so that the big map's list of ways cannot disagree with the land:
//   its length          along the line the way takes (a road of the net, the river's bed, or a straight run over open ground);
//   its ground          every 25 m along it the ground is asked what it is (scablandsDriveAt), and the shares are added up;
//   its crossings       the crossings of the dry river that lie on it;
//   who holds it        the barricades a job has set on it (and the crossing they stand at), and what a watcher can see of it: the
//                       furnace on its skyline and the Ridge's lookout, each along a clear line over the ground's own height.
// Reading only: nothing here changes a job.
import {LAND} from './scablands-names.js';
import {DRIVE, RIVER_LAND, scablandsDriveAt} from './scablands-regions.js';
import {scablandsHeightAt} from './scablands-height.js';
import {ROAD_NET} from './scablands-road.js';
import {scablandsFloorsAt} from './scablands-ground.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// ---- Lines ---------------------------------------------------------------------------------------------------------------------------
export function pathLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += gap(points[i], points[i - 1]);
  return length;
}

// The nearest point of a line to (x, z): its index (the segment's start), the share along that segment, the distance and the metres
// along the whole line.
export function nearestOnLine(points, x, z) {
  let best = null, before = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1], dx = b.x - a.x, dz = b.z - a.z, square = dx * dx + dz * dz;
    const t = square > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / square)) : 0;
    const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t), span = Math.sqrt(square);
    if (!best || distance < best.distance) best = {index: i, t, distance, along: before + span * t, x: a.x + dx * t, z: a.z + dz * t};
    before += span;
  }
  return best;
}

// The part of a line between two metres-along (either order; reversed when `from` is beyond `to`).
export function sliceLine(points, fromAlong, toAlong) {
  const reverse = fromAlong > toAlong, low = Math.min(fromAlong, toAlong), high = Math.max(fromAlong, toAlong), out = [];
  let before = 0;
  const at = (a, b, metres) => { const span = gap(a, b), t = span > 0 ? (metres - before) / span : 0; return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t}; };
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1], span = gap(a, b), end = before + span;
    if (end >= low && before <= high) {
      if (!out.length) out.push(before >= low ? {x: a.x, z: a.z} : at(a, b, low));
      out.push(end <= high ? {x: b.x, z: b.z} : at(a, b, high));
    }
    before = end;
  }
  return reverse ? out.reverse() : out;
}

// A line sampled every `step` metres: [{x, z, along}].
export function sampleLine(points, step) {
  const total = pathLength(points), count = Math.max(1, Math.ceil(total / step)), out = [];
  let i = 1, before = 0;
  for (let k = 0; k <= count; k++) {
    const along = total * k / count;
    while (i < points.length - 1 && before + gap(points[i], points[i - 1]) < along) { before += gap(points[i], points[i - 1]); i++; }
    const a = points[i - 1] ?? points[0], b = points[i] ?? points[0], span = gap(a, b), t = span > 0 ? Math.min(1, (along - before) / span) : 0;
    out.push({x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, along});
  }
  return out;
}

// What a line crosses: metres on each ground, from the ground's own question asked every `step` metres.
export function groundAlong(points, {driveAt = scablandsDriveAt, step = 25} = {}) {
  const samples = sampleLine(points, step), metres = new Map();
  const names = new Map(Object.entries(DRIVE).map(([key, record]) => [record, key]));
  for (let i = 0; i + 1 < samples.length; i++) {
    const mid = {x: (samples[i].x + samples[i + 1].x) / 2, z: (samples[i].z + samples[i + 1].z) / 2};
    const key = names.get(driveAt(mid.x, mid.z)) ?? 'flats';
    metres.set(key, (metres.get(key) ?? 0) + samples[i + 1].along - samples[i].along);
  }
  const total = [...metres.values()].reduce((sum, value) => sum + value, 0) || 1;
  return [...metres.entries()].map(([key, value]) => ({key, name: DRIVE[key].name, metres: value, share: value / total})).sort((a, b) => b.metres - a.metres);
}

// ---- Sight ---------------------------------------------------------------------------------------------------------------------------
// A watcher at `eye` metres above the ground sees a point `target` metres above its ground when no ground between them stands higher
// than the line of sight (the highest angle the ground has taken so far from the watcher's eye) and it is within range. Heights are the land's own.
const sightFloors = [], sightPoint = {x: 0, y: 0, z: 0};
const sightFeet = actor => Number.isFinite(actor.y) ? actor.y : Number.isFinite(actor.groundY) ? actor.groundY : undefined;
export function sees(from, point, {heightAt = scablandsHeightAt, eye = 5, target = 1.5, step = 40, range = Infinity,
  actorFloors = false, tunnels = null} = {}) {
  const distance = gap(from, point);
  if (distance > range) return false;
  const fromFeet = sightFeet(from), targetFeet = sightFeet(point);
  const eyeY = (actorFloors && Number.isFinite(fromFeet) ? fromFeet : heightAt(from.x, from.z)) + eye;
  const targetY = (actorFloors && Number.isFinite(targetFeet) ? targetFeet : heightAt(point.x, point.z)) + target;
  const count = Math.max(1, Math.ceil(Math.max(distance / step, Math.abs(targetY - eyeY) / (actorFloors ? 1 : step))));
  for (let i = 1; i < count; i++) {
    const t = i / count, x = from.x + (point.x - from.x) * t, z = from.z + (point.z - from.z) * t;
    const y = eyeY + (targetY - eyeY) * t;
    if (!actorFloors) { if (heightAt(x, z) > y) return false; continue; }
    const floors = scablandsFloorsAt(x, z, sightFloors);
    if (floors > 1) {
      if (y < sightFloors[1] || (y >= sightFloors[0] - 1.2 && y <= sightFloors[0])) return false;
    } else if (heightAt(x, z) > y) {
      sightPoint.x = x; sightPoint.y = y; sightPoint.z = z;
      if (!tunnels?.tubeAt(sightPoint, y)) return false;
    }
  }
  return true;
}

// The area a watcher can see: rays out from it over `halfAngle` either side of `heading` (a whole circle when halfAngle is pi), each
// stopped where the ground first hides a car or at `range`. Returns the outline as points, the watcher first when it is a fan.
export function sightOutline(from, {heading = 0, halfAngle = Math.PI, range = 1400, eye = 5, target = 1.5, rays = 48, step = 40, heightAt = scablandsHeightAt} = {}) {
  const whole = halfAngle >= Math.PI - 1e-6, outline = [], count = whole ? rays : rays + 1;
  const eyeY = heightAt(from.x, from.z) + eye;
  for (let r = 0; r < count; r++) {
    const angle = whole ? heading + Math.PI * 2 * r / rays : heading - halfAngle + halfAngle * 2 * r / rays;
    const dx = Math.sin(angle), dz = Math.cos(angle);
    let highest = -Infinity, seen = 0;
    for (let d = step; d <= range; d += step) {
      const x = from.x + dx * d, z = from.z + dz * d, ground = heightAt(x, z);
      if ((ground + target - eyeY) / d < highest) break;
      seen = d;
      highest = Math.max(highest, (ground - eyeY) / d);
    }
    outline.push({x: from.x + dx * seen, z: from.z + dz * seen});
  }
  return whole ? outline : [{x: from.x, z: from.z}, ...outline];
}

// Metres of a line (sampled every `step`) that a watcher sees, within its range.
export function metresSeen(points, from, {range = 1400, step = 25, ...options} = {}) {
  const samples = sampleLine(points, step);
  let seen = 0;
  for (let i = 0; i + 1 < samples.length; i++) {
    const mid = {x: (samples[i].x + samples[i + 1].x) / 2, z: (samples[i].z + samples[i + 1].z) / 2};
    if (sees(from, mid, {range, ...options})) seen += samples[i + 1].along - samples[i].along;
  }
  return seen;
}

// ---- Routes --------------------------------------------------------------------------------------------------------------------------
// A way is written as legs, each of one kind, from named things of the land (never from a number):
//   {to: 'the-steps'}                      straight to a named point
//   {road: 'east-road'}                    the whole of a road of the net, from the end nearer the start
//   {road, until: 'safe-road'}             a road from its start to the point on it nearest a named point
//   {road, from, until}                    the part of a road between the points on it nearest two named points
//   {road, untilRoadStart: 'ridge-spur'}   a road from its start to where another road leaves it
//   {river: ['the-wash', 'the-steps']}     the dry river's bed from one named point on it to another
export function routeFor(legs, {start, destination, land = LAND, net = ROAD_NET, river = RIVER_LAND}) {
  const point = ref => { const found = land.at(typeof ref === 'string' ? ref : ref.id); return {x: found.x, z: found.z}; };
  const out = [{x: start.x, z: start.z}];
  const add = points => {
    const list = points.slice();
    if (list.length && gap(out.at(-1), list[0]) > 1) {
      // A road is joined where it starts or where it ends, whichever is nearer; a road laid the other way round is turned over.
      if (list.length > 1 && gap(out.at(-1), list.at(-1)) < gap(out.at(-1), list[0])) list.reverse();
    }
    for (const p of list) if (gap(out.at(-1), p) > .5) out.push({x: p.x, z: p.z});
  };
  for (const leg of legs) {
    if (leg.to) add([point(leg.to)]);
    else if (leg.river) {
      const [a, b] = leg.river.map(point), line = river.line.points;
      add(sliceLine(line, nearestOnLine(line, a.x, a.z).along, nearestOnLine(line, b.x, b.z).along));
    } else if (leg.road) {
      const road = net.road(leg.road).points, alongTo = ref => { const p = point(ref); return nearestOnLine(road, p.x, p.z).along; };
      const spur = leg.untilRoadStart ? net.road(leg.untilRoadStart).points[0] : null;
      const from = leg.from ? alongTo(leg.from) : 0;
      const until = leg.until ? alongTo(leg.until) : spur ? nearestOnLine(road, spur.x, spur.z).along : pathLength(road);
      add(sliceLine(road, from, until));
    }
  }
  const end = {x: destination.x, z: destination.z};
  if (gap(out.at(-1), end) > .5) out.push(end);
  return out;
}

// The four ways from the yard to Tin Town that the card sets for Hot Delivery ("What the player weighs, yard to Tin Town").
export const HOT_DELIVERY_WAYS = Object.freeze([
  Object.freeze({id: 'east-road', name: 'The East Road', legs: Object.freeze([Object.freeze({road: 'east-road'})])}),
  Object.freeze({id: 'scab-plates', name: 'Across the scab plates', legs: Object.freeze([Object.freeze({to: 'the-steps'})])}),
  // The card: "a car on the pan is seen from the Ridge", so the Ridge's lookout is listed for this way.
  Object.freeze({id: 'salt-pan', name: 'By the salt pan', lookouts: Object.freeze(['ridge']), legs: Object.freeze([Object.freeze({road: 'salt-road', untilRoadStart: 'ridge-spur'}),
    Object.freeze({road: 'ridge-spur'}), Object.freeze({road: 'ridge-road'})])}),
  Object.freeze({id: 'river-bed', name: 'Along the river bed', legs: Object.freeze([Object.freeze({road: 'east-road', until: 'safe-road'}),
    Object.freeze({road: 'boneyard-road', until: 'the-wash'}), Object.freeze({river: Object.freeze(['the-wash', 'the-steps'])}), Object.freeze({to: 'the-steps'})])}),
]);

// ---- The graph of roads, for a way between two places that has no way written for it ---------------------------------------------------
// Roads meet where one's end lies on another (a spur leaves its road, a road ends on the one it joins). The graph has a node at every
// end and every such meeting; a trip's start and end are joined to the nearest road within `reach`.
export function roadGraph(net = ROAD_NET) {
  const splits = new Map(net.roads.map(road => [road.id, [0, pathLength(road.points)]]));
  for (const road of net.roads) for (const other of net.roads) {
    if (road === other) continue;
    for (const end of [road.points[0], road.points.at(-1)]) {
      const hit = nearestOnLine(other.points, end.x, end.z);
      if (hit.distance < 3) splits.get(other.id).push(hit.along);
    }
  }
  const nodes = new Map(), edges = [], key = p => `${Math.round(p.x / 4)},${Math.round(p.z / 4)}`;
  const node = p => { const k = key(p); if (!nodes.has(k)) nodes.set(k, {k, x: p.x, z: p.z, edges: []}); return nodes.get(k); };
  for (const road of net.roads) {
    const cuts = [...new Set(splits.get(road.id).map(value => Math.round(value)))].sort((a, b) => a - b);
    for (let i = 0; i + 1 < cuts.length; i++) {
      if (cuts[i + 1] - cuts[i] < 6) continue;
      const points = sliceLine(road.points, cuts[i], cuts[i + 1]), a = node(points[0]), b = node(points.at(-1));
      const edge = {a, b, points, length: pathLength(points), road: road.id};
      a.edges.push(edge); b.edges.push(edge); edges.push(edge);
    }
  }
  return {nodes, edges};
}

// The shortest way over the roads from one point to another, with a straight run at each end to reach them; null when a place is
// further than `reach` from every road.
export function roadWay(from, to, {net = ROAD_NET, reach = 400, graph = roadGraph(net)} = {}) {
  const snap = point => {
    let best = null;
    for (const edge of graph.edges) { const hit = nearestOnLine(edge.points, point.x, point.z); if (!best || hit.distance < best.hit.distance) best = {edge, hit}; }
    return best && best.hit.distance <= reach ? best : null;
  };
  const a = snap(from), b = snap(to);
  if (!a || !b) return null;
  // Dijkstra over the nodes; the first and last edges are cut at the snapped points.
  const cost = new Map(), via = new Map(), queue = [];
  const startNodes = [[a.edge.a, a.hit.along], [a.edge.b, a.edge.length - a.hit.along]];
  for (const [n, c] of startNodes) { cost.set(n, c); via.set(n, {from: null, edge: a.edge, start: true}); queue.push(n); }
  const done = new Set();
  while (queue.length) {
    queue.sort((p, q) => cost.get(p) - cost.get(q));
    const n = queue.shift();
    if (done.has(n)) continue;
    done.add(n);
    for (const edge of n.edges) {
      const next = edge.a === n ? edge.b : edge.a, c = cost.get(n) + edge.length;
      if (!cost.has(next) || c < cost.get(next)) { cost.set(next, c); via.set(next, {from: n, edge}); queue.push(next); }
    }
  }
  const endNodes = [[b.edge.a, b.hit.along], [b.edge.b, b.edge.length - b.hit.along]].filter(([n]) => cost.has(n));
  const sameEdge = a.edge === b.edge;
  let best = null;
  for (const [n, c] of endNodes) { const total = cost.get(n) + c; if (!best || total < best.total) best = {n, total}; }
  if (sameEdge) {
    const direct = Math.abs(a.hit.along - b.hit.along);
    if (!best || direct <= best.total) return [{x: from.x, z: from.z}, ...sliceLine(a.edge.points, a.hit.along, b.hit.along), {x: to.x, z: to.z}];
  }
  if (!best) return null;
  const chain = [];
  for (let n = best.n; n; ) { const step = via.get(n); chain.unshift({n, step}); n = step.from; }
  const points = [];
  const first = chain[0].n;
  points.push(...sliceLine(a.edge.points, a.hit.along, first === a.edge.a ? 0 : a.edge.length));
  for (const {n, step} of chain.slice(1)) points.push(...(step.edge.b === n ? step.edge.points : step.edge.points.slice().reverse()));
  const last = best.n;
  points.push(...sliceLine(b.edge.points, last === b.edge.a ? 0 : b.edge.length, b.hit.along));
  return [{x: from.x, z: from.z}, ...points, {x: to.x, z: to.z}];
}

// ---- What is known of a way --------------------------------------------------------------------------------------------------------------
// The holder of a barricade, from its own name ('ash-men-barricade-1' is held by the Ash Men).
export const holderOf = id => String(id ?? '').replace(/-?barricade.*$/, '').split('-').filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(' ') || 'Someone';

// Watchers: the furnace on its skyline (from the job's own sighting) and named lookouts (a place of the land, how far it sees, how high
// the lookout stands above its ground). A lookout is only listed for the jobs whose ways name it.
export const WATCH = Object.freeze({furnace: Object.freeze({range: 1400, eye: 5}), lookout: Object.freeze({range: 3000, eye: 12})});

// A way, with its numbers. `context` is {land, net, river, barricades, watchers, heightAt}:
//   barricades   [{id, x, z}] a job has set on its ways;
//   watchers     [{id, name, x, z, range, eye}] who can see a car on the ground.
export function describeWay(way, points, {barricades = [], watchers = [], land = LAND, river = RIVER_LAND, heightAt = scablandsHeightAt, driveAt = scablandsDriveAt} = {}) {
  const length = pathLength(points), grounds = groundAlong(points, {driveAt});
  // A way that runs along the river's bed passes under a bridge and does not use it: only a way that crosses the river there is held there.
  const along = (line, hit) => { const a = line[hit.index], b = line[hit.index + 1]; return {x: (b.x - a.x) / (gap(a, b) || 1), z: (b.z - a.z) / (gap(a, b) || 1)}; };
  const crossings = river.crossings.map(crossing => ({crossing, hit: nearestOnLine(points, crossing.x, crossing.z)})).filter(({hit}) => hit.distance < 110).map(({crossing, hit}) => {
    const way = along(points, hit), stream = along(river.line.points, nearestOnLine(river.line.points, crossing.x, crossing.z));
    const under = Math.abs(way.x * stream.x + way.z * stream.z) > Math.cos(35 * Math.PI / 180);
    const held = under ? [] : barricades.filter(item => gap(item, crossing) < 260);
    return {id: crossing.id, name: crossing.name, kind: crossing.kind, under, heldBy: held.length ? [...new Set(held.map(item => holderOf(item.id)))] : []};
  });
  const own = barricades.filter(item => nearestOnLine(points, item.x, item.z).distance < 60);
  const holders = [];
  const who = new Map();
  for (const item of own) who.set(holderOf(item.id), (who.get(holderOf(item.id)) ?? 0) + 1);
  for (const [name, count] of who) holders.push({kind: 'barricades', who: name, count});
  const sights = [];
  for (const watcher of watchers) {
    const seen = metresSeen(points, watcher, {range: watcher.range, eye: watcher.eye, heightAt});
    if (seen >= 100) sights.push({id: watcher.id, name: watcher.name, metres: seen});
  }
  return {id: way.id, name: way.name, points, length, grounds, crossings, holders, sights};
}
