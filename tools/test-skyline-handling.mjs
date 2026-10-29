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
assert.equal(CAR_PRICES[id], undefined, 'V6 owns the shop price');
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
  assert.equal(assets.source(id), 'skyline-preview');
  assert.equal(assets.status(id), 'ready');
  const body = assets.create(id);
  assert.equal(body.userData.vehicleKey, id);
  assert.equal(body.userData.wheels.length, 4);
  const {disposeTree} = await import('../src/world.js');
  disposeTree(body);
  console.log('Skyline config, pace, surfaces, completion, lift, field and dev-only donor: PASS');
}
