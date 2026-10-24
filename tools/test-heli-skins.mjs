// Skins, gear, dirt and the wash (docs/HELI_WILDLIFE.md sections 5 and 6):
// earning at five from each tally (including missions done before H3), the
// buying price by missions done, wearing and the fresh coat, every gear
// effect on and off with its skin, dirt by event, the grime cap and the
// wash. Pure: no storage, no clock, no random.
import assert from 'node:assert/strict';
import {createHeli, createMissions, SKIN_KINDS, DIRT_KINDS, DIRT_MAX, heliOf, normalizeHeli} from '../src/heli/heli-save.js';
import {
  EARN_AT, SKIN_PRICE, WASH, SKINS, GEAR, BASE_GEAR, DIRT_RULES, skinsOf, tallyOf, skinPrice, skinRows, earnSkins, buySkin,
  wearSkin, skinOffer, gearWorn, gearStats, grimeOf, createFlightDirt, addFlightTime, addLanding, addDip, addDrop,
  settleFlightDirt, addDirt, washHelicopter,
} from '../src/heli/heli-skins.js';

let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
const on = {enabled: true};
// A frozen profile, so any change in place throws.
const make = ({credits = 5000, missions, skins, dirt} = {}) => {
  const heli = {...createHeli()};
  if (missions) heli.missions = {...createMissions(), ...missions};
  if (skins) heli.skins = skins;
  if (dirt) heli.dirt = {dust: 0, mud: 0, soot: 0, salt: 0, ...dirt};
  return deepFreeze({credits, heli});
};
const TALLY_FIELD = {fire: 'firesOut', medevac: 'hoists', rescue: 'searches', wildlife: 'wildlifeCounts', supply: 'supplies'};
const dirtOf = profile => heliOf(profile).dirt;
const zero = {dust: 0, mud: 0, soot: 0, salt: 0};

check('the tables hold the packet numbers', () => {
  assert.equal(EARN_AT, 5);
  assert.deepEqual({...SKIN_PRICE}, {base: 2500, perMission: 400, floor: 900, tv: 2500});
  assert.deepEqual({...WASH}, {cost: 100, hintAbove: 80});
  assert.deepEqual(Object.keys(SKINS), ['stock', ...SKIN_KINDS]);
  assert.deepEqual(SKINS.fire.look, ['red', 'yellow', 'white']);
  assert.deepEqual(SKINS.medevac.look, ['white', 'white', 'red']);
  assert.deepEqual(SKINS.rescue.look, ['rescue yellow', 'red', 'black']);
  assert.deepEqual(SKINS.wildlife.look, ['olive', 'brown', 'dark green']);
  assert.deepEqual(SKINS.supply.look, ['orange', 'white', 'black']);
  assert.deepEqual(SKINS.tv.look, ['black', 'black', 'gold']);
  assert.deepEqual(SKINS.stock.look, ['white', 'navy', 'red']);
  for (const [kind, field] of Object.entries(TALLY_FIELD)) assert.equal(SKINS[kind].tally, field, kind);
  assert.equal(SKINS.tv.tally, null);
  assert.equal(SKINS.stock.tally, null);
  for (const table of [SKIN_PRICE, WASH, SKINS, GEAR, BASE_GEAR, DIRT_RULES]) assert.equal(Object.isFrozen(table), true);
});

check('every skin names its gear and the gear names its skin', () => {
  for (const kind of SKIN_KINDS) {
    assert.equal(SKINS[kind].gear.length, kind === 'tv' ? 1 : 2, kind);
    for (const id of SKINS[kind].gear) assert.equal(GEAR[id].skin, kind, id);
  }
  assert.equal(Object.keys(GEAR).length, 11);
  assert.deepEqual(SKINS.stock.gear, []);
});

check('missions are read from the saved counts, and a new save has none', () => {
  const plain = make();
  for (const kind of SKIN_KINDS) assert.equal(tallyOf(plain, kind), 0, kind);
  assert.equal(tallyOf({}, 'fire'), 0);
  assert.equal(tallyOf(plain, 'stock'), 0);
  assert.equal(tallyOf(plain, 'nope'), 0);
  const some = make({missions: {firesOut: 3, hoists: 2, searches: 4, supplies: 1, wildlifeCounts: 5, cameraFlights: 9}});
  assert.equal(tallyOf(some, 'fire'), 3);
  assert.equal(tallyOf(some, 'medevac'), 2);
  assert.equal(tallyOf(some, 'rescue'), 4);
  assert.equal(tallyOf(some, 'supply'), 1);
  assert.equal(tallyOf(some, 'wildlife'), 5);
  assert.equal(tallyOf(some, 'tv'), 0, 'camera flights never earn the TV skin');
});

check('a skin is earned at the fifth mission of its kind, from each tally', () => {
  for (const [kind, field] of Object.entries(TALLY_FIELD)) {
    const four = make({missions: {[field]: 4}});
    const none = earnSkins(four, on);
    assert.deepEqual(none.earned, [], kind);
    assert.equal(none.profile, four, 'nothing earned changes nothing: ' + kind);
    const five = earnSkins(make({missions: {[field]: 5}}), on);
    assert.deepEqual(five.earned, [kind], kind);
    assert.equal(five.first, true);
    assert.deepEqual(skinsOf(five.profile), {owned: [kind], worn: 'stock', fresh: [kind]}, kind);
    const many = earnSkins(make({missions: {[field]: 12}}), on);
    assert.deepEqual(skinsOf(many.profile).owned, [kind]);
  }
});

