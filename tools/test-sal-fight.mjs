import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {thinkBrain, BRAIN_DIFFICULTY} from '../src/arena/arena-brains.js';
import {arenaCarSpec, pilotStep} from '../src/arena/arena-pilot.js';
import {arenaFloorSpeed} from '../src/arena/venues.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {COURSE} from '../src/config.js';

// WAR-02a-SAL: synthetic cars, null flag storage, no browser or real saves.
const DT = .01;
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
const near = (actual, expected, message) => { checks++; assert.ok(Math.abs(actual - expected) < 1e-7, message); };
const flags = () => createFeatureFlags({storage: null, qa: true, search: '?flags=warlords'});
test.after(() => console.log('Sal fight: ' + checks + ' acceptance checks executed.'));

function fight(difficulty = 'medium', {straight = true} = {}) {
  const duel = new Duel({seed: 1989, featureFlags: flags()});
  assert.equal(startWarlordEvent(duel, {warlordId: 'sal', car: 'falcone_f42', cpuDifficulty: difficulty}), true);
  assert.equal(beginWarlordEvent(duel), true);
  duel.state.countdown = 0; duel.step(DT); duel.step(DT);
  const actor = duel.state.opponents[0], participant = duel.state.arena.participants[1];
  if (straight) {
    const layout = duel.course.def.scrapdome;
    const point = (s, lateral = 0) => ({x: lateral, y: 0, z: s, heading: 0, curvature: 0});
    duel.course = {def: {theme: 'desert', scrapdome: {...layout, floorHalfWidth: 1000}}, length: 10000,
      at: point, worldAt: point, groundAt: point, nearest: (x, z) => ({s: z, lateral: x, distance: Math.abs(x)}),
      roadHalfWidthAt: () => 1000, features: {obstacles: []}};
    Object.assign(duel.state, {s: 100, prevS: 100, lateral: 0, prevLateral: 0, headingError: 0, speedMph: 35});
    Object.assign(actor, {s: 100, prevS: 100, lateral: 8, prevLateral: 8, headingError: 0, speedMph: 35});
  }
  participant.targetId = 'player'; participant.goal = null; participant.reactionSec = 0;
  participant.backoffSec = 0; participant.tellLeft = 0; participant.chargeReady = false;
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  duel.state.invulnerableSec = 0;
  return {duel, actor, participant};
}
function tick(f, dt = DT) {
  f.duel.state.stageTimeSec += dt;
  return thinkBrain(f.duel, f.participant, f.actor, dt);
}
function startTell(f) {
  tick(f, 0);
  equal(f.actor.salSaw?.stage, 'tell', 'an alongside Sal announces a Saw Sweep before attacking');
}
function advance(f, seconds) {
  let left = seconds, goal;
  while (left > 1e-9) { const dt = Math.min(DT, left); goal = tick(f, dt); left -= dt; }
  return goal;
}
function escape(f, type) {
  f.duel.setInput({throttle: type === 'boost' ? 1 : 0, brake: type === 'brake' ? 1 : 0, boost: type === 'boost'});
  f.duel.state.boosting = type === 'boost';
  f.duel.state.s += type === 'boost' ? 10 : -10;
  f.duel.state.speedMph = type === 'boost' ? 60 : 0;
}
const normalPace = f => arenaFloorSpeed(f.duel.course.def.scrapdome, arenaCarSpec(f.duel, f.actor).topSpeed) *
  BRAIN_DIFFICULTY[f.duel.state.cpuDifficulty].pace;

for (const [difficulty, tell] of [['easy', 1.2], ['medium', .8], ['hard', .5]]) {
  for (const phase of [1, 2]) test(difficulty + ' phase ' + phase + ' requires the full settled tell', () => {
    const f = fight(difficulty); f.duel.state.arena.warlordPhase = phase;
    startTell(f);
    equal(f.actor.salSaw.phase, 'spin-up', 'tell uses the reviewed spin-up art');
    const seconds = tell * (phase === 2 ? .8 : 1);
    advance(f, seconds - DT);
    equal(f.actor.salSaw.stage, 'tell', 'sweep cannot start a tick before its complete tell');
    const goal = tick(f);
    equal(f.actor.salSaw.stage, 'sweep', 'sweep starts at the exact tell deadline');
    equal(f.actor.salSaw.phase, 'sweeping', 'attacking blades use reviewed sweep art');
    ok(Number.isFinite(goal?.x) && Number.isFinite(goal?.z), 'sweep makes a finite pilot request');
    near(goal.x, f.duel.state.lateral, 'the sweep swerves toward the actual player flank');
  });
}

