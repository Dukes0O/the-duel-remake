// Seeded candidates for the realism trial. This module is not connected to the scene yet.
import {makeRng} from '../rng.js';
import {ROAD_NET, ROAD_HALF_WIDTH} from './scablands-road.js';
import {GROUND_AREAS, edgeWarp, polygonMargin, riverDistanceAt, scablandsRegionAt} from './scablands-regions.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';
import {SOLID_GRID} from './scablands-solids.js';
import {RIVER_LAND} from './scablands-regions.js';
import {sampleLine} from './scablands-ways.js';
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

export function nearRoadForLitter(x, z) {
  const segments = roadCells.get(roadKey(Math.floor(x / ROAD_CELL), Math.floor(z / ROAD_CELL))) ?? [];
  for (const {a, b} of segments) {
    const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
    const t = length ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
    if (Math.hypot(x - a.x - t * dx, z - a.z - t * dz) < LITTER_REACH) return true;
  }
  return false;
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

function insideSolid(x, z) {
  for (const solid of SOLID_GRID.near(x, z, x, z, 1)) {
    const dx = x - solid.x, dz = z - solid.z;
    const c = Math.cos(solid.heading), s = Math.sin(solid.heading);
    const localX = dx * c - dz * s, localZ = dx * s + dz * c;
    if (Math.abs(localX) <= solid.halfX + .3 && Math.abs(localZ) <= solid.halfZ + .3) return true;
  }
  return false;
}

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
    if (ROAD_NET.nearest(x, z) || insideSolid(x, z) || jobStarts.some(p => Math.hypot(x - p.x, z - p.z) < 6)) continue;
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
