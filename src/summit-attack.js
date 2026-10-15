// Derived challenge rules only. No profile, renderer or simulation mutation.
export const SUMMIT_ATTACK_ID = 'summit-time-attack';
export const isSummitAttack = value => (typeof value === 'string' ? value : value?.id) === SUMMIT_ATTACK_ID;

export function summitAttackTargets(baselineSec) {
  if (!Number.isFinite(baselineSec) || baselineSec <= 0)
    throw new RangeError('Summit Attack needs an actual positive finite baseline.');
  const targets = {
    gold: Math.ceil(baselineSec * 1.03 * 10) / 10,
    silver: Math.ceil(baselineSec * 1.08 * 10) / 10,
    bronze: Math.ceil(baselineSec * 1.15 * 10) / 10,
  };
  if (!Object.values(targets).every(Number.isFinite))
    throw new RangeError('Summit Attack baseline exceeds finite target precision.');
  return Object.freeze(targets);
}

export function summitAttackMedal(timeSec, targets) {
  if (!Number.isFinite(timeSec) || timeSec <= 0 || !targets ||
      !['gold', 'silver', 'bronze'].every(key => Number.isFinite(targets[key]) && targets[key] > 0) ||
      targets.gold > targets.silver || targets.silver > targets.bronze) return null;
  for (const medal of ['gold', 'silver', 'bronze']) if (timeSec <= targets[medal]) return medal;
  return null;
}
