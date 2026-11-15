// Seeded placement for the realism trial.
import {makeRng} from '../rng.js';
import {ROAD_NET, ROAD_HALF_WIDTH} from './scablands-road.js';
import {GROUND_AREAS, edgeWarp, polygonMargin, riverDistanceAt, scablandsRegionAt} from './scablands-regions.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';
import {SOLID_GRID, createSolidGrid} from './scablands-solids.js';
import {RIVER_LAND} from './scablands-regions.js';
import {sampleLine, HOT_DELIVERY_WAYS, routeFor} from './scablands-ways.js';
import {stepsWayFor, RIVER} from './scablands-regions.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from './jobs/everburn.js';
import {GAS_RUN_PATHS} from './jobs/gas-run.js';
import {LAND} from './scablands-names.js';
import {IRON_LINE, ironLineLength, sampleIronLine} from './iron-line.js';
import {SCARPS} from './scablands-scarps.js';

export const THINGS_CELL = 16;
export const THINGS_RANGE = 120;

// Single boulders use their own larger cells, so they remain stable as the
// player moves. Like rock falls, these candidates need footprint clearance.
export const BOULDER_CELL = 120;
export function loneBoulderInCell(seed, i, j) {
  const rng = makeRng(seedCell(seed ^ 0xb01d3, i, j));
  const present = rng.float();
  const x = (i + rng.float()) * BOULDER_CELL;
  const z = (j + rng.float()) * BOULDER_CELL;
  const size = 1 + rng.float() * 3, heading = rng.float() * Math.PI * 2;
  const ground = scablandsRegionAt(x, z);
  const chance = ground === 'scab-plates' || ground === 'river-bed' ? .45 : .12;
  if (ground === 'salt-pan' || present >= chance) return null;
  return {id: `boulder:single:${i}:${j}`, x, z,
    y: scablandsSurfaceHeightAt(x, z), size, heading};
}

// Rock falls sit on the foot side of each named scarp. These are candidates:
// their full footprints still need clearance before drawing or making solids.
export function scarpBoulderCandidates(seed, scarps = SCARPS) {
  const rng = makeRng(seed), result = [];
  for (const scarp of scarps) for (const [stretchIndex, {a, b}] of scarp.stretches.entries()) {
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    if (!length) continue;
    const tx = dx / length, tz = dz / length;
    for (let along = 20; along < length - 20; along += 45) {
      if (!rng.chance(.65)) continue;
      const count = 2 + Math.floor(rng.float() * 4);
      for (let index = 0; index < count; index++) {
        const offsetAlong = (rng.float() - .5) * 28, foot = 3 + rng.float() * 24;
        const x = a.x + tx * (along + offsetAlong) + tz * foot;
        const z = a.z + tz * (along + offsetAlong) - tx * foot;
        result.push({id: `boulder:${scarp.id}:${stretchIndex}:${along}:${index}`,
          scarp: scarp.id, x, z, y: scablandsSurfaceHeightAt(x, z),
          size: 1 + rng.float() * 3, heading: rng.float() * Math.PI * 2});
      }
    }
  }
  return result;
}

// Fence candidates follow each road arriving at Tin Town. They are not yet
// drawn or solid; the later connection must apply all clearance rules first.
export function fenceCandidates(seed, {net = ROAD_NET, land = LAND} = {}) {
  const town = land.at('tin-town'), rng = makeRng(seed), runs = [];
  for (const road of net.roads) {
    const ends = [road.points[0], road.points[road.points.length - 1]];
    const nearStart = Math.hypot(ends[0].x - town.x, ends[0].z - town.z) < Math.hypot(ends[1].x - town.x, ends[1].z - town.z);
    const end = nearStart ? ends[0] : ends[1];
    if (Math.hypot(end.x - town.x, end.z - town.z) > 200 || road.length < 650) continue;
    const length = 200 + Math.floor(rng.float() * 21) * 20;
    const side = rng.chance(.5) ? 1 : -1;
    const posts = [];
    for (let distance = 0; distance <= length; distance += 8) {
      const along = nearStart ? 200 + distance : road.length - 200 - distance;
      let left = along, point;
      for (let i = 0; i + 1 < road.points.length; i++) {
        const a = road.points[i], b = road.points[i + 1];
        const dx = b.x - a.x, dz = b.z - a.z, segment = Math.hypot(dx, dz);
        if (!segment) continue;
        if (left <= segment || i + 2 === road.points.length) {
          const t = Math.min(1, left / segment), heading = Math.atan2(dx, dz);
          point = {x: a.x + dx * t + Math.cos(heading) * side * 22,
            z: a.z + dz * t - Math.sin(heading) * side * 22, heading};
          break;
        }
        left -= segment;
      }
      if (!point) continue;
      const gap = rng.chance(.08);
      posts.push({id: `fence:${road.id}:${posts.length}`, ...point,
        y: scablandsSurfaceHeightAt(point.x, point.z), along, gap, canFall: true});
    }
    runs.push({id: `fence:${road.id}`, town: 'tin-town', road: road.id, length, posts});
  }
  return runs;
}

