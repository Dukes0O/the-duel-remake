import assert from 'node:assert/strict';
import test from 'node:test';
import {armorPresentation, combatHudEnabled, damageZoneFromChange,
  fallbackOpponentPosition} from '../src/combat-hud.js';

test('combat HUD requires the Wasteland 2 switch and an active combat race', () => {
  const state = {mode: 'wasteland', status: 'racing', combat: {}};
  const duel = {featureFlags: {enabled: key => key === 'wasteland2'}};
  assert.equal(combatHudEnabled(duel, state), true);
  assert.equal(combatHudEnabled(duel, {...state, mode: 'duel'}), false);
  assert.equal(combatHudEnabled(duel, {...state, status: 'menu'}), false);
  assert.equal(combatHudEnabled({featureFlags: {enabled: () => false}}, state), false);
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
