import {SCARPS} from './scablands-scarps.js';

﻿const finite = Number.isFinite;
// Where the flat road at 0.55 radius below the centre meets the bore.
const wallRadius = Math.sqrt(1 - 0.55 ** 2);

/** Lay a straight trial tube between surface points and measure its cover. */
export function trialTubeBetween(start, end, radius, heightAt, samples = 100) {
  if (!start || !end || !finite(start.x) || !finite(start.z) ||
      !finite(end.x) || !finite(end.z) || !finite(radius) || radius <= 0 ||
      typeof heightAt !== 'function' || !Number.isInteger(samples) || samples < 1) {
    throw new TypeError('A trial tube needs two surface points, a radius and a height query.');
  }
  if (start.x === end.x && start.z === end.z) throw new RangeError('Trial mouths must be apart.');
  const startHeight = heightAt(start.x, start.z), endHeight = heightAt(end.x, end.z);
  if (!finite(startHeight) || !finite(endHeight)) throw new TypeError('Surface heights must be finite.');
  const segment = {start: {x: start.x, y: startHeight + radius * 0.55, z: start.z},
    end: {x: end.x, y: endHeight + radius * 0.55, z: end.z}, radius};
  let minimumCover = Infinity, maximumCover = -Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples, x = start.x + (end.x - start.x) * t, z = start.z + (end.z - start.z) * t;
    const terrain = heightAt(x, z);
    if (!finite(terrain)) throw new TypeError('Surface heights must be finite.');
    const roof = startHeight + (endHeight - startHeight) * t + radius * 1.55;
    minimumCover = Math.min(minimumCover, terrain - roof);
    maximumCover = Math.max(maximumCover, terrain - roof);
  }
  return {segment, minimumCover, maximumCover};
}

// A 100 m trial from the west scarp foot to its high ground.
// The scarp endpoints already come from the land's named places.
export function westScarpTrial(heightAt) {
  const {a, b} = SCARPS.find(scarp => scarp.id === 'scab-west').stretches[0];
  const mid = {x: (a.x + b.x) / 2, z: (a.z + b.z) / 2};
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const across = {x: -(b.z - a.z) / length, z: (b.x - a.x) / length};
  const at = distance => ({x: mid.x + across.x * distance, z: mid.z + across.z * distance});
  return trialTubeBetween(at(-5), at(95), 4, heightAt);
}

function checkPoint(value, label) {
  if (!value || !finite(value.x) || !finite(value.y) || !finite(value.z)) {
    throw new TypeError(`${label} needs finite x, y and z coordinates.`);
  }
}

function point(value, label) {
  checkPoint(value, label);
  return {x: value.x, y: value.y, z: value.z};
}

function validSegment(segment) {
  if (!segment || !finite(segment.radius) || segment.radius <= 0) {
    throw new TypeError('Tunnel segments need a positive radius.');
  }
  return {start: point(segment.start, 'Tunnel start'), end: point(segment.end, 'Tunnel end'), radius: segment.radius};
}

function closestOnSegment(position, segment) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const dz = segment.end.z - segment.start.z;
  const lengthSquared = dx * dx + dy * dy + dz * dz;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((position.x - segment.start.x) * dx + (position.y - segment.start.y) * dy +
      (position.z - segment.start.z) * dz) / lengthSquared));
  return {x: segment.start.x + dx * t, y: segment.start.y + dy * t, z: segment.start.z + dz * t};
}

// The floor and side walls are sampled in plan view. Using the actor's Y
// in the projection moves the centre along a sloping tube as the car bounces.
function horizontalProjection(position, segment, result) {
  const dx = segment.end.x - segment.start.x;
  const dz = segment.end.z - segment.start.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 :
    ((position.x - segment.start.x) * dx + (position.z - segment.start.z) * dz) / lengthSquared;
  result.x = segment.start.x + dx * t;
  result.y = segment.start.y + (segment.end.y - segment.start.y) * t;
  result.z = segment.start.z + dz * t;
  return result;
}

