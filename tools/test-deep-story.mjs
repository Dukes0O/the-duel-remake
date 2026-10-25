// DEEP-SIRENA-VIEW (docs/THE_DEEP.md 6.2 to 6.7): the Kelp Coast story in a real
// dive, headless: the badge, the sonar, the lift bags, the Sirena, the sea-life
// log and Ana's lines in order; the App pays and saves each once. Memory-only.
import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {ROUTE_VARIANTS} from '../src/route-variants.js';
import {kelpCoastProvider} from '../src/deep/zones/kelp-coast.js';
import {SIRENA, SIRENA_FINDS} from '../src/deep/deep-sirena.js';
import {DEEP_PHONE_LINES} from '../src/deep/deep-phone-lines.js';
import {deepStoryView} from '../src/deep/deep-story.js';
import {controlsHelp} from '../src/controls-help.js';
import {keyboardAction} from '../src/input-contexts.js';

const DT = 1 / 120;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

function race(route, {enabled = true, deepSave = null, deepFound = []} = {}) {
  const duel = new Duel({seed: route.seed, deepProviders: [kelpCoastProvider], featureFlags: {'the-deep': enabled}});
  duel.startCampaign({seed: route.seed, car: 'falcone_f42', mode: 'duel', deepKit: true, opponentCount: 1,
    fieldSize: 2, fieldSeed: route.seed, playerId: 'node-qa', deepSave, deepFound});
  Object.assign(duel.state, {status: 'racing', countdown: 0});
  return duel;
}
function rampPoint(ramp, progress) {
  for (let i = 1; i < ramp.points.length; i++) {
    const a = ramp.points[i - 1], b = ramp.points[i];
    if (progress > b.progress && i < ramp.points.length - 1) continue;
    const t = (progress - a.progress) / (b.progress - a.progress);
    return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t};
  }
}
function dive(duel) {
  const ramp = duel.course.deepRamp, point = rampPoint(ramp, ramp.shoreline.center.progress - .04);
  const near = duel.course.nearest(point.x, point.z), frame = duel.course.at(near.s);
  Object.assign(duel.state, {s: near.s, prevS: near.s, lateral: near.lateral, prevLateral: near.lateral,
    headingError: wrap(ramp.heading - frame.heading), speedMph: 35, groundHeight: point.y, airHeight: 0,
    prevAirHeight: 0, airborne: false, impactTimer: 0, yawVelocity: 0, steerVisual: 0, slipAngle: 0, pushVelocity: 0, _jumpY: null});
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  duel.step(DT);
  assert.equal(duel.chooseDeep('dive'), true);
  for (let i = 0; i < 3 * 120; i++) duel.step(DT);
  assert.equal(duel.state.deepJourney.phase, 'underwater');
}
// Put the stopped car on the sea floor at a world point (as if driven there).
function park(duel, x, z) {
  const near = duel.course.nearest(x, z, duel.state.s);
  Object.assign(duel.state, {s: near.s, prevS: near.s, lateral: near.lateral, prevLateral: near.lateral, speedMph: 0,
    yawVelocity: 0, pushVelocity: 0, airborne: false, airHeight: 0, _jumpY: null});
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
}
function hold(duel, seconds, lift = false) {
  for (let t = 0; t < seconds; t += DT) {
    duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false, interact: lift});
    Object.assign(duel.state, {speedMph: 0});
    duel.step(DT);
  }
}
const findAt = (duel, id) => duel.deepStory.sirena.finds.find(find => find.id === id);
function record(duel) {
  const log = [];
  duel.onChange((state, event) => {
    for (const key of ['deepRaised', 'deepSonar', 'deepLift', 'deepLogged', 'deepPearl', 'deepPhone'])
      if (event[key]) log.push(key === 'deepPhone' ? event.deepPhone.line : key === 'deepRaised' ? 'raised:' + event.deepRaised.find :
        key === 'deepLogged' ? 'logged:' + event.deepLogged.creature : key === 'deepPearl' ? 'pearl:' + event.deepPearl.pearl : key);
  });
  return log;
}

