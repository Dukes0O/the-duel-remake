import {rankForXp} from './notoriety.js';
import {makeRng} from './rng.js';

export const WEAPON_IDS = Object.freeze(['ufo', 'bomb', 'crossbow', 'star']);
export const WEAPON_UPGRADE_COSTS = Object.freeze([350, 700, 1200]);
export const WASTELAND_UPGRADE_COSTS = Object.freeze([150, 300, 600]);
export const ARSENAL_WEAPON_COST = 400;

// Extend this catalog only when another weapon's core implementation is built.
export const ARSENAL_WEAPONS = Object.freeze({
  oil: Object.freeze({rank: 2, wave: 1}),
  smoke: Object.freeze({rank: 6, wave: 1, warlordId: 'dustmonger'}),
});

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const levelFor = value => Number.isFinite(value) ? Math.max(0, Math.min(3, Math.floor(value))) : 0;
const validIds = value => (Array.isArray(value) ? value : [])
  .filter(id => typeof id === 'string' && id.length > 0 && id.length <= 80).slice(0, 100);
const futureCareer = profile => Number.isSafeInteger(profile?.wasteland?.version) &&
  profile.wasteland.version > 1;

export function normalizeWeapons(value) {
  const source = record(value) ? value : {};
  const levels = {...(record(source.levels) ? source.levels : {})};
  const unlocked = [...new Set([...WEAPON_IDS, ...validIds(source.unlocked)])];
  for (const id of WEAPON_IDS) levels[id] = levelFor(levels[id]);
  // Known arsenal levels are bounded, but a level alone never grants ownership.
  for (const id of Object.keys(ARSENAL_WEAPONS)) {
    if (unlocked.includes(id) || Object.hasOwn(levels, id)) levels[id] = levelFor(levels[id]);
  }
  return {...source, version: 1, unlocked, levels};
}

export function getProfileWeapons(profile) {
  const nested = normalizeWeapons(profile?.wasteland?.weapons);
  const legacy = normalizeWeapons(profile?.weapons);
  const levels = {...legacy.levels, ...nested.levels};
  for (const id of [...WEAPON_IDS, ...Object.keys(ARSENAL_WEAPONS)]) {
    if (WEAPON_IDS.includes(id) || Object.hasOwn(legacy.levels, id) || Object.hasOwn(nested.levels, id))
      levels[id] = Math.max(legacy.levels[id] || 0, nested.levels[id] || 0);
  }
  return {...legacy, ...nested,
    unlocked: [...new Set([...legacy.unlocked, ...nested.unlocked])], levels};
}

export function implementedArsenalWeapons({implemented = Object.keys(ARSENAL_WEAPONS)} = {}) {
  return Object.keys(ARSENAL_WEAPONS).filter(id => Array.isArray(implemented) && implemented.includes(id));
}

export function arsenalCareerAvailable(profile, {wastelandEnabled = false, arsenalEnabled = false} = {}) {
  return wastelandEnabled === true && arsenalEnabled === true &&
    profile?.wasteland?.version === 1 && profile.wasteland.discoveredGate === true;
}

export function offeredArsenalWeapons(profile, options = {}) {
  // The offer API's arsenal switch already represents the caller's Wasteland
  // view. An explicit disabled Wasteland option can still narrow that view.
  if (!arsenalCareerAvailable(profile, {...options, wastelandEnabled: options.wastelandEnabled ?? true})) return [];
  const owned = getProfileWeapons(profile).unlocked;
  const rank = rankForXp(profile.wasteland.xp);
  return implementedArsenalWeapons(options).filter(id =>
    rank >= ARSENAL_WEAPONS[id].rank && !owned.includes(id));
}

function withWeapons(profile, weapons, careerFields = {}) {
  const {weapons: legacyWeapons, ...rest} = profile;
  return {...rest, wasteland: {...profile.wasteland,
    version: profile.wasteland?.version ?? 1, ...careerFields, weapons}};
}

function unlockWeapon(profile, id) {
  const weapons = getProfileWeapons(profile);
  if (weapons.unlocked.includes(id)) return {ok: true, profile, changed: false, cost: 0};
  return {ok: true, changed: true, cost: 0,
    profile: withWeapons(profile, {...weapons,
      unlocked: [...weapons.unlocked, id], levels: {...weapons.levels, [id]: 0}})};
}

