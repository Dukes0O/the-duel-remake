import assert from 'node:assert/strict';
import test from 'node:test';
import {armorPresentation, combatSlotHidden, combatHudEnabled, combatHudVisible, damageZoneFromChange,
  fallbackOpponentPosition, footCarDirection, footAmmoPresentation,
  footActionPresentation, footLampProgress, footBrandDirection} from '../src/combat-hud.js';

test('lamp bar reads the rule count, and the lamp row names its circle and precise distance', () => {
  const step = {brand: true, places: [{id: 'mast', position: {x: 0, z: 0}}]};
  const count = {brandBriefed: true, brandSeconds: 80, lightingLamp: 'mast', lightingSeconds: 1};
  const state = {status: 'racing', onFoot: true, fighter: {x: 3.4, z: 0},
    arena: {mode: 'world-job', worldJob: {job: {steps: [step], stepIndex: 0, stepState: count}}}};
  const before = JSON.stringify(state);
  assert.deepEqual(footLampProgress(state), {text: 'LIGHTING THE MAST LAMP', fraction: .5});
  assert.equal(footBrandDirection(state).atLamp, true);
  assert.equal(JSON.stringify(state), before);
  state.fighter.x = 3.6;
  assert.equal(footBrandDirection(state).distance, '3.6');
  assert.equal(footBrandDirection(state).atLamp, false);
  // The review of 18 November: with the brand out the row leads to a lit lamp to relight at, whose reach is 3 m, so it
  // keeps its metres at 3.2 m and does not say "AT THE LAMP".
  const outState = {status: 'racing', onFoot: true, fighter: {x: 3.2, z: 0}, arena: {mode: 'world-job', worldJob: {job: {steps: [step], stepIndex: 0,
    stepState: {brandBriefed: true, brandSeconds: 0, brandsUsed: 1, lamps: {mast: true}}}}}};
  assert.equal(footBrandDirection(outState).name, 'MAST LAMP');
  assert.equal(footBrandDirection(outState).atLamp, false);
  assert.equal(footBrandDirection(outState).distance, '3.2');
  count.townEnding = true;
  assert.equal(footLampProgress(state), null);
  count.townEnding = false; count.brandSeconds = 0;
  assert.equal(footLampProgress(state), null);
});

test('every real car slot is visible, with one button for a borrowed flamethrower', () => {
  for (const loadout of [['crossbow','tesla','decoy','flamethrower'], ['crossbow','tesla','decoy','nitro']]) {
    for (let slot = 0; slot < 4; slot++) {
      const buttons = [false, ...(slot === 3 ? [true] : [])];
      assert.equal(buttons.filter(loan => !combatSlotHidden(slot, loadout[slot], loan)).length, 1);
    }
  }
});

test('combat HUD requires saved gate discovery and an active combat race', () => {
  const state = {mode: 'wasteland', status: 'racing', combat: {}, wastelandGateDiscovered: true};
  const duel = {};
  assert.equal(combatHudEnabled(duel, state), true);
  assert.equal(combatHudEnabled(duel, {...state, mode: 'duel'}), false);
  assert.equal(combatHudEnabled(duel, {...state, status: 'menu'}), false);
  assert.equal(combatHudEnabled(duel, {...state, wastelandGateDiscovered: false}), false);
});

test('combat HUD stays eligible for legacy suppression but only displays during active play', () => {
  const duel = {};
  const state = {mode: 'wasteland', status: 'racing', combat: {}, paused: false, wastelandGateDiscovered: true};
  for (const status of ['racing', 'countdown', 'exploring']) {
    assert.equal(combatHudVisible(duel, {...state, status}), true, status);
  }
  for (const status of ['stage_result', 'complete', 'gameover', 'menu']) {
    assert.equal(combatHudVisible(duel, {...state, status}), false, status);
  }
  assert.equal(combatHudEnabled(duel, {...state, status: 'stage_result'}), true);
  assert.equal(combatHudVisible(duel, {...state, paused: true}), false);
  assert.equal(combatHudVisible(duel, {...state, wastelandGateDiscovered: false}), false);
});

test('armor presentation clamps damaged, wrecked, and missing armor', () => {
  assert.deepEqual(armorPresentation({armor: 25, maxArmor: 100}),
    {value: 25, max: 100, fraction: .25});
  assert.deepEqual(armorPresentation({armor: -1, maxArmor: 100}),
    {value: 0, max: 100, fraction: 0});
  assert.deepEqual(armorPresentation({armor: 200, maxArmor: 100}),
    {value: 100, max: 100, fraction: 1});
});

