import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
import {COURSE} from '../src/config.js';

const STEP = 1 / 120;
function ticks(duel, count) {
  for (let index = 0; index < count; index++) duel.step(STEP);
}

function race(mode = 'wasteland', wasteland2 = true, keepOpponent = false) {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2},
    destructiblesEnabled: false});
  duel.startCampaign({mode, car: 'falcone_f42', startStage: 0,
    seed: 1989});
  const state = duel.state;
  state.status = 'racing';
  state.countdown = 0;
  state.s = state.prevS = 500;
  state.lateral = state.prevLateral = 0;
  state.traffic = [];
  if (keepOpponent) state.opponents[0].s = state.s + 300;
  else state.opponents = [];
  if (state.combat) {
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
  }
  return duel;
}

test('a low-speed hold exits at 0.4 s; walking leaves the race clock and car progress alone', () => {
  const duel = race(), state = duel.state;
  const startS = state.s, gate = state.nextLapGate;
  duel.setInput({interact: true});
  ticks(duel, 47);
  assert.equal(state.onFoot, false);
  ticks(duel, 1);
  assert.equal(state.onFoot, true);
  assert.equal(state.fighter.health, 100);
  assert.equal(duel.setFighterInput({forward: true}), true);
  const fighterStart = {x: state.fighter.x, z: state.fighter.z};
  duel.setInput({interact: false});
  ticks(duel, 120);
  assert.ok(Math.hypot(state.fighter.x - fighterStart.x,
    state.fighter.z - fighterStart.z) > 4);
  assert.equal(state.s, startS);
  assert.equal(state.nextLapGate, gate);
  assert.ok(state.stageTimeSec >= 1.4 - 1e-9);
});

test('high-speed bail needs 1 s, costs 25 health, and the car coasts then brakes', () => {
  const duel = race(), state = duel.state;
  state.speedMph = 80;
  duel.setInput({interact: true});
  ticks(duel, 119);
  assert.equal(state.onFoot, false);
  const exitSpeed = state.speedMph;
  ticks(duel, 1);
  assert.equal(state.onFoot, true);
  assert.equal(state.fighter.health, 75);
  assert.ok(state.fighter.bailTumbleSeconds > 0);
  assert.ok(state.speedMph < exitSpeed);
  const carAtExit = state.s;
  duel.setInput({interact: false});
  ticks(duel, 120);
  assert.ok(state.s > carAtExit, 'unoccupied car has a real coast path');
  assert.ok(state.speedMph < exitSpeed * .4,
    'parked car brakes itself instead of holding cruising speed');
});

test('re-entry requires release, proximity, and a fresh 0.6 s hold', () => {
  const duel = race(), state = duel.state;
  duel.setInput({interact: true});
  ticks(duel, 48);
  assert.equal(state.onFoot, true);
  ticks(duel, 120);
  assert.equal(state.onFoot, true, 'continuous F cannot immediately re-enter');
  duel.setInput({interact: false});
  ticks(duel, 1);
  duel.setFighterInput({forward: true, sprint: true});
  ticks(duel, 60);
  duel.setFighterInput({forward: false, sprint: false});
  assert.ok(state.fighter.s - state.s > 3.5);
  duel.setInput({interact: true});
  ticks(duel, 90);
  assert.equal(state.onFoot, true, 'F cannot pull a fighter back from afar');
  const near = duel.course.groundAt(state.s, state.lateral + 2.5);
  Object.assign(state.fighter, {x: near.x, y: near.y, z: near.z,
    s: state.s, lateral: state.lateral + 2.5, groundY: near.y});
  duel.setInput({interact: false});
  ticks(duel, 1);
  duel.setInput({interact: true});
  ticks(duel, 71);
  assert.equal(state.onFoot, true);
  ticks(duel, 1);
  assert.equal(state.onFoot, false);
  assert.equal(state.fighter, null);
});

test('parked car remains an armor target and recovers at the same site after 3 s', () => {
  const duel = race(), state = duel.state;
  duel.setInput({interact: true});
  ticks(duel, 48);
  assert.equal(state.onFoot, true);
  const parked = {s: state.s, lateral: state.lateral};
  const first = applyArmorDamage(duel, state, 'crossbow', {owner: 'cpu'});
  assert.ok(first > 0 && state.armor < state.maxArmor);
  while (!state.combatWrecking)
    applyArmorDamage(duel, state, 'rpg-direct', {level: 3, owner: 'cpu'});
  assert.equal(state.combatWreckTimer,
    COMBAT_TUNING.foot.parkedWreckSeconds);
  ticks(duel, 359);
  assert.equal(state.combatWrecking, true);
  ticks(duel, 1);
  assert.equal(state.combatWrecking, false);
  assert.equal(state.onFoot, true);
  assert.equal(state.s, parked.s);
  assert.equal(state.lateral, parked.lateral);
  assert.equal(state.speedMph, 0);
  assert.ok(state.armor > 0);
});

test('an opponent can ram the unoccupied player car', () => {
  const duel = race('wasteland', true, true), state = duel.state;
  duel.setInput({interact: true});
  ticks(duel, 48);
  assert.equal(state.onFoot, true);
  const opponent = state.opponents[0];
  const parkedS = state.s, parkedArmor = state.armor;
  Object.assign(opponent, {s: parkedS + 3, prevS: parkedS + 10,
    lateral: state.lateral, prevLateral: state.lateral,
    speedMph: 70, dir: -1, contactCooldown: 0});
  state.prevS = parkedS;
  state.prevLateral = state.lateral;
  assert.equal(duel._vehicleContact(state, opponent, 'rival'), true);
  assert.ok(state.armor < parkedArmor || state.s !== parkedS,
    'the parked car takes an actual ram response');
});

test('ordinary, time trial, objective, and flag-off races cannot enter the fighter state', () => {
  for (const [mode, flag] of [['duel', true], ['timetrial', true],
    ['wasteland', false]]) {
    const duel = race(mode, flag), state = duel.state;
    duel.setInput({interact: true});
    ticks(duel, 150);
    assert.notEqual(state.onFoot, true, `${mode}/${flag} stayed in the car`);
    assert.equal(state.fighter, undefined);
  }
  const objective = new Duel({seed: 1989, featureFlags: {wasteland2: true}});
  objective.startCampaign({mode: 'wasteland', car: 'titan_monster',
    startStage: COURSE.findIndex(stage => stage.id === 'titan-stunt-trial'),
    seed: 1989});
  objective.state.status = 'racing';
  objective.state.countdown = 0;
  objective.setInput({interact: true});
  ticks(objective, 150);
  assert.notEqual(objective.state.onFoot, true);
  assert.equal(objective.state.fighter, undefined);
});