export function purchaseArsenalWeapon(profile, id, options = {}) {
  if (futureCareer(profile)) return {ok: false, profile, reason: 'This career needs a newer game build.'};
  if (!arsenalCareerAvailable(profile, options) || !implementedArsenalWeapons(options).includes(id))
    return {ok: false, profile, reason: 'That weapon is not available.'};
  const rank = rankForXp(profile.wasteland.xp);
  if (rank < ARSENAL_WEAPONS[id].rank)
    return {ok: false, profile, reason: 'Reach rank ' + ARSENAL_WEAPONS[id].rank + ' to buy this weapon.'};
  const weapons = getProfileWeapons(profile);
  if (weapons.unlocked.includes(id)) return {ok: true, profile, changed: false, cost: 0};
  const balance = profile.wasteland.scrap;
  if (!Number.isSafeInteger(balance) || balance < ARSENAL_WEAPON_COST)
    return {ok: false, profile, reason: 'You need ' + ARSENAL_WEAPON_COST + ' scrap for this weapon.'};
  const earned = unlockWeapon(profile, id);
  return {...earned, cost: ARSENAL_WEAPON_COST,
    profile: {...earned.profile, wasteland: {...earned.profile.wasteland,
      scrap: balance - ARSENAL_WEAPON_COST}}};
}

export function rewardArsenalWeapon(profile, id, {warlordId} = {}) {
  if (profile?.wasteland?.version !== 1 || !Object.hasOwn(ARSENAL_WEAPONS, id) ||
      !ARSENAL_WEAPONS[id].warlordId || ARSENAL_WEAPONS[id].warlordId !== warlordId)
    return {ok: false, profile, reason: 'That weapon reward is not available.'};
  const warlords = profile.wasteland.warlords;
  const earned = warlords?.[warlordId]?.defeated === true || validIds(warlords?.defeated).includes(warlordId);
  if (!earned) return {ok: false, profile, reason: 'Defeat this warlord to earn the weapon.'};
  return unlockWeapon(profile, id);
}

export function purchaseWeaponUpgrade(profile, id, options = {}) {
  const {wastelandEnabled = false} = options;
  if (futureCareer(profile)) return {ok: false, profile, reason: 'This career needs a newer game build.'};
  const weapons = getProfileWeapons(profile), level = weapons.levels[id];
  const starter = WEAPON_IDS.includes(id);
  const arsenal = arsenalCareerAvailable(profile, options) &&
    implementedArsenalWeapons(options).includes(id) && weapons.unlocked.includes(id);
  if ((!starter && !arsenal) || !Number.isInteger(level) || level < 0 || level >= 3)
    return {ok: false, profile, reason: 'This weapon is already maxed or unavailable.'};
  const wastelandCareer = wastelandEnabled && profile?.wasteland?.version === 1 &&
    profile.wasteland.discoveredGate === true;
  const cost = (wastelandCareer ? WASTELAND_UPGRADE_COSTS : WEAPON_UPGRADE_COSTS)[level];
  const balance = wastelandCareer ? profile.wasteland.scrap : profile.credits;
  if (!Number.isSafeInteger(balance) || balance < cost) return {ok: false, profile,
    reason: 'You need ' + cost + ' ' + (wastelandCareer ? 'scrap' : 'credits') + ' for this upgrade.'};
  const updated = withWeapons(profile, {...weapons, levels: {...weapons.levels, [id]: level + 1}},
    wastelandCareer ? {scrap: balance - cost} : {});
  return {ok: true, profile: {...updated,
    credits: wastelandCareer ? profile.credits : profile.credits - cost}, cost};
}

export function cpuArsenalLoadout(rank, difficulty, {implemented, rng = makeRng(1989)} = {}) {
  const safeRank = Number.isSafeInteger(rank) ? Math.max(1, Math.min(30, rank)) : 1;
  const maximumWave = {easy: 1, medium: 2, hard: 3}[difficulty] ?? 1;
  const candidates = [...WEAPON_IDS, ...implementedArsenalWeapons({implemented}).filter(id =>
    ARSENAL_WEAPONS[id].rank <= safeRank && ARSENAL_WEAPONS[id].wave <= maximumWave)];
  // Fisher-Yates uses the supplied src/rng generator; native scheduling owns
  // when this function is called and how that generator is seeded per car.
  for (let index = candidates.length - 1; index > 0; index--) {
    const other = rng.int(0, index);
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }
  return candidates.slice(0, 4);
}

export function weaponSignature(result) {
  if (result.mode !== 'wasteland') return '';
  const levels = normalizeWeapons({levels: result.weaponLevels}).levels;
  return WEAPON_IDS.some(id => levels[id] > 0) ? WEAPON_IDS.map(id => levels[id]).join('-') : '';
}
