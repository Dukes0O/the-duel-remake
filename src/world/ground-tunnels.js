import {SCARPS} from './scablands-scarps.js';

﻿const finite = Number.isFinite;

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
  const segment = {start: {x: start.x, y: startHeight + radius, z: start.z},
    end: {x: end.x, y: endHeight + radius, z: end.z}, radius};
  let minimumCover = Infinity, maximumCover = -Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples, x = start.x + (end.x - start.x) * t, z = start.z + (end.z - start.z) * t;
    const terrain = heightAt(x, z);
    if (!finite(terrain)) throw new TypeError('Surface heights must be finite.');
    const roof = startHeight + (endHeight - startHeight) * t + radius * 2;
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

function point(value, label) {
  if (!value || !finite(value.x) || !finite(value.y) || !finite(value.z)) {
    throw new TypeError(`${label} needs finite x, y and z coordinates.`);
  }
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
function horizontalProjection(position, segment) {
  const dx = segment.end.x - segment.start.x;
  const dz = segment.end.z - segment.start.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 :
    ((position.x - segment.start.x) * dx + (position.z - segment.start.z) * dz) / lengthSquared;
  return {x: segment.start.x + dx * t, y: segment.start.y + (segment.end.y - segment.start.y) * t,
    z: segment.start.z + dz * t};
}

/** Immutable tunnel tubes with height-aware ground lookup and shader hole tests. */
export function createGroundTunnels(segments = []) {
  if (!Array.isArray(segments)) throw new TypeError('Tunnel segments must be a list.');
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

  function tubeAt(position, actorHeight = position?.y, floorTolerance = 0) {
    point(position, 'Actor position');
    if (!finite(actorHeight)) throw new TypeError('Actor height must be finite.');
    let nearest = null;
    for (const tube of tubes) {
      const center = horizontalProjection(position, tube);
      // A tube's support ends at its mouths, rather than extending forever
      // along the approach on either side.
      const dxAxis = tube.end.x - tube.start.x, dzAxis = tube.end.z - tube.start.z;
      const along = (position.x - tube.start.x) * dxAxis + (position.z - tube.start.z) * dzAxis;
      if (along < 0 || along > dxAxis * dxAxis + dzAxis * dzAxis) continue;
      const dx = position.x - center.x, dz = position.z - center.z;
      const radial = Math.hypot(dx, dz);
      const floor = center.y - tube.radius;
      const ceiling = center.y + tube.radius;
      if (radial < tube.radius && actorHeight <= ceiling && actorHeight >= floor - floorTolerance &&
          (!nearest || radial < nearest.radial)) {
        nearest = {tube, center, floor, ceiling, radial};
      }
    }
    return nearest;
  }

  function groundAt(position, actorHeight, terrainHeight) {
    if (!finite(terrainHeight)) throw new TypeError('Terrain height must be finite.');
    if (!tubes.length) return terrainHeight;
    // A support sample can move slightly uphill since the previous step.
    // Accept a small step below the new floor, without pulling an actor down
    // from the surface above the ceiling.
    const inside = tubeAt(position, actorHeight, 0.5);
    return inside ? inside.floor : terrainHeight;
  }

  function wallAt(position, actorHeight) {
    const inside = tubeAt(position, actorHeight);
    return inside ? {limit: inside.tube.radius, radial: inside.radial, center: inside.center} : null;
  }

  // Constrain a move that starts inside one segment. Its ends remain open.
  // The caller supplies the vehicle's horizontal clearance from the wall.
  function constrainMotion(start, end, clearance = 0) {
    point(start, 'Move start');
    point(end, 'Move end');
    if (!finite(clearance) || clearance < 0) throw new TypeError('Clearance must be non-negative.');
    const inside = tubeAt(start, start.y);
    if (!inside) return {position: {...end}, hit: false};
    let tube = inside.tube;
    let dx = tube.end.x - tube.start.x, dz = tube.end.z - tube.start.z;
    let length = Math.hypot(dx, dz);
    if (!length) return {position: {...end}, hit: false};
    const along = ((end.x - tube.start.x) * dx + (end.z - tube.start.z) * dz) / length;
    if (along < 0 || along > length) {
      // A joint is not a mouth: use the adjoining segment's walls when the
      // move crosses it. Only exact joins are considered, leaving mouths open.
      const joint = along < 0 ? tube.start : tube.end;
      const next = tubes.find(candidate => {
        if (candidate === tube) return false;
        const joined = [candidate.start, candidate.end].some(p =>
          Math.hypot(p.x - joint.x, p.y - joint.y, p.z - joint.z) < 1e-7);
        if (!joined) return false;
        const cx = candidate.end.x - candidate.start.x, cz = candidate.end.z - candidate.start.z;
        const squared = cx * cx + cz * cz;
        if (!squared) return false;
        const t = ((end.x - candidate.start.x) * cx + (end.z - candidate.start.z) * cz) / squared;
        const centerY = candidate.start.y + (candidate.end.y - candidate.start.y) * t;
        return t >= 0 && t <= 1 && end.y >= centerY - candidate.radius - 0.5 && end.y <= centerY + candidate.radius;
      });
      if (!next) return {position: {...end}, hit: false};
      tube = next;
      dx = tube.end.x - tube.start.x; dz = tube.end.z - tube.start.z;
      length = Math.hypot(dx, dz);
    }
    const side = ((end.x - tube.start.x) * -dz + (end.z - tube.start.z) * dx) / length;
    const limit = Math.max(0, tube.radius - clearance);
    if (Math.abs(side) <= limit) return {position: {...end}, hit: false};
    const correction = side - Math.sign(side) * limit;
    return {position: {x: end.x + correction * dz / length, y: end.y,
      z: end.z - correction * dx / length}, hit: true};
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