// Candidate poles follow the actual road and rail lines. Clearance and solid
// records must be added before these candidates are used by the scene.
export function telegraphCandidates(seed, {road = ROAD_NET.road('east-road'), rail = IRON_LINE} = {}) {
  const rng = makeRng(seed), lines = [];
  const add = (id, length, pointAt, offset) => {
    const poles = [];
    for (let along = 0; along <= length; along += 60) {
      const point = pointAt(along), x = point.x + Math.cos(point.heading) * offset;
      const z = point.z - Math.sin(point.heading) * offset;
      const state = rng.float(), lean = rng.float();
      poles.push({id: `${id}:${poles.length}`, x, z, y: scablandsSurfaceHeightAt(x, z),
        heading: point.heading, along, state: state < .04 ? 'down' : state < .16 ? 'leaning' : 'upright',
        lean: (lean - .5) * .3});
    }
    lines.push({id, poles});
  };
  const pointOnRoad = along => {
    let left = along;
    for (let i = 0; i + 1 < road.points.length; i++) {
      const a = road.points[i], b = road.points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      if (!length) continue;
      if (left <= length || i + 2 === road.points.length) {
        const t = Math.min(1, left / length);
        return {x: a.x + dx * t, z: a.z + dz * t, heading: Math.atan2(dx, dz)};
      }
      left -= length;
    }
    throw new Error('The East Road has no usable segments');
  };
  add('east-road', road.length, pointOnRoad, ROAD_HALF_WIDTH + 8);
  add('iron-line', ironLineLength(rail), along => sampleIronLine(rail, along), 12);
  return lines;
}

// Candidate centres along a continuous line, spaced in metres along the line
// rather than independently on each leg. The renderer and map can share the
// returned records once the candidates have passed the solid clearance rules.
export function pylonCandidates(seed, land = LAND) {
  const points = [land.at('dry-dam', 100, 0), land.at('yard', 100, 0), land.at('dead-mall', 100, 0)];
  const rng = makeRng(seed), result = [];
  let travelled = 0, next = 0;
  for (let leg = 0; leg + 1 < points.length; leg++) {
    const a = points[leg], b = points[leg + 1], dx = b.x - a.x, dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    if (!length) continue;
    while (next <= travelled + length) {
      const t = (next - travelled) / length;
      const x = a.x + dx * t, z = a.z + dz * t;
      result.push({id: `pylon:${result.length}`, x, z, y: scablandsSurfaceHeightAt(x, z),
        heading: Math.atan2(dx, dz), along: next, height: 40, cableDown: rng.chance(.2)});
      next += 350;
    }
    travelled += length;
  }
  return result;
}

