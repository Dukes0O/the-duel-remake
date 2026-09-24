import assert from 'node:assert/strict';
import test from 'node:test';
import {ARMOR_KITS, equipArmorKit, getEquippedArmorKit, purchaseArmorKit} from '../src/armor-kits.js';
import {maxArmorForMass} from '../src/combat-armor.js';
import {CARS} from '../src/config.js';
import {Duel} from '../src/game.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {createArmoryScreen} from '../src/screen-armory.js';

function profile({xp = 0, credits = 10000, defeated = []} = {}) {
  const saved = createProfile();
  return {...saved, credits, wasteland: {...saved.wasteland, xp,
    warlords: {defeated}}};
}

test('per-car prices and rank gates require earned notoriety and a beaten warlord', () => {
  assert.deepEqual(Object.values(ARMOR_KITS).map(kit => kit.price), [350, 950, 2500]);
  const stock = profile();
  assert.match(purchaseArmorKit(stock, 'falcone_f42', 'scrapper').reason, /rank 3/);
  const rank3 = profile({xp: 950});
  assert.equal(purchaseArmorKit(rank3, 'falcone_f42', 'scrapper').ok, true);
  assert.match(purchaseArmorKit(rank3, 'falcone_f42', 'raider').reason, /rank 12/);
  const rank12 = profile({xp: 12650});
  assert.match(purchaseArmorKit(rank12, 'falcone_f42', 'warlord').reason, /Defeat a warlord/);
  assert.equal(purchaseArmorKit(profile({xp: 12650, defeated: ['sawtooth-sal']}),
    'falcone_f42', 'warlord').ok, true);
  assert.equal(purchaseArmorKit(profile({xp: 12650, credits: 949}),
    'falcone_f42', 'raider').ok, false);
  assert.equal(purchaseArmorKit(rank12, 'viper_proto', 'scrapper').ok, false);
});

test('buy, equip and remove are scoped to one car and cannot debit twice', () => {
  const starting = profile({xp: 12650});
  const first = purchaseArmorKit(starting, 'falcone_f42', 'scrapper');
  assert.equal(first.cost, 350);
  assert.equal(first.profile.credits, 9650);
  assert.equal(getEquippedArmorKit(first.profile, 'falcone_f42'), 'scrapper');
  const repeat = purchaseArmorKit(first.profile, 'falcone_f42', 'scrapper');
  assert.equal(repeat.ok, false);
  assert.equal(repeat.profile, first.profile);
  const second = purchaseArmorKit(first.profile, 'stuttgart_959s', 'raider');
  assert.equal(second.profile.credits, 8700);
  assert.equal(getEquippedArmorKit(second.profile, 'stuttgart_959s'), 'raider');
  assert.equal(getEquippedArmorKit(second.profile, 'falcone_f42'), 'scrapper');
  assert.equal(equipArmorKit(second.profile, 'falcone_f42', 'raider').ok, false);
  const removed = equipArmorKit(second.profile, 'falcone_f42', null);
  assert.equal(removed.profile.credits, 8700);
  assert.equal(getEquippedArmorKit(removed.profile, 'falcone_f42'), null);
  assert.deepEqual(removed.profile.wasteland.kits.falcone_f42.owned, ['scrapper']);
  assert.equal(equipArmorKit(removed.profile, 'falcone_f42', 'scrapper').ok, true);
  assert.equal(getEquippedArmorKit(normalizeProfile(removed.profile), 'falcone_f42'), null);
});

test('historical profiles, malformed kits and future versions cannot grant free armor', () => {
  const old = createProfile();
  const {wasteland, ...historical} = old;
  historical.weapons = {levels: {ufo: 2, bomb: 1, crossbow: 0, star: 0}};
  assert.match(purchaseArmorKit(historical, 'falcone_f42', 'scrapper').reason,
    /not ready/);
  const migrated = normalizeProfile(historical);
  assert.equal(migrated.wasteland.weapons.levels.ufo, 2);
  assert.deepEqual(migrated.wasteland.kits, {});
  assert.equal(getEquippedArmorKit(migrated, 'falcone_f42'), null);
  const malformed = normalizeProfile({...old, wasteland: {...old.wasteland,
    kits: {falcone_f42: {owned: ['future', 'scrapper'], equipped: 'future'}}}});
  assert.equal(getEquippedArmorKit(malformed, 'falcone_f42'), null);
  const future = {...old, wasteland: {...old.wasteland, version: 2}};
  assert.equal(purchaseArmorKit(future, 'falcone_f42', 'scrapper').ok, false);
  assert.equal(equipArmorKit(future, 'falcone_f42', null).ok, false);
});

test('equipped tier adds only its armor to a flagged Wasteland player', () => {
  const base = maxArmorForMass(CARS.falcone_f42.mass);
  for (const [tier, bonus] of [[null, 0], ['scrapper', 10], ['raider', 20], ['warlord', 30]]) {
    const duel = new Duel({seed: 1989, featureFlags: {wasteland2: true}});
    duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', combatArmorKit: tier});
    assert.equal(duel.state.maxArmor, base + bonus);
    assert.equal(duel.state.armor, base + bonus);
    assert.equal(duel.state.combatArmorKit, tier);
    assert.equal(duel.state.rival.maxArmor, base);
  }
  for (const [mode, wasteland2] of [['duel', true], ['wasteland', false]]) {
    const duel = new Duel({seed: 1989, featureFlags: {wasteland2}});
    duel.startCampaign({mode, car: 'falcone_f42', combatArmorKit: 'warlord'});
    assert.equal(duel.state.combatArmorKit, null);
    assert.equal(duel.state.maxArmor, undefined);
  }
});

test('Armory shows per-car kit choices only with the feature enabled', () => {
  const saved = profile({xp: 950});
  const common = {profile: () => saved, credits: String, escapeHTML: String,
    getGarageMessage: () => '', action: () => ''};
  assert.doesNotMatch(createArmoryScreen(common)(), /ARMOR KITS · PER CAR/);
  const flagged = createArmoryScreen({...common, kitsEnabled: () => true,
    getArmoryCar: () => 'falcone_f42'})();
  assert.match(flagged, /ARMOR KITS · PER CAR/);
  assert.match(flagged, /data-kit-action="buy" data-kit-tier="scrapper"/);
  assert.match(flagged, /Notoriety rank 12 required/);
});