check('other missions and camera flights do not earn the fire or TV skin', () => {
  const result = earnSkins(make({missions: {hoists: 9, searches: 9, supplies: 9, cameraFlights: 50}}), on);
  assert.deepEqual(result.earned, ['medevac', 'rescue', 'supply']);
  assert.equal(skinsOf(result.profile).owned.includes('fire'), false);
  assert.equal(skinsOf(result.profile).owned.includes('tv'), false);
});

check('missions done before H3 count: a save with old counts and no skins earns them at once', () => {
  const old = make({missions: {firesOut: 7, hoists: 5}});
  assert.equal(heliOf(old).skins, undefined);
  const result = earnSkins(old, on);
  assert.deepEqual(result.earned, ['fire', 'medevac']);
  assert.equal(result.first, true);
  assert.deepEqual(skinsOf(result.profile).fresh, ['fire', 'medevac']);
});

check('the first skin is whichever kind reaches five first, and only that one is "first"', () => {
  const afterFirst = earnSkins(make({missions: {searches: 5}}), on).profile;
  assert.deepEqual(skinsOf(afterFirst).owned, ['rescue']);
  const next = earnSkins({...afterFirst, heli: {...heliOf(afterFirst), missions: {...createMissions(), searches: 5, firesOut: 5}}}, on);
  assert.deepEqual(next.earned, ['fire']);
  assert.equal(next.first, false);
  assert.deepEqual(skinsOf(next.profile).owned, ['rescue', 'fire'], 'the first earned stays first');
});

check('an owned skin is never earned twice, taken away, or lost when the count falls', () => {
  const earned = earnSkins(make({missions: {firesOut: 5}}), on).profile;
  const again = earnSkins(earned, on);
  assert.deepEqual(again.earned, []);
  assert.equal(again.profile, earned);
  const fell = {...earned, heli: {...heliOf(earned), missions: {...heliOf(earned).missions, firesOut: 4}}};
  assert.deepEqual(skinsOf(fell).owned, ['fire']);
  assert.deepEqual(earnSkins(fell, on).earned, []);
});

check('earning leaves the other helicopter fields and the credits alone', () => {
  const base = make({credits: 321, missions: {firesOut: 5}});
  const result = earnSkins(base, on).profile;
  assert.equal(result.credits, 321);
  const {skins, ...rest} = heliOf(result);
  assert.deepEqual(rest, heliOf(base));
});

check('the buying price falls 400 for each mission done and never goes below 900', () => {
  const expected = [2500, 2100, 1700, 1300, 900];
  for (const [kind, field] of Object.entries(TALLY_FIELD))
    for (let done = 0; done <= 4; done++) assert.equal(skinPrice(make({missions: {[field]: done}}), kind), expected[done], `${kind} ${done}`);
  assert.equal(skinPrice(make({missions: {firesOut: 5}}), 'fire'), 900);
  assert.equal(skinPrice(make({missions: {firesOut: 40}}), 'fire'), 900, 'the floor');
  assert.equal(skinPrice(make({missions: {firesOut: 1, hoists: 3}}), 'medevac'), 1300, 'only missions of that kind');
});

check('the TV skin costs 2,500 whatever else is done', () => {
  assert.equal(skinPrice(make(), 'tv'), 2500);
  assert.equal(skinPrice(make({missions: {firesOut: 4, hoists: 4, searches: 4, supplies: 4, wildlifeCounts: 4, cameraFlights: 4}}), 'tv'), 2500);
});

check('a price is only given for a skin', () => {
  assert.equal(skinPrice(make(), 'stock'), null);
  assert.equal(skinPrice(make(), 'nope'), null);
  assert.equal(skinPrice(make(), undefined), null);
});

check('buying takes the whole price once, owns the skin and leaves it fresh', () => {
  const profile = make({credits: 3000, missions: {hoists: 2}});
  const bought = buySkin(profile, 'medevac', on);
  assert.equal(bought.ok, true);
  assert.equal(bought.price, 1700);
  assert.equal(bought.profile.credits, 1300);
  assert.deepEqual(skinsOf(bought.profile), {owned: ['medevac'], worn: 'stock', fresh: ['medevac']});
  assert.equal(profile.credits, 3000, 'the old profile is untouched');
  const twice = buySkin(bought.profile, 'medevac', on);
  assert.equal(twice.ok, false);
  assert.equal(twice.profile, bought.profile, 'a second buy charges nothing');
  assert.equal(twice.profile.credits, 1300);
});

check('buying with too few credits takes nothing and says how many are missing', () => {
  const profile = make({credits: 2499});
  const result = buySkin(profile, 'tv', on);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'You need 1 more credit.');
  assert.equal(result.profile, profile);
  assert.equal(buySkin(make({credits: 0}), 'supply', on).reason, 'You need 2,500 more credits.');
  assert.equal(buySkin(make({credits: 2500}), 'tv', on).profile.credits, 0, 'exactly enough');
});

check('buying keeps the order skins were gained in and keeps the worn skin', () => {
  let profile = earnSkins(make({credits: 9000, missions: {firesOut: 5}}), on).profile;
  profile = wearSkin(profile, 'fire', on).profile;
  profile = buySkin(profile, 'wildlife', on).profile;
  assert.deepEqual(skinsOf(profile), {owned: ['fire', 'wildlife'], worn: 'fire', fresh: ['wildlife']});
});

