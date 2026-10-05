import {SAL_FIGHT} from './sal.js';
import {DUSTMONGER_FIGHT} from './dustmonger.js';
import {MIRAGE_FIGHT} from './mirage.js';
import {KETTLE_FIGHT} from './kettle.js';
import {VULTURES_FIGHT} from './vultures.js';
import {GUNN_FIGHT} from './gunn.js';

// Every built warlord's fight, one file each (docs/SCRAPDOME.md section 7).
// Shared arena files call these hooks and never name a warlord. Adding a
// boss means its own file and one line here.
const FIGHTS = Object.freeze({
  sal: SAL_FIGHT,
  dustmonger: DUSTMONGER_FIGHT,
  mirage: MIRAGE_FIGHT,
  kettle: KETTLE_FIGHT,
  vultures: VULTURES_FIGHT,
  gunn: GUNN_FIGHT,
});

export function warlordEnabled(duel, id) {
  const fight = FIGHTS[id];
  return !!fight && (!fight.featureFlag || duel.featureFlags?.enabled(fight.featureFlag) === true);
}

// The fight hooks for the warlord driving `actor`, or null for every other car.
export function warlordFight(duel, actor) {
  const arena = duel.state.arena, id = arena?.warlordId;
  if (arena?.mode !== 'warlord' || !Object.hasOwn(FIGHTS, id) ||
      !actor || actor === duel.state ||
      actor.warlordId !== id ||
      !(arena.warlordTeamIds ?? [arena.warlordBossId]).includes(actor.arenaId)) return null;
  return FIGHTS[id];
}

export const FIGHT_WARLORD_IDS = Object.freeze(Object.keys(FIGHTS));
