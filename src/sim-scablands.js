// The Scablands' shape, driven (SCABLANDS-LAND round 4, slice 2b): in the Scablands only, a slope slows a car going up and speeds it going down,
// ground too steep to grip stops a car and is a hit, a car that leaves the ground and lands takes a hit sized by its fall, and everything drawn
// that stands taller than a wheel is solid. Race courses and the Scrapdome never call this (the arena event calls it only when
// `course.def.scablands` is set), so no replay can move.
import {CARS} from './config.js';
import {slopeSpeedDelta} from './offroad-physics.js';
import {contactZone} from './collision.js';
import {combatArmorEnabled, applyArmorDamage, applySceneryArmorDamage} from './combat-armor.js';
import {combatCrashThresholdMph} from './vehicle-impact.js';
import {scablandsSurfaceHeightAt} from './world/scablands-ground.js';
import {ledgeAt} from './world/scablands-regions.js';
import {GROUND, MPH_TO_KMH, climbLimit, dropFor, fallHit} from './world/scablands-ground-rules.js';
import {SOLID_GRID} from './world/scablands-solids.js';

// The solids a swept move may meet, with the town layout's own (a town drive): one list, reused by the next call. `start` and `end` are the
// move's world points; the grid is asked for everything within 6 m of the sweep (a car is under 3 m from its middle to its far corner).
export function scablandsContactObstacles(duel, car, start, end, base) {
  const out = duel._scablandsObstacles ??= [];
  out.length = 0;
  for (const obstacle of base) out.push(obstacle);
  for (const solid of (duel.state.arena?.worldJob?.solidGrid ?? SOLID_GRID).near(start.x, start.z, end.x, end.z, 6)) out.push(solid);
  return out;
}

// The hit a car takes against ground it could not climb, with the same consequences a hit on any solid in the arena has
// (`_staticContacts`, src/sim-contacts.js): armour at the crash speed or above, a dent and a scrape below it.
function hitGround(duel, actor, impactMph, nx, nz) {
  const player = actor === duel.state;
  const armorContact = combatArmorEnabled(duel) && (player || duel.state.opponents.includes(actor));
  const thresholdCar = player ? duel.car : CARS[actor.car] || duel.car;
  const threshold = player || armorContact ? duel.state.mode === 'wasteland' ? combatCrashThresholdMph(thresholdCar) : 28 : Infinity;
  const frame = duel.course.at(actor.s), zone = contactZone(nx, nz, frame.heading + (actor.headingError || 0) + (actor.slipAngle || 0));
  if (player) duel._breakDrift?.('hit');
  if (armorContact && impactMph >= threshold) {
    applySceneryArmorDamage(duel, actor, impactMph);
    if (player && !actor.combatWrecking) duel._scrape(zone, impactMph);
  } else if (player && duel.state.invulnerableSec <= 0 && duel.state.impactTimer <= 0 && impactMph > 4) duel._scrape(zone, impactMph);
  duel.emit({scablandsHit: {kind: 'climb', impactMph, player, cue: 'world.ground.scab-plates'}});
}

// Only x and z are needed here. Read the same sampled frame as Course.worldAt, without making a frame or a position on each step.
function groundPoint(course, s, lateral, out) {
  if (!course.def?.scablands || Object.hasOwn(course, 'at') || !course.samples) return course.worldAt(s, lateral);
  const phase = course.phase(s), index = Math.min(course.samples.length - 2, Math.floor(phase / course.step));
  const a = course.samples[index], b = course.samples[index + 1], t = (phase - a.s) / course.step;
  const heading = a.heading + (b.heading - a.heading) * t;
  out.x = a.x + (b.x - a.x) * t + Math.cos(heading) * lateral;
  out.z = a.z + (b.z - a.z) * t - Math.sin(heading) * lateral;
  return out;
}