check('a skin whose five missions are done is earned, so it is not sold', () => {
  const profile = make({credits: 9000, missions: {firesOut: 5}});
  const result = buySkin(profile, 'fire', on);
  assert.equal(result.ok, false);
  assert.equal(result.profile, profile);
});

check('buying refuses stock, unknown names and anything with the switch off', () => {
  const profile = make({credits: 9000});
  for (const kind of ['stock', 'nope', undefined, 7]) {
    const result = buySkin(profile, kind, on);
    assert.equal(result.ok, false, String(kind));
    assert.equal(result.profile, profile);
  }
  for (const flag of [{}, {enabled: false}, {enabled: 'yes'}, undefined]) {
    const result = buySkin(profile, 'tv', flag);
    assert.equal(result.ok, false);
    assert.equal(result.profile, profile);
  }
});

check('wearing an owned skin or the stock paint; an unowned skin cannot be worn', () => {
  const owned = earnSkins(make({missions: {firesOut: 5}}), on).profile;
  const worn = wearSkin(owned, 'fire', on);
  assert.equal(worn.ok, true);
  assert.equal(skinsOf(worn.profile).worn, 'fire');
  const back = wearSkin(worn.profile, 'stock', on);
  assert.equal(back.ok, true);
  assert.equal(back.freshCoat, false);
  assert.equal(skinsOf(back.profile).worn, 'stock');
  for (const bad of ['medevac', 'nope', undefined]) {
    const result = wearSkin(owned, bad, on);
    assert.equal(result.ok, false, String(bad));
    assert.equal(result.profile, owned);
  }
  assert.equal(wearSkin(owned, 'fire').ok, false, 'switch off');
});

check('the first wearing of a new skin is a fresh coat: all dirt goes to 0, and only the first time', () => {
  const dirty = make({missions: {firesOut: 5}, dirt: {dust: 20, mud: 5, soot: 3, salt: 1}});
  const owned = earnSkins(dirty, on).profile;
  const first = wearSkin(owned, 'fire', on);
  assert.equal(first.freshCoat, true);
  assert.deepEqual(dirtOf(first.profile), zero);
  assert.deepEqual(skinsOf(first.profile).fresh, []);
  const dirtyAgain = addDirt(first.profile, {dust: 10}, on).profile;
  const toStock = wearSkin(dirtyAgain, 'stock', on);
  assert.equal(dirtOf(toStock.profile).dust, 10, 'stock paint is not a fresh coat');
  const second = wearSkin(toStock.profile, 'fire', on);
  assert.equal(second.freshCoat, false);
  assert.equal(dirtOf(second.profile).dust, 10, 'the same skin again keeps its dirt');
});

check('changing to a second fresh skin cleans again', () => {
  let profile = earnSkins(make({missions: {firesOut: 5, hoists: 5}, dirt: {mud: 7}}), on).profile;
  profile = wearSkin(profile, 'fire', on).profile;
  assert.equal(dirtOf(profile).mud, 0);
  profile = addDirt(profile, {mud: 7}, on).profile;
  const other = wearSkin(profile, 'medevac', on);
  assert.equal(other.freshCoat, true);
  assert.deepEqual(dirtOf(other.profile), zero);
});

check('wearing the skin already worn changes nothing', () => {
  const profile = make();
  const result = wearSkin(profile, 'stock', on);
  assert.equal(result.ok, true);
  assert.equal(result.already, true);
  assert.equal(result.profile, profile);
});

check('a fit button offers a skin only when it is owned and not worn', () => {
  const profile = earnSkins(make({missions: {firesOut: 5}}), on).profile;
  assert.equal(skinOffer(profile, 'fire'), 'fire');
  assert.equal(skinOffer(profile, 'medevac'), null, 'not owned');
  assert.equal(skinOffer(wearSkin(profile, 'fire', on).profile, 'fire'), null, 'already worn');
  assert.equal(skinOffer(profile, 'stock'), null);
  assert.equal(skinOffer(profile, 'nope'), null);
});

check('the paint shop rows give the tally toward five, what is owned, worn and fresh, and the price', () => {
  const profile = earnSkins(make({missions: {firesOut: 5, hoists: 3}}), on).profile;
  const rows = skinRows(wearSkin(profile, 'fire', on).profile);
  assert.deepEqual(rows.map(row => row.kind), SKIN_KINDS);
  const fire = rows.find(row => row.kind === 'fire'), medevac = rows.find(row => row.kind === 'medevac'), tv = rows.find(row => row.kind === 'tv');
  assert.deepEqual(fire, {kind: 'fire', name: 'Fire service', tally: 5, need: 5, owned: true, worn: true, fresh: false, price: 900});
  assert.deepEqual(medevac, {kind: 'medevac', name: 'Medevac', tally: 3, need: 5, owned: false, worn: false, fresh: false, price: 1300});
  assert.equal(tv.need, null);
  assert.equal(tv.price, 2500);
});

