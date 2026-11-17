import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createProfile, createPlayerRegistry, loadPlayers, PLAYERS_KEY} from '../src/progression.js';
import {AIR_ONLY_CARS, JOB_CARS, airOnlyNote} from '../src/heli/heli-jobs.js';
import {ownTestCourses} from './career-fixture.mjs';

const values = new Map();
const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key)};
const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
globalThis.cancelAnimationFrame ??= () => {};
const cars = ['ferrari_enzo', 'mclaren_f1', 'bugatti_bolide'];
const profile = {...createProfile(), unlockedCars: [...createProfile().unlockedCars, ...cars, 'mcmurtry_speirling'],
  heli: {version: 1, carsAt: {ferrari_enzo: 'tremblant-woods', mcmurtry_speirling: 'tremblant-woods'}}};
values.set(PLAYERS_KEY, JSON.stringify(createPlayerRegistry(profile)));
const before = values.get(PLAYERS_KEY);
const loaded = loadPlayers(storage).players[0].profile;
assert.equal(values.get(PLAYERS_KEY), before, 'loading an old profile does not write it');
assert.equal(loaded.heli.carsAt.ferrari_enzo, 'tremblant-woods');
assert.deepEqual(AIR_ONLY_CARS, ['falcone_sirena', 'falcone_vasca', 'mcmurtry_speirling']);
assert.ok(cars.every(car => !JOB_CARS.includes(car)));
const app = new App();
try {
  app.duel.featureFlags = createFeatureFlags({storage: null, qa: true, overrides: {'earned-cars': true, helicopter: true}});
  ownTestCourses(app);
  const stage = COURSE.findIndex(course => course.id === 'pacific-canyon');
  for (const car of cars) for (const mode of ['duel', 'timetrial', 'grandprix', 'wasteland']) {
    assert.equal(app.startCampaign({car, startStage: stage, mode}), true, `${car} starts ${mode} away from its saved location`);
    assert.equal(app.duel.state.car, car);
    app.returnToMenu();
  }
  assert.equal(app.profile.heli.carsAt.ferrari_enzo, 'tremblant-woods');
  const message = 'The McMurtry Sp\u00e9irling travels only by air. Fly it here from the helipad first.';
  assert.equal(app._airOnlyRefused('mcmurtry_speirling', 'pacific-canyon'), true);
  assert.equal(app.courseAccessMessage, message);
  assert.equal(airOnlyNote({enabled: true, profile: app.profile, carId: 'mcmurtry_speirling', courseId: 'pacific-canyon', carName: 'McMurtry Sp\u00e9irling'}), message);
  console.log('Earned cars race anywhere; old positions and the McMurtry rule are preserved.');
} finally {
  app.dispose?.();
  if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
}
