import assert from 'node:assert/strict';
import {test} from 'node:test';
import {COURSE} from '../src/config.js';
import {createProfile, settleRace} from '../src/progression.js';
import {TERRITORIES, territoryForCourse} from '../src/wasteland-career.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {purchaseWeaponUpgrade} from '../src/weapon-upgrades.js';
import {purchaseArmorKit} from '../src/armor-kits.js';
import {selectCrew} from '../src/crew.js';
import {Duel} from '../src/game.js';
import {stepRaiders} from '../src/raiders.js';
import {combatResultSnapshot} from '../src/combat-scoring.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';

test('eleven combat courses belong to exactly one territory', () => {
  const assigned = Object.values(TERRITORIES).flatMap(item => item.courses);
  assert.equal(new Set(assigned).size, 11);
  for (const id of assigned) assert.ok(COURSE.some(course => course.id === id));
  assert.equal(territoryForCourse('pacific-canyon'), 'sal');
  assert.equal(territoryForCourse('red-mesa'), 'sal');
});

test('post-gate wins earn bounded scrap and hold exactly once', () => {
  let profile = createProfile();
  profile.wasteland.discoveredGate = true;
  profile.credits = 800;
  for (let i = 0; i < 4; i++) {
    const settled = settleRace(profile, {runId: `career-${i}`, stageIndex: 0,
      mode: 'wasteland', combatRewardsEnabled: true, completed: true, won: true,
      car: 'falcone_f42', timeSec: 180, laps: 2,
      hitsLanded: 100, wrecksCaused: 100, cpuDifficulty: 'easy', difficulty: 'casual'});
    assert.equal(settled.awarded, true);
    assert.equal(settled.scrapEarned, 590);
    profile = settled.profile;
    assert.equal(profile.wasteland.territories.sal.hold, (i + 1) * 25);
    assert.equal(profile.wasteland.scrap, (i + 1) * 590);
    assert.equal(profile.credits, 800);
    assert.equal(settleRace(profile, {runId: `career-${i}`, stageIndex: 0,
      mode: 'wasteland', combatRewardsEnabled: true, completed: true, won: true}).awarded, false);
  }
});

test('pre-gate, abandoned and ordinary events do not pay scrap or hold', () => {
  const cases = [
    {mode: 'wasteland', combatRewardsEnabled: true, completed: true, won: true, discovered: false},
    {mode: 'wasteland', combatRewardsEnabled: true, abandoned: true, completed: false, won: false, discovered: true},
    {mode: 'duel', combatRewardsEnabled: false, completed: true, won: true, discovered: true},
  ];
  for (const [index, item] of cases.entries()) {
    const profile = createProfile();
    profile.wasteland.discoveredGate = item.discovered;
    const settled = settleRace(profile, {runId: `case-${index}`, stageIndex: 0, ...item,
      car: 'falcone_f42', timeSec: 180, laps: 2,
      hitsLanded: 4, wrecksCaused: 1, cpuDifficulty: 'easy', difficulty: 'casual'});
    assert.equal(settled.profile.wasteland.scrap, 0);
    assert.equal(settled.profile.wasteland.territories.sal?.hold ?? 0, 0);
  }
});

test('additive migration preserves old weapon levels and validates career fields', () => {
  const migrated = normalizeWasteland({discoveredGate: true, scrap: -7,
    territories: {sal: {hold: 200, claimed: true}, custom: {note: 'future'}}},
    {levels: {ufo: 2}});
  assert.equal(migrated.scrap, 0);
  assert.equal(migrated.territories.sal.hold, 100);
  assert.equal(migrated.territories.sal.claimed, true);
  assert.deepEqual(migrated.territories.custom, {note: 'future'});
  assert.equal(migrated.weapons.levels.ufo, 2);
  const future = {version: 2, scrap: 999, territories: {sal: {hold: 1}}};
  assert.deepEqual(normalizeWasteland(future), future);
});

test('post-gate weapon and kit purchases spend scrap, preserving racing credits', () => {
  const profile = createProfile();
  profile.credits = 5000;
  profile.wasteland.discoveredGate = true;
  profile.wasteland.scrap = 500;
  profile.wasteland.xp = 1000;
  const weapon = purchaseWeaponUpgrade(profile, 'ufo', {wastelandEnabled: true});
  assert.equal(weapon.ok, true);
  assert.equal(weapon.profile.credits, 5000);
  assert.equal(weapon.profile.wasteland.scrap, 350);
  const kit = purchaseArmorKit(weapon.profile, 'falcone_f42', 'scrapper');
  assert.equal(kit.ok, true);
  assert.equal(kit.profile.credits, 5000);
  assert.equal(kit.profile.wasteland.scrap, 0);
});

test('post-gate crew is purchased once with scrap, then may be selected freely', () => {
  const profile = createProfile();
  profile.credits = 900;
  profile.wasteland.discoveredGate = true;
  profile.wasteland.xp = 100_000;
  profile.wasteland.scrap = 400;
  const bought = selectCrew(profile, 'nell');
  assert.equal(bought.ok, true);
  assert.equal(bought.profile.wasteland.scrap, 100);
  assert.equal(bought.profile.credits, 900);
  const rook = selectCrew(bought.profile, 'rook');
  const again = selectCrew(rook.profile, 'nell');
  assert.equal(again.profile.wasteland.scrap, 100);
});

test('a second named career keeps its own scrap, gate and territory progress', () => {
  const first = createProfile();
  const second = createProfile();
  first.wasteland.discoveredGate = true;
  const earned = settleRace(first, {runId: 'player-one', stageIndex: 0,
    mode: 'wasteland', combatRewardsEnabled: true, completed: true, won: true,
    car: 'falcone_f42', timeSec: 180, laps: 2});
  assert.equal(earned.profile.wasteland.scrap, 200);
  assert.equal(earned.profile.wasteland.territories.sal.hold, 25);
  assert.equal(second.wasteland.scrap, 0);
  assert.equal(second.wasteland.territories.sal.hold, 0);
  assert.equal(second.wasteland.discoveredGate, false);
});

test('real salvage collection pays only with a completed post-gate run', () => {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2: true}});
  duel.startCampaign({mode: 'wasteland', startStage: 0, discoveredGate: true});
  const state = duel.state, crate = state.raids.zones[0].salvage;
  state.status = 'racing';
  state.onFoot = true;
  state.fighter = {x: crate.x, y: crate.y, z: crate.z,
    crewId: 'rook', knockedDown: false};
  state.armor = state.maxArmor;
  state.footWeapons.ammo = COMBAT_TUNING.foot.rpgAmmo;
  stepRaiders(duel, 1 / 120);
  assert.equal(crate.collected, true, 'full resources still permit post-gate scrap');
  const snapshot = combatResultSnapshot(duel);
  assert.equal(snapshot.salvageCollected, 1);
  const profile = createProfile();
  profile.wasteland.discoveredGate = true;
  const result = {runId: 'salvage-complete', stageIndex: 0, mode: 'wasteland',
    combatRewardsEnabled: true, completed: true, won: false,
    car: 'falcone_f42', timeSec: 180, laps: 2, ...snapshot};
  const awarded = settleRace(profile, result);
  assert.equal(awarded.scrapEarned, 105);
  assert.equal(settleRace(awarded.profile, result).awarded, false);
  const abandoned = settleRace(profile, {...result, runId: 'salvage-abandoned',
    completed: false, abandoned: true});
  assert.equal(abandoned.profile.wasteland.scrap, 0);
});
