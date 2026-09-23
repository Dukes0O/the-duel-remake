// Wasteland vehicle impacts use closing speed, not either car's road speed.
// Each body style has a different armor rating; a future armor kit can
// override that rating through car.impactArmorFactor.
import {COMBAT_TUNING} from './wasteland-tuning.js';

const RAM = COMBAT_TUNING.ram;
const MPH_TO_MPS = 0.44704;
const ARMOR_BY_KIND = Object.freeze({
  rally: .95,
  muscle: 1.15,
  prototype: .82,
  monster: 1.5,
  hypercar: .92,
});

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function combatCrashThresholdMph(car, { targetMass = 1450 } = {}) {
  const topSpeed = Number.isFinite(car?.topSpeed) ? car.topSpeed : 180;
  const mass = Number.isFinite(car?.mass) ? car.mass : 1450;
  const armor = Number.isFinite(car?.impactArmorFactor) ? car.impactArmorFactor : ARMOR_BY_KIND[car?.kind] ?? 1;
  const massAdvantage = clamp(Math.sqrt(mass / Math.max(500, targetMass)), .75, 1.3);
  return topSpeed * .5 * armor * massAdvantage;
}

export function rearRamResponse({ closingMph, attackerMph, attackerMass, targetMass, steer = 0, offset = 0 }) {
  const closing = Math.max(0, closingMph);
  const attackerShare = attackerMass / Math.max(1, attackerMass + targetMass);
  // The target gets the larger share of the blow. The attacker keeps enough
  // speed to continue driving into a shove instead of stopping dead.
  const targetGainMph = closing * attackerShare * .9;
  const attackerLossMph = closing * (1 - attackerShare) * .45;
  const side = Math.sign(offset) || Math.sign(steer);
  const pressure = Math.min(1, Math.abs(attackerMph) / 100);
  const lateralKick = side * clamp((closing * .11 + Math.abs(steer) * pressure * 5)
    * clamp(attackerMass / Math.max(500, targetMass), .65, 1.6), 0, 28);
  // A severe ram throws the target briefly into the air. The caller decides
  // whether its course supports this actor and integrates the short flight.
  const launchMps = closing >= 65 && attackerMass >= targetMass * .65
    ? clamp(4 + (closing - 65) * .055, 4, 12) : 0;
  return { targetGainMph, attackerLossMph, lateralKick, launchMps };
}

// The contact zone is relative to the actual car face. A car backing into a
// target, or being struck on its side, cannot claim a front-bumper spike hit.
export function combatFrontSpikes(actor, zone) {
  return zone === 'front' && actor?.combatBumperSpikes !== false;
}

export function combatContactCleared(relative, width, length) {
  return Math.abs(relative.x) > width + RAM.contactClearance ||
    Math.abs(relative.z) > length + RAM.contactClearance;
}

// Return bounded mass-based velocity changes for one accepted contact. Armor
// uses closing speed separately; an offset, equal-speed shove can still push
// the struck car sideways without causing armor damage.
export function combatRamResponse({closingMph, massA, massB, normalX, normalZ,
  speedA, speedB, zoneA, zoneB, offset, steerA = 0, steerB = 0}) {
  const aMass = Math.max(500, Number.isFinite(massA) ? massA : 1450);
  const bMass = Math.max(500, Number.isFinite(massB) ? massB : 1450);
  const total = aMass + bMass;
  const closing = clamp(Math.max(0, closingMph), 0, RAM.maximumClosingMph);
  const impulse = Math.min(RAM.maximumImpulseMph, closing * RAM.impulseShare);
  const aShare = bMass / total, bShare = aMass / total;
  const shovel = (attackerSpeed, attackerMass, targetMass, side, steer) => {
    const direction = Math.sign(side) || Math.sign(steer);
    if (!direction) return 0;
    const massRatio = clamp(attackerMass / targetMass, .65, 1.6);
    const pressure = Math.abs(attackerSpeed) * RAM.shovelPerMph +
      closing * RAM.shovelPerClosingMph;
    return direction * clamp(pressure * massRatio, 0, RAM.maximumShovelMps);
  };
  const shovelFromA = zoneA === 'front'
    ? shovel(speedA, aMass, bMass, offset, steerA) : 0;
  const shovelFromB = zoneB === 'front'
    ? shovel(speedB, bMass, aMass, -offset, steerB) : 0;
  const sidePressure = Math.abs(normalX) * Math.min(RAM.maximumShovelMps,
    Math.max(Math.abs(speedA), Math.abs(speedB)) * RAM.shovelPerMph);
  const launch = (attackerMass, targetMass, zone) =>
    zone === 'front' && closing >= RAM.launchClosingMph && attackerMass >= targetMass * .65
      ? clamp(RAM.launchBaseMps + (closing - RAM.launchClosingMph) * RAM.launchPerMph,
        RAM.launchBaseMps, RAM.maximumLaunchMps) : 0;
  return {
    speedDeltaA: normalZ * impulse * aShare,
    speedDeltaB: -normalZ * impulse * bShare,
    pushDeltaA: normalX * (impulse * MPH_TO_MPS + sidePressure) * aShare + shovelFromB,
    pushDeltaB: -normalX * (impulse * MPH_TO_MPS + sidePressure) * bShare + shovelFromA,
    shovelFromA, shovelFromB,
    launchA: launch(bMass, aMass, zoneB),
    launchB: launch(aMass, bMass, zoneA),
    recoverySeconds: clamp(RAM.recoveryBaseSeconds + closing * RAM.recoveryPerMph,
      RAM.recoveryBaseSeconds, RAM.maximumRecoverySeconds),
  };
}
