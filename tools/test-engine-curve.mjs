// ENGINE-CURVE (docs/DRIVING_LESSONS.md 12.1 and 12.5): engines that pull like real ones, behind the dev switch
// `engine-curve`. Switch off: byte for byte as today. Switch on with the automatic box: every car within 2% of today
// on 0 to 60 and 0 to 100 mph, on the way up to near top speed, and on a lap of three circuits; a Grand Prix field's
// racers within 2%. The manual box now has something to learn: shifting early or sitting in a high gear is slower,
// and changing up at the lights is as quick as the automatic. Headless; memory-only.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {CARS, COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {ENGINE_CURVE, ENGINE_FIT, engineFitFor, enginePullShare, gearMultiplication, enginePull, autoShiftGear} from '../src/engine-curve.js';
import {bestKey} from '../src/progression.js';
import {SUMMIT_RUN} from '../src/circuits/summit-run.js';

const DT = 1 / 120;
const def = {id: 'test-engine-curve', name: 'Test only', kind: 'circuit', closed: true, airborne: false, theme: 'alpine',
  noTraffic: true, hasRival: false, hasRadar: false,
  script: [['straight', 6000], ['turn', 'L', 90, 100], ['straight', 500], ['turn', 'L', 90, 100],
    ['straight', 6000], ['turn', 'L', 90, 100], ['straight', 500], ['turn', 'L', 90, 100]]};
const flags = on => createFeatureFlags({storage: null, overrides: on === null ? {} : {'engine-curve': on}});
const IDS = Object.keys(CARS).filter(id => CARS[id].electric !== true); // Electric single-gear cars have no piston engine or shift trade.
const topOf = id => CARS[id].topSpeed * (CARS[id].factoryMaxed ? 1.105 : 1);

// A full-throttle run on a flat straight, in one gear box: the seconds to reach each speed in `marks`.
function secondsTo(id, marks, {curve, difficulty = 'casual', from = 0, gear = 0, shiftAt = null, hold = false, engineLevel = 0} = {}) {
  const duel = new Duel({seed: 1989, car: id, featureFlags: flags(curve)});
  duel.startCampaign({car: id, opponentCount: 0, difficulty});
  duel.course = new Course(def);
  if (engineLevel) duel.state.upgrades = {...duel.state.upgrades, engine: engineLevel};
  Object.assign(duel.state, {status: 'racing', s: 300, prevS: 300, lateral: 0, countdown: 0, traffic: [], speedMph: from, gear});
  assert.equal(duel.state.engineCurve === true, curve === true, 'the race latches the switch');
  const out = new Map();
  for (let tick = 0; tick < 120 * 60 && out.size < marks.length; tick++) {
    const input = {throttle: 1, brake: 0, steer: 0, boost: false};
    if (!hold && shiftAt !== null && duel.state.revs >= shiftAt && duel.state.gear < duel.car.gears.length - 1) input.shiftUp = true;
    duel.setInput(input);
    duel._drive(DT);
    for (const mark of marks) if (!out.has(mark) && duel.state.speedMph >= mark) out.set(mark, (tick + 1) * DT);
  }
  assert.equal(out.size, marks.length, `${id} reached every mark (${marks.join(', ')} mph)`);
  return marks.map(mark => out.get(mark));
}

// ---- the shape ---------------------------------------------------------------------------------

