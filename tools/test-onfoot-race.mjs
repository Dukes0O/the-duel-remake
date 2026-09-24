import assert from 'node:assert/strict';
import test from 'node:test';
import {trafficSpeedNearFighter, opponentFighterIntent,
  strikeFighterFromVehicles} from '../src/onfoot-race.js';

function fixture(difficulty = 'hard', seed = 1989) {
  const fighter = {s: 100, lateral: -3, x: -3, y: 0, z: 100,
    groundY: 0, health: 100, knockedDown: false};
  const actor = {s: 70, prevS: 70, lateral: -3, prevLateral: -3,
    dir: 1, speedMph: 80, alive: true};
  const events = [];
  const duel = {
    seed,
    state: {onFoot: true, fighter, cpuDifficulty: difficulty,
      opponents: [actor], traffic: []},
    relativeS: value => value,
    _surface: () => ({road: true}),
    _vehicleSpec: () => ({halfWidth: 1.2, halfLength: 2.4, height: 1.5}),
    course: {groundAt: (s, lateral) => ({x: lateral, y: 0, z: s})},
    emit: event => events.push(event),
    _callout: () => {},
  };
  return {duel, actor, fighter, events};
}

test('traffic brakes for a fighter in its lane but leaves distant or off-lane fighters alone', () => {
  const {duel, actor, fighter} = fixture();
  assert.equal(trafficSpeedNearFighter(duel, actor, 80), 20);
  actor.s = 92;
  assert.equal(trafficSpeedNearFighter(duel, actor, 80), 12);
  fighter.lateral = 3;
  assert.equal(trafficSpeedNearFighter(duel, actor, 80), 80);
  fighter.lateral = -3;
  actor.s = 25;
  assert.equal(trafficSpeedNearFighter(duel, actor, 80), 80);
  duel.state.onFoot = false;
  assert.equal(trafficSpeedNearFighter(duel, actor, 80), 80);
});

test('Easy avoids a fighter, Hard aims for one, Medium is seeded', () => {
  const easy = fixture('easy');
  assert.deepEqual(opponentFighterIntent(easy.duel, easy.actor, 80, -3),
    {attack: false, lane: 3.4, targetMph: 38});
  const hard = fixture('hard');
  hard.fighter.lateral = 3;
  assert.deepEqual(opponentFighterIntent(hard.duel, hard.actor, 20, -3),
    {attack: true, lane: 3, targetMph: 35});
  const decisions = Array.from({length: 18}, (_, seed) => {
    const {duel, actor} = fixture('medium', seed);
    return opponentFighterIntent(duel, actor, 60, -3).attack;
  });
  assert.ok(decisions.includes(true) && decisions.includes(false));
});

test('a fast swept vehicle hit knocks down the fighter once; a slow hit does not', () => {
  const setup = fixture();
  const {duel, actor, fighter, events} = setup;
  actor.prevS = 98; actor.s = 102;
  assert.equal(strikeFighterFromVehicles(duel), true);
  assert.equal(fighter.knockedDown, true);
  assert.equal(fighter.knockdownRemaining, 3);
  assert.equal(events.length, 1);
  assert.equal(events[0].source, 'opponent');
  assert.equal(strikeFighterFromVehicles(duel), false);
  fighter.knockedDown = false; fighter.health = 100;
  actor.speedMph = 10;
  assert.equal(strikeFighterFromVehicles(duel), false);
  fighter.y = 3;
  actor.speedMph = 80;
  assert.equal(strikeFighterFromVehicles(duel), false);
});
