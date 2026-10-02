import {DRIVE} from '../config.js';
import {sweepObstacle} from '../collision.js';
import {wrapHeading} from '../offroad-physics.js';
import {actorBody, bodyHeading, resolveCarCrash, startKnock, stepKnock} from '../vehicle-knock.js';
import {containInArena} from './arena-floor.js';
import {spawnSlots} from './venues.js';

// Round-owned cover uses the same rigid-body bridge as cars. It has no
// driver, armor, wreck timer or reward for sliding. Only Titan crush pays.
export function arenaJunkSpec(prop) {
  return {mass: 2175, halfWidth: prop.halfX, halfLength: prop.halfZ, height: prop.height};
}

export function initializeArenaJunk(duel) {
  duel._arenaJunkContacts = new Set();
  for (const prop of duel.course.features.crushables || []) {
    if (prop.kind !== 'junkCar') continue;
    Object.assign(prop, {lateral: prop.off, prevS: prop.s, prevLateral: prop.off,
      headingError: wrapHeading(prop.heading - duel.course.at(prop.s).heading),
      speedMph: 0, pushVelocity: 0, airHeight: 0, prevAirHeight: 0,
      airborne: false, knock: null});
  }
}

function syncPose(duel, prop) {
  const at = duel.course.groundAt(prop.s, prop.lateral);
  prop.x = at.x; prop.y = at.y; prop.z = at.z; prop.off = prop.lateral;
  prop.heading = bodyHeading(duel, prop);
}

function groundedKnock(duel, prop, after, severity) {
  startKnock(prop, {vx: after.vx, vz: after.vz, spin: after.spin,
    severity, heading: bodyHeading(duel, prop), arenaShove: true});
  prop.airHeight = prop.prevAirHeight = 0; prop.airborne = false;
}

function stopAtContact(duel, actor, start, end, hit) {
  const pose = duel._roadPosition({
    x: start.x + (end.x - start.x) * hit.t + hit.nx * (hit.penetration + .01),
    z: start.z + (end.z - start.z) * hit.t + hit.nz * (hit.penetration + .01),
  }, actor.s);
  actor.s = pose.s; actor.lateral = pose.lateral;
}

// Called by the native crush dispatcher after its existing vertical test.
// A continuing touch has one impulse; separation admits a fresh hit.
export function contactArenaJunk(duel, actor, prop, hit, start, end) {
  const key = (actor === duel.state ? 'player' : actor.arenaId) + '/' + prop.id;
  const incidents = duel._arenaJunkContacts;
  if (!hit) {incidents.delete(key); return;}
  stopAtContact(duel, actor, start, end, hit);
  if (incidents.has(key)) return;
  const before = actorBody(duel, actor);
  const crash = resolveCarCrash(duel, actor, prop, {forceKnock: true,
    playerKnockMinDvMph: Infinity, attackerKeepsControl: true});
  if (!(crash.result.closingMps > 0)) return;
  incidents.add(key);
  groundedKnock(duel, prop, crash.result.b, crash.severityB);
  // The existing spatial crash cue accompanies a new real ram. Sliding
  // contacts never enter combat armor damage or count as participant wrecks.
  if (actor === duel.state && Math.hypot(before.vx, before.vz) > DRIVE.mphToWorld)
    duel.emit({vehicleSmash: {severity: crash.severityB, dvMph: crash.result.b.dvMph,
      point: crash.result.point, traffic: false, actor: prop, zone: 'front'}});
}

export function stepArenaJunk(duel, dt) {
  const props = duel.course.features.crushables || [];
  let moved = false;
  for (const prop of props) {
    if (prop.kind !== 'junkCar') continue;
    if (prop.knock) {
      const fromS = prop.s, fromLateral = prop.lateral;
      stepKnock(duel, prop, dt);
      containInArena(duel, prop, dt);
      if (!prop.knock) prop.speedMph = prop.pushVelocity = 0;
      syncPose(duel, prop);
      moved ||= prop.s !== fromS || prop.lateral !== fromLateral;
    } else {prop.prevS = prop.s; prop.prevLateral = prop.lateral;}
  }
  for (let i = 0; i < props.length; i++) for (let j = i + 1; j < props.length; j++) {
    const a = props[i], b = props[j];
    if (a.kind !== 'junkCar' || b.kind !== 'junkCar' ||
        duel.state.crushedProps.includes(a.id) || duel.state.crushedProps.includes(b.id)) continue;
    const key = a.id + '/' + b.id;
    const start = duel.course.worldAt(a.prevS, a.prevLateral);
    const end = duel.course.worldAt(a.s, a.lateral);
    const hit = sweepObstacle(start, end, b, bodyHeading(duel, a), arenaJunkSpec(a));
    if (!hit) {duel._arenaJunkContacts.delete(key); continue;}
    if (!a.knock && !b.knock || duel._arenaJunkContacts.has(key)) continue;
    const fromS = a.s, fromLateral = a.lateral;
    stopAtContact(duel, a, start, end, hit);
    moved ||= a.s !== fromS || a.lateral !== fromLateral;
    const crash = resolveCarCrash(duel, a, b, {forceKnock: true});
    if (crash.result.closingMps > 0) {
      duel._arenaJunkContacts.add(key);
      groundedKnock(duel, a, crash.result.a, crash.severityA);
      groundedKnock(duel, b, crash.result.b, crash.severityB);
    }
    containInArena(duel, a, 0); containInArena(duel, b, 0);
    syncPose(duel, a); syncPose(duel, b);
  }
  // Use the existing venue chooser against current cover. Slot identities
  // remain stable; Fuel depots are independent copied positions from setup.
  if (moved) duel.state.arena.spawnSlots = spawnSlots(duel.course);
}
