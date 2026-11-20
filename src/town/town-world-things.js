// Things the town sets down in the Scablands (the neighbours' outposts, Mrs Vane's kiosks, fences and billboards): the maths
// shared by every family of them. Pure: no DOM and no Three.js, so the job's solids and the drawing are made from the same numbers.
//
// A thing stands at (x, z) turned by `heading`, the way a three.js mesh turned by `heading` about the vertical stands: its own x runs
// to (cos h, -sin h) and its own z to (sin h, cos h). Its `bounds` are [west, north, east, south] in its own metres (x east, z south at
// no turn). Each `box` is [west, north, east, south, height], cut from the model at a cell of 1 m (as src/world/scablands-solids.js
// cuts Tin Town), and tools/test-town-outposts-scene.mjs reads the model again to check that every part taller than a wheel is inside one.
import {scablandsSurfaceHeightAt} from '../world/scablands-ground.js';

// Anything this tall or less is driven over (src/world/scablands-solids.js says the same).
export const TOWN_THING_WHEEL = .9;
// How far a pad's edge goes into the ground at its lowest corner, so that no gap shows under it.
export const TOWN_THING_SINK = .12;
// 0.3 m is added on every side of a cut box, as Tin Town's are: the cells were 1 m and a drawn part may stand just past one.
export const TOWN_THING_PAD = .3;

// A point of the thing, (lx, lz) in its own metres, in the world.
export function thingPoint(thing, lx, lz) {
  const cos = Math.cos(thing.heading), sin = Math.sin(thing.heading);
  return {x: thing.x + lx * cos + lz * sin, z: thing.z - lx * sin + lz * cos};
}

// A world point in the thing's own metres.
export function thingLocal(thing, x, z) {
  const cos = Math.cos(thing.heading), sin = Math.sin(thing.heading), dx = x - thing.x, dz = z - thing.z;
  return {x: dx * cos - dz * sin, z: dx * sin + dz * cos};
}

// The heading that turns the thing's `front` side ('-x', '+x', '-z' or '+z') to face (tx, tz).
export function headingToward(x, z, tx, tz, front = '-x') {
  const length = Math.hypot(tx - x, tz - z) || 1, dx = (tx - x) / length, dz = (tz - z) / length;
  // Own -x goes to (-cos h, sin h); own +x to (cos h, -sin h); own -z to (-sin h, -cos h); own +z to (sin h, cos h).
  if (front === '-x') return Math.atan2(dz, -dx);
  if (front === '+x') return Math.atan2(-dz, dx);
  if (front === '-z') return Math.atan2(-dx, -dz);
  if (front === '+z') return Math.atan2(dx, dz);
  throw new RangeError(`A thing's front is one of -x, +x, -z or +z, not ${JSON.stringify(front)}.`);
}

// Points over a footprint, its edge every metre or so and a few across its middle, in its own metres.
export function footprintSamples([west, north, east, south], step = 1) {
  const out = [], across = Math.max(1, Math.ceil((east - west) / step)), down = Math.max(1, Math.ceil((south - north) / step));
  for (let i = 0; i <= across; i++) for (let j = 0; j <= down; j++) {
    const edge = i === 0 || j === 0 || i === across || j === down;
    if (edge || (i % 3 === 0 && j % 3 === 0)) out.push([west + (east - west) * i / across, north + (south - north) * j / down]);
  }
  return out;
}

// The ground under a footprint: its lowest and highest point. `heightAt` is the real ground (the physics) by default; the drawing passes
// the drawn ground instead, so that a pad meets the ground it is drawn on.
export function groundUnder(thing, bounds, heightAt = scablandsSurfaceHeightAt) {
  let low = Infinity, high = -Infinity;
  for (const [lx, lz] of footprintSamples(bounds)) {
    const point = thingPoint(thing, lx, lz), y = heightAt(point.x, point.z);
    if (y < low) low = y;
    if (y > high) high = y;
  }
  return {low, high, relief: high - low};
}

