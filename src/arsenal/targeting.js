import {point} from '../combat-weapons.js';
import {arenaTargetOf, arenaTargetOutOfPlay, arenaParticipant, hostile, outOfPlay} from '../combat-teams.js';
import {segmentCircle} from '../collision.js';
import {hazardsFor} from './hazards.js';

export function targetIdentity(duel, actor) {
  return actor === duel.state ? 'player' : actor?.decoy ? actor.id :
    actor?.arenaId || 'cpu:' + duel.state.opponents.indexOf(actor);
}

export function actorForTarget(duel, id) {
  return [duel.state, ...(duel.state.opponents || [])]
    .find(actor => targetIdentity(duel, actor) === id) || null;
}

function sightlinePoint(duel, actor) {
  const state = duel.state;
  return actor === state && state.onFoot && state.fighter ? state.fighter : point(duel, actor);
}

function nativeTarget(duel, attacker) {
  const state = duel.state;
  if (!attacker || outOfPlay(duel, attacker)) return null;
  if (attacker !== state) return state.arena ? arenaTargetOf(duel, attacker)
    : !outOfPlay(duel, state) && hostile(duel, attacker, state) ? state : null;
  return (state.opponents || []).filter(actor => !actor.decoy &&
    !outOfPlay(duel, actor) && hostile(duel, attacker, actor))
    .reduce((closest, actor) => !closest ||
      Math.abs(duel.relativeS(actor.s, state.s) - state.s) <
      Math.abs(duel.relativeS(closest.s, state.s) - state.s) ? actor : closest, null);
}

function smokeBlocks(duel, from, to) {
  return hazardsFor(duel).some(hazard => hazard.kind === 'smoke' &&
    hazard.opacity > 0 && hazard.age < hazard.lifetime &&
    segmentCircle(from.x, from.z, to.x, to.z, hazard.x, hazard.z, hazard.radius));
}

/** A caller supplies numeric or candidate reach and current origin; locks keep identity. */
export function targetFor(duel, attacker, context = {}) {
  if (!attacker || outOfPlay(duel, attacker)) return null;
  const from = context.origin || sightlinePoint(duel, attacker);
  const within = actor => {
    const requested = typeof context.rangeForTarget === 'function'
      ? context.rangeForTarget(actor) : context.range;
    const range = Number.isFinite(requested) ? Math.max(0, requested) : Infinity;
    const at = sightlinePoint(duel, actor);
    return Math.hypot(at.x - from.x, at.z - from.z) <= range;
  };
  let target = context.lockedTargetId != null
    ? actorForTarget(duel, context.lockedTargetId) : nativeTarget(duel, attacker);
  if (target && (target.decoy || arenaTargetOutOfPlay(duel, target) ||
      !hostile(duel, attacker, target) || !within(target))) target = null;
  const decoys = (duel.state.opponents || []).filter(actor => {
    const participant = arenaParticipant(duel, actor);
    const owner = actorForTarget(duel, actor.ownerId);
    return actor.decoy === true && actor.active === true &&
      Number.isFinite(actor.expiresAt) && actor.expiresAt > duel.state.stageTimeSec &&
      !outOfPlay(duel, actor) && owner && hostile(duel, attacker, owner) &&
      (!participant || participant.decoy === true && participant.active === true &&
        participant.expiresAt > duel.state.stageTimeSec) && within(actor);
  });
  decoys.sort((a, b) => {
    const distance = actor => {
      const at = sightlinePoint(duel, actor);
      return Math.hypot(at.x - from.x, at.z - from.z);
    };
    return distance(a) - distance(b);
  });
  target = decoys[0] || target;
  return target && !smokeBlocks(duel, from, sightlinePoint(duel, target)) ? target : null;
}

export function enemiesBehind(duel, owner, range, sameLane = false) {
  if (!owner || outOfPlay(duel, owner)) return [];
  const state = duel.state, at = point(duel, owner);
  const heading = at.heading + (owner.headingError || 0);
  return [state, ...(state.opponents || [])].filter(actor => {
    if (actor.decoy || !hostile(duel, owner, actor) || outOfPlay(duel, actor)) return false;
    const there = point(duel, actor), dx = there.x - at.x, dz = there.z - at.z;
    if (Math.hypot(dx, dz) > range || dx*Math.sin(heading) + dz*Math.cos(heading) >= 0) return false;
    return !sameLane || Math.abs(actor.lateral - owner.lateral) <=
      duel._vehicleSpec(actor).halfWidth + duel._vehicleSpec(owner).halfWidth;
  });
}