// A ground renderer can read these short paired segments without knowing how a
// map route was made. Pass it the very same points the map uses. Road pieces
// are left to the road renderer, including where a route meets another road.
export function tracksForWay(points, {net = ROAD_NET, crossings = RIVER_LAND.crossings} = {}) {
  if (points.length < 2) return [];
  const samples = sampleLine(points, 4), tracks = [];
  for (let i = 0; i + 1 < samples.length; i++) {
    const a = samples[i], b = samples[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    if (!length) continue;
    const nx = -dz / length * .8, nz = dx / length * .8;
    // Check both ends and the middle so a short segment cannot bridge a road.
    if ([a, b, {x: (a.x + b.x) / 2, z: (a.z + b.z) / 2}].some(p =>
      net.nearest(p.x, p.z) || net.nearest(p.x + nx, p.z + nz) || net.nearest(p.x - nx, p.z - nz))) continue;
    const middle = {x: (a.x + b.x) / 2, z: (a.z + b.z) / 2};
    const crossing = crossings.some(p => Math.hypot(middle.x - p.x, middle.z - p.z) < p.reach);
    for (const side of [-1, 1]) tracks.push({
      x1: a.x + side * nx, z1: a.z + side * nz,
      x2: b.x + side * nx, z2: b.z + side * nz,
      strength: crossing ? 1 : .5,
    });
  }
  return tracks;
}

// Index only the road segments that can affect roadside litter. The full road
// distance search is meant for checks and is too expensive for every cell.
const LITTER_REACH = ROAD_HALF_WIDTH + 28, ROAD_CELL = 256;
const roadCells = new Map();
const roadKey = (i, j) => `${i}:${j}`;
for (const road of ROAD_NET.roads) for (let n = 0; n + 1 < road.points.length; n++) {
  const a = road.points[n], b = road.points[n + 1];
  const i0 = Math.floor((Math.min(a.x, b.x) - LITTER_REACH) / ROAD_CELL);
  const i1 = Math.floor((Math.max(a.x, b.x) + LITTER_REACH) / ROAD_CELL);
  const j0 = Math.floor((Math.min(a.z, b.z) - LITTER_REACH) / ROAD_CELL);
  const j1 = Math.floor((Math.max(a.z, b.z) + LITTER_REACH) / ROAD_CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const key = roadKey(i, j);
    if (!roadCells.has(key)) roadCells.set(key, []);
    roadCells.get(key).push({a, b});
  }
}

function roadWithin(x, z, reach) {
  const segments = roadCells.get(roadKey(Math.floor(x / ROAD_CELL), Math.floor(z / ROAD_CELL))) ?? [];
  for (const {a, b} of segments) {
    const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
    const t = length ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
    if (Math.hypot(x - a.x - t * dx, z - a.z - t * dz) <= reach) return true;
  }
  return false;
}

export const nearRoadForLitter = (x, z) => roadWithin(x, z, LITTER_REACH);

// Protect the named ways and the routes used by the moving trucks. Index the
// segments so that placing small things does not scan every route per cell.
const routeCells = new Map();
const routeLines = HOT_DELIVERY_WAYS.map(way => ({points: routeFor(way.legs, {
  start: LAND.yard, destination: LAND.at('tin-town'),
}), width: 7}));
for (const path of Object.values(GAS_RUN_PATHS)) routeLines.push({points: path.map(place => place.position), width: 8});
for (const job of [...EVERBURN_JOBS, ...EVERBURN_SIDE_JOBS]) for (const step of job.steps) {
  if (step.path && (step.kind === 'escort' || step.actor?.id === 'old-smoke-furnace'))
    routeLines.push({points: step.path.map(place => place.position), width: 8});
}
const stepsWay = stepsWayFor();
if (stepsWay) routeLines.push({width: 7, points: [-1, 1].map(side => ({
  x: stepsWay.x + side * stepsWay.nx * stepsWay.reach,
  z: stepsWay.z + side * stepsWay.nz * stepsWay.reach,
}))});
for (const {points, width} of routeLines) for (let n = 1; n < points.length; n++) {
  const a = points[n - 1], b = points[n], reach = width + 28;
  for (let i = Math.floor((Math.min(a.x, b.x) - reach) / ROAD_CELL); i <= Math.floor((Math.max(a.x, b.x) + reach) / ROAD_CELL); i++)
    for (let j = Math.floor((Math.min(a.z, b.z) - reach) / ROAD_CELL); j <= Math.floor((Math.max(a.z, b.z) + reach) / ROAD_CELL); j++) {
      const key = roadKey(i, j);
      if (!routeCells.has(key)) routeCells.set(key, []);
      routeCells.get(key).push({a, b, width});
    }
}
function routeWithin(x, z, radius) {
  for (const {a, b, width} of routeCells.get(roadKey(Math.floor(x / ROAD_CELL), Math.floor(z / ROAD_CELL))) ?? []) {
    const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
    const t = length ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
    if (Math.hypot(x - a.x - t * dx, z - a.z - t * dz) <= width + radius) return true;
  }
  return false;
}

// Reject the whole round footprint, not just its centre. The road index covers
// up to 28 m beyond the road edge; callers must use a radius within that limit.
// Job starts are required explicitly so a caller cannot silently omit them.
export function thingFootprintClear(x, z, radius, jobStarts) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(radius) || radius < 0 || radius > 28 || !Array.isArray(jobStarts)) {
    throw new RangeError('A finite footprint and job starts are required');
  }
  if (roadWithin(x, z, ROAD_HALF_WIDTH + radius) || routeWithin(x, z, radius)) return false;
  const river = RIVER_LAND.nearest(x, z);
  if (river && RIVER_LAND.crossings.some(crossing => {
    const along = Math.abs(river.along - crossing.along);
    if (crossing.kind === 'wash' || crossing.kind === 'ford')
      return along < crossing.reach + radius && river.distance < RIVER.rampLipHalfWidth + radius;
    if (crossing.kind === 'bridge' || crossing.kind === 'pipe')
      return along < 40 + radius && river.distance < RIVER.bedHalfWidth + radius;
    return false;
  })) return false;
  if (jobStarts.some(p => Math.hypot(x - p.x, z - p.z) < 6 + radius)) return false;
  for (const solid of SOLID_GRID.near(x, z, x, z, radius)) {
    const dx = x - solid.x, dz = z - solid.z;
    const c = Math.cos(solid.heading), s = Math.sin(solid.heading);
    const localX = dx * c - dz * s, localZ = dx * s + dz * c;
    const outsideX = Math.max(0, Math.abs(localX) - solid.halfX);
    const outsideZ = Math.max(0, Math.abs(localZ) - solid.halfZ);
    if (Math.hypot(outsideX, outsideZ) <= radius) return false;
  }
  return true;
}

