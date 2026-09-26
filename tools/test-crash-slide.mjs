import assert from 'node:assert/strict';
import test from 'node:test';
import {COURSE, DRIVE} from '../src/config.js';
import {Duel} from '../src/game.js';

// CRASH-03: a car smashed out of the way keeps the solver's speed and scrubs
// to a stop on friction. It ends beyond the nearest shoulder, never parked
// in the lane, and never stops dead from speed in one tick.
const RIVAL_STAGE = COURSE.findIndex(stage => !stage.kind && stage.hasRival);
// m/s², about 1 g: forward and sideways scrub combined on a spinning car.
const MAX_DECEL = 10;
const BASE = 900;

function crash({mode = 'duel', car = 'falcone_f42', playerMph, trafficMph,
  lateral = 0, crashPhysics = true}) {
  const duel = new Duel({seed: 2609,
    featureFlags: {wasteland2: true, 'crash-physics': crashPhysics}});
  duel.startCampaign({mode, startStage: mode === 'duel' ? RIVAL_STAGE : 0, car,
    opponentCount: 1});
  const s = duel.state;
  Object.assign(s, {status: 'racing', countdown: 0, invulnerableSec: 0,
    s: BASE, prevS: BASE, lateral: 0, prevLateral: 0, speedMph: playerMph,
    pushVelocity: 0, headingError: 0});
  Object.assign(s.input, {throttle: 1, brake: 0, steer: 0});
  for (const actor of [...(s.opponents || []), s.rival].filter(Boolean))
    Object.assign(actor, {s: BASE + 3000, prevS: BASE + 3000});
  const traffic = {s: BASE + 8, prevS: BASE + 8, lateral, prevLateral: lateral,
    speedMph: trafficMph, dir: 1, alive: true, headingError: 0,
    pushVelocity: 0, model: 'sedan'};
  s.traffic = [traffic];
  s.trafficTimer = 999;
  const clear = duel.course.roadHalfWidthAt(traffic.s) +
    duel._vehicleSpec(traffic).halfWidth + .5;
  const samples = [];
  let hit = false;
  for (let tick = 0; tick < 60 * 12; tick++) {
    duel.step(1 / 60);
    hit ||= !!(traffic.knock || traffic.wrecked);
    if (hit) samples.push({s: traffic.s, lateral: traffic.lateral,
      knocked: !!traffic.knock, wrecked: !!traffic.wrecked});
  }
  return {duel, traffic, samples, clear};
}

// Worst slowing of the struck car along the road between samples. The last
// crawl below 3 m/s to a standstill is allowed.
function worstStop(samples) {
  let worst = 0;
  for (let i = 2; i < samples.length; i++) {
    const v1 = (samples[i - 1].s - samples[i - 2].s) * 60;
    const v2 = (samples[i].s - samples[i - 1].s) * 60;
    if (Math.abs(v1) >= 3) worst = Math.max(worst, (Math.abs(v1) - Math.abs(v2)) * 60);
  }
  return worst;
}

test('Rival Duel: a hard rear-end smashes traffic forward and off the lane', () => {
  const {traffic, samples, clear} = crash({playerMph: 100, trafficMph: 45});
  assert.ok(traffic.wrecked, 'the struck sedan is wrecked');
  const travelled = samples.at(-1).s - samples[0].s;
  assert.ok(travelled >= 40,
    `a sedan hit from behind at 55 mph closing keeps rolling (${travelled.toFixed(1)} m)`);
  assert.ok(Math.abs(traffic.lateral) >= clear - .05,
    `the wreck ends beyond the shoulder (${traffic.lateral.toFixed(2)} of ${clear.toFixed(2)})`);
  assert.ok(worstStop(samples) <= MAX_DECEL,
    `no dead stop (worst ${worstStop(samples).toFixed(1)} m/s²)`);
});

test('Rival Duel: an off-centre hit leaves by the side it was struck toward', () => {
  const {traffic, clear} = crash({playerMph: 100, trafficMph: 45, lateral: 1.3});
  assert.ok(traffic.wrecked);
  assert.ok(traffic.lateral >= clear - .05,
    `pushed right, parked on the right shoulder (${traffic.lateral.toFixed(2)})`);
});

test('Mad Max: a shoved car scrubs to a stop instead of halting from speed', () => {
  const {traffic, samples, clear} = crash({mode: 'wasteland', playerMph: 100, trafficMph: 45});
  assert.ok(traffic.wrecked, 'the shoved car ends as a still roadside wreck');
  assert.ok(worstStop(samples) <= MAX_DECEL,
    `no dead stop (worst ${worstStop(samples).toFixed(1)} m/s²)`);
  assert.ok(Math.abs(traffic.lateral) >= clear - .05,
    `parked beyond the shoulder (${traffic.lateral.toFixed(2)} of ${clear.toFixed(2)})`);
  const settled = samples.findIndex(sample => sample.wrecked);
  const before = samples[settled - 1], atPark = samples[settled - 2];
  const speed = Math.abs(before.s - atPark.s) * 60;
  assert.ok(speed < 3, `nearly stopped when parked (${speed.toFixed(1)} m/s)`);
});

test('Mad Max Titan: a sedan is thrown clear and slides to rest', () => {
  const {traffic, samples, clear} = crash({mode: 'wasteland', car: 'titan_monster',
    playerMph: 80, trafficMph: 40, lateral: .8});
  assert.ok(traffic.wrecked);
  assert.ok(Math.abs(traffic.lateral) >= clear - .05);
  assert.ok(worstStop(samples) <= MAX_DECEL);
  const last = samples.slice(-10);
  assert.ok(last.every(sample => sample.s === last[0].s &&
    sample.lateral === last[0].lateral), 'the wreck comes to rest');
});

test('crash-physics off keeps the released wreck motion', () => {
  const {traffic} = crash({playerMph: 100, trafficMph: 45, crashPhysics: false});
  assert.equal(traffic.wrecked?.physical, undefined,
    'no physical wreck exists without the switch');
  assert.ok(DRIVE.mphToWorld > 0);
});
