import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {heldInput, keyboardAction, carGamepadDrive, footGamepadInput} from '../src/input-contexts.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
import {hudMarkup, createHudScreen} from '../src/screen-hud.js';

let hints;
try { hints = await import('../src/onfoot-hints.js'); } catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  hints = {};
}
const STEP = 1 / 120;
const fixturePath = new URL('./replays/onfoot-hints.json', import.meta.url);
let checks = 0;
const failures = [];
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
function hint(duel) {
  assert.equal(typeof hints.onFootHint, 'function', 'onFootHint public presentation API exists');
  return hints.onFootHint(duel);
}
function race(mode = 'wasteland', wasteland2 = true) {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2}});
  duel.startCampaign({mode, seed: 1989, car: 'falcone_f42', startStage: 0});
  Object.assign(duel.state, {status: 'racing', countdown: 0, s: 500, prevS: 500,
    lateral: 0, prevLateral: 0, traffic: [], opponents: []});
  if (duel.state.combat) {
    duel.state.combat.aiTimer = Infinity;
    duel.state.combat.pickupTimer = Infinity;
  }
  return duel;
}
function ticks(duel, count, kph) {
  for (let index = 0; index < count; index++) {
    if (kph !== undefined) duel.state.speedMph = kph / COMBAT_TUNING.armor.kphPerMph;
    duel.step(STEP);
  }
}
function onFoot() {
  const duel = race();
  duel.setInput({interact: true});
  ticks(duel, 48, 0);
  assert.equal(duel.state.onFoot, true);
  return duel;
}
function mockHud(duel) {
  const elements = {}, texts = {};
  const ui = new Proxy(elements, {get(target, key) {
    return target[key] ??= {hidden: false, dataset: {}, style: {},
      classList: {toggle() {}}, setAttribute() {}, firstChild: {textContent: ''},
      lastChild: {textContent: ''}, innerHTML: ''};
  }});
  const app = {duel, player: {name: 'QA'}, cameraMode: 'chase'};
  const update = createHudScreen({app, ui, text: (id, value) => {texts[id] = value;},
    time: String, clamp: value => Math.max(0, Math.min(1, value)), credits: String,
    routeMap: {update() {}}});
  return {ui, texts, update};
}
function replay(mode, flag, readHints) {
  const duel = race(mode, flag), samples = [];
  duel.setInput({throttle: 1, steer: .12});
  for (let tick = 1; tick <= 360; tick++) {
    if (tick === 120) duel.setInput({throttle: .5, brake: .2, steer: -.08});
    if (tick === 240) duel.setInput({throttle: 1, brake: 0, steer: 0});
    duel.step(STEP);
    if (readHints) {
      const before = structuredClone(duel.state);
      hint(duel);
      assert.deepEqual(duel.state, before, `hint mutated ${mode}/${flag} at tick ${tick}`);
    }
    if (tick % 120 === 0) samples.push(structuredClone(duel.state));
  }
  return createHash('sha256').update(JSON.stringify(samples)).digest('hex');
}
const replayCases = [['duel', true], ['timetrial', true], ['wasteland', false], ['wasteland', true]];
if (process.argv.includes('--record')) {
  const fingerprints = Object.fromEntries(replayCases.map(([mode, flag]) =>
    [`${mode}/${flag}`, replay(mode, flag, false)]));
  writeFileSync(fixturePath, JSON.stringify({version: 1, seed: 1989, stepHz: 120,
    durationTicks: 360, fingerprints}, null, 2) + '\n');
  console.log(`On-foot hint fingerprints: recorded ${replayCases.length} seeded races.`);
  process.exit(0);
}

