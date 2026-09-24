import {CPU_COMBAT, WEAPONS, COMBAT_TUNING} from './wasteland-tuning.js';
import {point, velocity, fireWeapon} from './combat-weapons.js';
import {cpuPickupCharges} from './combat-pickups.js';

const T = COMBAT_TUNING;

function incomingBolt(duel, cpu, opponent) {
  const state = duel.state;
  const combat = state.combat;
  if (!opponent || opponent.finished || opponent.crushed || opponent.combatWrecking ||
      (opponent === state.rival ? combat.rivalShield : opponent.combatShield) > 0) return false;

  const target = point(duel, opponent);
  const motion = velocity(opponent, target);
  const radius = duel._vehicleSpec(opponent).halfWidth + T.projectileRadiusPadding;
  const facing = target.heading + (opponent.headingError || 0);
  const forwardX = Math.sin(facing);
  const forwardZ = Math.cos(facing);

  for (const projectile of combat.projectiles) {
    if (projectile.enemy || projectile.kind !== 'crossbow') continue;
    const dx = target.x - projectile.x;
    const dz = target.z - projectile.z;
    const rvx = projectile.vx - motion.x;
    const rvz = projectile.vz - motion.z;
    const distance = Math.hypot(dx, dz);
    // The driver needs time to recognize a bolt inside the forward cone.
    if (projectile.age < cpu.shieldReaction ||
        (-dx * forwardX - dz * forwardZ) < distance * cpu.visionCos) continue;
    const relativeSpeed = rvx * rvx + rvz * rvz;
    const soon = relativeSpeed
      ? Math.max(0, Math.min(T.cpu.boltLookahead, (dx * rvx + dz * rvz) / relativeSpeed))
      : 0;
    if (soon <= 0 || Math.hypot(dx - rvx * soon, dz - rvz * soon) >= radius) continue;
    if (Math.abs(projectile.y + projectile.vy * soon - target.y) < T.projectileHitHeight) return true;
  }
  return false;
}

function useCpuPickupShield(duel) {
  const state = duel.state;
  const combat = state.combat;
  for (const opponent of state.opponents) {
    if (opponent.finished || opponent.crushed || opponent.combatWrecking ||
        opponent.impactTimer > 0) continue;
    const charges = cpuPickupCharges(state, combat, opponent);
    if (charges.star && fireWeapon(duel, 'star', true, opponent)) {
      charges.star--;
      duel.emit({cpuPickupUsed: 'star'});
    }
  }
}

function useCpuPickupUfo(duel, cpu) {
  const {state} = duel;
  for (const opponent of state.opponents) {
    if (cpuPickupCharges(state, state.combat, opponent).ufo > 0 &&
        incomingBolt(duel, cpu, opponent)) {
      // Hold the charge until the existing defensive reaction sees a threat.
      // UFO use has its own per-lap limit. It never spends or resets the
      // shared scheduled-attack timer, shot seed or alternating CPU turn.
      fireWeapon(duel, 'ufo', true, opponent);
    }
  }
}

export function stepCombatAI(duel, dt) {
  const state = duel.state;
  const combat = state.combat;
  const cpu = CPU_COMBAT[state.cpuDifficulty] ?? CPU_COMBAT.medium;
  const modernField = duel.featureFlags?.enabled('wasteland2') === true;
  for (let index = 1; index < state.opponents.length; index++) {
    const opponent = state.opponents[index];
    opponent.aiShieldCooldown = Math.max(0, (opponent.aiShieldCooldown || 0) - dt);
  }

  if (state.cpuDifficulty !== 'easy') {
    useCpuPickupShield(duel);
    useCpuPickupUfo(duel, cpu);
  }
  // A multi-car field keeps the same total attack rate, but distributes
  // decisions across the cars instead of firing a synchronized volley.
  let liveOpponents = 0;
  if (modernField) for (const opponent of state.opponents) {
    if (!opponent.finished && !opponent.crushed && !opponent.combatWrecking)
      liveOpponents++;
  }
  const attackInterval = modernField
    ? cpu.interval / Math.max(1, liveOpponents) : cpu.interval;
  if (combat.aiTimer == null) combat.aiTimer = attackInterval;
  combat.aiTimer -= dt;

  for (const opponent of state.opponents) {
    const ready = opponent === state.rival
      ? combat.aiShieldCooldown <= 0
      : opponent.aiShieldCooldown <= 0;
    if (ready && incomingBolt(duel, cpu, opponent) && fireWeapon(duel, 'star', true, opponent)) {
      if (opponent === state.rival) combat.aiShieldCooldown = WEAPONS.star.cooldown;
      else opponent.aiShieldCooldown = WEAPONS.star.cooldown;
    }
  }

  if (!(combat.aiTimer <= 0)) return;
  combat.aiTimer = attackInterval;
  const opponents = state.opponents;
  const first = modernField ? (combat.aiTurn || 0) % Math.max(1, opponents.length) : 0;
  for (let offset = 0; offset < opponents.length; offset++) {
    const index = modernField ? (first + offset) % opponents.length : offset;
    const opponent = opponents[index];
    if (opponent.finished || opponent.crushed || opponent.combatWrecking ||
        opponent.impactTimer > 0) continue;
    const attacker = point(duel, opponent);
    const player = point(duel, state);
    const gap = Math.hypot(attacker.x - player.x, attacker.z - player.z);
    if (!(gap < T.cpu.attackRange)) continue;

    let weapon = gap < T.cpu.bombRange ? 'bomb' : 'crossbow';
    // A collected weapon selects a scheduled attack. It does not add a shot
    // or shorten the difficulty's attack interval.
    if (state.cpuDifficulty !== 'easy' && gap >= T.cpu.bombRange &&
        gap < T.cpu.pickupBombRange && cpuPickupCharges(state, combat, opponent).bomb) {
      weapon = 'bomb';
    }
    combat.aiShot++;
    const charges = cpuPickupCharges(state, combat, opponent);
    if (fireWeapon(duel, weapon, true, opponent) && charges[weapon]) {
      charges[weapon]--;
      duel.emit({cpuPickupUsed: weapon});
    }
    if (modernField) {
      combat.aiTurn = (index + 1) % opponents.length;
      break;
    }
  }
}
