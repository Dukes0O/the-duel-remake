import {WEAPONS, COMBAT_TUNING} from './wasteland-tuning.js';
import {burst} from './combat-weapons.js';
import {combatArmorEnabled} from './combat-armor.js';
import {makeRng} from './rng.js';

const T = COMBAT_TUNING;
const LANES = [-2.2, 0, 2.2];
const WEAPON_CRATES = ['bomb', 'crossbow', 'star', 'ufo'];

export function cpuPickupCharges(state, combat, actor) {
  if (actor === state.rival) return combat.cpuPickupCharges;
  return actor.cpuPickupCharges ??= {bomb: 0, crossbow: 0, star: 0, ufo: 0};
}

// The complete plan is fixed before any car reaches a crate. Speed, frame
// rate, and CPU update order cannot change its identity or road position.
export function buildSeededPickupPlan(duel) {
  const state = duel.state;
  const laps = Math.max(1, state.lapsTotal || duel.course.def.laps || 1);
  const plannedLaps = Math.min(laps, T.pickup.maxSeededCrates);
  const perLap = Math.min(3, Math.floor(T.pickup.maxSeededCrates / plannedLaps));
  const plan = [];
  for (let lap = 0; lap < plannedLaps; lap++) {
    const rng = makeRng((duel.seed ^ Math.imul((state.stageIndex + 1), T.pickup.stageSalt) ^
      Math.imul((lap + 1), T.pickup.lapSalt)) >>> 0);
    for (let slot = 0; slot < perLap; slot++) {
      const fraction = T.pickup.seedFractions[slot] + rng.range(-T.pickup.seedJitter, T.pickup.seedJitter);
      const s = lap * duel.course.length + fraction * duel.course.length;
      const laneOrder = slot === 1 ? [-2.2, -1.5, 0] :
        slot === 2 ? [2.2, 1.5, 0] : [rng.pick(LANES), ...LANES];
      const carWidthMargin = duel.course.roadHalfWidthAt(s) - T.pickup.roadEdgeMargin;
      const lateral = laneOrder.find(value => Math.abs(value) <= carWidthMargin &&
        duel._surface(s, value).road) ?? 0;
      const kind = slot === 0 ? 'armor' : 'weapon';
      const weapon = kind === 'weapon' ? rng.pick(WEAPON_CRATES) : undefined;
      plan.push({id: `pickup-${lap}-${slot}`, lap, s, lateral, kind, ...(weapon ? {weapon} : {}), age: 0});
    }
  }
  return plan;
}

// A future on-foot crate can call this bounded inventory operation. No ammo
// crate is placed until the on-foot actor and its inventory are implemented.
export function applyAmmoPickup(inventory, ammoType, amount, capacity) {
  if (!inventory || !ammoType || !Number.isFinite(amount) || !Number.isFinite(capacity)) return 0;
  const before = Number.isFinite(inventory[ammoType]) ? Math.max(0, inventory[ammoType]) : 0;
  const after = Math.max(before,
    Math.min(Math.max(0, capacity), before + Math.max(0, amount)));
  inventory[ammoType] = after;
  return after - before;
}

export function sweptPickupFraction(actor, pickup) {
  if (actor.combatWrecking || actor.finished || actor.crushed ||
      (actor.impactTimer || 0) > 0 || (actor.airHeight || 0) >= T.pickup.airClearance) return null;
  const startS = actor.prevS ?? actor.s;
  const startLateral = actor.prevLateral ?? actor.lateral;
  const ds = actor.s - startS;
  if (ds < 0) return null;
  const roadLow = ds ? (pickup.s - T.pickup.contactDistance - startS) / ds : 0;
  const roadHigh = ds ? (pickup.s + T.pickup.contactDistance - startS) / ds : 1;
  if (!ds && Math.abs(startS - pickup.s) > T.pickup.contactDistance) return null;
  const dl = actor.lateral - startLateral;
  const targetLateral = pickup.lateral ?? 0;
  if (!dl && Math.abs(startLateral - targetLateral) > T.pickup.lateralClearance)
    return null;
  const lateralA = dl ? (targetLateral - T.pickup.lateralClearance - startLateral) / dl : 0;
  const lateralB = dl ? (targetLateral + T.pickup.lateralClearance - startLateral) / dl : 1;
  const first = Math.max(0, roadLow, Math.min(lateralA, lateralB));
  const last = Math.min(1, roadHigh, Math.max(lateralA, lateralB));
  return first <= last ? first : null;
}

