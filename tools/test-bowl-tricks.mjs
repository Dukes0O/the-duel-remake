import assert from 'node:assert/strict';
import test from 'node:test';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {stepBowlTricks} from '../src/bowl/bowl-tricks.js';

const DT = 1 / 120;

function actor(overrides = {}) {
  return {airborne: true, airHeight: 8, speedMph: 72,
    input: {throttle: 0, brake: 0}, ...overrides};
}

// A key pressed in the air tips the nose; the first step airborne is the take-off.
function pressInAir(duel, state, input) {
  const pressed = {...state.input};
  state.input = {throttle: 0, brake: 0};
  stepBowlTricks(duel, state, DT);
  state.input = pressed;
  Object.assign(state.input, input);
}

test('W/S pitch only the Bowl truck and do not change flight velocity', () => {
  const state = actor({input: {throttle: 1, brake: 0}});
  const bowl = {course: {def: {bowl: true, tricks: true}}, featureFlags: {enabled: name => name === 'titan-bowl'}, state};
  pressInAir(bowl, state, {throttle: 1});
  stepBowlTricks(bowl, state, DT);
  assert.ok(state.bowlPose.pitch < 0, 'W pitches the nose down');
  assert.equal(state.speedMph, 72, 'air control does not change velocity');

  const reversePitch = actor({input: {throttle: 0, brake: 1}});
  pressInAir({...bowl, state: reversePitch}, reversePitch, {brake: 1});
  stepBowlTricks({...bowl, state: reversePitch}, reversePitch, DT);
  assert.ok(reversePitch.bowlPose.pitch > 0, 'S pitches the nose up');

  const ordinary = actor({input: {throttle: 1, brake: 0}});
  stepBowlTricks({course: {def: {}}, featureFlags: {enabled: () => true}, state: ordinary}, ordinary, DT);
  assert.equal(Object.hasOwn(ordinary, 'bowlPose'), false, 'other courses do not start Bowl air state');

  const disabled = actor({input: {throttle: 1, brake: 0}});
  stepBowlTricks({course: {def: {bowl: true, tricks: true}}, featureFlags: {enabled: () => false}, state: disabled}, disabled, DT);
  assert.equal(Object.hasOwn(disabled, 'bowlPose'), false, 'the dev switch gates air control');
});

test('a key held from before take-off tips nothing until it is pressed again', () => {
  const state = actor({airborne: false, input: {throttle: 1, brake: 0}});
  const bowl = {course: {def: {bowl: true, tricks: true}}, featureFlags: {enabled: name => name === 'titan-bowl'}, state};
  stepBowlTricks(bowl, state, DT);
  state.airborne = true;
  for (let i = 0; i < 60; i++) stepBowlTricks(bowl, state, DT);
  assert.equal(state.bowlPose.pitch, 0, 'the throttle held over the lip leaves the nose level');
  state.input.throttle = 0; stepBowlTricks(bowl, state, DT);
  state.input.throttle = 1; stepBowlTricks(bowl, state, DT);
  assert.ok(state.bowlPose.pitch < 0, 'pressed again in the air, W tips the nose down');
  state.airborne = false; stepBowlTricks(bowl, state, DT);
  assert.ok(!state.tumble, 'a small tip lands on the wheels');
});

function carLaunch(enabled) {
  const practice = COURSE.findIndex(course => course.practice);
  const duel = new Duel({seed: 1989});
  duel.startCampaign({car: 'titan_monster', startStage: practice, difficulty: 'casual', mode: 'timetrial'});
  const point = (s, lateral = 0) => ({x: lateral, y: 0, z: s, heading: 0, curvature: 0});
  duel.course = {def: {id: 'bowl-air-launch', practice: true, bowl: true, tricks: true, kind: 'arena', theme: 'desert'},
    closed: false, length: 10000, raceLength: 20000,
    features: {obstacles: [], mountains: [], ramps: [], crushables: [], shortcuts: [], flocks: []},
    at: point, worldAt: point, groundAt: point, nearest: (x, z) => ({s: z, lateral: x}), phase: s => s,
    surfaceAt: (_, lateral) => ({mainRoad: Math.abs(lateral) <= 7, road: Math.abs(lateral) <= 7, roadHalfWidth: 7}),
    themeAt: () => 'desert', roadHalfWidthAt: () => 7, nearestRadar: () => null,
    obstaclesNear: () => duel.course.features.obstacles};
  duel.featureFlags = {enabled: name => name === 'titan-bowl' && enabled};
  duel._obstacleArray = duel.course.features.obstacles;
  duel._obstacleQueryCache.clear();
  duel._lapGates = [];
  const target = {s: 40, prevS: 40, lateral: 30, prevLateral: 30, speedMph: 0,
    headingError: 0, pushVelocity: 0, dir: 1, car: 'falcone_f42', alive: true,
    damageZones: {front: 0, rear: 0, left: 0, right: 0}};
  Object.assign(duel.state, {status: 'racing', s: 28, prevS: 28, lateral: 30,
    prevLateral: 30, speedMph: 30, traffic: [target]});
  const samples = [];
  for (let i = 0; i < 360; i++) {
    duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
    duel.step(DT);
    const s = duel.state;
    samples.push([s.speedMph, s.airHeight, s.airborne, !!s.tumble]);
  }
  assert.equal(target.crushed, true, 'the Titan still launches from the parked car');
  return samples;
}

