import {point} from '../combat-weapons.js';
import {arenaTargetOf, hostile, outOfPlay} from '../combat-teams.js';
import {segmentCircle} from '../collision.js';
import {hazardsFor} from './hazards.js';

// Keep the established brain choice and ordinary player/CPU target selection.
function nativeTarget(duel, attacker) {
  const state = duel.state;
  if (!attacker || outOfPlay(duel, attacker)) return null;
  if (attacker !== state) return state.arena ? arenaTargetOf(duel, attacker)
    : !outOfPlay(duel, state) && hostile(duel, attacker, state) ? state : null;
  return (state.opponents || []).filter(actor => !outOfPlay(duel, actor) && hostile(duel, attacker, actor))
    .reduce((closest, actor) => !closest ||
      Math.abs(duel.relativeS(actor.s, state.s) - state.s) <
      Math.abs(duel.relativeS(closest.s, state.s) - state.s) ? actor : closest, null);
}

export function targetFor(duel, attacker) {
  const target = nativeTarget(duel, attacker);
  if (!target) return null;
  const from = point(duel, attacker), to = point(duel, target);
  const blocked = hazardsFor(duel).some(hazard => hazard.kind === 'smoke' &&
    hazard.opacity > 0 && hazard.age < hazard.lifetime &&
    segmentCircle(from.x, from.z, to.x, to.z, hazard.x, hazard.z, hazard.radius));
  return blocked ? null : target;
}

// Rear-deploy decisions use real world distances and the current native teams.
// Oil's lane test uses course lateral positions, so bends do not invent lanes.
export function enemiesBehind(duel, owner, range, sameLane = false) {
  if (!owner || outOfPlay(duel, owner)) return [];
  const state = duel.state, at = point(duel, owner);
  const heading = at.heading + (owner.headingError || 0);
  return [state, ...(state.opponents || [])].filter(actor => {
    if (!hostile(duel, owner, actor) || outOfPlay(duel, actor)) return false;
    const there = point(duel, actor), dx = there.x - at.x, dz = there.z - at.z;
    if (Math.hypot(dx, dz) > range || dx * Math.sin(heading) + dz * Math.cos(heading) >= 0) return false;
    if (!sameLane) return true;
    return Math.abs(actor.lateral - owner.lateral) <=
      duel._vehicleSpec(actor).halfWidth + duel._vehicleSpec(owner).halfWidth;
  });
}
