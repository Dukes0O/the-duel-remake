import {normalizeWeapons, WEAPON_IDS} from './weapon-upgrades.js';
import {normalizeGateDiscovery} from './hidden-road-discovery.js';
import {rankForXp} from './notoriety.js';
import {TERRITORIES} from './wasteland-career.js';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const bounded = (value, minimum, maximum, fallback = minimum) =>
  Number.isSafeInteger(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
const ids = (value, limit = 100, maxLength = 80) => [...new Set(
  (Array.isArray(value) ? value : [])
    .filter(id => typeof id === 'string' && id.length > 0 && id.length <= maxLength)
    .slice(0, limit),
)];
const entries = value => record(value) ? Object.entries(value)
  .filter(([id]) => id.length > 0 && id.length <= 80)
  .slice(0, 100) : [];

export const MUDDY_HOLLOW_HUBCAP_IDS = Object.freeze([
  'hilltop', 'pond', 'mega-landing', 'mud-pit', 'log-ramp',
]);

export function normalizeMuddyHollow(value) {
  const source = record(value) ? value : {};
  return {
    ...source,
    discovered: source.discovered === true,
    hubcaps: ids(source.hubcaps).filter(id => MUDDY_HOLLOW_HUBCAP_IDS.includes(id)),
    titanHighCountryFinishes: bounded(source.titanHighCountryFinishes, 0, 5),
  };
}

export function muddyHollowSnapshot(profile, playerId, enabled) {
  const progress = normalizeMuddyHollow(profile?.wasteland?.muddyHollow);
  const available = enabled === true && profile?.wasteland?.version === 1 &&
    profile.wasteland.discoveredGate === true;
  return Object.freeze({
    playerId: typeof playerId === 'string' ? playerId : null,
    enabled: available,
    discovered: available && progress.discovered,
    hubcaps: Object.freeze(available ? [...progress.hubcaps] : []),
    titanHighCountryFinishes: available ? progress.titanHighCountryFinishes : 0,
    garageTip: available && !progress.discovered &&
      progress.titanHighCountryFinishes >= 5
      ? 'Locals say the Titan can climb the meadow above the Alpine Summit.' : null,
  });
}

export function discoverMuddyHollow(profile) {
  const progress = normalizeMuddyHollow(profile?.wasteland?.muddyHollow);
  if (profile?.wasteland?.version !== 1 || progress.discovered) return profile;
  return {...profile, wasteland: {...profile.wasteland,
    muddyHollow: {...progress, discovered: true}}};
}

export function collectMuddyHollowHubcap(profile, id) {
  const progress = normalizeMuddyHollow(profile?.wasteland?.muddyHollow);
  if (profile?.wasteland?.version !== 1 ||
      !MUDDY_HOLLOW_HUBCAP_IDS.includes(id) || progress.hubcaps.includes(id))
    return {profile, collected: false, total: progress.hubcaps.length,
      complete: progress.hubcaps.length === MUDDY_HOLLOW_HUBCAP_IDS.length};
  const hubcaps = [...progress.hubcaps, id].sort((a, b) =>
    MUDDY_HOLLOW_HUBCAP_IDS.indexOf(a) - MUDDY_HOLLOW_HUBCAP_IDS.indexOf(b));
  return {profile: {...profile, wasteland: {...profile.wasteland,
    muddyHollow: {...progress, hubcaps}}}, collected: true, total: hubcaps.length,
    complete: hubcaps.length === MUDDY_HOLLOW_HUBCAP_IDS.length};
}

export function normalizeWasteland(value, legacyWeapons, history = []) {
  const source = record(value) ? value : {};
  // An older build cannot interpret a newer schema. Keep every byte of the
  // nested object; the startup backup gate blocks writes to that career.
  if (Number.isSafeInteger(source.version) && source.version > 1) return {...source};
  const previous = normalizeWeapons(legacyWeapons);
  const nested = normalizeWeapons(source.weapons);
  const weapons = {
    ...nested,
    levels: Object.fromEntries(WEAPON_IDS.map(id => [
      id, Math.max(previous.levels[id], nested.levels[id]),
    ])),
  };
  const loadout = Array.isArray(source.loadout)
    ? [...new Set(source.loadout.filter(id => WEAPON_IDS.includes(id)))].slice(0, 4)
    : [...WEAPON_IDS];
  const crewSource = record(source.crew) ? source.crew : {};
  const crewUnlocked = [...new Set(['rook', ...ids(crewSource.unlocked)])];
  const kits = Object.fromEntries(entries(source.kits).map(([car, item]) => {
    const owned = ids(item?.owned);
    return [car, {owned, equipped: owned.includes(item?.equipped) ? item.equipped : null}];
  }));
  const warPaint = Object.fromEntries(entries(source.warPaint).map(([car, item]) => [
    car, {layers: Array.isArray(item?.layers) ? item.layers.filter(record).slice(0, 32) : []},
  ]));
  const challenges = Object.fromEntries(entries(source.challenges).map(([id, item]) => [
    id, {progress: bounded(item?.progress, 0, 1_000_000), done: item?.done === true},
  ]));
  const bountySource = record(source.bounties) ? source.bounties : {};
  const warlordSource = record(source.warlords) ? source.warlords : {};
  const cards = (Array.isArray(source.cards) ? source.cards : [])
    .filter(item => record(item) && typeof item.id === 'string' &&
      item.id.length > 0 && item.id.length <= 80 &&
      typeof item.kind === 'string' && item.kind.length > 0 && item.kind.length <= 80 &&
      (typeof item.earnedAt === 'string' || Number.isFinite(item.earnedAt)))
    .slice(0, 200)
    .map(item => ({id: item.id, kind: item.kind, earnedAt: item.earnedAt}));
  const xp = bounded(source.xp, 0, 1_000_000_000);
  const territories = {...(record(source.territories) ? source.territories : {}),
    ...Object.fromEntries(Object.entries(TERRITORIES).map(([id]) => {
    const item = record(source.territories?.[id]) ? source.territories[id] : {};
    return [id, {...item, hold: bounded(item.hold, 0, 100), claimed: item.claimed === true}];
  }))};
  return {
    // Unknown future fields remain intact until their owning feature understands
    // them. Known fields are validated so old or damaged saves remain playable.
    ...source,
    version: 1,
    ...normalizeGateDiscovery(source, history),
    muddyHollow: normalizeMuddyHollow(source.muddyHollow),
    xp,
    rank: rankForXp(xp),
    scrap: bounded(source.scrap, 0, 1_000_000_000),
    territories,
    weapons,
    loadout,
    crew: {unlocked: crewUnlocked,
      selected: crewUnlocked.includes(crewSource.selected) ? crewSource.selected : 'rook'},
    kits,
    warPaint,
    challenges,
    bounties: {
      day: typeof bountySource.day === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(bountySource.day) ? bountySource.day : null,
      done: ids(bountySource.done),
      streak: bounded(bountySource.streak, 0, 1_000_000),
    },
    warlords: {defeated: ids(warlordSource.defeated)},
    cards,
    settledResults: ids(source.settledResults, 1000, 180),
  };
}
