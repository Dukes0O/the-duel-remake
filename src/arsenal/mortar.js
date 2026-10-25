import {point, predictedPoint, burst} from '../combat-actors.js';
import {hostile, outOfPlay, combatOwnerId} from '../combat-teams.js';
import {applyArmorDamage} from '../combat-armor.js';
import {COMBAT_TUNING} from '../wasteland-tuning.js';
import {targetFor, targetIdentity, actorForTarget} from './targeting.js';
import {setCarMortarHop} from './car-effects.js';
import {isConvoyRig} from '../arena/modes/convoy-raid.js';
import {convoyBlastDistance} from '../arena/convoy.js';

export const MORTAR_RULES = Object.freeze({
  flightSec: 1.6, radius: 3, damage: 25, hopMps: 3,
  cpuMinimum: 40, cpuMaximum: 200, limit: 24,
});
const EPS = 1e-9;

function ahead(duel, owner, actor) {
  const at = point(duel, owner), to = point(duel, actor);
  const heading = at.heading + (owner.headingError || 0);
  return (to.x - at.x) * Math.sin(heading) + (to.z - at.z) * Math.cos(heading);
}
function target(duel, owner, computer = false) {
  const candidates = [duel.state, ...duel.state.opponents].filter(actor =>
    !actor.decoy && hostile(duel, owner, actor) && !outOfPlay(duel, actor));
  if (computer) candidates.sort((a, b) => {
    const score = actor => duel.state.arena
      ? duel.state.arena.participants.find(p => p.id === targetIdentity(duel, actor))?.wrecks || 0
      : (actor.completedLaps || 0) * duel.course.length + actor.s;
    return score(b) - score(a);
  });
  else {
    const at = point(duel, owner);
    const distance = actor => {
      const to = point(duel, actor);
      return Math.hypot(to.x - at.x, to.z - at.z);
    };
    candidates.sort((a, b) => distance(a) - distance(b));
  }
  const chosen = computer ? candidates[0] : candidates.find(actor => ahead(duel, owner, actor) > 0);
  if (!chosen) return null;
  const gap = ahead(duel, owner, chosen);
  if (!(gap > 0) || computer && (gap < MORTAR_RULES.cpuMinimum || gap > MORTAR_RULES.cpuMaximum)) return null;
  return targetFor(duel, owner, {lockedTargetId: targetIdentity(duel, chosen),
    range: computer ? MORTAR_RULES.cpuMaximum : Infinity});
}
export function shouldUseMortar(duel, owner) { return !!target(duel, owner, true); }
export function launchMortar(duel, owner, level = 0) {
  const combat = duel.state.combat, enemy = owner !== duel.state;
  if (!combat || outOfPlay(duel, owner)) return null;
  const victim = target(duel, owner, enemy);
  if (!victim || (combat.mortarShells?.length || 0) >= MORTAR_RULES.limit) return null;
  const at = point(duel, owner), landing = predictedPoint(duel, victim, MORTAR_RULES.flightSec);
  const shell = {id: ++combat.serial, ownerId: targetIdentity(duel, owner),
    damageOwnerId: combatOwnerId(duel, owner), targetId: targetIdentity(duel, victim),
    ...landing, from: {x: at.x, y: at.y, z: at.z}, age: 0,
    lifetime: MORTAR_RULES.flightSec, radius: MORTAR_RULES.radius, level};
  (combat.mortarShells ||= []).push(shell);
  duel.emit({arsenalCue: 'weapon.mortar.fire', actor: owner, shell, hitPosition: at});
  duel.emit({arsenalCue: 'weapon.mortar.whistle', actor: owner, shell, hitPosition: at});
  return shell;
}
export function stepMortars(duel, dt) {
  const combat = duel.state.combat;
  if (!combat?.mortarShells?.length || !(dt > 0)) return;
  for (const shell of [...combat.mortarShells]) {
    shell.age += dt;
    if (shell.age + EPS < shell.lifetime) continue;
    const owner = actorForTarget(duel, shell.ownerId);
    for (const actor of [duel.state, ...duel.state.opponents]) {
      if (!owner || !hostile(duel, owner, actor) || outOfPlay(duel, actor)) continue;
      const at = point(duel, actor), rig = isConvoyRig(duel, actor);
      const distance = rig ? convoyBlastDistance(duel, actor, shell) :
        Math.hypot(at.x - shell.x, at.z - shell.z);
      const share = Math.max(0, 1 - distance / shell.radius);
      if (!(share > 0)) continue;
      const removed = applyArmorDamage(duel, actor, 'fixed', {
        owner: shell.damageOwnerId, amount: MORTAR_RULES.damage * share,
        hitPosition: shell, blastRadius: shell.radius,
        damageMultiplier: 1 + Math.max(0, Math.min(3, shell.level)) * COMBAT_TUNING.armor.upgradePerLevel});
      if (removed > 0 && !rig && !actor.drone && !actor.combatWrecking) {
        actor._ramVerticalSpeed = Math.max(actor._ramVerticalSpeed || 0, MORTAR_RULES.hopMps * share);
        setCarMortarHop(actor, true);
        actor.airborne = true;
        actor.airHeight = Math.max(actor.airHeight || 0, .02);
        duel.emit({combatHit: true, strength: removed / 60, enemy: owner !== duel.state,
          victim: actor === duel.state ? 'player' : 'rival', hitPosition: at});
      }
    }
    burst(combat, shell, 'blast');
    duel.emit({arsenalCue: 'weapon.mortar.hit', shell, hitPosition: shell});
  }
  combat.mortarShells = combat.mortarShells.filter(shell => shell.age + EPS < shell.lifetime);
}