check('the stock paint has no gear and gives the base kit exactly', () => {
  assert.deepEqual(gearWorn(make(), on), []);
  assert.deepEqual(gearStats(make(), on), {...BASE_GEAR});
  assert.deepEqual(BASE_GEAR, {litreGauge: false, dropSight: false, lineMin: 15, lineMax: 15, reelSpeed: 0,
    bumpHurtAbove: null, bumpTwoStepsAbove: null, hoistPayBonus: 0, searchNightMinutes: 0, heatRange: 0, heatBuriedRange: 0,
    heatAnimals: false, scareDistance: 100, countReach: 60, crates: 1, hookReach: 4, hookLimitKg: 1500, noseCamera: false});
});

// What each skin's gear must set, from section 5.3.
const GEAR_EXPECTED = {
  fire: {litreGauge: true, dropSight: true},
  medevac: {lineMin: 5, lineMax: 40, reelSpeed: 1.5, bumpHurtAbove: 8, bumpTwoStepsAbove: 14, hoistPayBonus: 200},
  rescue: {searchNightMinutes: 8, heatRange: 150, heatBuriedRange: 30, heatAnimals: true},
  wildlife: {scareDistance: 50, countReach: 100},
  supply: {crates: 2, hookReach: 6.7},
  tv: {noseCamera: true},
};
const wearing = kind => make({skins: {owned: [kind], worn: kind, fresh: []}});

check('every skin sets exactly its gear numbers while worn, and nothing else', () => {
  for (const kind of SKIN_KINDS) assert.deepEqual(gearStats(wearing(kind), on), {...BASE_GEAR, ...GEAR_EXPECTED[kind]}, kind);
});

check('each piece of gear sets only its own numbers', () => {
  const keysByGear = {
    'water-gauge': ['litreGauge'], 'drop-sight': ['dropSight'], winch: ['lineMin', 'lineMax', 'reelSpeed'],
    stretcher: ['bumpHurtAbove', 'bumpTwoStepsAbove', 'hoistPayBonus'], searchlight: ['searchNightMinutes'],
    'heat-camera': ['heatRange', 'heatBuriedRange', 'heatAnimals'], 'quiet-tips': ['scareDistance'], 'zoom-camera': ['countReach'],
    'cargo-net': ['crates'], 'strong-hook': ['hookReach'], 'nose-camera': ['noseCamera'],
  };
  assert.deepEqual(Object.keys(GEAR).sort(), Object.keys(keysByGear).sort());
  for (const [id, keys] of Object.entries(keysByGear)) assert.deepEqual(Object.keys(GEAR[id].effect), keys, id);
});

check('the gear numbers match the packet one by one', () => {
  const worn = kind => gearStats(wearing(kind), on);
  assert.equal(worn('fire').litreGauge, true);
  assert.equal(worn('fire').dropSight, true);
  assert.equal(worn('medevac').lineMin, 5);
  assert.equal(worn('medevac').lineMax, 40);
  assert.equal(worn('medevac').reelSpeed, 1.5);
  assert.equal(worn('medevac').bumpHurtAbove, 8);
  assert.equal(worn('medevac').bumpTwoStepsAbove, 14);
  assert.equal(worn('medevac').hoistPayBonus, 200);
  assert.equal(worn('rescue').searchNightMinutes, 8);
  assert.equal(worn('rescue').heatRange, 150);
  assert.equal(worn('rescue').heatBuriedRange, 30);
  assert.equal(worn('rescue').heatAnimals, true);
  assert.equal(worn('wildlife').scareDistance, 50);
  assert.equal(worn('wildlife').countReach, 100);
  assert.equal(worn('supply').crates, 2);
  assert.equal(worn('supply').hookReach, 6.7);
  assert.equal(worn('supply').hookLimitKg, 1500, 'the hook limit stays 1,500 kg');
  assert.equal(worn('tv').noseCamera, true);
});

check('gear works only while its skin is worn: owned but not worn gives the base kit', () => {
  for (const kind of SKIN_KINDS) {
    const profile = make({skins: {owned: [kind], worn: 'stock', fresh: []}});
    assert.deepEqual(gearStats(profile, on), {...BASE_GEAR}, kind);
    assert.deepEqual(gearWorn(profile, on), []);
  }
});

check('gear works only with the switch on', () => {
  for (const kind of SKIN_KINDS) {
    const profile = wearing(kind);
    for (const flag of [{}, {enabled: false}, undefined]) {
      assert.deepEqual(gearStats(profile, flag), {...BASE_GEAR}, kind);
      assert.deepEqual(gearWorn(profile, flag), []);
    }
    assert.deepEqual(gearWorn(profile, on), SKINS[kind].gear);
  }
});

check('wearing a skin turns its gear on and wearing another turns it off', () => {
  let profile = earnSkins(make({missions: {firesOut: 5, hoists: 5}}), on).profile;
  assert.equal(gearStats(profile, on).lineMax, 15);
  profile = wearSkin(profile, 'medevac', on).profile;
  assert.equal(gearStats(profile, on).lineMax, 40);
  assert.equal(gearStats(profile, on).dropSight, false);
  profile = wearSkin(profile, 'fire', on).profile;
  assert.equal(gearStats(profile, on).lineMax, 15);
  assert.equal(gearStats(profile, on).dropSight, true);
});

