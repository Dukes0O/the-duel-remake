import {warlordFight} from './warlords/index.js';
import {carEffect} from './arsenal/car-effects.js';
import {arsenalEnabled} from './combat-weapons.js';

const side = face => face === 'left' || face === 'right';

// A warlord's weak side or window, from that warlord's own fight file.
export function warlordDefenseMultiplier(duel, victim, victimFace) {
  return warlordFight(duel, victim)?.defense?.(duel, victim, victimFace) ?? 1;
}

export function vehicleContactModifiers(duel, attacker, victim, attackerFace, victimFace) {
  const sideSaws = attacker?.combatArmorKit === 'side-saws' && side(attackerFace);
  const fight = warlordFight(duel, attacker);
  const move = fight?.attack?.(duel, attacker, victim, attackerFace, victimFace) ?? null;
  // A decoy car may ram for a fraction of the damage (ramDamageScale).
  const nitro = arsenalEnabled(duel) ? carEffect(attacker, 'nitro')?.ramMultiplier || 1 : 1;
  return {multiplier: (sideSaws ? 1.6 : 1) * (move?.multiplier ?? 1) * (attacker?.ramDamageScale ?? 1) * nitro, sideSaws,
    warlordMove: move?.move === true, warlordFight: move ? fight : null};
}
