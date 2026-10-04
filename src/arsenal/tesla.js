import {point} from '../combat-weapons.js';
import {hostile, outOfPlay} from '../combat-teams.js';
import {actorForTarget, targetIdentity} from './targeting.js';
import {setCarEffect} from './car-effects.js';
import {endScrapMagnet} from './magnet.js';
import {burstDrone} from './decoy-drone.js';

export const TESLA_RULES = Object.freeze({tellSec: .4, radius: 15, disabledSec: 3,
  cpuRange: 12, pulseSec: .35});
const EPS = 1e-9;
export function shouldUseTesla(duel, owner) {
  const at = point(duel, owner);
  return [duel.state, ...duel.state.opponents].some(actor =>
    hostile(duel, owner, actor) && !outOfPlay(duel, actor) &&
    Math.hypot(point(duel, actor).x - at.x, point(duel, actor).z - at.z) <= TESLA_RULES.cpuRange + EPS);
}
export function startTeslaCharge(duel, owner) {
  const combat = duel.state.combat;
  if (!combat || outOfPlay(duel, owner)) return null;
  const ownerId = targetIdentity(duel, owner);
  if (combat.teslaCharges?.some(charge => charge.ownerId === ownerId)) return null;
  const charge = {id: ++combat.serial, ownerId, age: 0, lifetime: TESLA_RULES.tellSec};
  (combat.teslaCharges ||= []).push(charge);
  duel.emit({arsenalCue: 'weapon.tesla.charge', actor: owner, charge, hitPosition: point(duel, owner)});
  return charge;
}
function consumeStar(duel, actor) {
  const combat = duel.state.combat;
  const key = actor === duel.state ? 'shield' : actor === duel.state.rival ? 'rivalShield' : null;
  const remaining = key ? combat[key] : actor.combatShield;
  if (!(remaining > 0)) return false;
  if (key) combat[key] = 0;
  else actor.combatShield = 0;
  if (actor === duel.state) actor.invulnerableSec = Math.max(0, (actor.invulnerableSec || 0) - remaining);
  return true;
}
export function stepTeslaCharges(duel, dt) {
  const combat = duel.state.combat;
  if (!combat || !(dt > 0)) return;
  if (combat.teslaPulses) combat.teslaPulses = combat.teslaPulses.filter(pulse =>
    (pulse.age += dt) < pulse.lifetime);
  if (!combat.teslaCharges?.length) return;
  for (const charge of combat.teslaCharges) {
    charge.age += dt;
    if (charge.age + EPS < charge.lifetime) continue;
    const owner = actorForTarget(duel, charge.ownerId);
    if (!owner || outOfPlay(duel, owner)) continue;
    const at = point(duel, owner);
    for (const actor of [duel.state, ...duel.state.opponents]) {
      if (!hostile(duel, owner, actor) || outOfPlay(duel, actor)) continue;
      const to = point(duel, actor);
      if (Math.hypot(to.x - at.x, to.z - at.z) > TESLA_RULES.radius + EPS) continue;
      if (actor.decoy) {
        if (!burstDrone(duel, actor)) actor.armor = Math.max(0, actor.armor - 1);
        continue;
      }
      endScrapMagnet(duel, actor);
      if (consumeStar(duel, actor)) continue;
      setCarEffect(actor, 'disabled', {duration: TESLA_RULES.disabledSec});
      actor.boosting = false;
    }
    const pulse = {...at, ownerId: charge.ownerId, radius: TESLA_RULES.radius,
      age: 0, lifetime: TESLA_RULES.pulseSec};
    (combat.teslaPulses ||= []).push(pulse);
    duel.emit({arsenalCue: 'weapon.tesla.pulse', actor: owner, pulse, hitPosition: at});
  }
  combat.teslaCharges = combat.teslaCharges.filter(charge =>
    charge.age + EPS < charge.lifetime && !outOfPlay(duel, actorForTarget(duel, charge.ownerId)));
}