test('the engine is weak at low revs, best at 70 to 80% and a little lower at the red line', () => {
  for (let revs = 0; revs < .3; revs += .01) assert.ok(enginePullShare(revs) < .55 + 1e-9, `under 55% below 30% revs (${revs.toFixed(2)})`);
  assert.ok(enginePullShare(.3) <= .55 + 1e-9);
  for (let revs = .7; revs <= .8 + 1e-9; revs += .01) assert.equal(enginePullShare(revs), 1, `its best at ${revs.toFixed(2)}`);
  assert.ok(Math.abs(enginePullShare(1) - .88) < 1e-9, 'about 88% of its best at 100%');
  let last = -1;
  for (let revs = 0; revs <= .7; revs += .01) { assert.ok(enginePullShare(revs) >= last - 1e-12, 'rising to its best'); last = enginePullShare(revs); }
  last = 2;
  for (let revs = .8; revs <= 1.2; revs += .01) { assert.ok(enginePullShare(revs) <= last + 1e-12, 'then easing off'); last = enginePullShare(revs); }
  assert.ok(enginePullShare(NaN) >= 0 && enginePullShare(-1) >= 0 && enginePullShare(9) > 0, 'odd revs stay in range');
});

test('a lower gear multiplies more, in proportion to the top gear\'s top speed over this gear\'s', () => {
  const gears = [55, 95, 135, 172, 201];
  for (let gear = 1; gear < gears.length; gear++) assert.ok(gearMultiplication(gears, gear - 1) > gearMultiplication(gears, gear));
  assert.equal(gearMultiplication(gears, 4), 1);
  assert.ok(Math.abs(gearMultiplication(gears, 0, 1) - 201 / 55) < 1e-12, 'with the plain power it is the ratio');
  assert.ok(Math.abs(gearMultiplication(gears, 1, 1) / gearMultiplication(gears, 2, 1) - 135 / 95) < 1e-12);
  // The launch stays inside the traction limit: no gear ever pulls harder than today's launch (a0).
  for (let gear = 0; gear < gears.length; gear++) for (let revs = 0; revs <= 1.04; revs += .02)
    assert.ok(enginePull({a0: 19, scale: 3, gears, gear, revs}) <= 19 + 1e-9, 'never past the launch pull');
  assert.ok(enginePull({a0: 19, scale: .6, gears, gear: 4, revs: .15}) < enginePull({a0: 19, scale: .6, gears, gear: 0, revs: .15}),
    'a high gear at low revs is weak next to first');
});

test('the automatic box changes up above 96% revs and down below 55%, never into a gear that would pass 90%', () => {
  const gears = [55, 95, 135, 172, 201], at = (gear, revs) => autoShiftGear({gears, gear, revs});
  assert.equal(at(1, .96), 1); assert.equal(at(1, .961), 2); assert.equal(at(4, 1), 4, 'no gear above the last');
  assert.equal(at(2, .55), 2); assert.equal(at(2, .549), 1); assert.equal(at(0, .1), 0, 'no gear below the first');
  assert.equal(at(1, .54), 1, 'down to first would be 93% revs: stays');
  assert.equal(at(1, .5), 0);
  assert.ok(ENGINE_CURVE.autoDownMaxRevs === .9);
});

test('a bought engine level has its own fit; a factory-maxed car uses its one scale', () => {
  assert.deepEqual(engineFitFor('falcone_f42', 0), ENGINE_FIT.falcone_f42);
  assert.equal(engineFitFor('falcone_f42', 1).scale, ENGINE_FIT.falcone_f42.upgraded[0]);
  assert.equal(engineFitFor('falcone_f42', 3).power, ENGINE_FIT.falcone_f42.upgraded[2].power, 'a level may carry its own power');
  assert.equal(engineFitFor('falcone_f42', 9).scale, engineFitFor('falcone_f42', 3).scale, 'levels stop at 3');
  assert.deepEqual(engineFitFor('koenigsegg_jesko', 3), ENGINE_FIT.koenigsegg_jesko, 'no levels to buy on a factory-maxed car');
  assert.deepEqual(engineFitFor('no_such_car', 2), {scale: 1});
  for (const [id, fit] of Object.entries(ENGINE_FIT)) assert.equal(fit.upgraded?.length ?? 3, 3, `${id}: one entry for each of levels 1 to 3`);
  for (const id of IDS) assert.equal(Boolean(ENGINE_FIT[id].upgraded), !CARS[id].factoryMaxed, `${id}: levels fitted exactly when they can be bought`);
});

