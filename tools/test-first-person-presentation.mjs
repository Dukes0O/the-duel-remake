import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {COMBAT_TUNING as T} from '../src/wasteland-tuning.js';

// The first-person selector composes actions with movement. It only projects
// successful simulation events; it cannot create a shot, reload or repair.
const tests = [];
const check = (name, run) => tests.push({name, run});
const freeze = value => {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
};
const entry = ({fighter = {}, input = {}, weapons = {}} = {}) => ({
  fighter: {crewId: 'rook', speed: 0, airHeight: 0, verticalSpeed: 0,
    knockedDown: false, ...fighter}, input,
  weapons: {selected: 'rpg', ammo: 2, serial: 0, nextFireAt: 0,
    repairing: false, repairSeconds: 0, repairAmount: 0, ...weapons},
});
async function selector() {
  assert.ok(existsSync(new URL('../src/first-person-presentation.js', import.meta.url)),
    'first-person presentation selector is missing');
  const module = await import('../src/first-person-presentation.js');
  assert.equal(typeof module.selectFirstPersonPresentation, 'function');
  return module.selectFirstPersonPresentation;
}
const shot = {serial: 1, lastFireAt: 10, nextFireAt: 10 + T.foot.rpgReloadSeconds};

check('selection returns current crew, tool, aim and real loaded state', async () => {
  const select = await selector();
  const result = select(freeze(entry({fighter: {crewId: 'nell'}, input: {aim: true}})), {time: 10});
  assert.equal(result.crewId, 'nell'); assert.equal(result.weapon, 'rpg');
  assert.equal(result.aim, true); assert.equal(result.loaded, true);
  assert.equal(result.action, 'idle'); assert.equal(result.locomotion, 'idle');
  assert.equal(select(entry({weapons: {ammo: 0}}), {time: 10}).loaded, false);
  assert.equal(select(entry({weapons: {selected: 'wrench'}}), {time: 10}).weapon, 'wrench');
});
check('walking, sprinting and jumping cannot suppress successful recoil or aim', async () => {
  const select = await selector();
  for (const [motion, fighter, input] of [['walk', {speed: 4.5}, {}],
    ['sprint', {speed: 7.5, locomotion: 'sprint'}, {sprint: true}],
    ['jump', {speed: 4.5, airHeight: 1, verticalSpeed: 2}, {}]]) {
    const result = select(freeze(entry({fighter, input: {...input, aim: true}, weapons: shot})), {time: 10.05});
    assert.equal(result.locomotion, motion); assert.equal(result.action, 'fire');
    assert.equal(result.aim, true); assert.ok(Math.abs(result.actionTime - .05) < 1e-9);
  }
  assert.equal(select(entry({input: {forward: true, sprint: true}}), {time: 10}).locomotion,
    'idle', 'blocked input alone does not create walking');
});
check('reload follows successful-shot deadline and ends without altering ammo', async () => {
  const select = await selector(), snapshot = freeze(entry({weapons: shot}));
  const before = JSON.stringify(snapshot);
  const result = select(snapshot, {time: 11.2});
  assert.equal(result.action, 'reload');
  assert.ok(result.actionProgress > 0 && result.actionProgress < 1);
  assert.equal(select(snapshot, {time: shot.nextFireAt}).action, 'idle');
  assert.equal(JSON.stringify(snapshot), before);
});
check('last rocket recoils but never visibly reloads nonexistent ammunition', async () => {
  const select = await selector(), snapshot = freeze(entry({weapons: {...shot, ammo: 0}}));
  const recoil = select(snapshot, {time: 10.05});
  assert.equal(recoil.action, 'fire'); assert.equal(recoil.loaded, false);
  const later = select(snapshot, {time: 11});
  assert.notEqual(later.action, 'reload'); assert.equal(later.loaded, false);
});
check('rejected, stale and future fire cannot fabricate or restart recoil', async () => {
  const select = await selector();
  for (const weapons of [{ammo: 0}, {ammo: 2}, {...shot, lastFireAt: 8, nextFireAt: 10.2},
    {...shot, lastFireAt: 12, nextFireAt: 14.2}]) {
    assert.notEqual(select(freeze(entry({input: {fire: true}, weapons})), {time: 10}).action, 'fire');
  }
});
check('repair follows actual work, including Odessa, and stops with the simulation', async () => {
  const select = await selector();
  const repair = (crewId, repairSeconds) => entry({fighter: {crewId, speed: 1},
    input: {fire: true}, weapons: {selected: 'wrench', repairing: true,
      repairSeconds, repairAmount: T.foot.wrenchRepairAmount / 2}});
  const rook = select(freeze(repair('rook', 2)), {time: 12});
  const odessa = select(freeze(repair('odessa', 1)), {time: 12});
  for (const result of [rook, odessa]) {
    assert.equal(result.action, 'repair'); assert.equal(result.locomotion, 'walk');
    assert.equal(result.actionProgress, .5, 'work fraction follows actual restored armor');
  }
  assert.equal(rook.actionTime, 2); assert.equal(odessa.actionTime, 1);
  const done = repair('odessa', 2); done.weapons.repairing = false;
  assert.notEqual(select(freeze(done), {time: 12}).action, 'repair');
});
check('selector reuses output and deterministic simulation time through pause and rewind', async () => {
  const select = await selector(), out = {}, snapshot = freeze(entry({
    fighter: {speed: 4.5}, weapons: shot}));
  const before = JSON.stringify(snapshot);
  const first = structuredClone(select(snapshot, {time: 10.05}, out));
  assert.equal(select(snapshot, {time: 10.05}, out), out);
  for (let frame = 0; frame < 8; frame++) assert.deepEqual(select(snapshot, {time: 10.05}, out), first);
  assert.equal(select(snapshot, {time: 11}, out).action, 'reload');
  assert.deepEqual(select(snapshot, {time: 10.05}, out), first);
  assert.equal(JSON.stringify(snapshot), before);
  assert.ok(Number.isFinite(first.motionTime) && Number.isFinite(first.actionTime));
});

let failures = 0;
for (const {name, run} of tests) {
  try {await run();} catch (error) {failures++; console.error(`FAIL ${name}: ${error.message}`);}
}
console.log(`First-person presentation: ${tests.length} checks, ${tests.length - failures} passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