// Where a thing's own floor (its y = 0) goes: the lowest ground under its footprint, less the sink, so that every edge of its pad is in the
// ground and nothing floats. The highest ground is then `relief + sink` above the floor, which is how deep its uphill edge is buried.
export function thingBase(thing, bounds, heightAt = scablandsSurfaceHeightAt, sink = TOWN_THING_SINK) {
  const under = groundUnder(thing, bounds, heightAt);
  return {y: under.low - sink, buried: under.relief + sink, relief: under.relief};
}

// The solids of a thing's cut boxes, as plain rows (src/world/scablands-solids.js `createJobSolidGrid().setTown` makes the records). Each
// stands on the thing's floor and reaches the box's height above it.
export function boxSolids(thing, boxes, {id = thing.id, kind = 'building', base = thing.base, pad = TOWN_THING_PAD} = {}) {
  return boxes.map(([west, north, east, south, height], index) => {
    const middle = thingPoint(thing, (west + east) / 2, (north + south) / 2);
    return Object.freeze({id: `${id}-${index + 1}`, kind, shape: 'box', x: middle.x, z: middle.z,
      halfX: (east - west) / 2 + pad, halfZ: (south - north) / 2 + pad, heading: thing.heading, height, base});
  });
}

// A fence round a thing: straight pieces of `length` metres along each side of `bounds` widened by `margin`, as many as fit, with the
// middle piece of the `gate` side left out (or that whole side, with `openSide`). Each piece is {id, x, z, heading, length, side}, its own
// x along the side, standing on the lower ground of its two ends.
export function fenceRing(thing, bounds, {margin = 3, length = 8, gate = '-x', openSide = false, heightAt = scablandsSurfaceHeightAt,
  sink = .05, id = `${thing.id}-fence`} = {}) {
  const [west, north, east, south] = bounds;
  const midX = (west + east) / 2, midZ = (north + south) / 2;
  const countX = Math.max(1, Math.ceil((east - west + 2 * margin) / length)), countZ = Math.max(1, Math.ceil((south - north + 2 * margin) / length));
  const halfX = countX * length / 2, halfZ = countZ * length / 2, pieces = [];
  // Each side: its own name, where it runs (a line in the thing's metres) and how many pieces it takes.
  const sides = [
    ['-z', [midX - halfX, midZ - halfZ], [1, 0], countX], ['+z', [midX - halfX, midZ + halfZ], [1, 0], countX],
    ['-x', [midX - halfX, midZ - halfZ], [0, 1], countZ], ['+x', [midX + halfX, midZ - halfZ], [0, 1], countZ],
  ];
  for (const [side, [sx, sz], [ax, az], count] of sides) {
    if (side === gate && openSide) continue;
    for (let n = 0; n < count; n++) {
      if (side === gate && n === Math.floor(count / 2)) continue;
      const a = thingPoint(thing, sx + ax * n * length, sz + az * n * length);
      const b = thingPoint(thing, sx + ax * (n + 1) * length, sz + az * (n + 1) * length);
      const heading = Math.atan2(-(b.z - a.z), b.x - a.x);
      pieces.push(Object.freeze({id: `${id}-${side}-${n + 1}`, side, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, heading, length,
        base: Math.min(heightAt(a.x, a.z), heightAt(b.x, b.z)) - sink, ends: Object.freeze([a, b])}));
    }
  }
  return pieces;
}

// The solid of one fence piece: a thin wall the piece's length and `height` tall.
export function fenceSolid(piece, height, thickness = .1) {
  return Object.freeze({id: piece.id, kind: 'fence', shape: 'box', x: piece.x, z: piece.z, halfX: piece.length / 2,
    halfZ: thickness / 2 + .15, heading: piece.heading, height, base: piece.base});
}

// A small seeded stream for one thing, from a number and a name: the same thing always gets the same draws.
export function thingSeed(seed, name) {
  let hash = (seed >>> 0) ^ 0x9e3779b9;
  for (const char of String(name)) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return hash >>> 0;
}
