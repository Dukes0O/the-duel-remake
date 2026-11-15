// Seeded candidates for the realism trial. This module is not connected to the scene yet.
import {makeRng} from '../rng.js';
import {ROAD_NET, ROAD_HALF_WIDTH, distanceToNet} from './scablands-road.js';
import {GROUND_AREAS, edgeWarp, polygonMargin, riverDistanceAt, scablandsRegionAt} from './scablands-regions.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';
import {SOLID_GRID} from './scablands-solids.js';

export const THINGS_CELL = 16;
export const THINGS_RANGE = 120;

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
    if (ground !== 'salt-pan' && ground !== 'wreck-fields' && distanceToNet(x, z) < ROAD_HALF_WIDTH + 28) {
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