check('the dirt table holds the packet numbers', () => {
  assert.equal(DIRT_RULES.dust.engineSeconds, 600);
  assert.equal(DIRT_RULES.dust.lowSeconds, 120);
  assert.equal(DIRT_RULES.dust.lowHeight, 30);
  assert.equal(DIRT_RULES.dust.landing, 2);
  assert.deepEqual([...DIRT_RULES.dust.courses], ['panorama-ridge', 'summit-run', 'summit-time-attack']);
  assert.equal(DIRT_RULES.mud.landing, 3);
  assert.equal(DIRT_RULES.mud.dip, 1);
  assert.deepEqual([...DIRT_RULES.mud.courses], ['tremblant-woods', 'tremblant-snow']);
  assert.equal(DIRT_RULES.soot.drop, 2);
  assert.equal(DIRT_RULES.soot.dropRadius, 30);
  assert.equal(DIRT_RULES.soot.fireSeconds, 60);
  assert.equal(DIRT_RULES.soot.fireRadius, 100);
  assert.equal(DIRT_RULES.salt.seaSeconds, 120);
  assert.equal(DIRT_RULES.salt.seaHeight, 50);
});

const gainsOf = record => settleFlightDirt(record).gains;
const fly = (seconds, ctx) => addFlightTime(createFlightDirt(), seconds, ctx);

check('dust: 1 for each 10 minutes of engine time anywhere', () => {
  assert.deepEqual(gainsOf(fly(599, {courseId: 'tremblant-woods', height: 100})), zero);
  assert.deepEqual(gainsOf(fly(600, {courseId: 'tremblant-woods', height: 100})), {...zero, dust: 1});
  assert.deepEqual(gainsOf(fly(6000, {courseId: 'harbour-lights', height: 500})), {...zero, dust: 10});
  assert.deepEqual(gainsOf(fly(1200, {})), {...zero, dust: 2});
});

check('dust: also 1 for each 2 minutes below 30 m over Panorama Ridge or Summit Run', () => {
  for (const courseId of ['panorama-ridge', 'summit-run']) {
    assert.deepEqual(gainsOf(fly(119, {courseId, height: 10})), zero, courseId);
    assert.deepEqual(gainsOf(fly(120, {courseId, height: 29.9})), {...zero, dust: 1}, courseId);
    assert.deepEqual(gainsOf(fly(600, {courseId, height: 10})), {...zero, dust: 5 + 1}, courseId + ' low time and engine time add');
    assert.deepEqual(gainsOf(fly(600, {courseId, height: 30})), {...zero, dust: 1}, courseId + ' 30 m is not below 30 m');
    assert.deepEqual(gainsOf(fly(600, {courseId, height: 80})), {...zero, dust: 1}, courseId + ' high');
  }
  assert.deepEqual(gainsOf(fly(600, {courseId: 'tremblant-woods', height: 5})), {...zero, dust: 1}, 'low over another course is only engine time');
  assert.deepEqual(gainsOf(fly(240, {courseId: 'panorama-ridge'})), zero, 'no height, no low time');
});

check('dust: 2 for each landing off a pad at Panorama Ridge or Summit Run', () => {
  for (const courseId of ['panorama-ridge', 'summit-run']) {
    assert.deepEqual(gainsOf(addLanding(createFlightDirt(), courseId, {onPad: false})), {...zero, dust: 2}, courseId);
    assert.deepEqual(gainsOf(addLanding(createFlightDirt(), courseId, {})), {...zero, dust: 2}, courseId);
    assert.deepEqual(gainsOf(addLanding(createFlightDirt(), courseId, {onPad: true})), zero, courseId + ' on the pad');
  }
  let record = createFlightDirt();
  for (let i = 0; i < 3; i++) record = addLanding(record, 'summit-run', {});
  assert.equal(gainsOf(record).dust, 6);
});

check('mud: 3 for each landing off a pad at Tremblant Woods or Tremblant Snow', () => {
  for (const courseId of ['tremblant-woods', 'tremblant-snow']) {
    assert.deepEqual(gainsOf(addLanding(createFlightDirt(), courseId, {onPad: false})), {...zero, mud: 3}, courseId);
    assert.deepEqual(gainsOf(addLanding(createFlightDirt(), courseId, {onPad: true})), zero, courseId + ' on the pad');
  }
  assert.deepEqual(gainsOf(addLanding(createFlightDirt(), 'harbour-lights', {})), zero, 'no dirt from a landing elsewhere');
  assert.deepEqual(gainsOf(addLanding(createFlightDirt(), undefined, {})), zero);
});

check('mud: 1 for each bucket dip', () => {
  let record = createFlightDirt();
  for (let i = 0; i < 4; i++) record = addDip(record);
  assert.deepEqual(gainsOf(record), {...zero, mud: 4});
});

check('soot: 2 for each water drop within 30 m of a burning cell', () => {
  assert.deepEqual(gainsOf(addDrop(createFlightDirt(), 0)), {...zero, soot: 2});
  assert.deepEqual(gainsOf(addDrop(createFlightDirt(), 30)), {...zero, soot: 2});
  assert.deepEqual(gainsOf(addDrop(createFlightDirt(), 30.1)), zero);
  assert.deepEqual(gainsOf(addDrop(createFlightDirt(), null)), zero, 'no fire');
  assert.deepEqual(gainsOf(addDrop(addDrop(createFlightDirt(), 10), 10)), {...zero, soot: 4});
});

