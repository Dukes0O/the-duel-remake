// Wasteland vehicle impacts use closing speed, not either car's road speed.
// Each body style has a different armor rating; a future armor kit can
// override that rating through car.impactArmorFactor.
import {COMBAT_TUNING} from './wasteland-tuning.js';

const RAM = COMBAT_TUNING.ram;
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

// The contact zone is relative to the actual car face. A car backing into a
// target, or being struck on its side, cannot claim a front-bumper spike hit.
export function combatFrontSpikes(actor, zone) {
  return zone === 'front' && actor?.combatBumperSpikes !== false;
}

export function combatContactCleared(relative, width, length) {
  return Math.abs(relative.x) > width + RAM.contactClearance ||
    Math.abs(relative.z) > length + RAM.contactClearance;
}

// Keep the released ram cadence and the lateral shove recorded by vehicleRam.
// The rigid-body crash solver owns all actual velocity changes and launches.
export function combatRamResponse({closingMph, massA, massB,
  speedA, zoneA, offset, steerA = 0}) {
  const aMass = Math.max(500, Number.isFinite(massA) ? massA : 1450);
  const bMass = Math.max(500, Number.isFinite(massB) ? massB : 1450);
  const closing = clamp(Math.max(0, closingMph), 0, RAM.maximumClosingMph);
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
  return {
    shovelFromA,
    recoverySeconds: clamp(RAM.recoveryBaseSeconds + closing * RAM.recoveryPerMph,
      RAM.recoveryBaseSeconds, RAM.maximumRecoverySeconds),
  };
}
