import {stepPickups} from './combat-pickups.js';
import {stepCombatAI} from './combat-ai.js';
import {stepProjectiles, tickImpactCooldowns} from './combat-projectiles.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';

export {WEAPONS, supportsCombat, createCombat, ufoDestination, fireWeapon} from './combat-weapons.js';

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

  stepCombatAI(duel, dt);
  stepProjectiles(duel, dt);
}
