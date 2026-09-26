import {WEAPONS, COMBAT_TUNING} from '../wasteland-tuning.js';
import {burst} from '../combat-weapons.js';
import {cpuPickupCharges} from '../combat-pickups.js';
import {makeRng} from '../rng.js';
import {arenaParticipant} from '../combat-teams.js';

// Scrapdome crates (docs/SCRAPDOME.md section 3): risk for reward. Weapon
// crates sit on the ramp tops, so you have to commit to a jump line; repair
// crates sit on the inner floor by the Heap, where fights are closest. A crate
// comes back a while after it is taken. Any car can collect from any
// direction, unlike race crates, which are laid out along the route.
export const ARENA_PICKUPS = Object.freeze({
  heapFractions: Object.freeze([.25, .6]), heapOffset: -14,
  reach: 3.2, airClearance: 3, respawnSec: 12, firstDelaySec: 3, salt: 0x51f15eed,
});

const WEAPON_CRATES = Object.freeze(['bomb', 'crossbow', 'star', 'ufo']);

export function arenaPickupSpots(course) {
  const spots = course.features.ramps.map((ramp, index) => ({
    id: `ramp-${index}`, s: (ramp.start + ramp.end) / 2, lateral: 0, kind: 'weapon'}));
  ARENA_PICKUPS.heapFractions.forEach((fraction, index) => spots.push({
    id: `heap-${index}`, s: fraction * course.length, lateral: ARENA_PICKUPS.heapOffset, kind: 'armor'}));
  return spots;
}

function crateAt(duel, spot, serial) {
  const rng = makeRng((duel.seed ^ Math.imul(serial + 1, ARENA_PICKUPS.salt)) >>> 0);
  return {id: `${spot.id}-${serial}`, spot: spot.id, s: spot.s, lateral: spot.lateral, kind: spot.kind,
    ...(spot.kind === 'weapon' ? {weapon: rng.pick(WEAPON_CRATES)} : {}), age: 0};
}

function canCollect(duel, actor, crate) {
  const state = duel.state, combat = state.combat;
  if (actor.combatWrecking || actor.crushed || (actor.airHeight || 0) >= ARENA_PICKUPS.airClearance) return false;
  if ((arenaParticipant(duel, actor)?.protectedSec || 0) > 0) return false;
  if (crate.kind === 'armor') return Number.isFinite(actor.armor) && actor.armor < actor.maxArmor;
  if (actor === state) return combat.cooldowns[crate.weapon] > 0;
  // Easy computer cars leave crates for the player, as in races.
  return state.cpuDifficulty !== 'easy' &&
    (cpuPickupCharges(state, combat, actor)[crate.weapon] ?? 0) < COMBAT_TUNING.pickup.chargeLimit;
}

function collect(duel, actor, crate) {
  const state = duel.state, combat = state.combat, player = actor === state;
  let amount = 0;
  if (crate.kind === 'armor') {
    const before = actor.armor;
    actor.armor = Math.min(actor.maxArmor, actor.armor + COMBAT_TUNING.pickup.armorRepair);
    amount = actor.armor - before;
  } else if (player) {
    amount = combat.cooldowns[crate.weapon];
    combat.cooldowns[crate.weapon] = 0;
  } else {
    const charges = cpuPickupCharges(state, combat, actor);
    charges[crate.weapon] = (charges[crate.weapon] || 0) + 1;
    amount = 1;
  }
  burst(combat, duel.course.groundAt(crate.s, crate.lateral), 'star');
  const label = crate.kind === 'armor' ? `ARMOR +${Math.round(amount)}` : `${WEAPONS[crate.weapon].name} / READY`;
  const name = arenaParticipant(duel, actor)?.name;
  duel._callout(player ? label : `${name} / ${label}`, COMBAT_TUNING.pickup.calloutSeconds);
  duel.emit({powerupCollected: crate.kind === 'armor' ? 'armor' : crate.weapon, pickupKind: crate.kind,
    collector: player ? 'player' : 'rival', opponentIndex: player ? -1 : state.opponents.indexOf(actor),
    amount, pickupId: crate.id});
}

export function stepArenaPickups(duel, dt) {
  const state = duel.state, combat = state.combat;
  if (!combat.arenaSpots) {
    combat.arenaSpots = arenaPickupSpots(duel.course).map(spot => ({...spot, waitSec: ARENA_PICKUPS.firstDelaySec}));
    combat.arenaCrateSerial = 0;
    combat.pickups = [];
  }
  for (const spot of combat.arenaSpots) {
    if (combat.pickups.some(crate => crate.spot === spot.id)) continue;
    spot.waitSec = Math.max(0, spot.waitSec - dt);
    if (spot.waitSec === 0) combat.pickups.push(crateAt(duel, spot, combat.arenaCrateSerial++));
  }
  const actors = [state, ...state.opponents];
  combat.pickups = combat.pickups.filter(crate => {
    crate.age += dt;
    const at = duel.course.worldAt(crate.s, crate.lateral);
    // The nearest eligible car takes it; ties go in a fixed order.
    let taker = null, best = Infinity;
    for (const actor of actors) {
      const p = duel.course.worldAt(actor.s, actor.lateral);
      const distance = Math.hypot(p.x - at.x, p.z - at.z);
      if (distance < ARENA_PICKUPS.reach && distance < best && canCollect(duel, actor, crate)) { taker = actor; best = distance; }
    }
    if (!taker) return true;
    collect(duel, taker, crate);
    const spot = combat.arenaSpots.find(item => item.id === crate.spot);
    if (spot) spot.waitSec = ARENA_PICKUPS.respawnSec;
    return false;
  });
}

// The nearest live repair crate, for a wounded computer car.
export function nearestRepairCrate(duel, actor) {
  const crates = duel.state.combat?.pickups || [];
  const p = duel.course.worldAt(actor.s, actor.lateral);
  let best = null, bestDistance = Infinity;
  for (const crate of crates) {
    if (crate.kind !== 'armor') continue;
    const at = duel.course.worldAt(crate.s, crate.lateral), distance = Math.hypot(at.x - p.x, at.z - p.z);
    if (distance < bestDistance) { best = {...at, crate}; bestDistance = distance; }
  }
  return best ? {...best, distance: bestDistance} : null;
}
