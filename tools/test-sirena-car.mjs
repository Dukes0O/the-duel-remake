// SIRENA-CAR (docs/THE_DEEP.md 6.2, 6.6 and 12): the Falcone Sirena as a car, its four states, its start at
// Pacific Canyon and the Coast Cup. Headless; memory-only; nothing real is read or written.
import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {CARS, COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {createProfile, normalizeProfile, settleRace, CAR_PRICES, isCarUnlocked, getUpgradeLevels} from '../src/progression.js';
import {SIRENA_CAR, sirenaState, settleCoastCup} from '../src/deep/sirena-car.js';
import {raiseFind, SIRENA_FINDS} from '../src/deep/deep-sirena.js';
import {AIR_ONLY_CARS, JOB_CARS, isAirOnlyCar, airOnlyNote} from '../src/heli/heli-jobs.js';
import {carAt, placeCar, FIRST_PLACE} from '../src/heli/heli-save.js';
import {liftCheck, carMassKg} from '../src/heli/heli-cable.js';
import {shownCars, shownCarIds} from '../src/earned-cars-ui.js';
import {MEDAL_CARS, countMedalWin} from '../src/medals.js';
import {createVehicleAssets} from '../src/vehicle-assets.js';

const PACIFIC = COURSE.findIndex(stage => stage.id === 'pacific-canyon');
const sirena = CARS.falcone_sirena, viper = CARS.viper_proto;
const ON = {enabled: true};

// The roster as it was on the commit before this card, for "every other car is unchanged".
const before = execFileSync('git', ['show', 'dfb420c1:src/config.js'], {encoding: 'utf8'})
  .replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (_, from, path, quote) => from + new URL(path, new URL('../src/config.js', import.meta.url)).href + quote);
const OTHER_CARS = Object.keys(CARS).filter(id => id !== SIRENA_CAR && id !== 'mcmurtry_speirling');

function raisedProfile(extra = {}) {
  let profile = {...createProfile(), credits: 1000, unlockedCars: [...createProfile().unlockedCars]};
  for (const id of SIRENA_FINDS) profile = raiseFind(profile, id, ON).profile;
  return {...profile, ...extra};
}
const restored = (extra = {}) => {
  const base = raisedProfile(extra);
  return {...base, unlockedCars: [...base.unlockedCars, SIRENA_CAR], upgrades: {...base.upgrades, [SIRENA_CAR]: {}}};
};
const finish = (extra = {}) => ({enabled: true, valid: true, eventId: 'pacific-canyon', car: SIRENA_CAR, mode: 'duel', ...extra});
const result = (extra = {}) => ({runId: 'cup-1', stageIndex: PACIFIC, car: SIRENA_CAR, mode: 'duel', cpuDifficulty: 'medium',
  difficulty: 'casual', seed: 1989, laps: 2, timeSec: 190, completed: true, won: false, deepEnabled: true, ...extra});

test('the Sirena is the Viper Prototype, 8% slower and 10% weaker on the brakes, 800 kg, manual, never bought', () => {
  assert.ok(sirena, 'the car exists');
  assert.ok(Math.abs(sirena.topSpeed - viper.topSpeed * .92) < .01, `top speed ${sirena.topSpeed}`);
  assert.ok(Math.abs(sirena.accel - viper.accel * .92) < .001, `acceleration ${sirena.accel}`);
  assert.equal(sirena.grip, viper.grip);
  assert.ok(Math.abs(sirena.braking - viper.braking * .9) < .001, `braking ${sirena.braking}`);
  assert.equal(sirena.mass, 810, 'about 800 kg: 810 keeps the arena junk-shove guard (2 m at 40 mph) whole'); assert.equal(sirena.gearbox, 'manual');
  assert.equal(sirena.unlockRequirement, 'sirena-restored');
  assert.ok(!(sirena.price > 0), 'no price'); assert.ok(!sirena.factoryMaxed, 'upgrades work as for any car');
  assert.equal(sirena.gears.length, viper.gears.length);
  assert.ok(sirena.gears.every((gear, i, all) => i === 0 || gear > all[i - 1]), 'gears climb');
  assert.equal(sirena.gears.at(-1), sirena.topSpeed, 'the top gear is the top speed');
  for (const key of ['offRoadGrip', 'offRoadSpeed', 'offRoadScrub']) assert.equal(sirena[key], viper[key], key);
  assert.ok(!('price' in CAR_PRICES) && !Object.hasOwn(CAR_PRICES, SIRENA_CAR), 'not in the shop');
});

test('no other car changes: numbers and prices are the roster of the commit before', async () => {
  const old = await import('data:text/javascript;base64,' + Buffer.from(before).toString('base64'));
  assert.deepEqual(OTHER_CARS, Object.keys(old.CARS), 'same cars in the same order, the Sirena last');
  // The one change since: the McLaren F1 is earned at 12 medals, not 15 (Claude, 28 October 2026, EARN-FINISH).
  const earlier = structuredClone(old.CARS);
  earlier.mclaren_f1.unlockRequirement.medals = 12;
  for (const id of OTHER_CARS) assert.deepEqual(CARS[id], earlier[id], `${id} is unchanged`);
  assert.equal(Object.keys(CARS).filter(id => id !== 'mcmurtry_speirling').at(-1), SIRENA_CAR);
  assert.deepEqual(Object.keys(CAR_PRICES), Object.keys(CAR_PRICES).filter(id => id !== SIRENA_CAR && id !== 'mcmurtry_speirling'));
  assert.deepEqual(old.DEFAULT_CAR, 'falcone_f42');
});