check('soot: 1 for each minute within 100 m of a fire', () => {
  assert.deepEqual(gainsOf(fly(59, {fireDistance: 50})), zero);
  assert.deepEqual(gainsOf(fly(60, {fireDistance: 100})), {...zero, soot: 1});
  assert.deepEqual(gainsOf(fly(180, {fireDistance: 0})), {...zero, soot: 3});
  assert.deepEqual(gainsOf(fly(180, {fireDistance: 100.5})), zero);
  assert.deepEqual(gainsOf(fly(180, {fireDistance: null})), zero);
  assert.deepEqual(gainsOf(fly(180, {})), zero);
});

check('salt: 1 for each 2 minutes below 50 m over the sea', () => {
  assert.deepEqual(gainsOf(fly(119, {overSea: true, height: 20})), zero);
  assert.deepEqual(gainsOf(fly(120, {overSea: true, height: 49.9})), {...zero, salt: 1});
  assert.deepEqual(gainsOf(fly(240, {overSea: true, height: 50})), zero, '50 m is not below 50 m');
  assert.deepEqual(gainsOf(fly(240, {overSea: false, height: 10})), zero, 'not over the sea');
  assert.deepEqual(gainsOf(fly(240, {overSea: true})), zero, 'no height');
});

check('a flight tally adds up its stretches and keeps part intervals for later', () => {
  let record = createFlightDirt();
  for (let i = 0; i < 25; i++) record = addFlightTime(record, 40, {courseId: 'summit-run', height: 10, fireDistance: 80});
  const {gains, rest} = settleFlightDirt(record);
  assert.deepEqual(gains, {dust: 1 + 8, mud: 0, soot: 16, salt: 0});
  assert.deepEqual(rest, {...createFlightDirt(), engineSeconds: 400, lowDrySeconds: 40, nearFireSeconds: 40});
  assert.deepEqual(gainsOf(rest), zero);
  const carried = settleFlightDirt(addFlightTime(rest, 20, {courseId: 'summit-run', height: 10, fireDistance: 80}));
  assert.deepEqual(carried.gains, {dust: 0, mud: 0, soot: 1, salt: 0}, 'the remainder joins the next stretch');
});

check('many small steps settle exactly like one big step, for every kind with an interval', () => {
  const ctx = {courseId: 'summit-run', height: 10, fireDistance: 50, overSea: true};
  for (const seconds of [6000, 7200, 600, 120]) {
    let small = createFlightDirt();
    for (let i = 0; i < seconds * 60; i++) small = addFlightTime(small, 1 / 60, ctx);
    const big = settleFlightDirt(addFlightTime(createFlightDirt(), seconds, ctx)), many = settleFlightDirt(small);
    assert.deepEqual(many.gains, big.gains, `${seconds} s gains`);
    for (const field of ['engineSeconds', 'lowDrySeconds', 'nearFireSeconds', 'lowSeaSeconds']) {
      assert.ok(many.rest[field] >= 0, `${seconds} s ${field} never negative`);
      assert.ok(Math.abs(many.rest[field] - big.rest[field]) < 1e-6, `${seconds} s ${field} leftover`);
    }
  }
  const tenMinutes = settleFlightDirt((() => { let r = createFlightDirt(); for (let i = 0; i < 6000 * 60; i++) r = addFlightTime(r, 1 / 60, {}); return r; })());
  assert.equal(tenMinutes.gains.dust, 10, '6000 s of engine time is exactly 10 levels of dust');
});

check('bad time stretches add nothing and the record is never changed in place', () => {
  const record = deepFreeze(createFlightDirt());
  for (const seconds of [0, -5, NaN, Infinity, 'x', undefined]) assert.equal(addFlightTime(record, seconds, {}), record, String(seconds));
  assert.equal(addLanding(record, 'summit-run', {}).dustLandings, 1);
  assert.equal(record.dustLandings, 0);
});

check('the same flight always gives the same dirt', () => {
  const run = () => {
    let record = createFlightDirt();
    record = addFlightTime(record, 900, {courseId: 'panorama-ridge', height: 12});
    record = addLanding(record, 'panorama-ridge', {});
    record = addDip(addDrop(record, 12));
    return settleFlightDirt(record);
  };
  assert.deepEqual(run(), run());
});

check('dirt is added in whole levels, kind by kind, to a save with none', () => {
  const result = addDirt(make(), {dust: 3, mud: 2}, on);
  assert.equal(result.ok, true);
  assert.deepEqual(dirtOf(result.profile), {dust: 3, mud: 2, soot: 0, salt: 0});
  const more = addDirt(result.profile, {dust: 1, salt: 4}, on);
  assert.deepEqual(dirtOf(more.profile), {dust: 4, mud: 2, soot: 0, salt: 4});
});

check('nothing to add changes nothing and bad amounts are ignored', () => {
  const profile = make({dirt: {dust: 5}});
  assert.equal(addDirt(profile, zero, on).profile, profile);
  assert.equal(addDirt(profile, {dust: -3, mud: 1.5, soot: NaN, salt: 'x'}, on).profile, profile);
  assert.equal(addDirt(profile, null, on).ok, false);
  assert.equal(addDirt(profile, {dust: 1}).ok, false, 'switch off');
  assert.equal(addDirt(profile, {dust: 1}, {enabled: false}).profile, profile);
});

check('each kind stops at 100', () => {
  const result = addDirt(make({dirt: {dust: 95}}), {dust: 50}, on);
  assert.equal(dirtOf(result.profile).dust, 100);
  assert.equal(DIRT_MAX, 100);
});

