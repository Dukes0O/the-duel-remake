// Seeded candidates for the realism trial. This module is not connected to the scene yet.
import {makeRng} from '../rng.js';
import {ROAD_NET, ROAD_HALF_WIDTH} from './scablands-road.js';
import {GROUND_AREAS, edgeWarp, polygonMargin, riverDistanceAt, scablandsRegionAt} from './scablands-regions.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';
import {SOLID_GRID} from './scablands-solids.js';
import {RIVER_LAND} from './scablands-regions.js';
import {sampleLine} from './scablands-ways.js';

export const THINGS_CELL = 16;
export const THINGS_RANGE = 120;

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