check('current transition rules hold at the exact exit and bailout boundaries', () => {
  for (const [kph, count, healthLoss] of [[39.999, 48, 0], [40, 120, 25], [-40, 120, 25]]) {
    const duel = race(); duel.setInput({interact: true});
    ticks(duel, count - 1, kph); assert.equal(duel.state.onFoot, false);
    ticks(duel, 1, kph); assert.equal(duel.state.onFoot, true);
    assert.equal(duel.state.fighter.health, duel.state.fighter.maxHealth - healthLoss);
  }
});
check('source controls use keyboard F and gamepad X, while keyboard X remains a car camera', () => {
  const pad = {axes: [0, 0, 0, 0], buttons: []}, pressed = [false, false, true];
  for (const context of ['car', 'foot']) {
    assert.equal(heldInput(context, 'interact', {KeyF: true}), true);
    assert.equal(heldInput(context, 'interact', {KeyX: true}), false);
  }
  assert.equal(keyboardAction('car', 'KeyX'), 'camera:left');
  assert.equal(carGamepadDrive(pad, pressed).interact, true);
  assert.equal(footGamepadInput(pad, pressed).interact, true);
  assert.match(hint(race()), /\bF\b/);
  assert.match(hint(race()), /(?:gamepad|controller|Xbox).*\bX\b|\bX\b.*(?:gamepad|controller|Xbox)/i);
});
check('normal exit takes a .4-second hold below 40 km/h and keeps full crew health', () => {
  const duel = race();
  duel.setInput({interact: true});
  ticks(duel, 47, 39.999);
  assert.equal(duel.state.onFoot, false);
  ticks(duel, 1, 39.999);
  assert.equal(duel.state.onFoot, true);
  assert.equal(duel.state.fighter.health, duel.state.fighter.maxHealth);
  const text = hint(race());
  assert.match(text, /hold/i); assert.match(text, /0\.4/);
  assert.match(text, /below\s*40|under\s*40|<\s*40/i);
  assert.match(text, /step out|exit/i);
});
for (const kph of [40, 40.001, -40]) check(`${kph} km/h requires a one-second bailout and costs 25 health`, () => {
  const duel = race();
  duel.setInput({interact: true});
  ticks(duel, 119, kph);
  assert.equal(duel.state.onFoot, false);
  const text = hint(duel);
  assert.match(text, /bail/i); assert.match(text, /hold.*\b1(?:\.0)?\s*(?:s|second)/i);
  assert.match(text, /25.*health|health.*25/i);
  ticks(duel, 1, kph);
  assert.equal(duel.state.onFoot, true);
  assert.equal(duel.state.fighter.health, duel.state.fighter.maxHealth - 25);
});
check('the exact speed boundary is described as 40 or above', () => {
  const duel = race(); duel.state.speedMph = 40 / COMBAT_TUNING.armor.kphPerMph;
  assert.match(hint(duel), /40\s*(?:km\/h\s*)?(?:or|and)\s*(?:above|more)|at least\s*40|>=\s*40|≥\s*40/i);
});
check('reentry requires release before a fresh .6-second hold', () => {
  const duel = onFoot();
  const text = hint(duel);
  assert.match(text, /release/i); assert.match(text, /0\.6/); assert.match(text, /3\.5/);
  ticks(duel, 90); assert.equal(duel.state.onFoot, true);
  duel.setInput({interact: false}); ticks(duel, 1);
  duel.setInput({interact: true}); ticks(duel, 71);
  assert.equal(duel.state.onFoot, true);
  ticks(duel, 1); assert.equal(duel.state.onFoot, false);
});
check('on-foot hints describe the car distance and tell a distant fighter to approach', () => {
  const duel = onFoot(), car = duel.course.groundAt(duel.state.s, duel.state.lateral);
  duel.state.footTransition.needsRelease = false;
  Object.assign(duel.state.fighter, {x: car.x + 3.501, y: car.y, z: car.z});
  const text = hint(duel);
  assert.match(text, /3\.5/); assert.match(text, /closer|approach|near|within/i);
});
check('availability excludes ordinary, time trial, flag off, missing combat and arena state', () => {
  for (const [mode, flag] of replayCases.slice(0, 3)) assert.equal(hint(race(mode, flag)), null);
  for (const change of [{combat: null}, {arena: {}}, {objective: {kind: 'stuntTrial'}},
    {paused: true}, {status: 'menu'}, {status: 'countdown'}, {status: 'complete'}]) {
    const duel = race(); Object.assign(duel.state, change);
    assert.equal(hint(duel), null, `excluded state ${JSON.stringify(change)}`);
  }
});
check('availability excludes practice, stunt, chase, drift and checkpoint stages', () => {
  for (const change of [{practice: true}, {stuntTrial: true}, {kind: 'chase'},
    {kind: 'drift'}, {kind: 'checkpoint'}]) {
    const duel = race();
    const context = {state: duel.state, course: duel.course, featureFlags: duel.featureFlags,
      stageDef: {...duel.stageDef, ...change}};
    assert.equal(hint(context), null, `excluded stage ${JSON.stringify(change)}`);
  }
});
check('hint text and HUD updates do not mutate race state or consume randomness', () => {
  const duel = onFoot(), before = structuredClone(duel.state), original = Math.random;
  Math.random = () => {throw new Error('presentation consumed randomness');};
  try {
    assert.equal(hint(duel), hint(duel));
    mockHud(duel).update(duel.state);
    assert.deepEqual(duel.state, before);
  } finally {Math.random = original;}
});
check('the race HUD provides a hint element and uses the public hint text', () => {
  assert.ok(hudMarkup().includes('id="onfoot-hint"'), 'race HUD includes onfoot-hint element');
  const duel = race(), hud = mockHud(duel); hud.update(duel.state);
  assert.equal(hud.ui['onfoot-hint'].hidden, false);
  assert.equal(hud.texts['onfoot-hint'], hint(duel));
});
check('HUD hides and clears stale availability when ordinary racing replaces Wasteland', () => {
  const duel = race(), hud = mockHud(duel); hud.update(duel.state);
  duel.state.mode = 'duel'; hud.update(duel.state);
  assert.equal(hud.ui['onfoot-hint'].hidden, true);
  assert.equal(hud.texts['onfoot-hint'], '');
});
check('seeded ordinary, time trial and Wasteland results retain recorded fingerprints with hint reads', () => {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  assert.equal(fixture.version, 1); assert.equal(fixture.seed, 1989);
  for (const [mode, flag] of replayCases) assert.equal(replay(mode, flag, true),
    fixture.fingerprints[`${mode}/${flag}`], `${mode}/${flag}: race fingerprint changed`);
});
for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`On-foot hints: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