for (const [side, along, starts] of [[11.99, 0, true], [12.01, 0, false],
  [8, 5.99, true], [8, 6.01, false], [-11.99, -5.99, true], [-12.01, 0, false]]) {
  test('alongside range: ' + side + ' sideways / ' + along + ' along', () => {
    const f = fight(); f.actor.lateral = side; f.actor.s = 100 + along;
    tick(f, 0);
    equal(f.actor.salSaw?.stage === 'tell', starts, 'sweep eligibility respects both settled distance limits');
  });
}

for (const type of ['brake', 'boost']) test(type + ' clear makes a miss and exactly two seconds to hit back', () => {
  const f = fight(); startTell(f); advance(f, .4); escape(f, type); advance(f, .4);
  equal(f.actor.salSaw.stage, 'window', 'a clear counter causes the sweep to miss');
  equal(f.actor.salSaw.phase, 'sparking', 'miss uses the reviewed sparking-out art');
  equal(f.duel.state.callout, 'SHE MISSED. HIT HER NOW!', 'the player is told to counterattack');
  const goal = tick(f, 0);
  near(goal.speedMph, normalPace(f) * .6, 'Sal overshoots at 60 percent normal pace');
  equal(goal.boost, false, 'Sal does not boost during her vulnerability');
  equal(goal.steeringScale, .5, 'the pilot request halves steering authority');
  advance(f, 2 - DT);
  equal(f.actor.salSaw.stage, 'window', 'the two-second opening does not end early');
  tick(f);
  equal(f.actor.salSaw.stage, 'idle', 'the window ends at exactly two seconds');
});

for (const [difficulty, cooldown, tell] of [['easy', 9, 1.2], ['medium', 7, .8], ['hard', 5, .5]]) {
  test(difficulty + ' repeats only after cooldown and tells every sweep', () => {
    const f = fight(difficulty), tells = [];
    f.duel.onChange((_state, event) => { if (event.salSaw) tells.push({time: f.duel.state.stageTimeSec, event: event.salSaw}); });
    startTell(f); const firstAt = f.duel.state.stageTimeSec;
    escape(f, 'boost'); advance(f, tell + 2);
    f.duel.state.s = f.actor.s; f.duel.state.lateral = f.actor.lateral - 8;
    advance(f, cooldown - (f.duel.state.stageTimeSec - firstAt) - DT);
    equal(tells.length, 1, 'no second sweep tell before the cooldown');
    tick(f);
    equal(tells.length, 2, 'the next eligible sweep starts at the settled cooldown');
    near(tells[1].time - tells[0].time, cooldown, 'cooldown is measured between move starts');
    equal(f.actor.salSaw.stage, 'tell', 'a repeat starts with a new full tell');
    advance(f, tell - DT);
    equal(f.actor.salSaw.stage, 'tell', 'repeated sweeps cannot reuse the first tell');
    tick(f); equal(f.actor.salSaw.stage, 'sweep', 'second complete tell permits second sweep');
  });
}

test('one saw scream is emitted at the tell position, not every reaction tick', () => {
  const f = fight(), events = [];
  f.duel.onChange((_state, event) => { if (event.salSaw) events.push(event.salSaw); });
  startTell(f); advance(f, .4);
  equal(events.length, 1, 'one tell emits one reviewed saw-scream event');
  equal(events[0].position, {x: 8, y: 0, z: 100}, 'scream comes from Sal world position');
  equal(f.actor.salSaw.sinceSec <= f.duel.state.stageTimeSec, true, 'art start time belongs to simulation time');
});

