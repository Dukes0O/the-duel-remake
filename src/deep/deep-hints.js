import {normalizeDeep} from './deep-discovery.js';

export const DEEP_KIT_COST = 150;
// Saved ids keep their original names; the tips now come after 3 and 6 Pacific
// Canyon finishes (Kyle, 25 October 2026, so Gratian reaches the dive sooner).
export const DEEP_HINT_IDS = Object.freeze(['kelp-coast-5', 'kelp-coast-10']);
export const DEEP_HINT_FINISHES = Object.freeze([3, 6]);
const firstTip = 'Fishermen at the cove say the old boat ramp goes further than the beach.';
const secondTip = 'Look for bubbles at the end of the old boat ramp on Pacific Canyon. A dive kit lets any car explore below.';
export function deepHints(snapshot) {
  const eligible = snapshot?.enabled === true && typeof snapshot.playerId === 'string' && snapshot.playerId.length > 0;
  const deep = normalizeDeep(snapshot), found = (deep.found?.length || 0) > 0;
  const count = deep.pacificFinishes || 0;
  const hintIds = eligible && !found ? DEEP_HINT_IDS.filter((id, index) => count >= DEEP_HINT_FINISHES[index]) : [];
  return {
    garageTip: hintIds.length ? (count >= DEEP_HINT_FINISHES[1] ? secondTip : firstTip) : null,
    hintIds,
    bubbles: eligible && !found && count >= DEEP_HINT_FINISHES[1],
    kitAvailable: eligible && (hintIds.length > 0 || deep.hintsShown?.includes(DEEP_HINT_IDS[0]) === true),
    kitOwned: eligible && deep.kit === true,
    kitCost: DEEP_KIT_COST,
  };
}
export function markDeepHintsShown(profile, {enabled = false} = {}) {
  const hints = deepHints({...profile?.deep, playerId: 'current', enabled});
  const deep = normalizeDeep(profile?.deep), shown = deep.hintsShown || [];
  const added = hints.hintIds.filter(id => !shown.includes(id));
  return added.length ? {...profile, deep: {...deep, hintsShown: [...shown, ...added]}} : profile;
}
export function purchaseDeepKit(profile, {enabled = false} = {}) {
  const fail = reason => ({profile, ok: false, reason, cost: 0});
  const hints = deepHints({...profile?.deep, playerId: 'current', enabled});
  if (!hints.kitAvailable) return fail('The dive kit is not available yet.');
  if (hints.kitOwned) return fail('Your dive kit already fits every car.');
  if (!Number.isSafeInteger(profile?.credits) || profile.credits < DEEP_KIT_COST)
    return fail('You need 150 credits for the dive kit.');
  return {profile: {...profile, credits: profile.credits - DEEP_KIT_COST,
    deep: {...normalizeDeep(profile.deep), kit: true}}, ok: true, reason: '', cost: DEEP_KIT_COST};
}
