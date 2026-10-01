import {point} from '../combat-weapons.js';
import {outOfPlay} from '../combat-teams.js';

const MAX_HAZARDS = 24;
const lists = new WeakMap();
const contacts = new WeakMap();
const EPSILON = 1e-10;

// Hazard records are shared with presentation; contact entitlements stay private.
export function hazardsFor(duel) {
  return [...(lists.get(duel) || [])];
}

export function addHazard(duel, spec) {
  if (!spec || !Number.isFinite(spec.x) || !Number.isFinite(spec.z) ||
      !Number.isFinite(spec.lifetime) || spec.lifetime <= 0 ||
      !['circle', 'strip'].includes(spec.shape)) return null;
  if (spec.shape === 'circle' && !(Number.isFinite(spec.radius) && spec.radius > 0)) return null;
  if (spec.shape === 'strip' && ![spec.width, spec.length].every(value =>
    Number.isFinite(value) && value > 0)) return null;
  const hazard = {...spec, age: 0, opacity: 1,
    ownerGraceSec: Math.max(0, Number.isFinite(spec.ownerGraceSec) ? spec.ownerGraceSec : 0)};
  let list = lists.get(duel);
  if (!list) lists.set(duel, list = []);
  if (list.length === MAX_HAZARDS) list.shift();
  list.push(hazard);
  contacts.set(hazard, new WeakSet());
  return hazard;
}

export function clearHazards(duel) {
  lists.delete(duel);
}

function bodyFor(duel, actor) {
  const at = point(duel, actor);
  const heading = at.heading + (actor.headingError || 0) + (actor.slipAngle || 0);
  const dimensions = duel._vehicleSpec(actor);
  return {x: at.x, z: at.z, halfWidth: dimensions.halfWidth,
    halfLength: dimensions.halfLength, rightX: Math.cos(heading),
    rightZ: -Math.sin(heading), forwardX: Math.sin(heading), forwardZ: Math.cos(heading)};
}

function overlapsCircle(body, hazard) {
  const dx = hazard.x - body.x, dz = hazard.z - body.z;
  const across = Math.abs(dx * body.rightX + dz * body.rightZ);
  const along = Math.abs(dx * body.forwardX + dz * body.forwardZ);
  const outsideX = Math.max(0, across - body.halfWidth);
  const outsideZ = Math.max(0, along - body.halfLength);
  return outsideX * outsideX + outsideZ * outsideZ <= hazard.radius * hazard.radius;
}

function overlapsStrip(body, hazard) {
  const heading = hazard.heading || 0;
  const strip = {halfWidth: hazard.width / 2, halfLength: hazard.length / 2,
    rightX: Math.cos(heading), rightZ: -Math.sin(heading),
    forwardX: Math.sin(heading), forwardZ: Math.cos(heading)};
  const dx = hazard.x - body.x, dz = hazard.z - body.z;
  // Separating-axis test for two oriented rectangles: no enlarged centre box.
  for (const [x, z] of [[body.rightX, body.rightZ], [body.forwardX, body.forwardZ],
    [strip.rightX, strip.rightZ], [strip.forwardX, strip.forwardZ]]) {
    const carReach = body.halfWidth * Math.abs(x * body.rightX + z * body.rightZ) +
      body.halfLength * Math.abs(x * body.forwardX + z * body.forwardZ);
    const stripReach = strip.halfWidth * Math.abs(x * strip.rightX + z * strip.rightZ) +
      strip.halfLength * Math.abs(x * strip.forwardX + z * strip.forwardZ);
    if (Math.abs(dx * x + dz * z) > carReach + stripReach) return false;
  }
  return true;
}

export function stepHazards(duel, dt) {
  if (!(Number.isFinite(dt) && dt > 0)) return;
  const list = lists.get(duel);
  if (!list?.length) return;
  const state = duel.state;
  const actors = [...new Set([state, ...(state.opponents || []), ...(state.traffic || []),
    state.police?.pursuit].filter(actor => actor && actor.alive !== false && !outOfPlay(duel, actor)))];
  const bodies = actors.map(actor => [actor, bodyFor(duel, actor)]);
  for (const hazard of [...list]) {
    const previousAge = hazard.age;
    hazard.age = Math.min(hazard.lifetime, previousAge + dt);
    // Integrate only the overlap of this fixed step with the authored drift window.
    const driftEnd = Math.min(hazard.lifetime, Math.max(0, hazard.driftSec || 0));
    const driftTime = Math.max(0, Math.min(hazard.age, driftEnd) - Math.min(previousAge, driftEnd));
    hazard.x += (hazard.driftX || 0) * driftTime;
    hazard.z += (hazard.driftZ || 0) * driftTime;
    const remaining = hazard.lifetime - hazard.age;
    const fade = Math.min(hazard.lifetime, Math.max(0, hazard.fadeSec || 0));
    hazard.opacity = remaining <= EPSILON ? 0 : fade > 0 ? Math.min(1, remaining / fade) : 1;
    if (remaining <= EPSILON) continue;
    const touched = contacts.get(hazard);
    for (const [actor, body] of bodies) {
      if (touched.has(actor) || actor === hazard.owner && hazard.age + EPSILON < hazard.ownerGraceSec) continue;
      const overlap = hazard.shape === 'circle' ? overlapsCircle(body, hazard) : overlapsStrip(body, hazard);
      if (!overlap) continue;
      touched.add(actor);
      hazard.onTouch?.(actor);
    }
  }
  lists.set(duel, list.filter(hazard => hazard.age + EPSILON < hazard.lifetime));
}
