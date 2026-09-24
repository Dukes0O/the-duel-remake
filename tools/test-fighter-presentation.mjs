import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
import {createFighter, FIGHTER_STEP_SECONDS} from '../src/onfoot.js';
import {stepFootTransition} from '../src/onfoot-transition.js';

// GFX-01 public presentation contract. These are simulation snapshots, not
// animation commands from input or wall-clock time. The renderer owns no rules.
const checks = [];
const check = (name, run) => checks.push({name, run});
const fighter = extra => ({crewId: 'nell', x: 3, y: 2, z: 7, yaw: .4,
  speed: 0, airHeight: 0, verticalSpeed: 0, knockedDown: false, ...extra});
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
async function select(entry, time = 10) {
  assert.ok(existsSync(new URL('../src/fighter-presentation.js', import.meta.url)),
    'GFX-01 pure fighter presentation selector is missing');
  const {selectFighterPresentation} = await import('../src/fighter-presentation.js');
  assert.equal(typeof selectFighterPresentation, 'function');
  return selectFighterPresentation(entry, {time});
}

check('stationary fighter uses its crew and simulation world pose', async () => {
  const snapshot = freeze(fighter());
  const result = await select(snapshot);
  assert.equal(result.crewId, 'nell'); assert.equal(result.clip, 'idle');
  assert.deepEqual(result.pose, {x: 3, y: 2, z: 7, yaw: .4});
  assert.ok(Number.isFinite(result.clipTime) && result.clipTime >= 0);
});
check('movement distinguishes walk, sprint and airborne motion', async () => {
  assert.equal((await select({fighter: fighter({speed: 4.5}), input: {}})).clip, 'walk');
  assert.equal((await select({fighter: fighter({speed: 7.5}), input: {sprint: true}})).clip, 'sprint');
  const jumping = await select({fighter: fighter({speed: 4.5, y: 3.1,
    airHeight: 1.1, verticalSpeed: .2}), input: {sprint: true}});
  assert.equal(jumping.clip, 'jump');
  assert.equal(jumping.pose.y, 3.1, 'animation must not add a second jump height');
  assert.equal((await select({fighter: fighter(), input: {forward: true, sprint: true}})).clip,
    'idle', 'blocked movement input alone must not make the fighter walk');
});
check('aim and active wrench repair come from current action state', async () => {
  assert.equal((await select({fighter: fighter(), input: {aim: true},
    weapons: {selected: 'rpg', serial: 0, nextFireAt: 0}})).clip, 'aim');
  const entry = freeze({fighter: fighter(), input: {fire: true},
    weapons: {selected: 'wrench', repairing: true, repairSeconds: .7, repairAmount: 8}});
  assert.equal((await select(entry)).clip, 'repair');
});
check('a successful shot gives fire then reload without changing weapon rules', async () => {
  const reload = COMBAT_TUNING.foot.rpgReloadSeconds;
  const entry = freeze({fighter: fighter(), input: {}, weapons: {
    selected: 'rpg', serial: 1, ammo: 3, lastFireAt: 10, nextFireAt: 10 + reload}});
  const before = JSON.stringify(entry);
  assert.equal((await select(entry, 10.01)).clip, 'fire');
  assert.equal((await select(entry, 10 + reload * .75)).clip, 'reload');
  assert.equal((await select(entry, 10 + reload + .01)).clip, 'idle');
  assert.equal(JSON.stringify(entry), before, 'presentation cannot consume ammo or alter cooldown');
});
check('rejected or stale fire input never starts or restarts recoil', async () => {
  for (const ammo of [0, 3]) {
    const result = await select(freeze({fighter: fighter(), input: {fire: true},
      weapons: {selected: 'rpg', serial: 0, ammo, nextFireAt: 0}}));
    assert.notEqual(result.clip, 'fire', 'input is not evidence of a successful shot');
  }
  const entry = {fighter: fighter(), input: {fire: true}, weapons: {
    selected: 'rpg', serial: 1, ammo: 0, lastFireAt: 8, nextFireAt: 10.2}};
  assert.notEqual((await select(freeze(entry), 10)).clip, 'fire',
    'rejected cooldown attempt must not replay an older successful shot');
});
check('knockdown overrides locomotion and weapon poses', async () => {
  const result = await select(freeze({fighter: fighter({speed: 7.5, knockedDown: true,
    knockdownRemaining: 1.5}), input: {aim: true, sprint: true},
    weapons: {selected: 'rpg', serial: 1, lastFireAt: 10, nextFireAt: 12.2},
    presentation: {clip: 'knockdown', startedAt: 8.5, duration: 3}}));
  assert.equal(result.clip, 'knockdown'); assert.equal(result.clipTime, 1.5);
});
for (const clip of ['get-up', 'enter', 'exit']) {
  check(`${clip} uses a bounded simulation event and expires without gameplay delay`, async () => {
    const entry = freeze({fighter: fighter(), presentation: {clip, startedAt: 10,
      duration: .8, pose: {x: 4, y: 2, z: 8, yaw: .6}}});
    const before = JSON.stringify(entry);
    const active = await select(entry, 10.25);
    assert.equal(active.clip, clip); assert.equal(active.clipTime, .25);
    assert.deepEqual(active.pose, entry.presentation.pose);
    assert.equal((await select(entry, 11)).clip, 'idle');
    assert.notEqual((await select(entry, 9.9)).clip, clip, 'future event must not animate early');
    assert.equal(JSON.stringify(entry), before);
  });
}
check('presentation repeats and rewinds from simulation time without mutable history', async () => {
  const entry = freeze({fighter: fighter({speed: 4.5})});
  const before = JSON.stringify(entry), first = await select(entry, .25);
  for (let index = 0; index < 6; index++) assert.deepEqual(await select(entry, .25), first);
  const later = await select(entry, .75);
  assert.notEqual(later.clipTime, first.clipTime);
  assert.deepEqual(await select(entry, .25), first);
  assert.equal(JSON.stringify(entry), before);
});

