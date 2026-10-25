import {point} from '../combat-actors.js';
import {hostile, outOfPlay} from '../combat-teams.js';
import {targetIdentity, actorForTarget} from './targeting.js';
import {setCarEffect, carEffect} from './car-effects.js';
import {COMBAT_TUNING} from '../wasteland-tuning.js';

export const NITRO_RULES = Object.freeze({duration: 3, topSpeed: 1.35,
  acceleration: 1.35, ramMultiplier: 3, cpuRange: 40});
export function shouldUseNitroRam(duel, owner) {
  if (duel.state.cpuDifficulty !== 'hard' || outOfPlay(duel, owner)) return false;
  const at = point(duel, owner), heading = at.heading + (owner.headingError || 0);
  return [duel.state, ...duel.state.opponents].some(actor => {
    if (actor.decoy || !hostile(duel, owner, actor) || outOfPlay(duel, actor)) return false;
    const to = point(duel, actor), dx = to.x - at.x, dz = to.z - at.z;
    const forward = dx * Math.sin(heading) + dz * Math.cos(heading);
    const across = dx * Math.cos(heading) - dz * Math.sin(heading);
    return forward > 0 && forward <= NITRO_RULES.cpuRange &&
      Math.abs(across) <= duel._vehicleSpec(actor).halfWidth + duel._vehicleSpec(owner).halfWidth;
  });
}
export function startNitroRam(duel, owner, level = 0) {
  const combat = duel.state.combat;
  if (!combat || outOfPlay(duel, owner) || carEffect(owner, 'nitro')) return null;
  const effect = setCarEffect(owner, 'nitro', {duration: NITRO_RULES.duration,
    topSpeed: NITRO_RULES.topSpeed, acceleration: NITRO_RULES.acceleration,
    ramMultiplier: NITRO_RULES.ramMultiplier *
      (1 + Math.max(0, Math.min(3, level)) * COMBAT_TUNING.armor.upgradePerLevel)});
  const run = {ownerId: targetIdentity(duel, owner), effect, age: 0};
  (combat.nitroRuns ||= []).push(run);
  const at = point(duel, owner);
  duel.emit({arsenalCue: 'weapon.nitro.start', actor: owner, nitro: run, hitPosition: at});
  duel.emit({arsenalCue: 'weapon.nitro.loop', actor: owner, nitro: run, hitPosition: at});
  return effect;
}
export function stepNitroRuns(duel, dt) {
  const combat = duel.state.combat;
  if (!combat?.nitroRuns?.length) return;
  combat.nitroRuns = combat.nitroRuns.filter(run => {
    run.age += dt;
    const owner = actorForTarget(duel, run.ownerId);
    return owner && !outOfPlay(duel, owner) && carEffect(owner, 'nitro') === run.effect;
  });
}
