import assert from 'node:assert/strict';
import {CARS, COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {WORKSHOP_CARS} from '../src/town/content/workshop-cars.js';
import {createProfile, normalizeProfile, unlockCar, CAR_PRICES, settleRace, completionCarProgress} from '../src/progression.js';
import {shownCarIds, wonCars, medalSheetPanel} from '../src/earned-cars-ui.js';
import {chooseCars, chooseRacers} from '../src/race-field.js';
import {JOB_CARS} from '../src/heli/heli-jobs.js';
import {CAR_VOICES} from '../src/sound-bank.js';
import {App} from '../src/app.js';

const ids = Object.keys(WORKSHOP_CARS), flags = on => createFeatureFlags({storage: null, overrides: {'wasteland-cars': on}});
assert.equal(FEATURE_STATES['wasteland-cars'], 'dev');
const owner = {...createProfile(), unlockedCars: [...createProfile().unlockedCars, ...ids]};
assert.deepEqual(wonCars(owner, flags(true)).map(([id]) => id), ids);
assert.deepEqual(wonCars(owner, flags(false)), []);
assert.deepEqual(wonCars(createProfile(), flags(true)), []);
assert.equal(completionCarProgress(owner).total, 8, 'the existing completion prize has no new requirements');
for (const id of ids) {
  assert.ok(normalizeProfile(owner).unlockedCars.includes(id), 'switch off never drops an owned car');
  assert.equal(CAR_PRICES[id], undefined);
  assert.equal(unlockCar({...createProfile(), credits: 1000000}, id).ok, false, 'money cannot buy a Workshop car');
  assert.ok(!shownCarIds(true).includes(id) && !shownCarIds(false).includes(id), 'no unbuilt car on a sale list');
  assert.ok(!JOB_CARS.includes(id), 'the existing helicopter job draw stays unchanged');
  assert.ok(CAR_VOICES[id]);
  for (const rival of [null, {car: id}]) {
    const duel = new Duel({seed: 1989, featureFlags: flags(true)});
    duel.startCampaign({car: id, rival, startStage: COURSE.findIndex(stage => stage.hasRival && !stage.practice), mode: 'duel'});
    assert.equal(duel.state.rival.car, CARS[id].rivalCar, `${id}: default and explicit rivals use the established field`);
    assert.equal(duel.rivalSpec.name, CARS[CARS[id].rivalCar].name);
    assert.ok(!duel.rivalSpec.workshop);
  }
  let profile = owner;
  for (const mode of ['duel', 'grandprix']) for (const cpuDifficulty of ['easy', 'medium', 'hard']) {
    const result = {runId: `${id}-${mode}-${cpuDifficulty}`, stageIndex: 0, car: id, mode,
      difficulty: 'casual', cpuDifficulty, seed: 1989, laps: 3, lapTimes: [90, 90, 90],
      completed: true, won: true, position: 1, fieldSize: 8, timeSec: 270,
      earnedCarsEnabled: true, grandPrixCareerEnabled: true};
    profile = settleRace(profile, result).profile;
    assert.equal(settleRace(profile, result).awarded, false, 'a result settles once');
  }
  assert.deepEqual(profile.medals.cars[id], {duel: [1, 1, 1], grandprix: [1, 1, 1]});
  assert.ok(medalSheetPanel(profile, id, {grandPrixCareer: true}).includes('6 / 6'));
}

function drive(car, dirt = false) {
  const duel = new Duel({seed: 1989, featureFlags: flags(true)});
  duel.startCampaign({car, seed: 1989, startStage: COURSE.findIndex(stage => stage.practice), mode: 'timetrial', difficulty: 'casual'});
  const point = (s, lateral = 0) => ({x: lateral, y: 0, z: s, heading: 0, curvature: 0});
  duel.course = {def: {id: 'workshop-drive', practice: true, theme: 'desert', kind: 'arena'},
    closed: false, length: 10000, raceLength: 20000,
    features: {obstacles: [], mountains: [], ramps: [], crushables: [], shortcuts: [], flocks: []},
    at: point, worldAt: point, groundAt: point, nearest: (x, z) => ({s: z, lateral: x}), phase: s => s,
    surfaceAt: () => ({mainRoad: !dirt, road: !dirt, roadHalfWidth: 7}), themeAt: () => 'desert',
    roadHalfWidthAt: () => 100, nearestRadar: () => null, obstaclesNear: () => []};
  duel._obstacleArray = []; duel._obstacleQueryCache.clear(); duel._lapGates = [];
  Object.assign(duel.state, {status: 'racing', countdown: 0, s: 500, prevS: 500,
    lateral: dirt ? 30 : 0, prevLateral: dirt ? 30 : 0, speedMph: 0, traffic: [], opponents: []});
  duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false});
  for (let i = 0; i < 120 * 8; i++) duel.step(1 / 120);
  assert.ok(duel.state.s > 530 && duel.state.speedMph > 15, `${car} drives under its own power`);
  assert.equal(duel.state.status, 'racing');
  return {speed: duel.state.speedMph, distance: duel.state.s};
}
const road = Object.fromEntries(ids.map(id => [id, drive(id)]));
for (const id of ids) assert.deepEqual(drive(id), road[id], `${id}: seed and inputs repeat exactly`);
assert.ok(road.rattler.speed > road.longhaul.speed && road.scarab.speed > road.bully.speed, 'light cars pull away from heavy trucks');
assert.ok(drive('scarab', true).speed > drive('rattler', true).speed, 'Scarab keeps more speed across rough ground');
for (const [id, car] of Object.entries(CARS).filter(([, car]) => !car.workshop)) {
  const field = chooseCars({playerCar: id, playerSpec: car, playerUpgrades: {}, racers: chooseRacers('medium', 7), cpuDifficulty: 'medium', seed: 1989});
  assert.ok(field.every(racer => !ids.includes(racer.car)), `${id}: no Workshop car enters the old computer field`);
}
// With a Workshop car as the player's own, the computer field is chosen as for its rival type (review, 27 November 2026).
for (const id of ids) {
  const field = chooseCars({playerCar: id, playerSpec: CARS[id], playerUpgrades: {}, racers: chooseRacers('medium', 7), cpuDifficulty: 'medium', seed: 1989});
  assert.ok(field.every(racer => !ids.includes(racer.car)), `${id}: a Grand Prix field holds no Workshop car`);
}
const memory = new Map();
globalThis.localStorage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value)};
const app = new App();
app.duel.featureFlags = flags(true);
app.profile = owner;
app._saveProfile();
app.setRaceSettings({car: 'rattler', rival: {car: 'scarab'}});
const reopened = new App();
assert.equal(reopened.getRaceChoices().car, 'falcone_f42', 'off: saved player selection is inactive');
assert.ok(!ids.includes(reopened.getRaceChoices().rival?.car), 'off: saved rival selection is inactive');
assert.ok(reopened.profile.unlockedCars.includes('rattler'), 'owned cars survive reopening');
assert.equal(reopened.startCampaign({car: 'falcone_f42', rival: {car: 'scarab'}}), true);
assert.ok(!ids.includes(reopened.duel.state.rival?.car), 'off: explicit rival is also refused');
console.log('PASS: four repeatable driving models, rough-ground handling, six medal boxes, ownership, no sale, and unchanged field pools.');
