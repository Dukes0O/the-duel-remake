import {CARS} from './config.js';
import {isCarUnlocked} from './progression.js';
import {rankForXp} from './notoriety.js';
import {hasDefeatedWarlord, hasEarnedSideSaws, hasEarnedTurretLook, normalizeWasteland} from './wasteland-progress.js';
import {WARLORDS} from './warlords.js';

// Prices are per car. Later tiers cost more because they carry stronger plating.
export const ARMOR_KITS = Object.freeze({
  // massKg is the plating's weight: a kitted car hits harder and is shoved less.
  scrapper: Object.freeze({name: 'Scrapper', armor: 10, massKg: 90, price: 350, rank: 3}),
  raider: Object.freeze({name: 'Raider', armor: 20, massKg: 180, price: 950, rank: 12}),
  warlord: Object.freeze({name: 'Warlord', armor: 30, massKg: 270, price: 2500, rank: 1}),
});

// Earned items stay separate from the three unchanged paid plating tiers.
export const EARNED_ARMOR_KITS = Object.freeze({
  'side-saws': Object.freeze({name: 'Side Saws', armor: 0, massKg: 0}),
  'turret-look': Object.freeze({name: 'Turret Look', armor: 0, massKg: 0}),
  'chrome-crown': Object.freeze({name: 'Chrome Crown', armor: 0, massKg: 0}),
});

export function validArmorKit(id) {
  return Object.hasOwn(ARMOR_KITS, id) || Object.hasOwn(EARNED_ARMOR_KITS, id) ? id : null;
}

export function armorKitDetails(id) {
  return ARMOR_KITS[validArmorKit(id)] || EARNED_ARMOR_KITS[validArmorKit(id)] || null;
}

export function ownsArmorKit(profile, car, id) {
  if (!Object.hasOwn(CARS, car) || !isCarUnlocked(profile, car) ||
      profile?.wasteland?.version !== 1 || !validArmorKit(id)) return false;
  if (id === 'side-saws') return hasEarnedSideSaws(profile.wasteland);
  if (id === 'turret-look') return hasEarnedTurretLook(profile.wasteland);
  if (earnedOnAnyCar(profile, id)) return true;
  const owned = profile.wasteland.kits?.[car]?.owned;
  return Array.isArray(owned) && owned.includes(id);
}

function earnedOnAnyCar(profile, kit) {
  const saved = profile?.wasteland?.warlords;
  return profile?.wasteland?.version === 1 && Object.values(WARLORDS).some(warlord =>
    warlord.rewardKit === kit && warlord.rewardKitAnyCar === true &&
    (saved?.[warlord.id]?.defeated === true ||
      Array.isArray(saved?.defeated) && saved.defeated.includes(warlord.id)));
}

export function armorKitBonus(id) {
  return ARMOR_KITS[validArmorKit(id)]?.armor || 0;
}

export function armorKitMass(id) {
  return ARMOR_KITS[validArmorKit(id)]?.massKg || 0;
}

export function getEquippedArmorKit(profile, car) {
  if (!Object.hasOwn(CARS, car) || !isCarUnlocked(profile, car) ||
      profile?.wasteland?.version !== 1) return null;
  const kit = profile.wasteland.kits?.[car];
  const equipped = validArmorKit(kit?.equipped);
  return equipped && ownsArmorKit(profile, car, equipped) ? equipped : null;
}

export function getEquippedRoofLook(profile, car) {
  return profile?.wasteland?.kits?.[car]?.roofLook === 'chrome-crown' &&
    !['side-saws', 'turret-look'].includes(profile.wasteland.kits[car].equipped) &&
    ownsArmorKit(profile, car, 'chrome-crown') ? 'chrome-crown' : null;
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
  if (ownsArmorKit({...profile, wasteland}, car, id)) return result(profile, 'This car already owns that kit.');
  const rank = rankForXp(wasteland.xp);
  if (rank < kit.rank) return result(profile, `Reach Notoriety rank ${kit.rank} first.`);
  if (id === 'warlord' && !hasDefeatedWarlord(wasteland.warlords))
    return result(profile, 'Defeat a warlord first.');
  const scrapCareer = wasteland.discoveredGate === true;
  const balance = scrapCareer ? wasteland.scrap : profile.credits;
  if (!Number.isSafeInteger(balance) || balance < kit.price)
    return result(profile, `You need ${Math.max(0, kit.price - (balance || 0))} more ${scrapCareer ? 'scrap' : 'credits'}.`);
  return {
    profile: {...profile, credits: scrapCareer ? profile.credits : profile.credits - kit.price,
      wasteland: {...wasteland, ...(scrapCareer ? {scrap: balance - kit.price} : {}), kits: {...wasteland.kits,
        [car]: {owned: [...installed.owned, id], equipped: id,
          ...(Object.hasOwn(installed, 'roofLook') ? {roofLook: installed.roofLook} : {})}}}},
    ok: true, reason: '', cost: kit.price, equipped: id,
  };
}

export function equipArmorKit(profile, car, id = null) {
  if (!Object.hasOwn(CARS, car) || !isCarUnlocked(profile, car))
    return result(profile, 'Unlock this car first.');
  const wasteland = currentWasteland(profile);
  if (!wasteland) return result(profile, 'This career is not ready for Wasteland kit changes.');
  const installed = wasteland.kits[car] || {owned: [], equipped: null};
  if (id !== null && !ownsArmorKit({...profile, wasteland}, car, id))
    return result(profile, 'Earn or buy this kit first.');
  if (id === 'chrome-crown') {
    if (getEquippedRoofLook(profile, car)) return result(profile, 'This look is already equipped.');
    const equipped = Object.hasOwn(ARMOR_KITS, installed.equipped) ? installed.equipped : null;
    return {profile: {...profile, wasteland: {...wasteland, kits: {...wasteland.kits,
      [car]: {...installed, owned: [...new Set([...installed.owned, id])],
        equipped, roofLook: id}}}}, ok: true, reason: '', cost: 0, equipped: id};
  }
  if (installed.equipped === id && (id !== null || !getEquippedRoofLook(profile, car)))
    return result(profile, id ? 'This kit is already equipped.' : 'This car is already stock.');
  const clearsRoof = id === null || id === 'side-saws' || id === 'turret-look';
  return {
    profile: {...profile, wasteland: {...wasteland, kits: {...wasteland.kits,
      [car]: {...installed, owned: Object.hasOwn(EARNED_ARMOR_KITS, id) || earnedOnAnyCar(profile, id)
        ? [...new Set([...installed.owned, id])] : installed.owned, equipped: id,
        ...(clearsRoof && Object.hasOwn(installed, 'roofLook') ? {roofLook: null} : {})}}}},
    ok: true, reason: '', cost: 0, equipped: id,
  };
}
