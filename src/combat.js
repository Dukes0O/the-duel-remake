import {stepPickups} from './combat-pickups.js';
import {stepCombatAI} from './combat-ai.js';
import {stepProjectiles, tickImpactCooldowns} from './combat-projectiles.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {arsenalEnabled, arsenalWaveThreeEnabled, hazardsActive, stepCpuWeaponCooldowns, clearCpuWeaponCooldowns} from './combat-weapons.js';
import {clearSmokeHistory} from './arsenal/smoke.js';
import {stepTether} from './arsenal/harpoon.js';
import {stepRocketVolleys} from './arsenal/rockets.js';
import {stepFlamethrowers} from './arsenal/flamethrower.js';
import {stepScrapMagnets} from './arsenal/magnet.js';
import {stepMortars} from './arsenal/mortar.js';
import {stepTeslaCharges} from './arsenal/tesla.js';
import {stepDecoyDrones, clearDroneHistory} from './arsenal/decoy-drone.js';
import {stepNitroRuns} from './arsenal/nitro-ram.js';
import {cpuArsenalLoadout} from './weapon-upgrades.js';
import {makeRng} from './rng.js';
import {clearHazards, stepHazards} from './arsenal/hazards.js';
import {clearCarEffects, stepCarEffects} from './arsenal/car-effects.js';
import {stepGearDeployables} from './crew-gear/signature.js';

export {WEAPONS, supportsCombat, createCombat, ufoDestination, fireWeapon} from './combat-weapons.js';

export function initializeArsenalCombat(duel) {
  if (!arsenalEnabled(duel)) return;
  duel.state.opponents.forEach((actor, index) => {
    actor.weaponLoadout = cpuArsenalLoadout(duel.state.arsenalRank || 1,
      duel.state.cpuDifficulty, {arsenalWave3Enabled: arsenalWaveThreeEnabled(duel),
        rng: makeRng(duel.seed ^ 0x415253 ^ (index + 1)*0x51ed)});
  });
}

export function clearArsenalState(duel) {
  clearHazards(duel);
  clearSmokeHistory(duel);
  clearDroneHistory(duel);
  if (duel.state.combat) {
    duel.state.combat.rocketVolleys = [];
    duel.state.combat.flameBursts = [];
    duel.state.combat.flameBurns = {};
    duel.state.combat.magnets = [];
    duel.state.combat.mortarShells = [];
    duel.state.combat.teslaCharges = [];
    duel.state.combat.teslaPulses = [];
    duel.state.combat.nitroRuns = [];
  }
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
  if (arsenalEnabled(duel)) stepScrapMagnets(duel, dt);
  if (arsenalWaveThreeEnabled(duel)) stepDecoyDrones(duel);
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
  stepGearDeployables(duel, dt);
  if (arsenalEnabled(duel)) {
    stepRocketVolleys(duel, dt);
    stepFlamethrowers(duel, dt);
  }
  if (arsenalWaveThreeEnabled(duel)) {
    stepMortars(duel, dt);

  }
  if (arsenalWaveThreeEnabled(duel) || state.combat.teslaCharges?.some(charge=>charge.crewShock) ||
      state.combat.teslaPulses?.length) stepTeslaCharges(duel, dt);
  stepProjectiles(duel, dt);
  if (hazardsActive(duel)) {
    for (const actor of [state, ...state.opponents, ...state.traffic, state.police?.pursuit]) {
      if (actor) {stepTether(duel, actor, dt); stepCarEffects(actor, dt);}
    }
    stepHazards(duel, dt);
    if (arsenalWaveThreeEnabled(duel)) stepNitroRuns(duel, dt);
  }
}