/** Immutable tunnel tubes with height-aware ground lookup and shader hole tests. */
export function createGroundTunnels(segments = [], {heightAt} = {}) {
  if (!Array.isArray(segments)) throw new TypeError('Tunnel segments must be a list.');
  if (heightAt !== undefined && typeof heightAt !== 'function')
    throw new TypeError('Tunnel surface height must be a function.');
  const tubes = segments.map(validSegment);
  for (let i = 0; i < tubes.length; i++) {
    const tube = tubes[i];
    if (Math.hypot(tube.end.x - tube.start.x, tube.end.z - tube.start.z) < 1e-7)
      throw new RangeError('A tunnel segment needs a horizontal length.');
    if (i > 0) {
      const previous = tubes[i - 1];
      if (Math.hypot(tube.start.x - previous.end.x, tube.start.y - previous.end.y,
        tube.start.z - previous.end.z) > 1e-7 || Math.abs(tube.radius - previous.radius) > 1e-7)
        throw new RangeError('Tunnel segments must join without a gap or a step.');
    }
  }

  // A cutting face is solid until the bore reaches the open surface.
  // Without a surface query, preserve the existing trial's open ends.
  function openEnd(tube, end) {
    if (!heightAt) return true;
    const surface = heightAt(end.x, end.z);
    if (!finite(surface)) throw new TypeError('Tunnel surface heights must be finite.');
    return Math.abs(surface - (end.y - tube.radius * 0.55)) <= 0.3;
  }
  const startOpen = !tubes.length || openEnd(tubes[0], tubes[0].start);
  const lastTube = tubes[tubes.length - 1];
  const endOpen = !lastTube || openEnd(lastTube, lastTube.end);

  // Each tube is entered in the cells touched by its plan-view bounds. A
  // query visits only its own cell, even when the bore has many segments.
  const cellSize = 32, grid = new Map(), noTubes = [];
  const indices = new Map(tubes.map((tube, index) => [tube, index]));
  for (const tube of tubes) {
    const minX = Math.floor((Math.min(tube.start.x, tube.end.x) - tube.radius) / cellSize);
    const maxX = Math.floor((Math.max(tube.start.x, tube.end.x) + tube.radius) / cellSize);
    const minZ = Math.floor((Math.min(tube.start.z, tube.end.z) - tube.radius) / cellSize);
    const maxZ = Math.floor((Math.max(tube.start.z, tube.end.z) + tube.radius) / cellSize);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      if (!grid.has(x)) grid.set(x, new Map());
      const column = grid.get(x);
      if (!column.has(z)) column.set(z, []);
      column.get(z).push(tube);
    }
  }
  const projected = {x: 0, y: 0, z: 0};
  const nearestResult = {tube: null, center: {x: 0, y: 0, z: 0}, floor: 0, ceiling: 0, radial: 0};

  function tubeAt(position, actorHeight = position?.y, floorTolerance = 0) {
    checkPoint(position, 'Actor position');
    if (!finite(actorHeight)) throw new TypeError('Actor height must be finite.');
    let found = false;
    const candidates = grid.get(Math.floor(position.x / cellSize))?.get(Math.floor(position.z / cellSize)) ?? noTubes;
    for (const tube of candidates) {
      const center = horizontalProjection(position, tube, projected);
      // A tube's support ends at its mouths, rather than extending forever
      // along the approach on either side.
      const dxAxis = tube.end.x - tube.start.x, dzAxis = tube.end.z - tube.start.z;
      const along = (position.x - tube.start.x) * dxAxis + (position.z - tube.start.z) * dzAxis;
      if (along < 0 || along > dxAxis * dxAxis + dzAxis * dzAxis) continue;
      const dx = position.x - center.x, dz = position.z - center.z;
      const radial = Math.hypot(dx, dz);
      const floor = center.y - tube.radius * 0.55;
      const ceiling = center.y + tube.radius;
      if (radial < tube.radius && actorHeight <= ceiling && actorHeight >= floor - floorTolerance &&
          (!found || radial < nearestResult.radial)) {
        found = true;
        nearestResult.tube = tube;
        nearestResult.center.x = center.x; nearestResult.center.y = center.y; nearestResult.center.z = center.z;
        nearestResult.floor = floor; nearestResult.ceiling = ceiling; nearestResult.radial = radial;
      }
    }
    return found ? nearestResult : null;
  }

  function groundAt(position, actorHeight, terrainHeight) {
    if (!finite(terrainHeight)) throw new TypeError('Terrain height must be finite.');
    if (!tubes.length) return terrainHeight;
    // A support sample can move slightly uphill since the previous step.
    // Accept a small step below the new floor, without pulling an actor down
    // from the surface above the ceiling.
    const inside = tubeAt(position, actorHeight, 0.6);
    if (!inside) return terrainHeight;
    // The surface is another floor. Keep an actor on it when it is within
    // step height, even if the bore's crown is just below the surface.
    if (terrainHeight >= inside.ceiling && terrainHeight <= actorHeight + 0.6) return terrainHeight;
    return inside.floor;
  }

  const wallResult = {limit: 0, radial: 0, center: nearestResult.center};
  function wallAt(position, actorHeight) {
    const inside = tubeAt(position, actorHeight);
    if (!inside) return null;
    wallResult.limit = inside.tube.radius * wallRadius;
    wallResult.radial = inside.radial;
    return wallResult;
  }

  // Constrain a move starting or ending inside a segment. Actual mouths
  // remain open, while unfinished faces are checked from either side.
  // The caller supplies the vehicle's horizontal clearance from the wall.
  // Results are scratch values, like tubeAt: callers consume them before the next query.
  const motionResult = {position: {x: 0, y: 0, z: 0}, hit: false};
  function motion(x, y, z, hit) {
    motionResult.position.x = x; motionResult.position.y = y; motionResult.position.z = z;
    motionResult.hit = hit;
    return motionResult;
  }
  function constrainMotion(start, end, clearance = 0) {
    checkPoint(start, 'Move start');
    checkPoint(end, 'Move end');
    if (!finite(clearance) || clearance < 0) throw new TypeError('Clearance must be non-negative.');
    let inside = tubeAt(start, start.y);
    if (!inside) {
      // A cutting face also stops an actor approaching from the rock side.
      // Check just the two ends, not every segment in the chain.
      for (let side = 0; side < 2 && tubes.length; side++) {
        if (side === 0 ? startOpen : endOpen) continue;
        const tube = side === 0 ? tubes[0] : lastTube;
        const face = side === 0 ? tube.start : tube.end;
        const dx = tube.end.x - tube.start.x, dz = tube.end.z - tube.start.z;
        const length = Math.hypot(dx, dz), sign = side === 0 ? 1 : -1;
        const before = sign * ((start.x - face.x) * dx + (start.z - face.z) * dz) / length;
        const after = sign * ((end.x - face.x) * dx + (end.z - face.z) * dz) / length;
        if (before >= 0 || after < 0) continue;
        const t = -before / (after - before);
        const x = start.x + (end.x - start.x) * t, z = start.z + (end.z - start.z) * t;
        const y = start.y + (end.y - start.y) * t;
        const sideways = Math.abs((x - face.x) * -dz + (z - face.z) * dx) / length;
        if (sideways > tube.radius + clearance || y < face.y - tube.radius * 0.55 || y > face.y + tube.radius) continue;
        return motion(x, y, z, true);
      }
      inside = tubeAt(end, end.y);
      if (!inside) return motion(end.x, end.y, end.z, false);
    }
    let tube = inside.tube;
    let dx = tube.end.x - tube.start.x, dz = tube.end.z - tube.start.z;
    let length = Math.hypot(dx, dz);
    if (!length) return motion(end.x, end.y, end.z, false);
    const along = ((end.x - tube.start.x) * dx + (end.z - tube.start.z) * dz) / length;
    if (along < 0 || along > length) {
      // A joint is not a mouth: use the adjoining segment's walls when the
      // move crosses it. Only exact joins are considered, leaving mouths open.
      const joint = along < 0 ? tube.start : tube.end;
      let next = null;
      const currentIndex = indices.get(tube);
      let hasJoint = false;
      for (let index = Math.max(0, currentIndex - 1); index <= Math.min(tubes.length - 1, currentIndex + 1); index++) {
        const candidate = tubes[index];
        if (candidate === tube) continue;
        const joined = Math.hypot(candidate.start.x - joint.x, candidate.start.y - joint.y, candidate.start.z - joint.z) < 1e-7 ||
          Math.hypot(candidate.end.x - joint.x, candidate.end.y - joint.y, candidate.end.z - joint.z) < 1e-7;
        if (!joined) continue;
        hasJoint = true;
        const cx = candidate.end.x - candidate.start.x, cz = candidate.end.z - candidate.start.z;
        const squared = cx * cx + cz * cz;
        const t = ((end.x - candidate.start.x) * cx + (end.z - candidate.start.z) * cz) / squared;
        const centerY = candidate.start.y + (candidate.end.y - candidate.start.y) * t;
        if (t >= 0 && t <= 1 && end.y >= centerY - candidate.radius * 0.55 - 0.5 && end.y <= centerY + candidate.radius) {
          next = candidate;
          break;
        }
      }
      if (!next) {
        // A move that misses the neighbouring bore must not escape into
        // solid rock through the seam. Hold it at the joint instead.
        const closedFace = !hasJoint && (along < 0 ? !startOpen : !endOpen);
        if (hasJoint || closedFace) {
          const correction = along < 0 ? along : along - length;
          const side = ((end.x - tube.start.x) * -dz + (end.z - tube.start.z) * dx) / length;
          const limit = Math.max(0, tube.radius * wallRadius - clearance);
          const sideways = side - Math.max(-limit, Math.min(limit, side));
          return motion(end.x - correction * dx / length + sideways * dz / length, end.y,
            end.z - correction * dz / length - sideways * dx / length, true);
        }
        return motion(end.x, end.y, end.z, false);
      }
      tube = next;
      dx = tube.end.x - tube.start.x; dz = tube.end.z - tube.start.z;
      length = Math.hypot(dx, dz);
    }
    const side = ((end.x - tube.start.x) * -dz + (end.z - tube.start.z) * dx) / length;
    const limit = Math.max(0, tube.radius * wallRadius - clearance);
    if (Math.abs(side) <= limit) return motion(end.x, end.y, end.z, false);
    const correction = side - Math.sign(side) * limit;
    return motion(end.x + correction * dz / length, end.y,
      end.z - correction * dx / length, true);
  }

  function clips(position, margin = 0) {
    point(position, 'Surface position');
    if (!finite(margin) || margin < 0) throw new TypeError('Clip margin must be non-negative.');
    return tubes.some(tube => {
      const center = closestOnSegment(position, tube);
      const dx = position.x - center.x, dy = position.y - center.y, dz = position.z - center.z;
      return dx * dx + dy * dy + dz * dz < (tube.radius + margin) ** 2;
    });
  }

  return Object.freeze({
    get segments() { return tubes.map(tube => ({start: {...tube.start}, end: {...tube.end}, radius: tube.radius})); },
    tubeAt,
    groundAt,
    wallAt,
    constrainMotion,
    clips,
    get length() { return tubes.reduce((sum, tube) => sum + Math.hypot(tube.end.x - tube.start.x,
      tube.end.y - tube.start.y, tube.end.z - tube.start.z), 0); },
  });
}

/** Compare a terrain mesh candidate without coupling pure simulation code to Three.js. */
export function compareTunnelHoleCandidates({samples, clips, csgCut} = {}) {
  if (!Array.isArray(samples) || typeof clips !== 'function') {
    throw new TypeError('Hole comparison needs surface samples and a clip test.');
  }
  const started = performance.now();
  const kept = samples.filter(sample => !clips(sample));
  const shaderMs = performance.now() - started;
  if (typeof csgCut !== 'function') {
    return {shader: {kept, elapsedMs: shaderMs}, csg: {available: false, elapsedMs: null}};
  }
  const csgStarted = performance.now();
  const mesh = csgCut(samples);
  return {shader: {kept, elapsedMs: shaderMs},
    csg: {available: true, mesh, elapsedMs: performance.now() - csgStarted}};
}
