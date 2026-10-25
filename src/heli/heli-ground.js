// Ground height and tall obstacles under the helicopter, read from a
// course's own samplers (docs/HELICOPTER.md section 9). Pure: the flight
// asks this for heights and rotor strikes and never touches the course.
import {renderedGroundHeight} from '../rendered-ground.js';
import {basinReach} from '../circuit-hills.js';

const BUCKET = 32;
const bucketKey = (i, j) => i * 100_003 + j;

// heightAt(x, z) is the drawn ground; it is read lazily on a 4 m grid and
// blended between grid points, so a long flight costs a few samples a step.
// obstacles: [{x, z, radius, base, top, shape: 'column' | 'cone'}].
// water(x, z) is the surface height of a lake the bucket can scoop from, or
// null: a ground without one never has water.
export function createHeliGround({heightAt, obstacles = [], cell = 4, water = null} = {}) {
  if (typeof heightAt !== 'function') throw new Error('createHeliGround needs heightAt(x, z)');
  const grid = new Map();
  const point = (i, j) => {
    const key = i * 1_000_003 + j;
    let y = grid.get(key);
    if (y === undefined) {
      y = heightAt(i * cell, j * cell);
      if (!Number.isFinite(y)) y = 0;
      grid.set(key, y);
    }
    return y;
  };
  const height = (x, z) => {
    const gx = x / cell, gz = z / cell, i = Math.floor(gx), j = Math.floor(gz), u = gx - i, v = gz - j;
    const a = point(i, j), b = point(i + 1, j), c = point(i, j + 1), d = point(i + 1, j + 1);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };
  const buckets = new Map();
  let reach = 0;
  for (const raw of obstacles) {
    const o = Object.freeze({x: raw.x, z: raw.z, radius: raw.radius, base: raw.base, top: raw.top,
      shape: raw.shape === 'cone' ? 'cone' : 'column', id: raw.id ?? null, kind: raw.kind ?? null});
    if (![o.x, o.z, o.radius, o.base, o.top].every(Number.isFinite) || o.top <= o.base) continue;
    reach = Math.max(reach, o.radius);
    const key = bucketKey(Math.floor(o.x / BUCKET), Math.floor(o.z / BUCKET));
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  }
  const near = (x, z, radius) => {
    const found = [], span = radius + reach;
    for (let i = Math.floor((x - span) / BUCKET); i <= Math.floor((x + span) / BUCKET); i++) {
      for (let j = Math.floor((z - span) / BUCKET); j <= Math.floor((z + span) / BUCKET); j++) {
        for (const o of buckets.get(bucketKey(i, j)) || []) {
          if (Math.hypot(o.x - x, o.z - z) <= radius + o.radius) found.push(o);
        }
      }
    }
    return found;
  };
  // The height an obstacle reaches at a horizontal distance from its centre.
  const topAt = (o, distance) => o.shape === 'cone'
    ? o.top - (o.top - o.base) * Math.min(1, Math.max(0, distance / o.radius))
    : o.top;
  // The tallest obstacle reaching into a circle, counting only those whose
  // base is below a height, or -Infinity. A cone counts at the circle's
  // closest point to its peak.
  const tallestIn = (x, z, radius, below = Infinity) => {
    let tallest = -Infinity;
    for (const o of near(x, z, radius)) {
      if (o.base > below) continue;
      const closest = Math.max(0, Math.hypot(o.x - x, o.z - z) - radius);
      tallest = Math.max(tallest, topAt(o, o.shape === 'cone' ? closest : 0));
    }
    return tallest;
  };
  // Does a rotor disc of this radius at this height touch the ground (a
  // cliff or slope) or a tree, building, rock face or mountain? The body,
  // from the skids up to the rotor, counts too.
  const rotorStrike = (x, y, z, radius, {skidsY = y, bodyRadius = 1.5} = {}) => {
    if (y - height(x, z) < radius + 20) {
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        if (height(x + Math.cos(a) * radius, z + Math.sin(a) * radius) > y) return true;
      }
    }
    return tallestIn(x, z, radius, y) > y || tallestIn(x, z, bodyRadius, y) > skidsY;
  };
  // Highest ground or obstacle top within a circle: what to stay above.
  const highest = (x, z, radius = 0) => {
    let top = height(x, z);
    if (radius > 0) for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      top = Math.max(top, height(x + Math.cos(a) * radius, z + Math.sin(a) * radius));
    }
    return Math.max(top, tallestIn(x, z, radius));
  };
  const waterAt = typeof water === 'function' ? (x, z) => water(x, z) ?? null : () => null;
  return Object.freeze({height, near, rotorStrike, highest, topAt, water: waterAt, sampled: () => grid.size});
}

// Tall things on a course that a rotor or a hanging car can hit. Trees use
// a crown wider than their trunk; mountains are cones.
export function courseObstacles(course) {
  const found = [];
  for (const o of course.features?.obstacles || []) {
    const top = o.modelMaxY ?? (Number.isFinite(o.height) ? o.y + o.height : null);
    if (!Number.isFinite(top) || !Number.isFinite(o.x) || !Number.isFinite(o.z)) continue;
    const base = Number.isFinite(o.modelMinY) ? o.modelMinY : o.y;
    if (top - base < 2) continue;
    const half = Math.max(o.halfX || 0, o.halfZ || 0);
    const radius = o.kind === 'tree' ? Math.max(1.5, 0.22 * (top - base))
      : o.kind === 'mountain' ? Math.max(half, 1) : Math.max(half, 0.5);
    found.push({x: o.x, z: o.z, radius, base, top, shape: o.kind === 'mountain' ? 'cone' : 'column', id: o.id, kind: o.kind});
  }
  return found;
}

export function groundFromCourse(course) {
  const fallback = (x, z) => {
    const near = course.nearest(x, z);
    return course.groundAt(near.s, near.lateral).y;
  };
  const heightAt = (x, z) => {
    // The drawn ground of a course that is not an authored circuit is found by the
    // point's own road coordinates, so they are given (an authored circuit never reads them).
    const near = course.nearest(x, z);
    const drawn = renderedGroundHeight(course, {x, z, s: near.s, off: near.lateral}, {requireSurface: true});
    return Number.isFinite(drawn) ? drawn : fallback(x, z);
  };
  return createHeliGround({heightAt, obstacles: courseObstacles(course), water: courseWater(course)});
}

// The surface height of a `basins` lake at a place, or null. The same oval
// and surface height installBasins digs and circuit-effects fills, with the
// lap wrapped so a lake over the start line is found from both sides.
export function courseWater(course) {
  // A frozen lake (Tremblant Snow) is ice: nothing to scoop.
  const frozen = course.def?.effects?.lake?.frozen === true ? course.def.effects.lake : null;
  const basins = (course.def?.basins ?? []).filter(basin => !(frozen && frozen.s === basin.s && frozen.lateral === basin.lateral));
  if (!basins.length) return () => null;
  return (x, z) => {
    const near = course.nearest(x, z), phase = course.phase(near.s);
    for (const basin of basins) {
      let along = phase - basin.s;
      if (course.closed) along -= Math.round(along / course.length) * course.length;
      if (basinReach(basin, along, near.lateral - basin.lateral) < 1) return course._height(basin.s) + basin.surface;
    }
    return null;
  };
}

export function flatGround(y = 0, obstacles = []) {
  return createHeliGround({heightAt: () => y, obstacles});
}