test('a first dive plays the whole Sirena story with Ana in order: badge, sonar, four parts, the car', () => {
  const duel = race(ROUTE_VARIANTS[0]), log = record(duel);
  dive(duel);
  hold(duel, DT);
  assert.deepEqual(log.splice(0), ['deep.ana.hello', 'deep.ana.legend'], 'the first dive: Ana calls');
  const badge = findAt(duel, 'sirena-badge');
  park(duel, badge.x, badge.z); hold(duel, 1.2);
  assert.deepEqual(log.splice(0), ['raised:sirena-badge', 'deep.ana.badge']);
  assert.equal(duel.deepPing(), true);
  assert.deepEqual(log.splice(0), ['deepSonar', 'deep.ana.sonar'], 'the first ping gives the 1,500 m line');
  assert.equal(duel.deepPing(), false, 'one ping every 1.5 s');
  for (const [index, id] of ['sirena-steering-wheel', 'sirena-wheel', 'sirena-bonnet', 'sirena-door'].entries()) {
    const part = findAt(duel, id);
    park(duel, part.x, part.z); hold(duel, DT);
    if (index === 0) assert.deepEqual(log.splice(0), ['deep.ana.bag'], 'Ana says how to bag the first part');
    hold(duel, SIRENA.liftSeconds + .1, true);
    const expected = ['deepLift', 'raised:' + id, 'deep.ana.part', ...(index === 3 ? ['deep.ana.deep'] : [])];
    assert.deepEqual(log.splice(0).filter(line => !line.startsWith('logged:') && !line.startsWith('pearl:') &&
      !['deep.ana.log', 'deep.ana.otter', 'deep.ana.pearl'].includes(line)), expected, id);
  }
  const car = findAt(duel, 'sirena-car');
  park(duel, car.x, car.z); hold(duel, DT);
  assert.ok(log.splice(0).includes('deep.ana.car'), "Ana: that's her");
  hold(duel, SIRENA.carLiftSeconds + .1, true);
  assert.deepEqual(log.splice(0).filter(line => !line.startsWith('logged:') && !line.startsWith('pearl:')),
    ['deepLift', 'raised:sirena-car', 'deep.ana.raised', 'deep.ana.lab']);
  assert.deepEqual(deepStoryView(duel).finds, [], 'nothing left on the sea floor');
  for (const line of new Set(['hello', 'legend', 'badge', 'sonar', 'bag', 'part', 'deep', 'car', 'raised', 'lab']))
    assert.ok(DEEP_PHONE_LINES['deep.ana.' + line], line + ' is recorded');
});

test('the way back up after the first part: the Norseman line once', () => {
  const duel = race(ROUTE_VARIANTS[1], {deepSave: {raised: ['sirena-badge'], sonar: true}, deepFound: ['kelp-coast']}), log = record(duel);
  dive(duel); hold(duel, DT);
  assert.deepEqual(log.splice(0), [], 'not a first dive: no hello');
  const part = findAt(duel, 'sirena-bonnet');
  park(duel, part.x, part.z); hold(duel, SIRENA.liftSeconds + .2, true);
  assert.ok(log.includes('raised:sirena-bonnet'));
  log.length = 0;
  const ramp = duel.deepRuntime.ramp, end = ramp.points.at(-1);
  park(duel, end.x, end.z);
  Object.assign(duel.state, {headingError: wrap(ramp.heading + Math.PI - duel.course.at(duel.state.s).heading), speedMph: 6});
  duel.setInput({throttle: .4, brake: 0, steer: 0, boost: false});
  for (let i = 0; i < 30 && duel.state.deepJourney?.phase === 'underwater'; i++) duel.step(DT);
  assert.equal(duel.state.deepJourney?.phase, 'ascending');
  duel.step(DT); duel.step(DT);
  assert.deepEqual(log.filter(line => line.startsWith('deep.ana.')), ['deep.ana.norseman']);
});