test('every car has its own fitted scale', () => {
  assert.deepEqual(Object.keys(ENGINE_FIT).sort(), [...IDS].sort(), 'one entry per car, so a new car is fitted before it ships');
  for (const [id, fit] of Object.entries(ENGINE_FIT)) {
    assert.ok(fit.scale > .3 && fit.scale < 1, `${id} scale ${fit.scale}`);
    if (fit.power !== undefined) assert.ok(fit.power > .1 && fit.power < 1.5, `${id} power ${fit.power}`);
  }
  assert.ok(Object.isFrozen(ENGINE_FIT) && Object.isFrozen(ENGINE_CURVE));
});

// ---- the switch off: byte for byte -----------------------------------------------------------

// A fingerprint of the released driving step: three cars, both gearboxes, 15 s of full throttle with shifts, historical tyre-slip off.
function releasedFingerprint() {
  const rows = [];
  for (const id of ['falcone_f42', 'banshee_muscle', 'titan_monster']) for (const difficulty of ['casual', 'pro']) {
    const duel = new Duel({seed: 1989, car: id, featureFlags: createFeatureFlags({storage: null, overrides: {'tyre-slip': false}})});
    duel.startCampaign({car: id, opponentCount: 0, difficulty});
    duel.course = new Course(def);
    Object.assign(duel.state, {status: 'racing', s: 300, prevS: 300, lateral: 0, countdown: 0, traffic: [], speedMph: 0, gear: 0});
    for (let tick = 0; tick < 120 * 15; tick++) {
      const input = {throttle: tick < 120 * 11 ? 1 : 0, brake: tick >= 120 * 13 ? .5 : 0, steer: tick % 400 < 200 ? .1 : -.1, boost: false};
      if (difficulty === 'pro' && duel.state.revs >= .97) input.shiftUp = true;
      duel.setInput(input);
      duel._drive(DT);
      if (tick % 60 === 0) rows.push([id, difficulty, tick, duel.state.speedMph, duel.state.s, duel.state.gear, duel.state.revs, duel.state.lateral, duel.state.headingError]);
    }
  }
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}
// Recorded on the commit before this card (13d23dce) with the same function: the released step is untouched.
const RELEASED = 'ebc0adfb211a9b1f311f7bbeec39e9b66a2141d08c78c39e4c55eff3b10bcecf';

test('with the switch off the released driving step is byte for byte what it was', () => {
  assert.equal(FEATURE_STATES['engine-curve'], 'dev', 'a development switch, off in the game');
  assert.equal(releasedFingerprint(), RELEASED);
  const duel = new Duel({seed: 1989, featureFlags: flags(false)});
  duel.startCampaign({opponentCount: 0});
  assert.equal(Object.hasOwn(duel.state, 'engineCurve'), false, 'no engine-curve field appears in the state');
  assert.equal(bestKey({stageIndex: 0, car: 'falcone_f42'}), bestKey({stageIndex: 0, car: 'falcone_f42', engineCurve: false}), 'personal-best keys are the same');
});

test('the switch is latched per race and recorded: on, a flagged race keeps its rules; arenas keep theirs', () => {
  const duel = new Duel({seed: 1989, featureFlags: flags(true)});
  duel.startCampaign({opponentCount: 0});
  assert.equal(duel.state.engineCurve, true);
  duel.featureFlags = flags(false);                                        // turned off mid-race: this race keeps its rules
  duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false}); duel._drive(DT);
  assert.equal(duel.state.engineCurve, true);
  duel.startCampaign({opponentCount: 0});                                  // the next race is latched anew
  assert.equal(Object.hasOwn(duel.state, 'engineCurve'), false);
  const key = engineCurve => bestKey({stageIndex: 0, car: 'falcone_f42', mode: 'duel', difficulty: 'casual', cpuDifficulty: 'easy', engineCurve});
  assert.notEqual(key(true), key(undefined), 'a race under the new pull is its own personal-best comparison');
  assert.match(key(true), /\|engine-curve:1/);
  const arena = new Duel({seed: 1989, featureFlags: flags(true)});
  arena.startCampaign({opponentCount: 0});
  arena.state.wastelandGateDiscovered = true;
  assert.ok(arena.startArenaEvent({venueId: 'scrapdome', car: 'falcone_f42', difficulty: 'casual', seed: 1989, cpuDifficulty: 'medium',
    opponents: [{car: 'viper_proto', brain: 'rammer'}]}));
  assert.equal(Object.hasOwn(arena.state, 'engineCurve'), false, 'arenas keep the old pull, tuned on it');
});

