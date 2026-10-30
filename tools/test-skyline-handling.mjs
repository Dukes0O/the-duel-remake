// V4: headless handling checks. The preview roster is loaded in a fresh process.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const id = 'nissan_skyline_gtr_r34';
const preview = process.argv.includes('--preview');
if (preview) {
  globalThis.__DUEL_QA__ = true;
  globalThis.location = {search: '?flags=nissan-skyline'};
}
// Never use browser storage, including in the dev-flag singleton.
globalThis.localStorage = {getItem: () => null, setItem() {}};
const {CARS, COURSE} = await import('../src/config.js');
const {createVehicleAssets} = await import('../src/vehicle-assets.js');
const {completionCarProgress, createProfile, unlockCar, CAR_PRICES} = await import('../src/progression.js');
const {featureFlags} = await import('../src/feature-flags.js');
const oldCars = Object.fromEntries(Object.entries(CARS).filter(([key]) => key !== id));
assert.equal(createHash('sha256').update(JSON.stringify(oldCars)).digest('hex'),
  'fce0c23e2c2f7c0acb6d79c19bdb60fa3b177546929d7abeae8002060bb68f75',
  'every previous config entry remains byte-identical');
assert.equal(completionCarProgress(createProfile()).total, 8);
assert.equal(CAR_PRICES[id], undefined, 'no price: the Skyline is never bought');
assert.equal(unlockCar({...createProfile(), credits: 100000}, id).ok, false);
const assets = createVehicleAssets();
if (!preview) {
  assert.equal(featureFlags.enabled('nissan-skyline'), false);
  assert.equal(CARS[id], undefined);
  assert.equal(assets.source(id), null);
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--preview'], {encoding: 'utf8'});
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  assert.equal(result.status, 0, 'dev preview checks pass');
} else {
  const car = CARS[id];
  assert.equal(featureFlags.enabled('nissan-skyline'), true);
  assert.equal(Object.keys(CARS).at(-1), id, 'append only');
  assert.deepEqual([car.topSpeed, car.accel, car.grip, car.braking, car.gears, car.mass],
    [205, 8.4, 1.08, 1.12, [55, 95, 133, 167, 190, 205], 1560]);
  assert.equal(car.awd, true);
  assert.equal(car.excludeFromCompletion, true);
  assert.equal(Object.keys(CARS).length, 15, 'only the preview car adds to the fourteen-car roster');
  const {Course} = await import('../src/course.js');
  const {performanceIndex, chooseCars, chooseRacers} = await import('../src/race-field.js');
  for (const courseId of ['tremblant-woods', 'panorama-ridge', 'ardennes-forest', 'harbour-lights']) {
    const def = COURSE.find(item => item.id === courseId);
    assert.ok(def, courseId);
    const course = new Course(def);
    const indices = ['aurora_gt', id, 'viper_proto'].map(key => performanceIndex(CARS[key], course));
    const above = indices[1] / indices[0] - 1, below = 1 - indices[1] / indices[2];
    assert.ok(above >= .01 && above <= .03, `${courseId}: 1 to 3% above Aurora`);
    assert.ok(below >= .03 && below <= .05, `${courseId}: 3 to 5% below Viper`);
    console.log(`${courseId}: Aurora ${indices[0].toFixed(6)}, Skyline ${indices[1].toFixed(6)}, Viper ${indices[2].toFixed(6)}; +${(above * 100).toFixed(3)}%, -${(below * 100).toFixed(3)}%`);
    const field = chooseCars({playerSpec: car, playerCar: id, playerUpgrades: {},
      racers: chooseRacers('medium', 7), cpuDifficulty: 'medium', seed: 1989, course});
    assert.ok(field.length === 7 && field.every(racer => racer.car !== id), 'ROAD_CLASS uses the unchanged road pool');
  }
  const {SURFACES, TYRES, surfaceGrip, effectiveGrip} = await import('../src/race-surfaces.js');
  for (const [key, spec] of Object.entries(oldCars)) for (const [kind, surface] of Object.entries(SURFACES)) {
    assert.equal(spec.awd, undefined, `${key}: no new AWD setting`);
    const previous = kind === 'gravel' && ['rally', 'monster'].includes(spec.kind) ? 1 : surface.grip;
    assert.equal(surfaceGrip(kind, spec), previous, `${key}: ${kind} unchanged`);
    for (const [tyre, set] of Object.entries(TYRES))
      assert.equal(effectiveGrip(kind, tyre, spec), Math.max(.4, previous * set[surface.column]), `${key}: ${kind}/${tyre} exact`);
  }
  for (const [kind, surface] of Object.entries(SURFACES)) for (const [tyre, set] of Object.entries(TYRES)) {
    const grip = kind === 'gravel' ? .93 : surface.grip;
    const snowShare = ['snow', 'deep-snow'].includes(kind) ? 1.06 : 1;
    assert.equal(effectiveGrip(kind, tyre, car), Math.max(.4, grip * set[surface.column] * snowShare));
  }
  const {liftCheck} = await import('../src/heli/heli-cable.js');
  const {JOB_CARS} = await import('../src/heli/heli-jobs.js');
  assert.deepEqual(liftCheck(id), {ok: false, massKg: 1560, reason: "Needs the Lab's lift upgrade."});
  assert.equal(JOB_CARS.includes(id), false);
  const {ENGINE_FIT, engineFitFor} = await import('../src/engine-curve.js');
  const {launchTimes} = await import('./fit-engine-curve.mjs');
  assert.ok(ENGINE_FIT[id], 'the preview has its own engine fit');
  for (let level = 0; level <= 3; level++) {
    const marks = [60, 100, 140, 170, 190];
    const oldTimes = launchTimes(id, marks, {engineLevel: level});
    const fitted = launchTimes(id, marks, {engineCurve: true, engineLevel: level});
    assert.ok(engineFitFor(id, level).scale > 0);
    for (let mark = 0; mark < marks.length; mark++)
      assert.ok(Number.isFinite(fitted[mark]) && Math.abs(fitted[mark] / oldTimes[mark] - 1) <= .02,
        `engine level ${level}: ${marks[mark]} mph within 2%`);
  }
  // The real Skyline body (V2) replaced the 959-S stand-in; loading it, its four wheels and its parts are checked in
  // tools/test-skyline-vehicle.mjs, so this suite checks only that the car is routed to that body.
  assert.equal(assets.source(id), 'skyline');
  // V6, the earn rule: the Kogane Invitation's prize, never bought, and unowned until the Night Duel grants it.
  assert.equal(car.unlockRequirement, 'kogane-duel');
  assert.equal(car.price, undefined);
  assert.equal(Object.hasOwn(CAR_PRICES, id), false, 'not in the shop price list');
  assert.equal(completionCarProgress({...createProfile(), unlockedCars: [...createProfile().unlockedCars, id]}).total, 8, 'the Jesko still reads of 8 for an owner');
  const {isCarUnlocked, purchaseUpgrade, UPGRADE_COSTS, getUpgradeLevels, loadPlayers, savePlayers, activePlayer, settleRace} = await import('../src/progression.js');
  const {normalizeRaceSettings} = await import('../src/race-settings.js');
  const {normalizeYeti} = await import('../src/yeti.js');
  const {PAINT_PRESETS, paintPresetsFor, purchasePaint, applyPaint, getPaintAppearance, normalizeCosmetics} = await import('../src/paint-presets.js');
  const {SKYLINE_PAINTS} = await import('../src/skyline-vehicle.js');
  const {countMedalWin, medalTotals, medalRequirement} = await import('../src/medals.js');
  const rich = {...createProfile(), credits: 100000};
  const owner = {...rich, unlockedCars: [...rich.unlockedCars, id]};
  // Not owned: no code path counts it as owned.
  assert.equal(isCarUnlocked(rich, id), false);
  assert.equal(unlockCar(rich, id).ok, false, 'no buy path, even with plenty of credits');
  assert.equal(unlockCar(rich, id).profile.unlockedCars.includes(id), false);
  assert.equal(purchaseUpgrade(rich, id, 'engine').ok, false, 'no upgrades on an unowned Skyline');
  assert.equal(normalizeRaceSettings({car: id}, rich).car, 'falcone_f42', 'race settings do not keep an unowned Skyline');
  assert.equal(purchasePaint(rich, id, 'copper_metallic').ok, false, 'no paint on an unowned Skyline');
  assert.equal(purchasePaint(rich, id, 'skyline_white').ok, false);
  assert.equal(getPaintAppearance({...rich, cosmetics: {[id]: {owned: ['factory', 'copper_metallic'], selected: 'copper_metallic'}}}, id), null, 'a forged finish on an unowned Skyline reads as factory');
  assert.equal(normalizeYeti({roof: {[id]: 'yeti'}, sightings: 5}, rich).roof[id], undefined, 'no yeti roof on an unowned Skyline');
  assert.equal(medalRequirement(id), null, 'it is not a medal car');
  // Owned: it works like any car.
  assert.equal(isCarUnlocked(owner, id), true);
  assert.equal(unlockCar(owner, id).ok, false, 'already in the garage');
  assert.equal(normalizeRaceSettings({car: id}, owner).car, id, 'race settings keep an owned Skyline');
  let upgraded = owner;
  for (let level = 0; level < 3; level++) {
    const bought = purchaseUpgrade(upgraded, id, 'engine');
    assert.equal(bought.ok, true); assert.equal(bought.cost, UPGRADE_COSTS[level]);
    upgraded = bought.profile;
  }
  assert.equal(getUpgradeLevels(upgraded, id).engine, 3);
  assert.deepEqual(UPGRADE_COSTS, [350, 600, 950]);
  assert.deepEqual(paintPresetsFor(owner, id).map(item => item.id), ['factory', 'copper_metallic', 'glacier_satin', 'skyline_white', 'skyline_silver', 'skyline_black'],
    'the owner is offered the ordinary finishes and the three of its own');
  for (const key of ['skyline_white', 'skyline_silver', 'skyline_black']) {
    const preset = PAINT_PRESETS[key];
    assert.equal(preset.price, 250); assert.equal(preset.car, id);
    assert.deepEqual({...preset.appearance}, {...SKYLINE_PAINTS[key]}, `${key}: the paint panel and the model use the same values`);
    const bought = purchasePaint(owner, id, key);
    assert.equal(bought.ok, true); assert.equal(bought.cost, 250); assert.equal(bought.profile.credits, owner.credits - 250);
    assert.equal(getPaintAppearance(bought.profile, id), preset.appearance);
    assert.equal(purchasePaint(owner, 'falcone_f42', key).ok, false, `${key}: other cars cannot wear it`);
    assert.equal(paintPresetsFor(owner, 'falcone_f42').some(item => item.id === key), false);
  }
  assert.equal(purchasePaint(owner, id, 'copper_metallic').cost, 250, 'the generic finishes work on it too');
  assert.equal(applyPaint(owner, id, 'skyline_black').ok, false, 'a finish must be bought first');
  assert.equal(normalizeCosmetics({[id]: {owned: ['factory', 'skyline_silver'], selected: 'skyline_silver'}}, owner)[id].selected, 'skyline_silver', 'an owned finish survives loading');
  assert.equal(normalizeYeti({roof: {[id]: 'yeti'}, sightings: 5}, owner).roof[id], 'yeti', 'a yeti roof is allowed once owned');
  const medal = countMedalWin(owner, {car: id, row: 'duel', cpuDifficulty: 'hard'});
  assert.equal(medal.newMedal?.car, id); assert.equal(medalTotals(medal.profile).medals, 1, 'it earns medals like any car');
  const grandPrix = countMedalWin(owner, {car: id, row: 'grandprix', cpuDifficulty: 'easy'});
  assert.equal(grandPrix.newMedal?.row, 'grandprix', 'and Grand Prix medals');
  // Saves: a player who owns the Skyline, with a tuned engine and a finish, loads back unchanged from memory-only storage.
  const values = new Map();
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key)};
  const saved = {...purchasePaint(upgraded, id, 'skyline_white').profile};
  const players = loadPlayers(storage);
  savePlayers({...players, players: players.players.map(player => ({...player, profile: saved}))}, storage);
  const back = activePlayer(loadPlayers(storage)).profile;
  assert.equal(isCarUnlocked(back, id), true, 'an owner keeps the Skyline through a save and load');
  assert.equal(getUpgradeLevels(back, id).engine, 3);
  assert.equal(getPaintAppearance(back, id), PAINT_PRESETS.skyline_white.appearance);
  assert.equal(CAR_PRICES[id], undefined);
  console.log('Skyline config, pace, surfaces, completion, lift, field and body routing: PASS');
}