test('incoming arrow selects the zone that actually gained damage', () => {
  assert.equal(damageZoneFromChange({front: 1, right: 0, rear: 0, left: 0},
    {front: 1, right: .6, rear: 0, left: .2}), 'right');
  assert.equal(damageZoneFromChange({front: 1}, {front: 1}), null);
});

test('offscreen marker distinguishes a car ahead from one behind', () => {
  const course = {worldAt: (s, lateral) => ({x: lateral, z: s, heading: 0})};
  const player = {s: 100, lateral: 0};
  assert.equal(fallbackOpponentPosition(course, player, {s: 140, lateral: -8}, 0).direction, 'LEFT');
  assert.equal(fallbackOpponentPosition(course, player, {s: 80, lateral: 0}, 0).direction, 'BEHIND');
});

test('offscreen riders flank the mirror in the direction they are coming from', () => {
  const course = {worldAt: (s, lateral) => ({x: lateral, z: s, heading: 0})};
  const player = {s: 100, lateral: 0};
  const marker = (s, lateral, index) => fallbackOpponentPosition(course, player, {s,lateral,roadRider:{}}, index);
  const left = marker(91,-2,1), right = marker(-6,6,0);
  assert.equal(left.direction,'BEHIND');
  assert.equal(right.direction,'BEHIND');
  assert.ok(left.x < .4 && right.x > .6 && left.y < .53 && right.y < .53);
  assert.ok(marker(91,0,0).x < .4 && marker(-6,0,1).x > .6);
});

test('on-foot car pointer follows fighter position and facing', () => {
  const course = {groundAt: (s, lateral) => ({x: lateral, z: s})};
  const state = {s: 100, lateral: 0, fighter: {x: 0, z: 90, yaw: 0}};
  assert.deepEqual(footCarDirection(course, state), {distance: 10, angle: 0});
  state.fighter.x = 10;
  state.fighter.z = 100;
  assert.deepEqual(footCarDirection(course, state), {distance: 10, angle: -90});
  state.fighter.yaw = -Math.PI / 2;
  assert.deepEqual(footCarDirection(course, state), {distance: 10, angle: 0});
});

test('on-foot ammo does not imply an unbuilt weapon is ready', () => {
  assert.deepEqual(footAmmoPresentation({onFoot: true}),
    {name: 'NO FOOT WEAPON', ammo: 'AMMO —'});
  assert.deepEqual(footAmmoPresentation({footGear: {name: 'RPG', ammo: 3}}),
    {name: 'RPG', ammo: 'AMMO 3'});
});

test('the Hand Flamer shows seconds of fuel and says how it is used', () => {
  const flamer = ammo => ({footGear: {name: 'HAND FLAMER', ammo}, footWeapons: {}, fighter: {}});
  assert.deepEqual(footAmmoPresentation(flamer(4)), {name: 'HAND FLAMER', ammo: 'FUEL 4.0 s'});
  assert.deepEqual(footAmmoPresentation(flamer(2.64)), {name: 'HAND FLAMER', ammo: 'FUEL 2.6 s'});
  assert.deepEqual(footAmmoPresentation(flamer(0)), {name: 'HAND FLAMER', ammo: 'FUEL 0.0 s'});
  assert.equal(footActionPresentation(flamer(2.64)).text, 'HOLD FIRE TO BURN');
  assert.equal(footActionPresentation({...flamer(2.64), fighter: {flaming: true}}).text, 'FLAMING');
  assert.equal(footActionPresentation(flamer(0)).text, 'OUT OF FUEL / LET GO TO REFILL');
});

test('on-foot status gives clear lock, reload and repair cues', () => {
  const state = {stageTimeSec: 4, footGear: {name: 'LONGHORN RPG', ammo: 3},
    footWeapons: {lockTargetIndex: null, lockSeconds: 0, nextFireAt: 0}};
  assert.deepEqual(footActionPresentation(state),
    {text: 'HOLD AIM ON A CAR', locked: false});
  state.footWeapons.lockTargetIndex = 0;
  state.footWeapons.lockSeconds = .8;
  assert.deepEqual(footActionPresentation(state),
    {text: 'TARGET LOCKED', locked: true});
  state.footWeapons.nextFireAt = 5.2;
  assert.deepEqual(footActionPresentation(state),
    {text: 'RELOADING 1.2s', locked: false});
  state.footGear = {name: 'WRENCH', ammo: null};
  state.footWeapons.repairing = true;
  state.footWeapons.repairAmount = 10;
  assert.deepEqual(footActionPresentation(state),
    {text: 'REPAIRING 10 / 40', locked: false});
});