// ---- the automatic box stays within 2% of today -----------------------------------------------

test('automatic box: every car within 2% of today on 0 to 60, 0 to 100 mph and on the way up to near top speed, at every engine level', () => {
  let checked = 0;
  for (const id of IDS) for (const engineLevel of CARS[id].factoryMaxed ? [0] : [0, 1, 2, 3]) {
    const top = topOf(id) * (1 + .035 * engineLevel);
    const marks = [60, 100, 140, 170, 190].filter(mark => mark < top * .93);
    const today = secondsTo(id, marks, {curve: false, engineLevel}), now = secondsTo(id, marks, {curve: true, engineLevel});
    marks.forEach((mark, i) => {
      const error = now[i] / today[i] - 1;
      assert.ok(Math.abs(error) <= .02, `${id} engine level ${engineLevel}, 0 to ${mark} mph: ${today[i].toFixed(3)} s today, ${now[i].toFixed(3)} s now (${(error * 100).toFixed(2)}%)`);
      checked++;
    });
  }
  assert.ok(checked >= 100, `${checked} marks checked`);
});

test('automatic box: a lap of three circuits, two cars, within 2% of today', () => {
  const lap = (course, car, curve) => {
    const app = new App(); app.autopilot = true;
    app.duel.featureFlags = flags(curve);
    app.duel.startCampaign({startStage: COURSE.findIndex(event => event.id === course), car, difficulty: 'casual', cpuDifficulty: 'easy', seed: 1989, opponentCount: 0, mode: 'timetrial'});
    app._scriptedCrashDone = true;
    for (let frames = 0; app.duel.state.completedLaps < 1 && !['stage_result', 'gameover'].includes(app.duel.state.status) && frames < 120 * 400; frames++) app.advance(1 / 120);
    assert.equal(app.duel.state.engineCurve === true, curve);
    assert.ok(app.duel.state.completedLaps >= 1, `${car} finished a lap of ${course}`);
    return app.duel.state.stageTimeSec;
  };
  for (const course of ['tremblant-woods', 'panorama-ridge', 'harbour-lights']) for (const car of ['falcone_f42', 'bugatti_bolide']) {
    const today = lap(course, car, false), now = lap(course, car, true);
    assert.ok(Math.abs(now / today - 1) <= .02, `${car} on ${course}: ${today.toFixed(2)} s today, ${now.toFixed(2)} s now`);
  }
});

test('a Grand Prix field: every racer within 2% of today after a minute and a half', async () => {
  const {runRace} = await import('./race-field-balance.mjs');
  const at = flag => {
    const marks = [];
    runRace('medium', 0, {maxSec: 95, flags: flag ? ['engine-curve'] : [], onStep: duel => {
      if (duel.state.stageTimeSec >= 90 && !marks.length) marks.push(duel.state.s, ...duel.state.opponents.map(racer => racer.s));
    }});
    return marks;
  };
  const today = at(false), now = at(true);
  assert.ok(today.length >= 8 && now.length === today.length, 'the player and seven racers');
  today.forEach((metres, i) => assert.ok(Math.abs(now[i] / metres - 1) <= .02, `racer ${i}: ${metres.toFixed(1)} m today, ${now[i].toFixed(1)} m now`));
});

