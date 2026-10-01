import {stepPickups} from './combat-pickups.js';
import {stepCombatAI} from './combat-ai.js';
import {stepProjectiles, tickImpactCooldowns} from './combat-projectiles.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {arsenalEnabled, stepCpuWeaponCooldowns, clearCpuWeaponCooldowns} from './combat-weapons.js';
import {clearSmokeHistory} from './arsenal/smoke.js';
import {cpuArsenalLoadout} from './weapon-upgrades.js';
import {makeRng} from './rng.js';
import {clearHazards, stepHazards} from './arsenal/hazards.js';
import {clearCarEffects, stepCarEffects} from './arsenal/car-effects.js';

export {WEAPONS, supportsCombat, createCombat, ufoDestination, fireWeapon} from './combat-weapons.js';

export function initializeArsenalCombat(duel) {
  if (!arsenalEnabled(duel)) return;
  duel.state.opponents.forEach((actor, index) => {
    actor.weaponLoadout = cpuArsenalLoadout(duel.state.arsenalRank || 1,
      duel.state.cpuDifficulty, {rng: makeRng(duel.seed ^ 0x415253 ^ (index + 1)*0x51ed)});
  });
}

export function clearArsenalState(duel) {
  clearHazards(duel);
  clearSmokeHistory(duel);
  for (const actor of [duel.state, ...duel.state.opponents, ...duel.state.traffic,
    duel.state.police?.pursuit]) {
    if (actor) {
      clearCarEffects(actor);
      clearCpuWeaponCooldowns(actor);
    }
  }
  // Future Mirage/Drone producers supply genuine flagged transient actors.
  // Retire that fight data only on the real lifecycle boundary calling us.
  if (duel.state.opponents.some(actor => actor.decoy)) {
    duel.state.opponents = duel.state.opponents.filter(actor => !actor.decoy);
    if (duel.state.arena) duel.state.arena.participants =
      duel.state.arena.participants.filter(participant => !participant.decoy);
  }
}

// Preserve the original update order. Projectiles resolve after pickups and
// scheduled CPU attacks, so a weapon fired this tick can hit this tick.
export function stepCombat(duel, dt) {
  const state = duel.state;
  const combat = state.combat;
  if (!combat || state.status !== 'racing' || state.paused) return;

  tickImpactCooldowns(duel, dt);
  stepPickups(duel, dt);

  for (const weapon of Object.keys(combat.cooldowns)) {
    combat.cooldowns[weapon] = Math.max(0, combat.cooldowns[weapon] - dt);
  }
  combat.shield = Math.max(0, combat.shield - dt);
  combat.rivalShield = Math.max(0, combat.rivalShield - dt);
  for (let index = 1; index < state.opponents.length; index++) {
    const opponent = state.opponents[index];
    opponent.combatShield = Math.max(0, (opponent.combatShield || 0) - dt);
  }
  combat.aiShieldCooldown = Math.max(0, (combat.aiShieldCooldown || 0) - dt);
  combat.bursts = combat.bursts.filter(burst => (burst.age += dt) < COMBAT_TUNING.effects.lifetime);
  combat.blastSound = Math.max(0, (combat.blastSound || 0) - dt);

  if (arsenalEnabled(duel)) for (const actor of state.opponents)
    stepCpuWeaponCooldowns(actor, dt);
  stepCombatAI(duel, dt);
  stepProjectiles(duel, dt);
  if (arsenalEnabled(duel)) {
    for (const actor of [state, ...state.opponents, ...state.traffic, state.police?.pursuit]) {
      if (actor) stepCarEffects(actor, dt);
    }
    stepHazards(duel, dt);
  }
}