// After a step's move and before its flight: the slope's pull on the car's speed, and the refusal of a step up ground too steep to grip.
export function scablandsGround(duel, actor, dt) {
  if (actor.airborne || actor.tumble || actor.crushed || actor.combatWrecking || actor.knock) return;
  const course = duel.course, oldS = actor.prevS, oldLateral = actor.prevLateral;
  if (!Number.isFinite(oldS) || !Number.isFinite(oldLateral)) return;
  const scratch = duel._scablandsGroundScratch ??= {from: {}, to: {}, put: {}, point: {}, slope: {capability: GROUND.slope}};
  const from = groundPoint(course, oldS, oldLateral, scratch.from), to = groundPoint(course, actor.s, actor.lateral, scratch.to);
  const dx = to.x - from.x, dz = to.z - from.z, distance = Math.hypot(dx, dz);
  if (distance < 1e-4) return;
  // Use the same floor as vehicle support when this course has a trial tube.
  const actorHeight = actor.groundHeight ?? actor._jumpY;
  const height = course.groundTunnels && Number.isFinite(actorHeight)
    ? (x, z) => course.groundTunnels.groundAt({x, y: actorHeight, z}, actorHeight, scablandsSurfaceHeightAt(x, z))
    : scablandsSurfaceHeightAt;
  const gain = height(to.x, to.z) - height(from.x, from.z);
  const kmh = Math.abs(actor.speedMph || 0) * MPH_TO_KMH, ledges = ledgeAt(to.x, to.z);
  const limit = climbLimit(kmh, ledges);
  if (gain > 0 && gain / distance > limit) {
    // Ground too steep to grip: the car is stopped at its foot and pushed back down it. The face's own normal is the way the ground falls.
    const e = 1.5, gx = (height(to.x + e, to.z) - height(to.x - e, to.z)) / (2 * e), gz = (height(to.x, to.z + e) - height(to.x, to.z - e)) / (2 * e);
    const length = Math.hypot(gx, gz) || 1, nx = -gx / length, nz = -gz / length;
    const dirX = dx / distance, dirZ = dz / distance, incoming = Math.max(0, -(dirX * nx + dirZ * nz));
    const impactMph = Math.abs(actor.speedMph || 0) * incoming;
    // Stay at the foot, keep the part of the move that runs along the face, and be pushed back a little down it.
    const along = dx * nx + dz * nz;
    scratch.point.x = from.x + dx - nx * along + nx * GROUND.pushBack * incoming;
    scratch.point.z = from.z + dz - nz * along + nz * GROUND.pushBack * incoming;
    const pose = duel._roadPosition(scratch.point, actor.s);
    if (Number.isFinite(pose.s) && Number.isFinite(pose.lateral)) { actor.s = pose.s; actor.lateral = pose.lateral; }
    // The car stands on the ground where it was put, with none of the upward speed it had: the flight rules (`_jump`) must not read the move back down the face
    // as the ground falling away from a car still rising.
    const put = groundPoint(course, actor.s, actor.lateral, scratch.put);
    actor._jumpY = height(put.x, put.z); actor._verticalSpeed = 0;
    actor.pushVelocity = (actor.pushVelocity || 0) * .25;
    actor.speedMph *= Math.max(.08, 1 - incoming * .94);
    if (impactMph > 3) hitGround(duel, actor, impactMph, nx, nz);
    return;
  }
  // A slope pulls a car down it and holds it back going up, by the rule the courses' climbing cars have (slopeSpeedDelta); on the Steps' ledges
  // (cut for wheels) it pulls a quarter as much.
  if (actor.speedMph) {
    scratch.slope.gain = gain; scratch.slope.distance = distance; scratch.slope.dt = dt;
    const delta = slopeSpeedDelta(scratch.slope) * (ledges ? GROUND.ledgeSlopeShare : 1);
    if (delta) actor.speedMph = Math.sign(actor.speedMph) * Math.max(0, Math.abs(actor.speedMph) + delta);
  }
}

// After a step's flight: a car that has just landed takes a hit sized by its fall. `_jump` leaves the closing speed at the ground in
// `_scablandsLanding` (metres a second) on the step it lands, and nothing otherwise.
export function scablandsLanded(duel, actor) {
  const closing = actor._scablandsLanding;
  if (closing == null) return;
  actor._scablandsLanding = null;
  const drop = dropFor(closing), hit = fallHit(drop);
  if (!(hit.kmh > 0)) return;
  const player = actor === duel.state;
  // The speed it sheds: a third of a km/h for each km/h of the hit, at most three quarters of what it had.
  const speed = Math.abs(actor.speedMph || 0), shed = Math.min(speed * .75, hit.kmh / MPH_TO_KMH * .35);
  actor.speedMph = Math.sign(actor.speedMph || 1) * Math.max(0, speed - shed);
  // The ember reads this through the step's own speed loss (src/arena/modes/world-job.js): a fall puts out as much as the drop gives, at any speed.
  if (player) duel.state.scablandsHitKmh = (duel.state.scablandsHitKmh || 0) + hit.kmh;
  if (combatArmorEnabled(duel) && (player || duel.state.opponents.includes(actor)) && !actor.combatWrecking && Number.isFinite(actor.maxArmor)) {
    // Never the last of the armour: a fall cannot end a job by itself.
    const amount = Math.min(hit.armorShare * actor.maxArmor, Math.max(0, (actor.armor ?? 0) - 1));
    if (amount > 0) applyArmorDamage(duel, actor, 'fixed', {amount});
  }
  if (player) {
    duel._scrape('front', Math.min(100, hit.kmh));
    if (drop >= 2) duel._callout('HARD LANDING', 1.2);
  }
  duel.emit({scablandsHit: {kind: 'fall', drop, kmh: hit.kmh, player, cue: 'vehicle.landing'}});
}
