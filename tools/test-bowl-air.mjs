import assert from 'node:assert/strict';
import test from 'node:test';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {stepBowlAir} from '../src/bowl/bowl-air.js';

const DT = 1 / 120;

function actor(overrides = {}) {
  return {airborne: true, airHeight: 8, speedMph: 72,
    input: {throttle: 0, brake: 0}, ...overrides};
}

test('W/S pitch only the Bowl truck and do not change flight velocity', () => {
  const state = actor({input: {throttle: 1, brake: 0}});
  const bowl = {course: {def: {bowl: true}}, featureFlags: {enabled: name => name === 'titan-bowl'}, state};
  stepBowlAir(bowl, state, DT);
  assert.ok(state.bowlAirPitch < 0, 'W pitches the nose down');
  assert.equal(state.speedMph, 72, 'air control does not change velocity');

  const reversePitch = actor({input: {throttle: 0, brake: 1}});
  stepBowlAir({...bowl, state: reversePitch}, reversePitch, DT);
  assert.ok(reversePitch.bowlAirPitch > 0, 'S pitches the nose up');

  const ordinary = actor({input: {throttle: 1, brake: 0}});
  stepBowlAir({course: {def: {}}, featureFlags: {enabled: () => true}, state: ordinary}, ordinary, DT);
  assert.equal(Object.hasOwn(ordinary, 'bowlAirPitch'), false, 'other courses do not start Bowl air state');

  const disabled = actor({input: {throttle: 1, brake: 0}});
  stepBowlAir({course: {def: {bowl: true}}, featureFlags: {enabled: () => false}, state: disabled}, disabled, DT);
  assert.equal(Object.hasOwn(disabled, 'bowlAirPitch'), false, 'the dev switch gates air control');
});

test('a full backflip from a big jump lands upright and counts once', () => {
  const index = COURSE.findIndex(course => course.kind === 'arena');
  const duel = new Duel({seed: 1989});
  duel.startCampaign({startStage: index, mode: 'timetrial', car: 'titan_monster'});
  duel.course.def = {...duel.course.def, bowl: true};
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  const state = duel.state, ramp = duel.course.features.ramps[0];
  duel.course.features.ramps = duel.course.features.ramps.map((entry, rampIndex) =>
    rampIndex === 0 ? {...entry, height: 8} : entry);
  state.status = 'racing';
  state.traffic = [];
  state.rival = null;
  state.s = state.prevS = ramp.start - 20;
  state.speedMph = 90;
  state.airborne = false;
  state.airHeight = 0;
  state._jumpY = null;
  state._verticalSpeed = 0;
  state.input.brake = 1;
  let airborneTicks = 0;
  for (let i = 0; i < 1000 && state.bowlAirFlips !== 1; i++) {
    state.prevS = state.s;
    state.s += state.speedMph * (1 / 120) * 0.44704;
    duel._jump(state, DT);
    if (state.airborne) {
      airborneTicks++;
      if (state.bowlAirPitch < -3) state._bowlAirPassedHalfTurn = true;
      if (state._bowlAirPassedHalfTurn && state.bowlAirPitch > 0) state.input.brake = 0;
    }
  }
  assert.ok(airborneTicks > 0, 'the ramp makes a real airborne jump');
  assert.equal(state.airborne, false, 'the jump lands before its result is checked');
  assert.equal(state.bowlAirFlips, 1);
  assert.equal(state.bowlAirPitch, 0);
});

test('a roof landing uses the existing tumble and recovery', () => {
  const index = COURSE.findIndex(course => course.id === 'titan-freestyle');
  const duel = new Duel({seed: 1147});
  duel.startCampaign({startStage: index, mode: 'timetrial', car: 'titan_monster'});
  duel.course.def = {...duel.course.def, bowl: true};
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  const state = duel.state;
  state.status = 'racing';
  state.speedMph = 45;
  state.airborne = true;
  state.airHeight = 5;
  state.input.brake = 1;
  for (let i = 0; i < 66; i++) stepBowlAir(duel, state, DT);
  state.airborne = false;
  stepBowlAir(duel, state, DT);
  assert.ok(state.tumble, 'landing upside down starts the existing tumble');

  for (let i = 0; i < 300 && state.tumble; i++) duel._rollover(DT);
  assert.equal(state.tumble, null, 'the existing recovery returns the truck to its wheels');
  assert.equal(state.status, 'racing', 'the existing recovery leaves the truck drivable');
});

function carLaunch(enabled) {
  const practice = COURSE.findIndex(course => course.practice);
  const duel = new Duel({seed: 1989});
  duel.startCampaign({car: 'titan_monster', startStage: practice, difficulty: 'casual', mode: 'timetrial'});
  const point = (s, lateral = 0) => ({x: lateral, y: 0, z: s, heading: 0, curvature: 0});
  duel.course = {def: {id: 'bowl-air-launch', practice: true, bowl: true, kind: 'arena', theme: 'desert'},
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