test('phase-two Charge appears only after the first real Sal wreck and tells before boost', () => {
  const f = fight('medium', {straight: false}), events = [];
  f.duel.onChange((_state, event) => { if (event.arenaTell) events.push(event.arenaTell); });
  equal(f.duel.state.arena.warlordPhase, 1, 'fight starts in phase one');
  f.actor.armor = 1; applyArmorDamage(f.duel, f.actor, 'crossbow', {owner: 'player'}); f.duel.step(DT);
  equal(f.duel.state.arena.warlordPhase, 2, 'first real boss wreck unlocks phase two');
  f.actor.combatWreckTimer = 0; f.duel.step(DT);
  f.participant.protectedSec = 0;
  f.actor.s = f.duel.state.s + 35; f.actor.lateral = f.duel.state.lateral;
  f.actor.speedMph = 35; f.actor.headingError = Math.PI;
  f.participant.goal = null; f.participant.reactionSec = 0;
  let found = false;
  for (let i = 0; i < 1500; i++) {
    const goal = tick(f);
    if (f.actor.salSaw?.stage === 'charge-tell') {
      found = true; equal(goal.boost, false, 'Charge cannot boost during its flash/roar tell');
      const count = events.length;
      advance(f, .64 - DT);
      equal(f.actor.salSaw.stage, 'charge-tell', 'phase-two Medium charge tells for .64 seconds');
      const charge = tick(f); equal(f.actor.salSaw.stage, 'charge', 'full charge tell releases Charge');
      equal(charge.boost, true, 'phase-two Charge is a straight boosted run');
      ok(count > 0, 'Charge emits the existing flash and roar event');
      break;
    }
  }
  ok(found, 'after her first wreck Sal adds Charge to the rammer moves');
});

test('real arena step dispatches the Sal state machine without callers driving its timers', () => {
  const f = fight('easy', {straight: false});
  f.actor.s = f.duel.state.s; f.actor.lateral = f.duel.state.lateral + 8;
  f.actor.headingError = f.duel.state.headingError; f.actor.speedMph = 35;
  f.duel.state.speedMph = 35; f.duel.step(DT);
  equal(f.actor.salSaw?.stage, 'tell', 'normal Duel.step reaches the Sal move dispatcher');
});

test('the actual pilot applies .5 yaw authority without changing the car physics limits', () => {
  const f = fight(), normal = structuredClone(f.actor), window = structuredClone(f.actor);
  const spec = structuredClone(arenaCarSpec(f.duel, normal));
  const goal = {x: 20, z: 150, speedMph: 35, boost: false};
  pilotStep(f.duel, normal, goal, DT);
  pilotStep(f.duel, window, {...goal, steeringScale: .5}, DT);
  ok(Math.abs(normal.yawVelocity) > 0, 'control goal really asks the pilot to turn');
  near(window.yawVelocity, normal.yawVelocity * .5, 'window halves actual pilot yaw authority');
  equal(arenaCarSpec(f.duel, window), spec, 'move goals preserve every car physics limit');
});

test('a successful sweep announces SAW SWEEP only when real contact damages the target', () => {
  const f = fight(); startTell(f); advance(f, .8);
  Object.assign(f.actor, {prevS: 100, s: 100, prevLateral: 6, lateral: 1, pushVelocity: -20, speedMph: 35});
  Object.assign(f.duel.state, {prevS: 100, s: 100, prevLateral: 0, lateral: 0, pushVelocity: 0, speedMph: 35});
  f.duel._vehicleContact(f.duel.state, f.actor, 'rival');
  ok(f.duel.state.armor < f.duel.state.maxArmor, 'fixture makes a real damaging side contact');
  equal(f.duel.state.callout, 'SAW SWEEP!', 'a damaging sweep has the settled hit callout');
});

test('ordinary race controls retain the existing reviewed replay fingerprints', () => {
  const fixture = JSON.parse(readFileSync(new URL('./replays/warlord-format-ordinary.json', import.meta.url), 'utf8'));
  for (const spec of fixture.cases) {
    const duel = new Duel({seed: spec.seed, featureFlags: flags()});
    duel.startCampaign({seed: spec.seed, mode: spec.mode, car: 'falcone_f42',
      startStage: COURSE.findIndex(c => c.id === spec.course), difficulty: 'casual', cpuDifficulty: 'medium'});
    const samples = [];
    for (let tick = 0; tick < 1200; tick++) {
      duel.setInput({throttle: 1, brake: tick >= 800 ? .2 : 0, steer: tick < 500 ? .08 : -.04, boost: false});
      duel.step(1 / 120);
      if (tick % 120 === 119) samples.push({status: duel.state.status, s: duel.state.s, lateral: duel.state.lateral,
        speedMph: duel.state.speedMph, time: duel.state.stageTimeSec, laps: duel.state.completedLaps,
        score: duel.state.score, rivals: duel.state.opponents.map(a => [a.s, a.lateral, a.speedMph]), result: duel.state.results});
    }
    equal(createHash('sha256').update(JSON.stringify(samples)).digest('hex'), spec.fingerprint,
      spec.mode + '/' + spec.course + ': ordinary replay unchanged');
  }
});