test('enabling Bowl air leaves the Titan launch off cars unchanged', () => {
  assert.deepEqual(carLaunch(true), carLaunch(false));
});

function onFloor(speed, lateral = -13, start = 38) {
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  duel.startBowlNight({night: 1, cpuDifficulty: 'medium'});
  Object.assign(duel.state.bowlNight, {show: {night: 1, eventIndex: 1, complete: false}, phase: 'result'});
  duel.continueBowlNight();
  Object.assign(duel.state, {status: 'racing', s: start, prevS: start, lateral, prevLateral: lateral,
    speedMph: speed, gear: 2, headingError: 0});
  const events = [];
  duel.onChange((_, ev) => { if (ev.bowlTrick) events.push(ev.bowlTrick); });
  return {duel, events};
}

const neutral = {throttle: 0, brake: 0, steer: 0, boost: false};
function bigJump(keys) {
  const {duel, events} = onFloor(53), speeds = [];
  let ticks = 0;
  for (let i = 0; i < 515; i++) {
    const input = {...neutral};
    if (duel.state.airborne) {
      Object.assign(input, keys(++ticks));
      speeds.push(duel.state.speedMph);
    } else if (ticks) input.throttle = 1;
    duel.setInput(input);
    duel.step(DT);
  }
  assert.ok(ticks > 218, 'the authored Big Jump permits a double');
  return {duel, events, speeds};
}

test('the Big Jump pays full turns, combos, sideways landings and a damage-free Slam', () => {
  const fly = (keys, expected) => {
    const run = bigJump(t => t > 2 ? keys(t - 2) : {});
    assert.deepEqual(run.events.map(e => [e.kind, e.turns, e.points, e.landing]), expected);
    return run;
  };
  const single = fly(t => ({brake: +(t <= 120)}), [['backflip', 1, 50, 'clean']]);
  assert.deepEqual(single.speeds, bigJump(() => ({})).speeds, 'S leaves the whole flight speed trace unchanged');
  fly(t => ({brake: +(t <= 216)}), [['backflip', 2, 200, 'clean']]);
  fly(t => ({throttle: +(t <= 120)}), [['frontFlip', 1, 50, 'clean']]);
  fly(t => ({steer: +(t <= 108)}), [['spin', 1, 30, 'clean']]);
  fly(t => ({brake: +(t <= 120), steer: +(t <= 108)}), [['backflip', 1, 75, 'clean'], ['spin', 1, 45, 'clean']]);
  fly(t => ({boost: t <= 120, steer: +(t <= 120)}), [['barrelRoll', 1, 60, 'clean']]);
  fly(t => ({boost: t > 27 && t <= 147, steer: +(t <= 147)}), [['sideFlip', 1, 40, 'slide']]);
  const slam = fly(t => ({brake: +(t <= 60)}), [['slam', 0, 0, 'slam']]);
  assert.ok(Object.values(slam.duel.state.damageZones).every(value => value === 0));
  assert.ok(slam.duel.state.speedMph > 1 && slam.duel.state.bowlPose.pitch === 0);
});

test('the real floor counts wheelies, stoppies and consecutive donuts', () => {
  for (const [speed, input, steps, expected] of [
    [0, {throttle: 1}, 370, [['wheelie', 8], ['wheelie', 8], ['wheelie', 33]]],
    [42, {brake: 1}, 123, [['stoppie', 10]]],
    [4, {throttle: 1, steer: 1}, 545, [['donut', 15], ['donut', 20], ['donut', 25], ['cyclone', 30]]],
  ]) {
    const {duel, events} = onFloor(speed, 7, 1);
    for (let i = 0; i < steps; i++) {
      duel.setInput({...neutral, boost: true, ...input});
      duel.step(DT);
    }
    assert.deepEqual(events.map(e => [e.kind, e.points]), expected);
  }
});
