import {CARS} from './config.js';
import {isCarUnlocked} from './progression.js';
import {rankForXp} from './notoriety.js';
import {normalizeWasteland} from './wasteland-progress.js';

// Prices are per car. Later tiers cost more because they carry stronger plating.
export const ARMOR_KITS = Object.freeze({
  scrapper: Object.freeze({name: 'Scrapper', armor: 10, price: 350, rank: 3}),
  raider: Object.freeze({name: 'Raider', armor: 20, price: 950, rank: 12}),
  warlord: Object.freeze({name: 'Warlord', armor: 30, price: 2500, rank: 1}),
});

export function validArmorKit(id) {
  return Object.hasOwn(ARMOR_KITS, id) ? id : null;
}

export function armorKitBonus(id) {
  return ARMOR_KITS[validArmorKit(id)]?.armor || 0;
}

export function getEquippedArmorKit(profile, car) {
  if (!Object.hasOwn(CARS, car) || !isCarUnlocked(profile, car) ||
      profile?.wasteland?.version !== 1) return null;
  const kit = profile.wasteland.kits?.[car];
  const equipped = validArmorKit(kit?.equipped);
  return equipped && Array.isArray(kit.owned) && kit.owned.includes(equipped)
    ? equipped : null;
}

function currentWasteland(profile) {
  // The startup migration verifies a backup before presenting version 1 to
  // the Armory. A direct caller cannot use a purchase to bypass that gate.
  if (profile?.wasteland?.version !== 1) return null;
  return normalizeWasteland(profile?.wasteland, profile?.weapons);
}

function result(profile, reason) {
  return {profile, ok: false, reason, cost: 0};
}

export function purchaseArmorKit(profile, car, id) {
  const kit = ARMOR_KITS[validArmorKit(id)];
  if (!kit) return result(profile, 'Choose an available armor kit.');
  if (!Object.hasOwn(CARS, car) || !isCarUnlocked(profile, car))
    return result(profile, 'Unlock this car first.');
  const wasteland = currentWasteland(profile);
  if (!wasteland) return result(profile, 'This career is not ready for Wasteland kit changes.');
  const installed = wasteland.kits[car] || {owned: [], equipped: null};
  if (installed.owned.includes(id)) return result(profile, 'This car already owns that kit.');
  const rank = rankForXp(wasteland.xp);
  if (rank < kit.rank) return result(profile, `Reach Notoriety rank ${kit.rank} first.`);
  if (id === 'warlord' && wasteland.warlords.defeated.length === 0)
    return result(profile, 'Defeat a warlord first.');
  const scrapCareer = wasteland.discoveredGate === true;
  const balance = scrapCareer ? wasteland.scrap : profile.credits;
  if (!Number.isSafeInteger(balance) || balance < kit.price)
    return result(profile, `You need ${Math.max(0, kit.price - (balance || 0))} more ${scrapCareer ? 'scrap' : 'credits'}.`);
  return {
    profile: {...profile, credits: scrapCareer ? profile.credits : profile.credits - kit.price,
      wasteland: {...wasteland, ...(scrapCareer ? {scrap: balance - kit.price} : {}), kits: {...wasteland.kits,
        [car]: {owned: [...installed.owned, id], equipped: id}}}},
    ok: true, reason: '', cost: kit.price, equipped: id,
  };
}

export function equipArmorKit(profile, car, id = null) {
  if (!Object.hasOwn(CARS, car) || !isCarUnlocked(profile, car))
    return result(profile, 'Unlock this car first.');
  const wasteland = currentWasteland(profile);
  if (!wasteland) return result(profile, 'This career is not ready for Wasteland kit changes.');
  const installed = wasteland.kits[car] || {owned: [], equipped: null};
  if (id !== null && (!validArmorKit(id) || !installed.owned.includes(id)))
    return result(profile, 'Buy this kit for this car first.');
  if (installed.equipped === id) return result(profile, id ? 'This kit is already equipped.' : 'This car is already stock.');
  return {
    profile: {...profile, wasteland: {...wasteland, kits: {...wasteland.kits,
      [car]: {...installed, equipped: id}}}},
    ok: true, reason: '', cost: 0, equipped: id,
  };
}
