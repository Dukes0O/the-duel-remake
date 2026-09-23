import {WEAPONS, COMBAT_TUNING} from './wasteland-tuning.js';
import {burst} from './combat-weapons.js';

const T = COMBAT_TUNING;

export function cpuPickupCharges(state, combat, actor) {
  if (actor === state.rival) return combat.cpuPickupCharges;
  return actor.cpuPickupCharges ??= {bomb: 0, crossbow: 0, star: 0};
}

function cpuCanUsePickup(state, combat, actor, pickup) {
  return state.cpuDifficulty !== 'easy' && pickup.weapon !== 'ufo' &&
    (cpuPickupCharges(state, combat, actor)?.[pickup.weapon] ?? 0) < T.pickup.chargeLimit;
}

function crossesPickup(actor, pickup) {
  const start = actor.prevS ?? actor.s;
  const delta = actor.s - start;
  const fraction = delta ? Math.max(0, Math.min(1, (pickup.s - start) / delta)) : 1;
  const lateral = (actor.prevLateral ?? actor.lateral) +
    (actor.lateral - (actor.prevLateral ?? actor.lateral)) * fraction;
  return (Math.abs(actor.s - pickup.s) < T.pickup.contactDistance ||
    (delta > 0 && start <= pickup.s && actor.s >= pickup.s)) &&
    Math.abs(lateral) < T.pickup.lateralClearance &&
    (actor.airHeight || 0) < T.pickup.airClearance &&
    (actor.impactTimer || 0) <= 0;
}

export function stepPickups(duel, dt) {
  const state = duel.state;
  const combat = state.combat;
  combat.pickupTimer -= dt;
  if (combat.pickupTimer <= 0) {
    const count = combat.pickupCount++;
    const where = state.s + T.pickup.frontDistance +
      T.pickup.frontStep * (count % T.pickup.frontCycle);
    combat.pickupTimer = T.pickup.interval +
      T.pickup.intervalStep * (count % T.pickup.cycle);
    if (where < duel.raceLength - T.pickup.finishMargin &&
        combat.pickups.length < T.pickup.limit) {
      combat.pickups.push({s: where, weapon: Object.keys(WEAPONS)[count % T.pickup.cycle], age: 0});
    }
  }

  combat.pickups = combat.pickups.filter(pickup => {
    pickup.age += dt;
    if (crossesPickup(state, pickup)) {
      combat.cooldowns[pickup.weapon] = 0;
      burst(combat, duel.course.groundAt(pickup.s, 0), 'star');
      duel._callout(`${WEAPONS[pickup.weapon].name} / POWER-UP READY`, T.pickup.calloutSeconds);
      duel.emit({powerupCollected: pickup.weapon});
      return false;
    }

    for (const opponent of state.opponents) {
      if (!cpuCanUsePickup(state, combat, opponent, pickup) || opponent.finished ||
          opponent.crushed || !crossesPickup(opponent, pickup)) continue;
      cpuPickupCharges(state, combat, opponent)[pickup.weapon]++;
      burst(combat, duel.course.groundAt(pickup.s, 0), 'star');
      duel._callout(`RIVAL / ${WEAPONS[pickup.weapon].name} PICKUP`, T.pickup.calloutSeconds);
      duel.emit({powerupCollected: pickup.weapon, collector: 'rival'});
      return false;
    }

    const rivalCanClaim = state.opponents.some(opponent =>
      cpuCanUsePickup(state, combat, opponent, pickup) && !opponent.finished &&
      !opponent.crushed && pickup.s > opponent.s - T.pickup.retentionBehind);
    return pickup.age < T.pickup.lifetime &&
      (pickup.s > state.s - T.pickup.retentionBehind || rivalCanClaim);
  });
}
