import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {BRAIN_DIFFICULTY} from '../src/arena/arena-brains.js';
import {ARENA_FEEL} from '../src/arena/arena-event.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {EngineAudio} from '../src/audio.js';
import {SOUND_BANK} from '../src/sound-bank.js';

// ARENA-FEEL (Claude, 26 September 2026; docs/SCRAPDOME.md): every computer
// charge is announced by a tell of BRAIN_DIFFICULTY.tellSec (flashing lights
// and an engine roar) before the car boosts in; respawns shimmer; wrecks are
// called out and sounded.
const ON = {wasteland2: true, 'hidden-road': true, scrapdome: true};
const FIELD = [{car: 'dusthawk_rally'}, {car: 'aurora_gt'}, {car: 'stuttgart_959s'}];

function playRound(difficulty, seed = 1989, seconds = 90) {
  const duel = new Duel({seed, featureFlags: ON});
  duel.startArenaEvent({car: 'banshee_muscle', cpuDifficulty: difficulty, seed, opponents: FIELD});
  const events = [];
  duel.onChange((_state, event) => events.push({t: duel.state.stageTimeSec, event}));
  const boosts = [], tells = [];
  const boosting = new Map();
  for (let step = 0; step < seconds * 120 && duel.state.status !== 'arena_result'; step++) {
    const s = duel.state, me = worldPose(duel, s);
    let best = null, bestDistance = Infinity;
    for (const other of s.opponents) {
      if (other.combatWrecking) continue;
      const at = worldPose(duel, other), distance = Math.hypot(at.x - me.x, at.z - me.z);
      if (distance < bestDistance) { best = at; bestDistance = distance; }
    }
    let steer = 0;
    if (best) {
      const turn = Math.atan2(best.x - me.x, best.z - me.z) - me.heading;
      steer = Math.max(-1, Math.min(1, -Math.atan2(Math.sin(turn), Math.cos(turn)) * 2));
    }
    duel.setInput({throttle: 1, brake: 0, steer, boost: false});
    duel.step(1 / 120);
    for (const participant of s.arena.participants) {
      if (participant.kind !== 'cpu') continue;
      const charging = participant.goal?.boost === true && participant.chargeReady === true;
      if (charging && !boosting.get(participant.id)) boosts.push({id: participant.id, t: s.stageTimeSec});
      boosting.set(participant.id, charging);
    }
  }
  for (const {t, event} of events) if (event.arenaTell) tells.push({...event.arenaTell, t});
  return {duel, events, tells, boosts};
}

test('charges are announced: a tell of tellSec precedes every charge', () => {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const {tells, boosts} = playRound(difficulty);
    const tellSec = BRAIN_DIFFICULTY[difficulty].tellSec;
    assert.ok(tells.length >= 2, `${difficulty}: rammers tell their charges (${tells.length})`);
    for (const tell of tells) assert.equal(tell.seconds, tellSec, `${difficulty} tells last ${tellSec} s`);
    for (const boost of boosts) {
      const before = tells.filter(tell => tell.id === boost.id && tell.t <= boost.t);
      assert.ok(before.length && boost.t - before.at(-1).t >= tellSec - 1e-6,
        `${difficulty}: ${boost.id} charged at ${boost.t.toFixed(2)} s only after a full tell`);
    }
  }
});

test('during a tell the car holds back and shows the tell to the renderer', () => {
  const {duel, events} = playRound('medium', 7, 60);
  const first = events.find(entry => entry.event.arenaTell);
  assert.ok(first, 'a tell happened');
  assert.ok(ARENA_FEEL.tellSpeedShare < 1, 'a telling car eases off');
  const actor = duel.state.opponents.find(item => item.arenaTellSec !== undefined);
  assert.ok(actor, 'the car carries its tell time for the renderer');
});

test('respawns shimmer for a moment', () => {
  const {duel, events} = playRound('hard', 42, 120);
  const respawn = events.find(entry => entry.event.arenaRespawn);
  assert.ok(respawn, 'a car respawned');
  assert.ok(ARENA_FEEL.shimmerSec > .5 && ARENA_FEEL.shimmerSec <= 2);
  const everyone = [duel.state, ...duel.state.opponents];
  assert.ok(everyone.every(actor => (actor.arenaShimmerSec ?? 0) >= 0 &&
    (actor.arenaShimmerSec ?? 0) <= ARENA_FEEL.shimmerSec), 'shimmer time stays in range and decays');
});

test('the tell is repeatable from seed and inputs', () => {
  const a = playRound('medium', 1989, 40), b = playRound('medium', 1989, 40);
  assert.deepEqual(a.tells, b.tells);
});

test('tell, respawn and wreck-credit sounds', () => {
  for (const id of ['arena.tell', 'arena.respawn', 'arena.wreck-credit'])
    assert.equal(SOUND_BANK[id]?.flag, 'scrapdome', `${id} is behind the scrapdome switch`);
  const played = [];
  const audio = new EngineAudio({flags: {enabled: name => name === 'scrapdome'}});
  audio.context = {state: 'running', currentTime: 1};
  audio.muted = false; audio.paused = false;
  audio._syncMixer = () => {};
  audio._spatialOutput = () => ({level: {}, space: {distance: 20, pan: 0, gain: 1}, disconnect() {}});
  audio._playCue = id => { played.push(id); return {}; };
  audio.event({arenaTell: {id: 'cpu-1', targetId: 'player', seconds: .8, position: {x: 5, y: 0, z: 5}}}, {}, null);
  audio.event({arenaTell: {id: 'cpu-1', targetId: 'cpu-2', seconds: .8, position: {x: 5, y: 0, z: 5}}}, {}, null);
  audio.event({arenaRespawn: {id: 'cpu-2', slot: 1}}, {}, null);
  audio.event({arenaWreck: {victimId: 'cpu-2', creditedId: 'player'}}, {}, null);
  audio.event({arenaWreck: {victimId: 'cpu-2', creditedId: 'cpu-1'}}, {}, null);
  assert.deepEqual(played, ['arena.tell', 'arena.tell', 'arena.respawn', 'arena.wreck-credit']);
  const off = new EngineAudio({flags: {enabled: () => false}});
  Object.assign(off, {context: {state: 'running', currentTime: 1}, muted: false, paused: false});
  off._syncMixer = () => {};
  const offPlayed = [];
  off._playCue = id => { offPlayed.push(id); return {}; };
  off.event({arenaWreck: {victimId: 'cpu-2', creditedId: 'player'}}, {}, null);
  assert.deepEqual(offPlayed, []);
});