test('the sea-life log runs in the dive: a creature spot logs, a pearl is found', () => {
  const duel = race(ROUTE_VARIANTS[2], {deepFound: ['kelp-coast']}), log = record(duel);
  dive(duel); hold(duel, DT);
  const spot = duel.deepStory.log.spots.find(row => row.creature === 'turtle'), pearl = duel.deepStory.log.pearls[0];
  park(duel, spot.x, spot.z); hold(duel, 1.1);
  assert.ok(log.includes('logged:turtle'));
  park(duel, pearl.x, pearl.z); hold(duel, 1.1);
  assert.ok(log.includes('pearl:' + pearl.pearl));
});

test('the switch off: no story, no events, no keys; R pings only under water; help lists R and F there', () => {
  const off = race(ROUTE_VARIANTS[0], {enabled: false, deepSave: {raised: []}}), log = record(off);
  for (let i = 0; i < 240; i++) off.step(DT);
  assert.equal(off.deepStory, null); assert.equal(off.deepPing(), false); assert.deepEqual(log, []);
  assert.equal(keyboardAction('car', 'KeyR'), 'deep-ping');
  const duel = race(ROUTE_VARIANTS[0]);
  assert.equal(duel.deepPing(), false, 'R on the road does nothing');
  assert.ok(!controlsHelp(duel).rows.some(([keys]) => keys === 'R'), 'not listed on the road');
  dive(duel); hold(duel, DT);
  const rows = controlsHelp(duel).rows.map(([keys]) => keys);
  assert.ok(rows.includes('R') && rows.includes('F'), 'listed while diving');
  assert.deepEqual(SIRENA_FINDS.length, 6);
});

test('memory-only App pays and saves each raise, log and pearl once, and passes Ana the log lines', async () => {
  const {App} = await import('../src/app.js');
  const {createFeatureFlags} = await import('../src/feature-flags.js');
  const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), values = new Map();
  const savedCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {configurable: true, value: () => {}});
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)}});
  let app;
  try {
    app = new App({deepProviders: [kelpCoastProvider]});
    app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {'the-deep': true}});
    app.audio.flags = app.duel.featureFlags;
    app.profile = {...app.profile, credits: 1000, deep: {kit: true, found: ['kelp-coast']}}; app._saveProfile();
    app.startCampaign({mode: 'duel', seed: ROUTE_VARIANTS[0].seed, opponentCount: 1});
    Object.assign(app.duel.state, {status: 'racing', countdown: 0});
    app._markActiveRace(app.duel.state);
    const lines = [];
    app.duel.onChange((state, event) => { if (event.deepPhone) lines.push(event.deepPhone.line); });
    dive(app.duel); hold(app.duel, DT);
    const bank = app.profile.credits;
    const badge = findAt(app.duel, 'sirena-badge');
    park(app.duel, badge.x, badge.z); hold(app.duel, 1.2);
    assert.equal(app.profile.credits, bank + 100, 'the badge pays 100 once');
    assert.deepEqual(app.profile.deep.raised, ['sirena-badge']); assert.equal(app.profile.deep.sonar, true);
    hold(app.duel, 2);
    assert.equal(app.profile.credits, bank + 100, 'standing there pays nothing more');
    const spot = app.duel.deepStory.log.spots.find(row => row.creature === 'otter');
    park(app.duel, spot.x, spot.z); hold(app.duel, 1.1);
    assert.equal(app.profile.credits, bank + 150); assert.deepEqual(app.profile.deep.logged, ['otter']);
    assert.ok(lines.includes('deep.ana.otter'), 'the App passes the otter line to the phone');
    const saved = JSON.parse([...values.values()].find(text => text.includes('sirena-badge')));
    assert.ok(JSON.stringify(saved).includes('"otter"'), 'written to the (memory) save');
  } finally {
    app?.dispose();
    if (savedStorage) Object.defineProperty(globalThis, 'localStorage', savedStorage); else delete globalThis.localStorage;
    if (savedCancel) Object.defineProperty(globalThis, 'cancelAnimationFrame', savedCancel); else delete globalThis.cancelAnimationFrame;
  }
});
