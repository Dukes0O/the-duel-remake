const finite = Number.isFinite;

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
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((position.x - segment.start.x) * dx + (position.z - segment.start.z) * dz) / lengthSquared));
  return {x: segment.start.x + dx * t, y: segment.start.y + (segment.end.y - segment.start.y) * t,
    z: segment.start.z + dz * t};
}

/** Immutable tunnel tubes with height-aware ground lookup and shader hole tests. */
export function createGroundTunnels(segments = []) {
  if (!Array.isArray(segments)) throw new TypeError('Tunnel segments must be a list.');
  const tubes = segments.map(validSegment);

  function tubeAt(position, actorHeight = position?.y) {
    point(position, 'Actor position');
    if (!finite(actorHeight)) throw new TypeError('Actor height must be finite.');
    for (const tube of tubes) {
      const center = horizontalProjection(position, tube);
      const dx = position.x - center.x, dz = position.z - center.z;
      const radial = Math.hypot(dx, dz);
      const floor = center.y - tube.radius;
      const ceiling = center.y + tube.radius;
      if (radial < tube.radius && actorHeight <= ceiling && actorHeight >= floor) {
        return {tube, center, floor, ceiling, radial};
      }
    }
    return null;
  }

  function groundAt(position, actorHeight, terrainHeight) {
    if (!finite(terrainHeight)) throw new TypeError('Terrain height must be finite.');
    if (!tubes.length) return terrainHeight;
    const inside = tubeAt(position, actorHeight);
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
    const tube = inside.tube;
    const dx = tube.end.x - tube.start.x, dz = tube.end.z - tube.start.z;
    const length = Math.hypot(dx, dz);
    if (!length) return {position: {...end}, hit: false};
    const along = ((end.x - tube.start.x) * dx + (end.z - tube.start.z) * dz) / length;
    if (along < 0 || along > length) return {position: {...end}, hit: false};
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