function canCollectSeeded(state, combat, actor, pickup, index) {
  if (index >= 0 && state.cpuDifficulty === 'easy') return false;
  if (pickup.kind === 'armor') return Number.isFinite(actor.armor) &&
    Number.isFinite(actor.maxArmor) && actor.armor < actor.maxArmor;
  if (pickup.kind !== 'weapon' || !WEAPONS[pickup.weapon]) return false;
  if (index === -1) return combat.cooldowns[pickup.weapon] > 0 &&
    !(pickup.weapon === 'ufo' && combat.ufoUsedLaps[state.completedLaps]);
  return cpuCanUsePickup(state, combat, actor, pickup);
}

function collectSeeded(duel, pickup, actor, index) {
  const state = duel.state;
  const combat = state.combat;
  let amount = 0;
  if (pickup.kind === 'armor') {
    const before = actor.armor;
    actor.armor = Math.min(actor.maxArmor, actor.armor + T.pickup.armorRepair);
    amount = actor.armor - before;
  } else if (index === -1) {
    amount = combat.cooldowns[pickup.weapon];
    combat.cooldowns[pickup.weapon] = 0;
  } else {
    const charges = cpuPickupCharges(state, combat, actor);
    charges[pickup.weapon] = (charges[pickup.weapon] || 0) + 1;
    amount = 1;
  }
  burst(combat, duel.course.groundAt(pickup.s, pickup.lateral), 'star');
  const label = pickup.kind === 'armor' ? `ARMOR +${Math.round(amount)}` :
    `${WEAPONS[pickup.weapon].name} / READY`;
  duel._callout(index === -1 ? label : `RIVAL ${index + 1} / ${label}`,
    T.pickup.calloutSeconds);
  duel.emit({powerupCollected: pickup.kind === 'armor' ? 'armor' : pickup.weapon,
    pickupKind: pickup.kind, collector: index === -1 ? 'player' : 'rival',
    opponentIndex: index, amount, pickupId: pickup.id});
}

function stepSeededPickups(duel, dt) {
  const state = duel.state;
  const combat = state.combat;
  if (!combat.seededPickupPlan) {
    combat.seededPickupPlan = buildSeededPickupPlan(duel);
    if (!combat.pickups.length) combat.pickups = combat.seededPickupPlan.map(pickup => ({...pickup}));
  }
  combat.pickups = combat.pickups.filter(pickup => {
    pickup.age += dt;
    const candidates = [state, ...state.opponents].map((actor, order) => ({
      actor, index: order - 1, fraction: sweptPickupFraction(actor, pickup),
    })).filter(candidate => candidate.fraction !== null &&
      canCollectSeeded(state, combat, candidate.actor, pickup, candidate.index));
    candidates.sort((a, b) => a.fraction - b.fraction || a.index - b.index);
    if (!candidates.length) return true;
    collectSeeded(duel, pickup, candidates[0].actor, candidates[0].index);
    return false;
  });
}

function cpuCanUsePickup(state, combat, actor, pickup) {
  return state.cpuDifficulty !== 'easy' &&
    !(pickup.weapon === 'ufo' && actor.ufoUsedLaps?.[actor.completedLaps]) &&
    (cpuPickupCharges(state, combat, actor)?.[pickup.weapon] ?? 0) < T.pickup.chargeLimit;
}

function crossesPickup(actor, pickup) {
  if (actor.combatWrecking) return false;
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
  if (combatArmorEnabled(duel)) return stepSeededPickups(duel, dt);
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
          opponent.combatWrecking ||
          opponent.crushed || !crossesPickup(opponent, pickup)) continue;
      const charges = cpuPickupCharges(state, combat, opponent);
      charges[pickup.weapon] = (charges[pickup.weapon] || 0) + 1;
      burst(combat, duel.course.groundAt(pickup.s, 0), 'star');
      duel._callout(`RIVAL / ${WEAPONS[pickup.weapon].name} PICKUP`, T.pickup.calloutSeconds);
      duel.emit({powerupCollected: pickup.weapon, collector: 'rival'});
      return false;
    }

    const rivalCanClaim = state.opponents.some(opponent =>
      cpuCanUsePickup(state, combat, opponent, pickup) && !opponent.finished &&
      !opponent.combatWrecking &&
      !opponent.crushed && pickup.s > opponent.s - T.pickup.retentionBehind);
    return pickup.age < T.pickup.lifetime &&
      (pickup.s > state.s - T.pickup.retentionBehind || rivalCanClaim);
  });
}