check('the four kinds together stop at 100: the drawn grime', () => {
  const start = make({dirt: {dust: 40, mud: 30, soot: 20}});
  assert.equal(grimeOf(start), 90);
  const result = addDirt(start, {salt: 10}, on);
  assert.deepEqual(dirtOf(result.profile), {dust: 40, mud: 30, soot: 20, salt: 10});
  assert.equal(grimeOf(result.profile), 100);
  assert.equal(addDirt(result.profile, {dust: 0}, on).profile, result.profile, 'nothing added, nothing changes');
});

check('a full coat: new dirt goes on and the same amount comes off the others, largest first', () => {
  const dusty = make({dirt: {dust: 100}});
  const sooty = addDirt(dusty, {soot: 30}, on);
  assert.deepEqual(dirtOf(sooty.profile), {dust: 70, mud: 0, soot: 30, salt: 0}, 'a fire after a dusty week turns the coat sooty');
  const more = addDirt(sooty.profile, {mud: 5}, on);
  assert.deepEqual(dirtOf(more.profile), {dust: 65, mud: 5, soot: 30, salt: 0}, 'the coat was full again, so dust gives way');
  const full = make({dirt: {dust: 50, mud: 30, soot: 20}});
  assert.deepEqual(dirtOf(addDirt(full, {salt: 10}, on).profile), {dust: 40, mud: 30, soot: 20, salt: 10});
  assert.deepEqual(dirtOf(addDirt(full, {salt: 25}, on).profile), {dust: 27, mud: 28, soot: 20, salt: 25}, 'levelled from the top: dust 50 to 30, then dust and mud shaved in turn');
});

check('when kinds are level the one first in the order dust, mud, soot, salt gives way first', () => {
  const level = make({dirt: {dust: 40, mud: 40, soot: 20}});
  assert.deepEqual(dirtOf(addDirt(level, {salt: 1}, on).profile), {dust: 39, mud: 40, soot: 20, salt: 1});
  assert.deepEqual(dirtOf(addDirt(level, {salt: 2}, on).profile), {dust: 39, mud: 39, soot: 20, salt: 2});
  const three = make({dirt: {dust: 0, mud: 34, soot: 33, salt: 33}});
  assert.deepEqual(dirtOf(addDirt(three, {dust: 1}, on).profile), {dust: 1, mud: 33, soot: 33, salt: 33});
  assert.deepEqual(dirtOf(addDirt(three, {dust: 2}, on).profile), {dust: 2, mud: 32, soot: 33, salt: 33}, 'mud 33 ties soot and salt and goes first');
});

check('the added kind never loses dirt, no kind goes below 0 or above 100, and the sum is exactly 100 when full', () => {
  const starts = [{dust: 100}, {mud: 100}, {dust: 25, mud: 25, soot: 25, salt: 25}, {dust: 97, mud: 3}, {dust: 1, mud: 1, soot: 98}, {salt: 60, soot: 40}];
  for (const start of starts)
    for (const kind of DIRT_KINDS)
      for (const amount of [1, 7, 50, 100, 500]) {
        const before = dirtOf(make({dirt: start})), result = dirtOf(addDirt(make({dirt: start}), {[kind]: amount}, on).profile);
        const sum = DIRT_KINDS.reduce((total, other) => total + result[other], 0);
        assert.ok(DIRT_KINDS.every(other => result[other] >= 0 && result[other] <= 100), JSON.stringify([start, kind, amount]));
        assert.ok(result[kind] >= before[kind], 'the added kind never loses');
        assert.equal(sum, Math.min(100, DIRT_KINDS.reduce((total, other) => total + before[other], 0) + amount), JSON.stringify([start, kind, amount]));
      }
});

check('several kinds at once on a full coat keep the sum at 100', () => {
  const result = addDirt(make({dirt: {dust: 100}}), {mud: 20, soot: 20, salt: 20}, on);
  const dirt = dirtOf(result.profile);
  assert.equal(DIRT_KINDS.reduce((total, kind) => total + dirt[kind], 0), 100);
  assert.deepEqual(dirt, {dust: 40, mud: 20, soot: 20, salt: 20});
});

check('a coat over 100 from a hand-edited save comes back to 100 with the next dirt', () => {
  const result = addDirt(make({dirt: {dust: 100, mud: 100}}), {soot: 10}, on);
  assert.equal(grimeOf(result.profile), 100);
  assert.equal(dirtOf(result.profile).soot, 10);
});

check('the grime is the sum, capped, and 0 for a save with no dirt', () => {
  assert.equal(grimeOf(make()), 0);
  assert.equal(grimeOf({}), 0);
  assert.equal(grimeOf(make({dirt: {dust: 1, mud: 2, soot: 3, salt: 4}})), 10);
  assert.equal(grimeOf(make({dirt: {dust: 100, mud: 100, soot: 100, salt: 100}})), 100);
});

check('Brian suggests a wash when the grime first passes 80, once', () => {
  assert.equal(addDirt(make({dirt: {dust: 79}}), {dust: 1}, on).hint, false, '80 does not pass 80');
  assert.equal(addDirt(make({dirt: {dust: 79}}), {dust: 2}, on).hint, true);
  assert.equal(addDirt(make({dirt: {dust: 85}}), {dust: 2}, on).hint, false, 'already past 80');
  assert.equal(addDirt(make(), {dust: 81}, on).hint, true, 'a big jump counts');
  assert.equal(addDirt(make({dirt: {dust: 20}}), {mud: 3}, on).hint, false);
});