test('lists, the shop, the medal ladder and the day\'s jobs are exactly what they were', () => {
  for (const enabled of [false, true, undefined]) {
    assert.ok(!shownCarIds(enabled).includes(SIRENA_CAR), `not listed (earned cars ${enabled})`);
    assert.ok(!shownCars(enabled).some(([id]) => id === SIRENA_CAR));
    assert.equal(shownCarIds(enabled).length, OTHER_CARS.length - (enabled === true ? 0 : MEDAL_CARS.length));
  }
  assert.ok(!MEDAL_CARS.includes(SIRENA_CAR), 'not a medal car');
  assert.ok(!JOB_CARS.includes(SIRENA_CAR), 'never a customer\'s car, so the day\'s jobs are the same');
  assert.deepEqual(JOB_CARS, OTHER_CARS.filter(id => liftCheck(id).ok && !isAirOnlyCar(id) && id !== 'koenigsegg_jesko'));
  assert.equal(isCarUnlocked(createProfile(), SIRENA_CAR), false, 'nobody owns it at the start');
  assert.equal(normalizeProfile({...createProfile(), unlockedCars: ['falcone_f42', SIRENA_CAR]}).unlockedCars.includes(SIRENA_CAR), true, 'and a save that has it keeps it');
});

test('four states: wreck, waiting under a sheet, restored, cup done', () => {
  assert.equal(sirenaState(createProfile()), 'wreck');
  assert.equal(sirenaState(undefined), 'wreck'); assert.equal(sirenaState({}), 'wreck');
  const partial = raiseFind(raiseFind(createProfile(), 'sirena-badge', ON).profile, 'sirena-door', ON).profile;
  assert.equal(sirenaState(partial), 'wreck', 'parts are not the car');
  assert.equal(sirenaState(raisedProfile()), 'waiting', 'raised, needs the Lab');
  assert.equal(sirenaState(restored()), 'restored');
  assert.equal(sirenaState({...restored(), deep: {...restored().deep, coastCup: true}}), 'cupDone');
  assert.equal(sirenaState({...raisedProfile(), deep: {...raisedProfile().deep, coastCup: true}}), 'cupDone');
});

test('the cup pays 1,000 once, and only for a counted finish on Pacific Canyon in the restored Sirena', () => {
  const profile = restored({credits: 500}), before = structuredClone(profile);
  const cup = settleCoastCup(profile, finish());
  assert.equal(cup.paid, 1000); assert.equal(cup.profile.credits, 1500); assert.equal(cup.profile.deep.coastCup, true);
  assert.deepEqual(cup.events, [{deepCoastCup: {}}]);
  assert.deepEqual(profile, before, 'the input is never changed');
  const again = settleCoastCup(cup.profile, finish());
  assert.equal(again.paid, 0); assert.equal(again.profile, cup.profile); assert.deepEqual(again.events, []);
  assert.equal(sirenaState(cup.profile), 'cupDone');
  for (const [label, change] of [['another car', {car: 'viper_proto'}], ['another course', {eventId: 'high-country'}],
    ['the wasteland duel', {mode: 'wasteland'}], ['not a valid finish', {valid: false}], ['the switch off', {enabled: false}],
    ['the switch missing', {enabled: undefined}], ['no mode', {mode: undefined}]]) {
    const refused = settleCoastCup(profile, finish(change));
    assert.equal(refused.paid, 0, label); assert.equal(refused.profile, profile, label);
  }
  // Not owned, or the car never raised, pays nothing.
  const waiting = raisedProfile();
  assert.equal(settleCoastCup(waiting, finish()).profile, waiting, 'a car you do not own cannot finish the cup');
  const handMade = {...createProfile(), unlockedCars: [...createProfile().unlockedCars, SIRENA_CAR]};
  assert.equal(settleCoastCup(handMade, finish()).paid, 0, 'a car that was never raised pays nothing');
  assert.equal(settleCoastCup(profile).paid, 0); assert.equal(settleCoastCup(null, finish()).paid, 0);
  for (const mode of ['timetrial', 'grandprix']) assert.equal(settleCoastCup(profile, finish({mode})).paid, 1000, mode);
});