check('optional output and pose are reused across ordinary and event presentation', async () => {
  const {selectFighterPresentation} = await import('../src/fighter-presentation.js');
  const pose = {}, output = {pose}, clock = {time: 10.25};
  for (const entry of [freeze({fighter: fighter()}), freeze({fighter: fighter(),
    presentation: {clip: 'exit', startedAt: 10, duration: .65,
      pose: {x: 4, y: 3, z: 2, yaw: .6}}})]) {
    const before = JSON.stringify(entry);
    const expected = selectFighterPresentation(entry, clock);
    const result = selectFighterPresentation(entry, clock, output);
    assert.equal(result, output, 'selector must return the supplied reusable output');
    assert.equal(result.pose, pose, 'event snapshots must reuse the supplied pose object');
    assert.deepEqual(result, expected);
    assert.equal(JSON.stringify(entry), before, 'output reuse must not mutate simulation inputs');
  }
});

check('recovery presentation starts on the same fixed tick at 30, 60 and 144 Hz', async () => {
  const observations = [];
  for (const fps of [30, 60, 144]) {
    const course = {def: {}, obstaclesNear: () => [],
      groundAt: (s, lateral) => ({x: lateral, y: 0, z: s, heading: 0})};
    const state = {mode: 'wasteland', combat: {}, status: 'racing', paused: false,
      s: 0, lateral: 0, stageTimeSec: 0, onFoot: true, input: {}, fighterInput: {},
      footTransition: {heldSeconds: 0, needsRelease: false, fighterStepRemainder: 0}};
    state.fighter = createFighter(course, state);
    Object.assign(state.fighter, {knockedDown: true, knockdownRemaining: FIGHTER_STEP_SECONDS,
      health: 0, bailTumbleSeconds: 0});
    const duel = {state, course, stageDef: {}, featureFlags: {enabled: () => true}};
    while (state.stageTimeSec < .1 - 1e-10) {
      const dt = Math.min(1 / fps, .1 - state.stageTimeSec);
      state.stageTimeSec += dt;
      stepFootTransition(duel, dt);
    }
    assert.equal(state.fighter.respawns, 1, 'presentation must not postpone gameplay recovery');
    assert.equal(state.fighter.health, state.fighter.maxHealth);
    observations.push({fps, startedAt: state.fighter.presentation.startedAt,
      clipTime: (await select(state.fighter, .1)).clipTime});
  }
  assert.ok(observations.every(item => Math.abs(item.startedAt - observations[0].startedAt) < 1e-10 &&
    Math.abs(item.clipTime - observations[0].clipTime) < 1e-10),
  `same fixed recovery tick produced different animation timestamps: ${JSON.stringify(observations)}`);
});

let failures = 0;
for (const {name, run} of checks) {
  try { await run(); } catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
console.log(`Fighter presentation: ${checks.length} checks, ${checks.length - failures} passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