check('the wash costs 100 credits on the ground and sets every dirt to 0', () => {
  const profile = make({credits: 450, dirt: {dust: 30, mud: 20, soot: 10, salt: 5}});
  const result = washHelicopter(profile, {enabled: true, onGround: true});
  assert.equal(result.ok, true);
  assert.equal(result.price, 100);
  assert.equal(result.profile.credits, 350);
  assert.deepEqual(dirtOf(result.profile), zero);
  assert.equal(grimeOf(result.profile), 0);
  assert.equal(profile.credits, 450, 'the old profile is untouched');
});

check('a wash never charges twice: the clean helicopter is not washed again', () => {
  const dirty = make({credits: 450, dirt: {mud: 10}});
  const first = washHelicopter(dirty, {enabled: true, onGround: true});
  const second = washHelicopter(first.profile, {enabled: true, onGround: true});
  assert.equal(second.ok, false);
  assert.equal(second.profile, first.profile);
  assert.equal(second.profile.credits, 350);
  assert.equal(washHelicopter(make({credits: 450}), {enabled: true, onGround: true}).ok, false, 'no dirt at all');
});

check('the wash needs the ground, the switch and 100 credits', () => {
  const profile = make({credits: 99, dirt: {dust: 10}});
  const poor = washHelicopter(profile, {enabled: true, onGround: true});
  assert.equal(poor.ok, false);
  assert.equal(poor.reason, 'You need 1 more credit.');
  assert.equal(poor.profile, profile);
  assert.equal(washHelicopter(make({credits: 100, dirt: {dust: 10}}), {enabled: true, onGround: true}).profile.credits, 0, 'exactly enough');
  const rich = make({credits: 900, dirt: {dust: 10}});
  for (const flags of [{enabled: true}, {enabled: true, onGround: false}, {onGround: true}, {enabled: false, onGround: true}, undefined]) {
    const result = washHelicopter(rich, flags);
    assert.equal(result.ok, false);
    assert.equal(result.profile, rich);
  }
});

check('dirt and the wash leave skins, gear and other fields alone: dirt is looks only', () => {
  const profile = earnSkins(make({credits: 900, missions: {firesOut: 5}}), on).profile;
  const worn = wearSkin(profile, 'fire', on).profile;
  const dirty = addDirt(worn, {dust: 40}, on).profile;
  assert.deepEqual(skinsOf(dirty), skinsOf(worn));
  assert.deepEqual(gearStats(dirty, on), gearStats(worn, on), 'a dirty helicopter flies like a clean one');
  const washed = washHelicopter(dirty, {enabled: true, onGround: true}).profile;
  assert.deepEqual(skinsOf(washed), skinsOf(worn));
  assert.deepEqual(heliOf(washed).missions, heliOf(worn).missions);
});

check('results survive a save and load', () => {
  let profile = earnSkins(make({credits: 5000, missions: {firesOut: 5}}), on).profile;
  profile = wearSkin(profile, 'fire', on).profile;
  profile = addDirt(profile, {dust: 12, soot: 3}, on).profile;
  const loaded = {...profile, heli: normalizeHeli(JSON.parse(JSON.stringify(profile.heli)))};
  assert.deepEqual(loaded.heli, profile.heli);
  assert.deepEqual(gearStats(loaded, on), gearStats(profile, on));
});

check('a profile with no helicopter reads as a new one', () => {
  const bare = deepFreeze({credits: 5000});
  assert.deepEqual(skinsOf(bare), {owned: [], worn: 'stock', fresh: []});
  assert.equal(grimeOf(bare), 0);
  assert.equal(earnSkins(bare, on).profile, bare);
  assert.equal(buySkin(bare, 'tv', on).ok, true);
  assert.equal(addDirt(bare, {dust: 1}, on).ok, true);
  assert.deepEqual(gearStats(bare, on), {...BASE_GEAR});
  assert.deepEqual(skinRows(bare).map(row => row.owned), SKIN_KINDS.map(() => false));
});

check('switch off gives the "not available" reason and the same profile for every action', () => {
  const profile = make({credits: 5000, missions: {firesOut: 5}, dirt: {dust: 3}});
  const results = [earnSkins(profile), buySkin(profile, 'tv'), wearSkin(profile, 'stock'), addDirt(profile, {dust: 1}), washHelicopter(profile, {onGround: true})];
  for (const result of results) {
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'Skins are not available yet.');
    assert.equal(result.profile, profile);
  }
});

check('no random or clock is used', () => {
  const realRandom = Math.random, realNow = Date.now;
  Math.random = () => { throw new Error('random used'); };
  Date.now = () => { throw new Error('clock used'); };
  try {
    const profile = earnSkins(make({missions: {firesOut: 5}}), on).profile;
    wearSkin(profile, 'fire', on);
    settleFlightDirt(addFlightTime(createFlightDirt(), 700, {courseId: 'summit-run', height: 5}));
    washHelicopter(make({dirt: {dust: 5}}), {enabled: true, onGround: true});
  } finally { Math.random = realRandom; Date.now = realNow; }
});

console.log(`Heli skins: ${checks} groups passed.`);