test('through the real race settlement: the cup rides on a valid finish, once, and nothing else changes', () => {
  const start = restored({credits: 1000});
  const plain = settleRace(start, result({deepEnabled: false}));
  assert.ok(plain.awarded && !plain.coastCup && !Object.hasOwn(plain.profile.deep ?? {}, 'coastCup'), 'switch off: no cup');
  const first = settleRace(start, result());
  assert.equal(first.coastCup.paid, 1000); assert.deepEqual(first.coastCup.events, [{deepCoastCup: {}}]);
  assert.equal(first.profile.deep.coastCup, true);
  assert.equal(first.profile.credits, plain.profile.credits + 1000, 'exactly 1,000 on top of the race\'s own pay');
  assert.equal(first.reward, plain.reward, 'the race\'s own reward is untouched');
  const second = settleRace(first.profile, result({runId: 'cup-2'}));
  assert.ok(!second.coastCup, 'the cup pays once');
  assert.equal(second.profile.credits, first.profile.credits + second.reward, 'a second finish pays only the race');
  assert.equal(second.profile.deep.coastCup, true);
  // Other cars, courses, qualifying, practice, abandons and partial finishes never pay it.
  for (const [label, extra] of [['another car', {car: 'viper_proto'}], ['another course', {stageIndex: COURSE.findIndex(stage => stage.id === 'high-country')}], ['qualifying', {qualifying: true}],
    ['abandoned', {abandoned: true}], ['not completed', {completed: false}], ['timeout', {timeout: true}], ['wasteland', {mode: 'wasteland'}]]) {
    const settled = settleRace(start, result({runId: 'x-' + label, ...extra}));
    assert.ok(!settled.coastCup, label); assert.ok(!settled.profile.deep?.coastCup, label);
  }
});

test('helicopter: the Sirena is air-only, first set down at Pacific Canyon, and a light car for the hook', () => {
  assert.ok(AIR_ONLY_CARS.includes(SIRENA_CAR) && isAirOnlyCar(SIRENA_CAR));
  assert.deepEqual(FIRST_PLACE, {falcone_sirena: 'pacific-canyon'});
  const profile = restored();
  assert.equal(carAt(profile, SIRENA_CAR), 'pacific-canyon', 'before the helicopter has moved it, it stands at Pacific Canyon');
  assert.equal(carAt(profile, 'koenigsegg_jesko'), 'tremblant-woods', 'the Jesko keeps its default helicopter position');
  assert.equal(isAirOnlyCar('koenigsegg_jesko'), false);
  assert.equal(airOnlyNote({enabled: true, profile, carId: 'koenigsegg_jesko', courseId: 'pacific-canyon'}), null, 'the Jesko races away from its helicopter position');
  assert.equal(airOnlyNote({enabled: true, profile, carId: SIRENA_CAR, courseId: 'pacific-canyon'}), null, 'it races at Pacific Canyon');
  assert.match(airOnlyNote({enabled: true, profile, carId: SIRENA_CAR, courseId: 'tremblant-woods', carName: 'The Sirena'}), /only by air/, 'and nowhere else yet');
  assert.equal(airOnlyNote({enabled: false, profile, carId: SIRENA_CAR, courseId: 'tremblant-woods'}), null, 'with the helicopter off it is an ordinary car');
  const flown = placeCar(profile, SIRENA_CAR, 'tremblant-snow', {enabled: true});
  assert.equal(flown.ok, true); assert.equal(carAt(flown.profile, SIRENA_CAR), 'tremblant-snow', 'after that it travels like any special car');
  assert.equal(carMassKg(SIRENA_CAR), 810); assert.equal(liftCheck(SIRENA_CAR).ok, true);
});

test('medals and upgrades treat it as an ordinary car', () => {
  const profile = restored();
  const win = countMedalWin(profile, {car: SIRENA_CAR, row: 'duel', cpuDifficulty: 'easy'});
  assert.ok(win.profile.medals.cars[SIRENA_CAR], 'a win fills a box on its sheet');
  assert.deepEqual(getUpgradeLevels(profile, SIRENA_CAR), {engine: 0, nitro: 0, handling: 0, tires: 0, brakes: 0, suspension: 0, tank: 0},
    'it starts with no upgrades, and they work as for any car');
});

test('the model and the car run: the original coupe builds, and it drives like a Viper a little slower', () => {
  const assets = createVehicleAssets();
  assert.equal(assets.status(SIRENA_CAR), 'ready');
  const model = assets.create(SIRENA_CAR);
  assert.equal(model.userData.vehicleKey, SIRENA_CAR);
  const run = key => {
    const duel = new Duel({seed: 1989});
    duel.startCampaign({seed: 1989, car: key, mode: 'timetrial', opponentCount: 0, startStage: PACIFIC, difficulty: 'casual'});
    Object.assign(duel.state, {status: 'racing', countdown: 0});
    let top = 0;
    for (let i = 0; i < 8 * 120; i++) { duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false}); duel.step(1 / 120); top = Math.max(top, duel.state.speedMph); }
    return {top, s: duel.state.s};
  };
  const slow = run(SIRENA_CAR), quick = run('viper_proto');
  assert.ok(slow.s > 100, `the Sirena drives (${slow.s.toFixed(0)} m in 8 s, flat out)`);
  assert.ok(slow.top < quick.top && slow.top > quick.top * .75, `top speed after 8 s: ${slow.top.toFixed(0)} against the Viper's ${quick.top.toFixed(0)}`);
  assert.ok(slow.top <= sirena.topSpeed, 'and stays under its own top speed');
});