// Find junctions from the road lines themselves. Endpoints that meet a road
// and true crossings both count; nearby intersections form one fork.
export function forkSigns(jobStarts, {net = ROAD_NET, land = LAND} = {}) {
  const junctions = [];
  const add = (x, z) => {
    if (!junctions.some(p => Math.hypot(p.x - x, p.z - z) < 60)) junctions.push({x, z});
  };
  const project = (p, a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
    const t = length2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / length2)) : 0;
    return {x: a.x + t * dx, z: a.z + t * dz, t};
  };
  for (let n = 0; n < net.roads.length; n++) for (let m = n + 1; m < net.roads.length; m++) {
    const a = net.roads[n], b = net.roads[m];
    for (const [first, second] of [[a, b], [b, a]]) for (const end of [first.points[0], first.points.at(-1)]) {
      for (let i = 0; i + 1 < second.points.length; i++) {
        const p = project(end, second.points[i], second.points[i + 1]);
        if (Math.hypot(p.x - end.x, p.z - end.z) < ROAD_HALF_WIDTH) { add(p.x, p.z); break; }
      }
    }
    for (let i = 0; i + 1 < a.points.length; i++) for (let j = 0; j + 1 < b.points.length; j++) {
      const p = a.points[i], q = b.points[j], rx = a.points[i + 1].x - p.x, rz = a.points[i + 1].z - p.z;
      const sx = b.points[j + 1].x - q.x, sz = b.points[j + 1].z - q.z, cross = rx * sz - rz * sx;
      if (Math.abs(cross) < 1e-8) continue;
      const t = ((q.x - p.x) * sz - (q.z - p.z) * sx) / cross;
      const u = ((q.x - p.x) * rz - (q.z - p.z) * rx) / cross;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) add(p.x + t * rx, p.z + t * rz);
    }
  }
  const places = [land.yard, ...land.table];
  return junctions.map((junction, index) => {
    const destinations = new Map();
    for (const road of net.roads) {
      let nearest = null, travelled = 0;
      for (let i = 0; i + 1 < road.points.length; i++) {
        const a = road.points[i], b = road.points[i + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
        const p = project(junction, a, b), distance = Math.hypot(p.x - junction.x, p.z - junction.z);
        if (!nearest || distance < nearest.distance) nearest = {distance, along: travelled + p.t * length};
        travelled += length;
      }
      if (!nearest || nearest.distance > ROAD_HALF_WIDTH + 2) continue;
      for (const [end, distance] of [[road.points[0], nearest.along], [road.points.at(-1), travelled - nearest.along]]) {
        if (distance < 40) continue;
        const place = places.reduce((best, row) => Math.hypot(row.x - end.x, row.z - end.z) < Math.hypot(best.x - end.x, best.z - end.z) ? row : best);
        const offset = Math.hypot(place.x - end.x, place.z - end.z);
        if (offset > 400) continue;
        const km = Math.max(1, Math.round((distance + offset) / 1000));
        const old = destinations.get(place.id);
        if (!old || distance < old.distance) destinations.set(place.id, {id: place.id, name: place.name, km, distance, x: end.x, z: end.z});
      }
    }
    let spot = null;
    for (let radius = 22; radius <= 100 && !spot; radius += 8) for (let angle = 0; angle < 16; angle++) {
      const heading = angle * Math.PI / 8, x = junction.x + Math.cos(heading) * radius, z = junction.z + Math.sin(heading) * radius;
      if (thingFootprintClear(x, z, .25, jobStarts)) { spot = {x, z, heading}; break; }
    }
    if (!spot) throw new Error(`No clear position for road fork ${index}`);
    return {id: `sign:${index}`, ...spot, y: scablandsSurfaceHeightAt(spot.x, spot.z), junction,
      destinations: [...destinations.values()].sort((a, b) => a.distance - b.distance)};
  });
}

