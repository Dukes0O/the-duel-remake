import {SAL_FIGHT} from './sal.js';
import {DUSTMONGER_FIGHT} from './dustmonger.js';
import {KETTLE_FIGHT} from './kettle.js';

// Every built warlord's fight, one file each (docs/SCRAPDOME.md section 7).
// Shared arena files call these hooks and never name a warlord. Adding a
// boss means its own file and one line here.
const FIGHTS = Object.freeze({
  sal: SAL_FIGHT,
  dustmonger: DUSTMONGER_FIGHT,
  kettle: KETTLE_FIGHT,
});

// The fight hooks for the warlord driving `actor`, or null for every other car.
export function warlordFight(duel, actor) {
  const arena = duel.state.arena, id = arena?.warlordId;
  if (arena?.mode !== 'warlord' || !Object.hasOwn(FIGHTS, id) ||
      duel.featureFlags?.enabled('warlords') !== true || !actor || actor === duel.state ||
      actor.warlordId !== id || actor.arenaId !== arena.warlordBossId) return null;
  return FIGHTS[id];
}

export const FIGHT_WARLORD_IDS = Object.freeze(Object.keys(FIGHTS));
