import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {fireWeapon} from '../src/combat-weapons.js';
import {canLeaveCar} from '../src/onfoot-transition.js';

const dt = 1 / 120;
const flags = {'hidden-road': true, arsenal: true, 'arsenal-wave3': true};
const duel = new Duel({seed: 1989, featureFlags: flags});
duel.state.wastelandGateDiscovered = true;
const profile = {wasteland: {loadout: ['bomb']}};
const savedLoadout = structuredClone(profile.wasteland.loadout);
const job = {id: 'test-job', seed: 1989, lend: ['flamethrower'], captions: {start: 'GO TO THE YARD'},
  steps: [{kind: 'reach', lineId: 'start', place: {position: {x: 500, z: 500}}, radius: 1}]};
assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42',
  seed: 1989, opponents: [{car: 'dusthawk_rally'}], weaponLoadout: profile.wasteland.loadout,
  job}), true, 'a real headless Duel accepts a world job');
assert.equal(duel.state.arena.mode, 'world-job');
assert.equal(duel.state.objective, null, 'world jobs leave the race objective inactive');
assert(duel.state.weaponLoadout.includes('flamethrower'), 'the run receives the job loan');
duel.state.countdown = 0;
duel.step(dt);
assert.equal(duel.state.status, 'racing');
assert.equal(canLeaveCar(duel), true, 'the player can leave the car during a job');
assert.equal(fireWeapon(duel, 'flamethrower'), true, 'the lent weapon fires in the real arena simulation');
Object.assign(duel.state.opponents[0], {combatWrecking: true, combatWreckTimer: 10000});

duel.setInput({interact: true});
for (let n = 0; n < 75; n++) duel.step(dt);
assert.equal(duel.state.onFoot, true, 'holding F steps out');
duel.setInput({interact: false}); duel.step(dt);
duel.setInput({interact: true});
for (let n = 0; n < 75; n++) duel.step(dt);
assert.equal(duel.state.onFoot, false, 'holding F beside the car gets back in');
assert.deepEqual(profile.wasteland.loadout, savedLoadout, 'the loan does not change the saved loadout');

const arena = duel.state.arena;
const at = duel.course.worldAt(duel.state.s, duel.state.lateral);
arena.worldJob.job.steps[0].place = {position: {x: at.x, z: at.z}};
arena.worldJob.job.steps[0].radius = 100;
duel.step(dt);
assert.equal(duel.state.status, 'arena_result', 'a completed job reaches normal arena settlement');
assert.equal(arena.result.reason, 'job-complete');
const result = arena.result;
duel.step(dt);
assert.equal(arena.result, result, 'settlement happens only once');
console.log('PASS world-job mode: start, step out and in, loaned weapon, isolated save loadout, one settlement');
