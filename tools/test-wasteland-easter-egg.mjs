import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {raceFeatureFlags, wastelandUnlocked, hiddenRoadInRace} from '../src/wasteland-access.js';
import {COURSE} from '../src/config.js';
import {createProfile, settleRace, stageEventId} from '../src/progression.js';

// Kyle, 25 September 2026: the only Wasteland choice on the main menu is Mad Max
// Duel. The Hidden Road is found while racing it, and the new rules wait for the
// gate (SPEC 0.2, Q9).
const released = createFeatureFlags({storage: null, qa: false});
const pacific = COURSE.findIndex(course => course.id === 'pacific-canyon');
const found = {version: 1, discoveredGate: true};

function race(mode, discoveredGate, extra = {}) {
  const duel = new Duel({seed: 1989});
  duel.featureFlags = raceFeatureFlags(released, () => duel.state);
  duel.startCampaign({mode, startStage: pacific, seed: 1989, car: 'falcone_f42',
    discoveredGate, crewId: 'nell', combatArmorKit: 'plated', weaponLoadout: {}, ...extra});
  return duel;
}

test('the unlock belongs to a player who found the gate', () => {
  assert.equal(wastelandUnlocked(released, {wasteland: found}), true);
  assert.equal(wastelandUnlocked(released, {wasteland: {version: 1, discoveredGate: false}}), false);
  assert.equal(wastelandUnlocked(released, {}), false);
  assert.equal(wastelandUnlocked(released, {wasteland: {version: 2, discoveredGate: true}}), false);
  const off = createFeatureFlags({storage: null, overrides: {wasteland2: false}});
  assert.equal(wastelandUnlocked(off, {wasteland: found}), false);
});

test('a race sees the new rules only when its player had found the gate at the start', () => {
  const state = {wastelandGateDiscovered: false};
  const flags = raceFeatureFlags(released, () => state);
  assert.equal(flags.enabled('wasteland2'), false);
  assert.equal(flags.enabled('hidden-road'), true, 'the road itself is how the gate is found');
  assert.equal(flags.base, released);
  state.wastelandGateDiscovered = true;
  assert.equal(flags.enabled('wasteland2'), true);
  assert.equal(flags.enabled('career-backup'), false);
});

test('the Hidden Road exists only in Mad Max Duel and the gate visit', () => {
  assert.equal(hiddenRoadInRace(released, {mode: 'wasteland'}), true);
  assert.equal(hiddenRoadInRace(released, {mode: 'duel'}), false);
  assert.equal(hiddenRoadInRace(released, {mode: 'timetrial'}), false);
  assert.equal(hiddenRoadInRace(released, {mode: 'duel', hiddenRoadVisit: {playerId: 'a'}}), true);
  assert.ok(race('wasteland', false).course.hiddenRoad);
  assert.equal(race('duel', false).course.hiddenRoad, undefined);
  assert.equal(race('timetrial', false).course.hiddenRoad, undefined);
  const visit = new Duel({seed: 1989});
  visit.featureFlags = raceFeatureFlags(released, () => visit.state);
  assert.equal(visit.startHiddenRoadVisit({playerId: 'a', car: 'falcone_f42'}), true);
  assert.ok(visit.course.hiddenRoad);
});

test('before discovery Mad Max Duel keeps the live rules; after, it uses the Wasteland rules', () => {
  const before = race('wasteland', false);
  assert.equal(before.state.crewId, null);
  assert.equal(before.state.combatArmorKit, null);
  assert.equal(before.state.weaponLoadout, null);
  assert.equal(before.state.raids, undefined);
  const after = race('wasteland', true);
  assert.equal(after.state.crewId, 'nell');
  assert.ok(after.state.weaponLoadout);
  assert.ok(after.state.raids);
});

test('garage hints count finished Mad Max Duels on Pacific Canyon only', () => {
  let profile = createProfile();
  const finish = (runId, mode) => ({runId, stageIndex: pacific, won: false, completed: true,
    timeSec: 180, laps: 2, car: 'falcone_f42', mode, seed: 1989,
    difficulty: 'casual', cpuDifficulty: 'medium'});
  profile = settleRace(profile, finish('duel-run', 'duel')).profile;
  profile = settleRace(profile, finish('trial-run', 'timetrial')).profile;
  assert.equal(profile.wasteland?.pacificFinishes ?? 0, 0);
  profile = settleRace(profile, finish('madmax-run', 'wasteland')).profile;
  assert.equal(profile.wasteland.pacificFinishes, 1);
  assert.equal(stageEventId(pacific), 'pacific-canyon');
});