// Keep empty positions in a line: a renderer must not join a wire across a
// rejected pole or fence post. The caller supplies all job starts explicitly.
export function clearedFixedThings(seed, jobStarts) {
  if (!Array.isArray(jobStarts)) throw new RangeError('Job starts are required');
  const clear = (item, radius) => thingFootprintClear(item.x, item.z, radius, jobStarts);
  return {
    signs: forkSigns(jobStarts),
    pylons: pylonCandidates(seed).map(pylon => clear(pylon, 6) ? pylon : null),
    telegraphs: telegraphCandidates(seed).map(line => ({...line,
      poles: line.poles.map(pole => clear(pole, pole.state === 'down' ? 7 : .5) ? pole : null)})),
    fences: fenceCandidates(seed).map(run => ({...run,
      posts: run.posts.map(post => !post.gap && clear(post, .25) ? post : null)})),
    boulders: scarpBoulderCandidates(seed).filter(rock => clear(rock, rock.size / 2)),
  };
}

// Map only the spans that the scene draws, preserving breaks at missing or fallen supports.
export function thingLandmarkLines(fixed) {
  const lines = [];
  const collect = (kind, id, supports, usable) => {
    let points = [];
    const finish = () => { if (points.length > 1) lines.push({kind, id, points}); points = []; };
    for (const support of supports) {
      if (support && usable(support)) points.push({x: support.x, z: support.z});
      else finish();
    }
    finish();
  };
  collect('pylon', 'pylons', fixed.pylons, () => true);
  for (const line of fixed.telegraphs) collect('telegraph', line.id, line.poles, pole => pole.state !== 'down');
  return lines;
}

export function clearedLoneBoulder(seed, i, j, jobStarts) {
  if (!Array.isArray(jobStarts)) throw new RangeError('Job starts are required');
  const rock = loneBoulderInCell(seed, i, j);
  return rock && thingFootprintClear(rock.x, rock.z, rock.size / 2, jobStarts) ? rock : null;
}

// Collision records and the view must be made from the same cleared things.
// The index is deliberately created only by a caller using the trial switch.
export function thingSolids(fixed, loneBoulders = []) {
  const solids = [];
  const add = (item, id, kind, x, z, halfX, halfZ, height, heading = 0, extra = {}) => {
    const y = scablandsSurfaceHeightAt(x, z);
    const center = [x, y + height / 2, z], size = [halfX * 2, height, halfZ * 2];
    solids.push({id, thingId: item.id, placeId: null, kind, shape: 'ellipse', x, z, y,
      halfX, halfZ, heading, height, minY: y, maxY: y + height, center, size,
      collision: {center, halfExtents: [halfX, height / 2, halfZ], heading}, ...extra});
  };
  for (const sign of fixed.signs ?? []) add(sign, sign.id, 'sign-post', sign.x, sign.z, .15, .15, 2.4, sign.heading);
  for (const pylon of fixed.pylons.filter(Boolean)) {
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      const c = Math.cos(pylon.heading), s = Math.sin(pylon.heading);
      const x = pylon.x + 3 * (side * c + end * s);
      const z = pylon.z + 3 * (-side * s + end * c);
      add(pylon, `${pylon.id}:foot:${side}:${end}`, 'pylon-foot', x, z, .4, .4, 3);
    }
  }
  for (const line of fixed.telegraphs) for (const pole of line.poles.filter(Boolean)) {
    if (pole.state === 'down') {
      // The centre moves half the length from the original foot.
      const x = pole.x + Math.sin(pole.heading) * 3.4, z = pole.z + Math.cos(pole.heading) * 3.4;
      add(pole, pole.id, 'telegraph', x, z, .25, 3.4, .5, pole.heading, {shape: 'box'});
    } else add(pole, pole.id, 'telegraph', pole.x, pole.z, .25, .25, 7, pole.heading);
  }
  for (const run of fixed.fences) for (const post of run.posts.filter(Boolean))
    add(post, post.id, 'fence-post', post.x, post.z, .15, .15, 1.4, post.heading, {canFall: true});
  for (const rock of [...fixed.boulders, ...loneBoulders].filter(Boolean))
    add(rock, rock.id, 'boulder', rock.x, rock.z, rock.size / 2, rock.size / 2, rock.size, rock.heading);
  return solids;
}