// ---- the manual box has something to learn ----------------------------------------------------

test('manual box: changing up at the lights is as quick as the automatic', () => {
  for (const id of IDS) {
    const auto = secondsTo(id, [100], {curve: true})[0];
    const lights = secondsTo(id, [100], {curve: true, difficulty: 'pro', shiftAt: .975})[0];
    assert.ok(Math.abs(lights / auto - 1) <= .01, `${id}: ${auto.toFixed(3)} s automatic, ${lights.toFixed(3)} s manual at 97.5% revs`);
  }
});

test('manual box: shifting at 50% revs is at least 5% slower from 0 to 100 mph', () => {
  for (const id of IDS) {
    const auto = secondsTo(id, [100], {curve: true})[0];
    const early = secondsTo(id, [100], {curve: true, difficulty: 'pro', shiftAt: .5})[0];
    assert.ok(early >= auto * 1.05, `${id}: ${auto.toFixed(3)} s automatic, ${early.toFixed(3)} s shifting at half revs`);
  }
});

test('manual box: held in top gear from 30 to 60 mph takes at least twice as long as the automatic box', () => {
  for (const id of IDS) {
    const auto = secondsTo(id, [60], {curve: true, from: 30})[0];
    const held = secondsTo(id, [60], {curve: true, difficulty: 'pro', from: 30, gear: CARS[id].gears.length - 1, hold: true})[0];
    assert.ok(held >= auto * 2, `${id}: ${auto.toFixed(2)} s automatic, ${held.toFixed(2)} s held in top gear`);
  }
});

test('the switch off leaves top gear at 30 mph as strong as it ever was', () => {
  const auto = secondsTo('falcone_f42', [60], {curve: false, from: 30})[0];
  const held = secondsTo('falcone_f42', [60], {curve: false, difficulty: 'pro', from: 30, gear: 4, hold: true})[0];
  assert.ok(held < auto * 1.5, `today a gear only caps speed: ${auto.toFixed(2)} s against ${held.toFixed(2)} s`);
});

// ---- decisions.md "Keep these" ---------------------------------------------------------------------

test('Summit Run hillside: driving off the road edge ends the same way with the switch on or off', () => {
  const original = COURSE[0];
  try {
    COURSE[0] = SUMMIT_RUN;
    for (const at of [1500, 3000, 8000]) {
      const ends = [false, true].map(curve => {
        const duel = new Duel({seed: 1989, featureFlags: {'grand-prix': true, 'summit-run': true, 'engine-curve': curve}});
        duel.startCampaign({startStage: 0, mode: 'timetrial', car: 'falcone_f42', difficulty: 'casual'});
        const state = duel.state;
        Object.assign(state, {s: at, prevS: at, speedMph: 70, status: 'racing', countdown: 0, lateral: duel.course.roadHalfWidthAt(at) + 3});
        state.prevLateral = state.lateral;
        duel.setInput({throttle: 1, steer: 0, brake: 0, boost: false});
        for (let tick = 0; tick < 120 * 10; tick++) duel.step(DT);
        assert.equal(state.engineCurve === true, curve);
        return {s: state.s, lateral: state.lateral, speed: state.speedMph, status: state.status, tumble: state.tumble?.reason ?? null};
      });
      assert.equal(ends[1].status, ends[0].status);
      assert.equal(ends[1].tumble, ends[0].tumble);
      assert.ok(Math.abs(ends[1].lateral - ends[0].lateral) < 1, `at ${at} m the car ends on the same part of the hill`);
      assert.ok(Math.abs(ends[1].s - ends[0].s) <= 3 + Math.abs(ends[0].s - at) * .02, `at ${at} m: ${ends[0].s.toFixed(1)} m against ${ends[1].s.toFixed(1)} m`);
    }
  } finally { COURSE[0] = original; }
});
