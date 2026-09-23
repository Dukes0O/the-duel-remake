// Wasteland vehicle impacts use closing speed, not either car's road speed.
// Each body style has a different armor rating; a future armor kit can
// override that rating through car.impactArmorFactor.
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
