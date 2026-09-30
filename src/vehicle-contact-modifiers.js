const side = face => face === 'left' || face === 'right';

function salBoss(duel, actor) {
  const arena = duel.state.arena;
  return duel.featureFlags?.enabled('warlords') === true &&
    arena?.mode === 'warlord' && arena.warlordId === 'sal' &&
    actor !== duel.state && actor?.arenaId === arena.warlordBossId &&
    actor?.warlordId === 'sal';
}

// Only an actual contact face can expose Sal's rear. Radial blasts have no
// face and never receive a guessed rear bonus.
export function salRearDamageMultiplier(duel, victim, victimFace) {
  return salBoss(duel, victim) && victim.salSaw?.stage === 'window' &&
    victimFace === 'rear' ? 1.5 : 1;
}

export function vehicleContactModifiers(duel, attacker, victim, attackerFace, victimFace) {
  const sideSaws = duel.featureFlags?.enabled('warlords') === true &&
    attacker?.combatArmorKit === 'side-saws' && side(attackerFace);
  const salSweep = salBoss(duel, attacker) && victim === duel.state &&
    attacker.salSaw?.stage === 'sweep' && side(victimFace);
  return {multiplier: (sideSaws ? 1.6 : 1) * (salSweep ? 2 : 1), sideSaws, salSweep};
}