export function thingSolidGrid(fixed, loneBoulders = []) {
  return createSolidGrid(thingSolids(fixed, loneBoulders));
}

// Both the scene and the simulation can make the same cleared land without
// either depending on the other. Nothing is created when the trial is off.
export function realismThingsData({enabled, seed, jobStarts, halfWidth, halfDepth}) {
  if (!enabled) return null;
  const fixed = clearedFixedThings(seed, jobStarts), loneBoulders = [];
  for (let i = Math.floor(-halfWidth / BOULDER_CELL); i <= Math.floor(halfWidth / BOULDER_CELL); i++) {
    for (let j = Math.floor(-halfDepth / BOULDER_CELL); j <= Math.floor(halfDepth / BOULDER_CELL); j++) {
      const rock = clearedLoneBoulder(seed, i, j, jobStarts);
      if (rock && Math.abs(rock.x) <= halfWidth && Math.abs(rock.z) <= halfDepth) loneBoulders.push(rock);
    }
  }
  return {fixed, loneBoulders};
}

// Chances per candidate, not counts per square metre. Salt lumps are confined to the pan edge below.
export const SMALL_DENSITY = Object.freeze({
  flats: {'stone': .22, 'scrub': .25, 'brush': .08},
  'scab-plates': {'stone': .48, 'scrub': .13, 'brush': .05},
  'river-bed': {'stone': .42, 'scrub': .06, 'brush': .02},
  sand: {'stone': .12, 'scrub': .05, 'brush': .03},
  burn: {'stone': .22, 'stump': .13, 'brush': .03},
  'wreck-fields': {'stone': .25, 'bone': .07, 'can': .07, 'scrap': .09, 'scrub': .08},
  'salt-pan': {'stone': .04, 'salt': .16},
});

function seedCell(seed, i, j) {
  return (seed ^ Math.imul(i, 0x1f123bb5) ^ Math.imul(j, 0x5f356495)) >>> 0;
}

// Returns stable world-space candidates for a cell. Job starts must be supplied by the caller.
// The caller owns the switch and must not call this while the trial is off.
export function smallThingsInCell(seed, i, j, jobStarts = []) {
  const rng = makeRng(seedCell(seed, i, j)), things = [];
  const pan = GROUND_AREAS.polygons.find(area => area.id === 'salt-pan');
  for (let index = 0; index < 12; index++) {
    const x = (i + rng.float()) * THINGS_CELL, z = (j + rng.float()) * THINGS_CELL;
    const choice = rng.float(), size = rng.float(), turn = rng.float();
    if (!thingFootprintClear(x, z, .3, jobStarts)) continue;
    const ground = scablandsRegionAt(x, z);
    const weights = {...SMALL_DENSITY[ground]};
    if (ground === 'salt-pan' && Math.abs(polygonMargin(pan.points, x, z) + edgeWarp(x, z, pan.phase)) > 90) delete weights.salt;
    if (ground !== 'salt-pan' && riverDistanceAt(x, z) < 110) weights.stone = Math.max(weights.stone || 0, .42);
    if (ground !== 'salt-pan' && ground !== 'wreck-fields' && nearRoadForLitter(x, z)) {
      weights.bone = .02; weights.can = .025; weights.scrap = .03;
    }
    let sum = 0, kind = null;
    for (const [name, weight] of Object.entries(weights)) {
      sum += weight;
      if (choice < sum) { kind = name; break; }
    }
    if (!kind) continue;
    things.push({id: `${i}:${j}:${index}`, kind, x, z, y: scablandsSurfaceHeightAt(x, z),
      size: kind === 'stone' ? .1 + size * .5 : .2 + size * .4, shape: Math.floor(size * 3), heading: turn * Math.PI * 2});
  }
  return things;
}
