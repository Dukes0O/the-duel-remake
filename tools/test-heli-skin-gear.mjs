// SKIN-GEAR (docs/HELI_WILDLIFE.md section 5.3): each piece of gear works only
// with its skin worn and the heli-skins switch on. This suite pins what the
// helicopter rules did before the gear existed (fingerprints taken on the
// merge of RESCUE-HOOKS, f0bd1edb, before this card), proves stock paint and
// the switch off give exactly those results, and then checks each piece of
// gear on and off. Memory-only: no real save is read or written, and nothing
// here uses a clock or Math.random.
import assert from 'node:assert/strict';
import {createProfile} from '../src/progression.js';
import * as wildlife from '../src/wildlife.js';
import {createHeli, normalizeHeli, missionsOf} from '../src/heli/heli-save.js';
import {gearStats, GEAR, BASE_GEAR} from '../src/heli/heli-skins.js';
import {HELI_STEP, KESTREL} from '../src/heli/heli-flight.js';
import {createMissions, armMissions, noteRefuel, beginRescue, finishRescue, peoplePay, RESCUE_MONEY, RESCUE_CLOCKS} from '../src/heli/heli-missions.js';
import {flatGround, createHeliGround} from '../src/heli/heli-ground.js';
import {CABLE, createLoad, hookPoint, canHook, hook, release, stepCable, swingAngle, createWinch, reelWinch, lineLengthOf} from '../src/heli/heli-cable.js';
import {BUCKET, createBucket, stepBucket, bucketWords, aimPoint, setBucketWater, bucketReading, dropSightDot} from '../src/heli/heli-bucket.js';
import {RESCUE, createRescueLine, setLineWho, stepRescue, rescueHit, rescuePay, hoistBonus, createSupplyCrate, noteCrateRelease,
  crateResult, supplyPay, NET_REACH, netCrates, canNetCrate, netCrate, hookCrates, carryNet, spillNet} from '../src/heli/heli-rescue.js';
import {pickHiker, hikerSpotted, hikerWalk, pickSlide, beaconSignal, liftAt, searchLimit, searchNight, heatContacts} from '../src/heli/heli-search.js';
import {SURVEY, surveyJob, planSurvey, createSurveyRun, stepSurvey, reportSurvey, surveyShare, heatAnimals} from '../src/heli/heli-survey.js';
import {HELI_CAMERA_VIEWS, cameraViewsFor, heliCameraPose} from '../src/heli/heli-camera.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};

// ---- the switch-off proof: fingerprints taken before this card -------------
// FNV-1a over the exact text of everything a scenario produces.
function fnv(value) {
  const text = JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const round = (v, n = 9) => Math.round(v * 10 ** n) / 10 ** n;

// A profile wearing a skin, or stock; `enabled` is the heli-skins switch.
const wearing = kind => ({...createProfile(), heli: {...createHeli(), skins: {owned: kind === 'stock' ? [] : [kind], worn: kind, fresh: []}}});
export const gearFor = (kind, enabled = true) => gearStats(wearing(kind), {enabled});

const pond = createHeliGround({heightAt: () => 95, water: (x, z) => Math.abs(x) <= 100 && Math.abs(z) <= 100 ? 100 : null});
const flat = flatGround(0);

// The cable: hook a car, lift it, swing it, let it go from height.
function cableScenario(gear) {
  const heli = {x: 0, y: 30, z: 0, vx: 0, vy: 0, vz: 0};
  const load = createLoad({id: 'viper_proto', massKg: 940, x: 1, z: 1, ground: flat});
  const out = [];
  out.push(hookPoint(heli, gear), canHook({...heli, y: 15.5}, load, gear), canHook({...heli, x: 2.9, y: 15.5}, load, gear),
    canHook({...heli, x: 3.5, z: 1, y: 15.5}, load, gear), canHook({...heli, x: 5.4, z: 1, y: 15.5}, load, gear));
  const rest = {x: 1, y: 15.5, z: 1, vx: 0, vy: 0, vz: 0};
  out.push(hook(rest, load, gear));
  for (let i = 0; i < 360; i++) {
    rest.y = Math.min(30, 15.5 + i * 0.05); rest.vy = i < 290 ? 6 : 0; rest.x += 0.02 * Math.max(0, i - 200) * HELI_STEP * 60;
    const step = stepCable(load, rest, {ground: flat}, HELI_STEP);
    if (i % 30 === 0) out.push(round(load.x), round(load.y), round(load.z), round(step.force.y, 3), round(swingAngle(load, rest)));
    if (step.events.length) out.push(step.events);
  }
  out.push(release(load, flat));
  for (let i = 0; i < 600; i++) { const step = stepCable(load, rest, {ground: flat}, HELI_STEP); if (step.events.length) out.push(i, step.events); }
  out.push(round(load.x), round(load.y), round(load.z), load.onGround);
  return fnv(out);
}

// The bucket: dip, fill, rise, pour, damage, aim and words.
function bucketScenario() {
  const bucket = createBucket({ground: pond});
  Object.assign(bucket, {onGround: false, y: 100 - 0.6 + BUCKET.hang});
  const out = [];
  for (let i = 0; i < 480; i++) { const r = stepBucket(bucket, {ground: pond}); if (r.events.length) out.push(i, r.events); }
  out.push(round(bucket.water), bucketWords(bucket));
  Object.assign(bucket, {y: 140, vx: 4, vz: 2, vy: 0});
  out.push(aimPoint(bucket, {ground: flat, wind: {speed: 3, toward: {x: 1, z: 0}}}));
  for (let i = 0; i < 240; i++) {
    const r = stepBucket(bucket, {ground: flat, pour: i > 20 && i < 140});
    for (const p of r.patches) out.push(i, round(p.x), round(p.z), round(p.litres), round(p.radius));
    if (r.events.length) out.push(i, r.events);
  }
  out.push(round(bucket.water), bucketWords(bucket));
  return fnv(out);
}

// The rescue line: the hold, the clip, every bump, the pay, the crates.
function rescueScenario(gear) {
  const out = [];
  const line = createRescueLine({x: 0, z: 0, ground: flat});
  const heli = {x: 0, y: 16.3, z: 0, vx: 0, vy: 0, vz: 0, heading: 0};
  for (let i = 0; i < 1100; i++) {
    const r = stepRescue(line, heli, {target: {x: 1, z: 1}, kind: 'hoist', zones: []}, HELI_STEP);
    if (r.events.length) out.push(i, r.events);
  }
  out.push(line.who, line.massKg);
  for (const [speed, who] of [[3, 'pair'], [5, 'pair'], [8, 'pair'], [9, 'pair'], [14, 'pair'], [15, 'pair'], [20, 'rescuer']]) {
    const l = createRescueLine({ground: flat}); setLineWho(l, who);
    out.push(rescueHit(l, {type: 'cargoHit', id: 'rescue', speed, with: 'tree'}, {gear}), l.condition);
    const s = createRescueLine({ground: flat}); setLineWho(s, who);
    out.push(rescueHit(s, {type: 'cargoHit', id: 'rescue', speed, with: 'tree'}, {stretcher: true}), s.condition);
  }
  for (const base of [1000, 1200, 0, NaN]) for (const c of ['unhurt', 'hurt', 'badly', 'x']) out.push(rescuePay(base, c));
  const crate = createSupplyCrate({id: 'food', x: 4, z: 4, ground: flat});
  out.push(noteCrateRelease(crate, {type: 'releasedHigh', heightM: 3}), crateResult(crate, {x: 4, z: 4}));
  out.push(supplyPay([{released: true, dropMetres: 0}, {released: true, dropMetres: 3}, {released: false}], {inTime: true}));
  return fnv(out);
}

// The searches: spotting, the walk, the beacon's signal, the lift ceiling.
function searchScenario() {
  const out = [];
  const spots = [{x: 10, z: 10, y: 0, clearing: {x: 40, z: 40, y: 0, radius: 12}}, {x: -200, z: 90, y: 0, clearing: {x: -230, z: 80, y: 0, radius: 12}}];
  out.push(pickHiker(spots, 12345), pickHiker(spots, 777, 2));
  for (const [x, y] of [[69, 100], [71, 100], [50, 121], [0, 0]]) out.push(hikerSpotted({x, y, z: 0}, {x: 0, z: 0}, flat));
  out.push(hikerWalk({x: 0, z: 0}, {x: 30, z: 40}, 10), hikerWalk({x: 0, z: 0}, {x: 30, z: 40}, 100));
  const slides = [{x: 100, z: 100, y: 0, down: {x: 1, z: 0}, slope: 25}];
  out.push(pickSlide(slides, 4242, flat));
  for (const d of [0, 10, 59, 60, 61, 100]) out.push(beaconSignal({x: d, y: 0, z: 0}, {x: 0, y: 0, z: 0}));
  out.push(liftAt(0), liftAt(3430));
  return fnv(out);
}

// The wildlife count: a day's job, the square, a flight across it, the report.
function surveyScenario(gear) {
  const out = [];
  for (const day of [0, 3, 11]) {
    const job = surveyJob(day, {summitRun: true});
    const plan = planSurvey(job, {wildlife});
    const run = createSurveyRun(plan);
    const {square} = plan;
    for (const agl of [100, 40]) {
      for (let i = 0; i < 400; i++) {
        const events = stepSurvey(run, {dt: 0.5, x: square.x0 + (i % 40) * 20, z: square.z0 + 40 + Math.floor(i / 40) * 80, agl: i % 80 < 40 ? agl : 100}, gear);
        if (events.length) out.push(day, i, events);
      }
    }
    out.push(run.count, surveyShare(run), reportSurvey(run));
  }
  return fnv(out);
}

// The camera: all four views with and without a load.
function cameraScenario(gear) {
  const out = [];
  const view = {heli: {x: 10, y: 50, z: -20, heading: 0.7, pitch: 0.1, roll: -0.2}};
  const withLoad = {...view, load: {hooked: true, x: 11, y: 35, z: -19}};
  for (let i = -5; i < 9; i++) out.push(heliCameraPose(view, i, gear), heliCameraPose(withLoad, i, gear));
  out.push(HELI_CAMERA_VIEWS);
  return fnv(out);
}

export const SCENARIOS = {cable: cableScenario, bucket: bucketScenario, rescue: rescueScenario, search: searchScenario,
  survey: surveyScenario, camera: cameraScenario};
export const runScenarios = gear => Object.fromEntries(Object.entries(SCENARIOS).map(([name, run]) => [name, run(gear)]));


// Taken on f0bd1edb, before any gear existed: `node tools/test-heli-skin-gear.mjs --print`
// on that commit gave these numbers. RESCUE-FINISH re-records search only
// for the closer hiker clue; gear-off equality still compares every result.
// HELI-PAY-CONTINUE re-records rescue and survey: their scenarios print the credits paid, which moved
// (rescue 1,000 to 2,650 and more, count 600 to 3,500). No flight or search result changed.
const BEFORE = {cable: 1196926726, bucket: 2443027711, rescue: 869779211, search: 4001410629, survey: 3083230588, camera: 2660321039};
if (process.argv.includes('--print')) { console.log(JSON.stringify(runScenarios(undefined))); process.exit(0); }

const KINDS = ['stock', 'fire', 'medevac', 'rescue', 'wildlife', 'supply', 'tv'];

// No clock, no random.
const real = {random: Math.random, now: Date.now};
Math.random = () => { throw new Error('Math.random used'); };
Date.now = () => { throw new Error('Date.now used'); };

// ---- 1. stock paint and the switch off: every old result, byte for byte ----
eq(runScenarios(undefined), BEFORE, 'no gear passed: the results taken before this card');
eq(runScenarios(gearFor('stock')), BEFORE, 'stock paint, switch on: the same');
for (const kind of KINDS) eq(runScenarios(gearFor(kind, false)), BEFORE, `${kind} worn with the switch off: the same`);
// Each skin changes only what its own gear touches.
const TOUCHES = {stock: [], fire: [], medevac: ['rescue'], rescue: [], wildlife: ['survey'], supply: ['cable'], tv: ['camera']};
for (const kind of KINDS) {
  const now = runScenarios(gearFor(kind));
  for (const name of Object.keys(BEFORE)) {
    if (TOUCHES[kind].includes(name)) ok(now[name] !== BEFORE[name], `${kind}: ${name} changes with the gear`);
    else eq(now[name], BEFORE[name], `${kind}: ${name} is untouched`);
  }
}
// The unworn numbers the rules fall back on are the packets' base kit.
eq(CABLE.length, BASE_GEAR.lineMax, 'the fixed line is the base kit line');
eq(CABLE.length, BASE_GEAR.lineMin, 'the base kit line does not reel');
eq(CABLE.hookReach, BASE_GEAR.hookReach, 'hook reach 4 m');
eq(KESTREL.hookLimitKg, BASE_GEAR.hookLimitKg, 'hook limit 1,500 kg');
eq(KESTREL.hookLimitKg, GEAR['strong-hook'].effect.hookLimitKg ?? KESTREL.hookLimitKg, 'the stronger hook does not lift more');
eq(SURVEY.countReach, BASE_GEAR.countReach, 'count reach 60 m');
eq(SURVEY.coverReach, BASE_GEAR.countReach, 'covered reach is the count reach');
eq(SURVEY.scareReach, BASE_GEAR.scareDistance, 'scare distance 100 m');
eq(RESCUE.stretcherBumpSpeed, GEAR.stretcher.effect.bumpHurtAbove, 'the older stretcher flag agrees with the gear table (8 m/s)');
eq(RESCUE.stretcherHardSpeed, GEAR.stretcher.effect.bumpTwoStepsAbove, 'and 14 m/s');

const fireGear = gearFor('fire'), medGear = gearFor('medevac'), searchGear = gearFor('rescue');
const wildGear = gearFor('wildlife'), supplyGear = gearFor('supply'), tvGear = gearFor('tv');
const stockGear = gearFor('stock');

// ---- 2. water gauge and drop sight (fire service) ---------------------------
{
  const bucket = createBucket({ground: flat});
  Object.assign(bucket, {onGround: false, y: 120 + BUCKET.hang, vx: 3, vz: 1});
  setBucketWater(bucket, 450);
  eq(bucketReading(bucket, undefined), {words: 'half', litres: null, capacity: 600, text: 'half'}, 'no gear: words on the panel');
  eq(bucketReading(bucket, stockGear).text, 'half', 'stock paint: words');
  eq(bucketReading(bucket, gearFor('fire', false)).text, 'half', 'switch off: words');
  eq(bucketReading(bucket, medGear).text, 'half', 'another skin: words');
  eq(bucketReading(bucket, fireGear), {words: 'half', litres: 450, capacity: 600, text: '450 L'}, 'the gauge shows litres instead of words');
  setBucketWater(bucket, 0.4);
  eq(bucketReading(bucket, fireGear).text, '0 L', 'empty: 0 L');
  setBucketWater(bucket, 600);
  bucket.damage = 1; setBucketWater(bucket, bucket.water);
  eq(bucketReading(bucket, fireGear), {words: 'full', litres: 450, capacity: 450, text: '450 L'}, 'a dented bucket holds 450: the gauge reads what it holds');
  bucket.damage = 3; setBucketWater(bucket, bucket.water);
  eq(bucketReading(bucket, fireGear).text, '0 L', 'a ruined bucket reads 0 L');
  eq(bucketReading(bucket, fireGear).words, 'ruined', 'and still knows the word');

  const sight = createBucket({ground: flat});
  Object.assign(sight, {onGround: false, y: 80 + BUCKET.hang, vx: 4, vz: 2});
  setBucketWater(sight, 600);
  const env = {ground: flat, wind: {speed: 3, toward: {x: 1, z: 0}}};
  eq(dropSightDot(sight, undefined, env), null, 'no gear: no sight dot');
  eq(dropSightDot(sight, stockGear, env), null, 'stock paint: no sight dot');
  eq(dropSightDot(sight, gearFor('fire', false), env), null, 'switch off: no sight dot');
  eq(dropSightDot(sight, searchGear, env), null, 'another skin: no sight dot');
  const dot = dropSightDot(sight, fireGear, env), aim = aimPoint(sight, env);
  ok(dot !== null, 'the sight shows a dot');
  eq(dot, {x: aim.x, z: aim.z}, 'the dot is the exact centre of the aim ring');
  setBucketWater(sight, 0);
  eq(dropSightDot(sight, fireGear, env), null, 'no water: nothing to drop, no dot');
}

// ---- 3. winch (medevac): the line reels from 5 to 40 m at 1.5 m/s ----------
{
  const winch = createWinch();
  eq(winch.length, 15, 'a winch starts at the 15 m line');
  eq(lineLengthOf(undefined), 15, 'no winch: 15 m');
  for (const gear of [undefined, stockGear, gearFor('medevac', false), fireGear]) {
    const w = createWinch(), load = {lineLength: 22};
    reelWinch(w, gear, -1, 2, load);
    eq([w.length, 'lineLength' in load], [15, false], 'without the winch the line stays 15 m and a leftover length is cleared');
  }
  reelWinch(winch, medGear, -1, 1);
  near(winch.length, 13.5, 1e-12, 'one second reeling in: 1.5 m shorter');
  reelWinch(winch, medGear, 0, 5);
  near(winch.length, 13.5, 1e-12, 'no key: holds');
  reelWinch(winch, medGear, 1, 2);
  near(winch.length, 16.5, 1e-12, 'two seconds paying out: 3 m longer');
  let seconds = 0;
  while (winch.length > 5 + 1e-9 && seconds < 60) { reelWinch(winch, medGear, -1, HELI_STEP); seconds += HELI_STEP; }
  near(seconds, (16.5 - 5) / 1.5, 0.05, 'from 16.5 m to 5 m in 7.7 seconds');
  reelWinch(winch, medGear, -1, 10);
  eq(winch.length, 5, 'never shorter than 5 m');
  reelWinch(winch, medGear, 1, 100);
  eq(winch.length, 40, 'never longer than 40 m');
  const load = {};
  reelWinch(winch, medGear, -1, 1, load);
  eq(load.lineLength, 38.5, 'the load on the cable gets the winch length');
  eq(lineLengthOf({lineLength: 30}), 30, 'the hook hangs where the winch left it');
  eq(hookPoint({x: 1, y: 100, z: 2}, {lineLength: 30}), {x: 1, y: 70, z: 2}, 'the hook point follows the line');
  eq(hookPoint({x: 1, y: 100, z: 2}, medGear), {x: 1, y: 85, z: 2}, 'worn gear alone does not change the line, the winch does');

  // A car on a 30 m line hangs 30 m down; on a 5 m line, 5 m down.
  for (const length of [30, 5, 15]) {
    const heli = {x: 0, y: 80, z: 0, vx: 0, vy: 0, vz: 0};
    const car = createLoad({id: 'viper_proto', massKg: 940, x: 0, z: 0, ground: flat});
    Object.assign(car, {hooked: true, onGround: false, y: 80 - length - 0.1, lineLength: length});
    if (length === 15) delete car.lineLength;
    for (let i = 0; i < 120 * 12; i++) stepCable(car, heli, {ground: flat}, HELI_STEP);
    near(heli.y - car.y, length, 0.2, `a ${length} m line hangs the load ${length} m below`);
  }
  // Reeling in while it hangs lifts it; paying out lowers it.
  {
    const heli = {x: 0, y: 80, z: 0, vx: 0, vy: 0, vz: 0};
    const car = createLoad({id: 'viper_proto', massKg: 940, x: 0, z: 0, ground: flat});
    Object.assign(car, {hooked: true, onGround: false, y: 80 - 15.05});
    const w = createWinch();
    for (let i = 0; i < 120 * 4; i++) { reelWinch(w, medGear, -1, HELI_STEP, car); stepCable(car, heli, {ground: flat}, HELI_STEP); }
    for (let i = 0; i < 120 * 8; i++) stepCable(car, heli, {ground: flat}, HELI_STEP);
    near(heli.y - car.y, w.length, 0.3, 'reeled in 6 m: the load hangs 9 m below');
    ok(w.length < 9.1 && w.length > 8.9, `the winch is at ${w.length}`);
    for (let i = 0; i < 120 * 10; i++) { reelWinch(w, medGear, 1, HELI_STEP, car); stepCable(car, heli, {ground: flat}, HELI_STEP); }
    for (let i = 0; i < 120 * 8; i++) stepCable(car, heli, {ground: flat}, HELI_STEP);
    near(heli.y - car.y, w.length, 0.3, 'paid out again: it hangs the new length below');
  }
}

// ---- 4. stretcher (medevac): bump limits and 500 more for a hoist ----------
{
  const bump = (speed, gear, who = 'pair') => {
    const line = createRescueLine({ground: flat}); setLineWho(line, who);
    return [rescueHit(line, {type: 'cargoHit', id: 'rescue', speed, with: 'tree'}, {gear}).steps, line.condition];
  };
  // The medevac skin: hurts only above 8 m/s, two steps only above 14.
  eq(bump(5, medGear), [0, 'unhurt'], '5 m/s on the stretcher: no bump');
  eq(bump(8, medGear), [0, 'unhurt'], 'exactly 8 m/s: no bump');
  eq(bump(8.01, medGear), [1, 'hurt'], 'above 8 m/s: one step');
  eq(bump(14, medGear), [1, 'hurt'], 'exactly 14 m/s: one step');
  eq(bump(14.01, medGear), [2, 'badly'], 'above 14 m/s: two steps');
  // The harness (stock, off, anyone else): 4 and 8 as ever.
  for (const gear of [undefined, stockGear, gearFor('medevac', false), fireGear, searchGear]) {
    eq(bump(5, gear), [1, 'hurt'], '5 m/s on the harness: one step');
    eq(bump(8, gear), [1, 'hurt'], '8 m/s: one step');
    eq(bump(8.5, gear), [2, 'badly'], 'above 8 m/s: two steps');
  }
  eq(bump(20, medGear, 'rescuer'), [0, 'unhurt'], 'the rescuer alone is never hurt');
  // The pay: 500 more for a hoist, once, whole.
  eq(hoistBonus(medGear, 'hoist'), 500, 'the stretcher adds 500 to a hoist rescue (HELI-PAY-CONTINUE: was 200)');
  for (const kind of ['hiker', 'avalanche', 'supply', 'fire']) eq(hoistBonus(medGear, kind), 0, `${kind}: no bonus`);
  for (const gear of [undefined, stockGear, gearFor('medevac', false), fireGear]) eq(hoistBonus(gear, 'hoist'), 0, 'harness: no bonus');
  eq(['unhurt', 'hurt', 'badly'].map(c => rescuePay(1200, c, 500)), [1700, 1220, 800], 'the 500 is on top of the condition pay');
  eq(['unhurt', 'hurt', 'badly'].map(c => rescuePay(1200, c)), [1200, 720, 300], 'no bonus: the old pay');
  eq(rescuePay(0, 'unhurt', 500), 0, 'a rescue that pays nothing gets no bonus');
  eq(rescuePay(1200, 'unhurt', -5), 1200, 'a bonus below nothing is ignored');
  eq(rescuePay(1200, 'unhurt', NaN), 1200, 'and so is one that is not a number');

  // Through the existing pay path exactly once: finishRescue pays what it is
  // given and the rescue is over, so a second call pays nothing.
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: 'Kyle'});
  let missions = armed;
  for (let n = 0; n < 6; n++) missions = noteRefuel(missions);
  missions = beginRescue({...missions, call: {kind: 'hoist', id: 'hoist-1', courseId: 'panorama-ridge', day: 10, answered: true}}, {rescue: true});
  const profile = {credits: 100, heli: normalizeHeli({...createHeli(), playDay: {last: '2026-11-10', count: 12}, missions})};
  const record = missionsOf(profile).rescue;
  eq(peoplePay(record), 3000, 'the mission engine prices a hoist at 3,000 (HELI-PAY-CONTINUE: was 1,200)');
  const pay = rescuePay(RESCUE_MONEY.basePay.hoist, 'unhurt', hoistBonus(medGear, 'hoist'));
  const paid = finishRescue(profile, {pay, enabled: true});
  eq([paid.ok, paid.paid, paid.profile.credits], [true, 3500, 3600], 'the hoist pays 3,500 with the stretcher');
  const again = finishRescue(paid.profile, {pay, enabled: true});
  eq([again.ok, again.profile.credits], [false, 3600], 'paid once: a second finish pays nothing');
  const plain = finishRescue(profile, {pay: rescuePay(RESCUE_MONEY.basePay.hoist, 'unhurt', hoistBonus(stockGear, 'hoist')), enabled: true});
  eq(plain.paid, 3000, 'stock paint: 3,000');
}

// ---- 5. searchlight (search and rescue) -------------------------------------
{
  eq(searchLimit(900, 'hiker', searchGear), 900 + 8 * 60, 'the hiker search runs 8 minutes on into the night');
  for (const kind of ['avalanche', 'hoist', 'supply']) eq(searchLimit(RESCUE_CLOCKS[kind], kind, searchGear), RESCUE_CLOCKS[kind], `${kind}: no extra time`);
  for (const gear of [undefined, stockGear, gearFor('rescue', false), wildGear]) eq(searchLimit(900, 'hiker', gear), 900, 'the search ends at dark');
  eq(searchNight(899, 900, searchGear), {dark: false, nightSeconds: 0, lightOn: false}, 'daylight: the light is not needed');
  eq(searchNight(900, 900, searchGear), {dark: true, nightSeconds: 0, lightOn: false}, 'dark falls');
  eq(searchNight(1000, 900, searchGear), {dark: true, nightSeconds: 100, lightOn: true}, 'in the night the light is on');
  eq(searchNight(1000, 900, stockGear), {dark: true, nightSeconds: 100, lightOn: false}, 'no light without the gear');
  // The mission clock itself: the extra minutes go through the existing clock.
  eq(RESCUE_CLOCKS.hiker, 900, 'the hiker clock is still 15 minutes without the light');
}

// ---- 6. heat camera (search and rescue) -------------------------------------
{
  const heli = {x: 0, y: 100, z: 0};
  const at = (d, y = 100) => ({x: d, z: 0, y});
  const kinds = list => list.map(c => c.kind);
  eq(heatContacts(heli, {hiker: at(100)}, undefined), [], 'no gear: nothing');
  eq(heatContacts(heli, {hiker: at(100)}, stockGear), [], 'stock paint: nothing');
  eq(heatContacts(heli, {hiker: at(100)}, gearFor('rescue', false)), [], 'switch off: nothing');
  eq(heatContacts(heli, {hiker: at(100)}, fireGear), [], 'another skin: nothing');
  eq(kinds(heatContacts(heli, {hiker: at(150)}, searchGear)), ['hiker'], 'a hiker 150 m away shows (trees do not hide them)');
  eq(kinds(heatContacts(heli, {hiker: at(150.5)}, searchGear)), [], 'beyond 150 m: not shown');
  eq(kinds(heatContacts(heli, {skier: at(30)}, searchGear)), ['skier'], 'a buried skier shows within 30 m');
  eq(kinds(heatContacts(heli, {skier: at(30.5)}, searchGear)), [], 'not beyond 30 m');
  eq(kinds(heatContacts(heli, {driver: at(120)}, searchGear)), ['driver'], 'a driver in a hoist rescue shows within 150 m');
  eq(kinds(heatContacts(heli, {hiker: {x: 100, z: 0, y: -60}}, searchGear)), [], 'height counts: 100 m across and 160 m up is 188 m');
  eq(kinds(heatContacts(heli, {hiker: at(140), skier: at(20), driver: at(60)}, searchGear)), ['skier', 'driver', 'hiker'], 'nearest first');
  eq(heatContacts(heli, {hiker: null, skier: undefined}, searchGear), [], 'nobody there: nothing');
  const first = heatContacts(heli, {hiker: at(50)}, searchGear)[0];
  eq([first.x, first.z, first.distance], [50, 0, 50], 'each contact says where and how far');
  eq(heatContacts(heli, {hiker: at(50)}, searchGear), heatContacts(heli, {hiker: at(50)}, searchGear), 'the same every time');

  // In a wildlife count: warm animals too, shown and nothing else.
  const job = surveyJob(3, {summitRun: true}), plan = planSurvey(job, {wildlife}), run = createSurveyRun(plan);
  const target = plan.animals[0];
  const above = {x: target.x + 60, z: target.z, agl: 80};
  eq(heatAnimals(run, above, undefined), [], 'no gear: no animals shown');
  eq(heatAnimals(run, above, stockGear), [], 'stock paint: none');
  eq(heatAnimals(run, above, gearFor('rescue', false)), [], 'switch off: none');
  eq(heatAnimals(run, above, wildGear), [], 'the wildlife skin has no heat camera');
  const warm = heatAnimals(run, above, searchGear);
  ok(warm.length >= 1 && warm.some(a => a.id === target.id), 'the heat camera shows the warm animals in range');
  ok(warm.every(a => Math.hypot(above.x - a.x, above.z - a.z, above.agl) <= 150), 'all within 150 m');
  ok(warm.every((a, i) => i === 0 || warm[i - 1].distance <= a.distance), 'nearest first');
  eq(Object.keys(warm[0]).sort(), ['distance', 'id', 'x', 'z'], 'the panel does not say which are being counted');
  const before = JSON.stringify([run.count, run.coveredCells, run.time, run.animals]);
  heatAnimals(run, above, searchGear);
  eq(JSON.stringify([run.count, run.coveredCells, run.time, run.animals]), before, 'showing animals changes nothing in the count');
  eq(heatAnimals(run, {x: target.x + 400, z: target.z + 400, agl: 80}, searchGear).every(a => a.distance <= 150), true, 'far away: only what is in range');
  eq(heatAnimals({animals: plan.animals}, above, searchGear), [], 'a hand-made run shows nothing');
}

// ---- 7. quiet rotor tips and zoom camera (wildlife) -------------------------
{
  // One animal being counted, at the middle of a square, and a straight pass by it.
  const base = planSurvey(surveyJob(3, {summitRun: true}), {wildlife});
  const cx = base.square.cx, cz = base.square.cz;
  const one = {...base, truth: 1, animals: [{id: 't0-0', role: 'target', species: base.species, herd: 't0', x: cx, z: cz}]};
  const pass = (side, agl, gear) => {
    const run = createSurveyRun(one), events = [];
    for (let i = 0; i <= 200; i++) events.push(...stepSurvey(run, {dt: 0.5, x: cx - 200 + i * 2, z: cz + side, agl}, gear));
    return {run, types: events.map(e => e.type)};
  };
  // Scaring: low, and within the scare distance sideways.
  eq(pass(70, 40, undefined).types.includes('scare'), true, 'no gear: 70 m away at 40 m up scares them (100 m)');
  eq(pass(70, 40, stockGear).types.includes('scare'), true, 'stock paint: scares');
  eq(pass(70, 40, gearFor('wildlife', false)).types.includes('scare'), true, 'switch off: scares');
  eq(pass(70, 40, wildGear).types.includes('scare'), false, 'quiet tips: 70 m is far enough');
  eq(pass(49, 40, wildGear).types.includes('scare'), true, 'quiet tips: 49 m still scares');
  eq(pass(51, 40, wildGear).types.includes('scare'), false, 'quiet tips: 51 m does not');
  eq(pass(99, 40, undefined).types.includes('scare'), true, 'no gear: 99 m scares');
  eq(pass(101, 40, undefined).types.includes('scare'), false, 'no gear: 101 m does not');
  eq(pass(70, 70, undefined).types.includes('scare'), false, 'above 60 m nobody is scared');
  // Counting: out to 100 m sideways with the zoom, 60 m without.
  eq(pass(90, 100, undefined).run.count, 0, 'no gear: 90 m away is too far to count');
  eq(pass(90, 100, stockGear).run.count, 0, 'stock paint: too far');
  eq(pass(90, 100, gearFor('wildlife', false)).run.count, 0, 'switch off: too far');
  eq(pass(90, 100, wildGear).run.count, 1, 'the zoom camera counts it at 90 m');
  eq(pass(99, 100, wildGear).run.count, 1, '99 m');
  eq(pass(101, 100, wildGear).run.count, 0, '101 m is too far even with the zoom');
  eq(pass(59, 100, undefined).run.count, 1, 'no gear: 59 m counts');
  eq(pass(61, 100, undefined).run.count, 0, 'no gear: 61 m does not');
  // The covered share grows with the reach, so a bigger reach does not
  // inflate the estimate (count and cover use the same reach).
  const plain = pass(0, 100, undefined).run, zoom = pass(0, 100, wildGear).run;
  ok(surveyShare(zoom) > surveyShare(plain), 'the zoom covers more of the square on the same line');
  const wide = createSurveyRun({...one, animals: []});
  for (let i = 0; i <= 200; i++) stepSurvey(wide, {dt: 0.5, x: cx - 400 + i * 4, z: cz, agl: 100}, wildGear);
  const narrow = createSurveyRun({...one, animals: []});
  for (let i = 0; i <= 200; i++) stepSurvey(narrow, {dt: 0.5, x: cx - 400 + i * 4, z: cz, agl: 100});
  near(wide.coveredCells / narrow.coveredCells, 100 / 60, 0.2, 'about 100/60 times the width on a straight line');
}

// ---- 8. cargo net and stronger hook (supply) ---------------------------------
{
  const crate = (id, x = 0, z = 0) => createSupplyCrate({id, set: 'summitRun', x, z, ground: flat});
  const hooked = (id, x = 0, z = 0) => { const c = crate(id, x, z); c.hooked = true; return c; };
  // The stronger hook reaches 6.7 m, the plain one 4 m; the limit stays 1,500 kg.
  const car = createLoad({id: 'viper_proto', massKg: 940, x: 5.5, z: 0, ground: flat});
  const heli = {x: 0, y: 15.7, z: 0, vx: 0, vy: 0, vz: 0};
  for (const gear of [undefined, stockGear, gearFor('supply', false), fireGear]) {
    eq(canHook(heli, car, gear), false, '5.5 m sideways: out of the plain hook\'s reach');
    eq(hook(heli, car, gear).ok, false, 'and it will not hook');
  }
  eq(canHook(heli, car, supplyGear), true, 'the stronger hook reaches 5.5 m');
  eq(canHook({...heli, x: -1.3}, car, supplyGear), false, '6.8 m is too far');
  eq(canHook({...heli, x: -1}, car, supplyGear), true, '6.5 m is within reach');
  eq(hook(heli, car, supplyGear).ok, true, 'the stronger hook hooks it');
  eq(supplyGear.hookLimitKg, 1500, 'the hook limit stays 1,500 kg');
  const heavy = createLoad({id: 'big', massKg: 1501, x: 0, z: 0, ground: flat});
  eq(hook(heli, heavy, supplyGear).ok, false, 'a 1,501 kg load is still too heavy');
  const edge = createLoad({id: 'edge', massKg: 1500, x: 0, z: 0, ground: flat});
  eq(hook(heli, edge, supplyGear).ok, true, 'exactly 1,500 kg is fine');

  // The net: hooking up takes the nearest two crates within 10 m in one go.
  const heliAt = {x: 0, y: 15.7, z: 0, vx: 0, vy: 0, vz: 0};
  const yard = (spec, override = {}) => spec.map(([id, x, z]) => createSupplyCrate({id, set: 'summitRun', x, z, ground: flat, ...(override[id] ? {massKg: override[id]} : {})}));
  eq(NET_REACH, 10, 'the net reaches 10 m from the hook point');
  for (const gear of [undefined, stockGear, gearFor('supply', false), fireGear]) {
    const crates = yard([['food', 2, 0], ['medicine', 8, 0]]);
    const got = hookCrates(heliAt, crates, gear);
    eq([got.ok, got.crates.map(c => c.id), crates[0].massKg], [true, ['food'], 300], 'no net: the nearest crate only');
    eq(crates[1].netted, undefined, 'and the other is left');
    eq(hookCrates(heliAt, yard([['food', 4.5, 0]]), gear).ok, false, 'no net: 4.5 m is out of the plain hook\'s reach');
  }
  {
    const crates = yard([['fuel', 14, 0], ['medicine', 8, 0], ['food', 2, 0]]);
    const got = hookCrates(heliAt, crates, supplyGear);
    eq([got.ok, got.event.type, got.event.id], [true, 'hooked', 'food'], 'with the net the nearest is the load on the hook');
    eq(got.crates.map(c => c.id), ['food', 'medicine'], 'and the next nearest comes with it; the one 14 m away is left');
    eq(got.carrier.massKg, 500, 'their weights add: 300 + 200 = 500 kg');
    eq([crates[0].netted, crates[0].hooked, crates[1].netted, crates[2].netted, crates[2].hooked], [undefined, false, true, undefined, true],
      'the far crate is untouched; the net crate counts as carried');
    eq(netCrate(got.carrier, crates[0], supplyGear).reason, 'The net is full.', 'a third will not fit: two crates');
  }
  eq(hookCrates(heliAt, yard([['food', 10.5, 0]]), supplyGear).ok, false, 'a crate 10.5 m away is too far even for the net');
  eq(hookCrates(heliAt, yard([['food', 9.9, 0]]), supplyGear).crates.length, 1, 'one crate within 10 m: it goes alone');
  eq(hookCrates({...heliAt, vx: 5}, yard([['food', 2, 0]]), supplyGear).ok, false, 'moving too fast: nothing hooks');
  {
    // Nearest first, and a tie goes to the first id.
    const crates = yard([['medicine', -3, 0], ['food', 3, 0], ['fuel', 0, 9]]);
    eq(hookCrates(heliAt, crates, supplyGear).crates.map(c => c.id), ['food', 'medicine'], 'a tie goes to the first id');
  }
  {
    // The hook limit covers the total: two too heavy, only the nearest.
    const crates = yard([['food', 2, 0], ['fuel', 6, 0]], {food: 1000, fuel: 640});
    const got = hookCrates(heliAt, crates, supplyGear);
    eq([got.crates.map(c => c.id), got.carrier.massKg, crates[1].netted], [['food'], 1000, undefined], '1,000 + 640 is over 1,500: only the nearest');
    const fits = hookCrates(heliAt, yard([['food', 2, 0], ['fuel', 6, 0]], {food: 860}), supplyGear);
    eq([fits.crates.length, fits.carrier.massKg], [2, 1500], 'exactly 1,500 kg together is fine');
    eq(hookCrates(heliAt, yard([['food', 2, 0]], {food: 1501}), supplyGear).ok, false, 'one crate over the limit will not hook');
    const fuel = yard([['fuel', 2, 0], ['medicine', 6, 0]]);
    eq(hookCrates(heliAt, fuel, supplyGear).carrier.massKg, 840, 'fuel and medicine: 840 kg');
  }
  {
    const [a, b] = yard([['food', 0, 0], ['medicine', 3, 0]]);
    Object.assign(a, {hooked: true});
    eq(canNetCrate(yard([['food', 0, 0]])[0], b, supplyGear).reason, 'Hook a crate first.', 'the first crate must be on the hook');
    eq(canNetCrate(a, a, supplyGear).ok, false, 'a crate cannot net itself');
    eq(canNetCrate(a, b, undefined).reason, 'The net is full.', 'no gear: one crate at a time');
    eq(canNetCrate(a, b, stockGear).ok, false, 'stock paint: one crate');
    eq(canNetCrate(a, b, gearFor('supply', false)).ok, false, 'switch off: one crate');
    eq(canNetCrate(a, b, fireGear).ok, false, 'another skin: one crate');
    eq(netCrates(a), [a], 'only the carrier aboard');
    eq(canNetCrate(a, b, supplyGear), {ok: true, reason: null}, 'the cargo net takes a second crate');
  }

  // Carried, released and set down: each crate is paid on its own.
  {
    const heli2 = {x: 0, y: 40, z: 0, vx: 0, vy: 0, vz: 0};
    const crates = yard([['food', 2, 0], ['medicine', 7, 0]]);
    const [first, second] = crates;
    Object.assign(heli2, {y: 15.7});
    ok(hookCrates(heli2, crates, supplyGear).ok, 'hooked up on the ground');
    Object.assign(heli2, {x: first.x, z: first.z, vy: 6});
    for (let i = 0; i < 120 * 20; i++) {
      if (heli2.y >= 40) Object.assign(heli2, {y: 40, vy: 0}); else heli2.y += 6 * HELI_STEP;
      stepCable(first, heli2, {ground: flat}, HELI_STEP); carryNet(first);
    }
    near(heli2.y - first.y, 15, 0.3, 'the net hangs on the same 15 m line');
    ok(second.y === first.y && !second.onGround, 'the second crate hangs with it');
    eq([second.x !== first.x || second.z !== first.z], [true], 'beside it, not inside it');
    eq(spillNet(first), [], 'nothing spills while it is hooked');
    // Let go from 3 m and settle on the ground.
    Object.assign(heli2, {y: 3 + 15 + 0.7});
    Object.assign(first, {y: 3 + 0.7, vy: 0, vx: 0, vz: 0, x: heli2.x, z: heli2.z});
    const released = release(first, flat);
    eq(released.event.type, 'releasedHigh', 'let go from 3 m');
    noteCrateRelease(first, released.event);
    for (let i = 0; i < 120 * 4; i++) { stepCable(first, heli2, {ground: flat}, HELI_STEP); carryNet(first); }
    const spilled = spillNet(first);
    eq(spilled, [second], 'the second crate is set down beside the first');
    eq([second.hooked, second.onGround, second.falling, second.netted, second.releaseDrop > 0], [false, true, false, false, true], 'at rest on the ground');
    eq(first.massKg, 300, 'the first is its own weight again');
    eq(netCrates(first), [first], 'the net is empty');
    // Both count at the yard with the 3 m cut each.
    const yardCircle = {x: first.x, z: first.z, radius: 10};
    const results = [crateResult(first, yardCircle), crateResult(second, yardCircle)];
    eq(results.map(r => r.released), [true, true], 'both are down in the yard');
    eq(supplyPay(results, {inTime: true, count: 3}).crates, 600 * 2, 'each crate pays by its own release: 1,250 less 650 each (HELI-PAY-CONTINUE: was 300 less 150)');
  }
}

// ---- 9. steady nose camera (TV camera) ---------------------------------------
{
  const view = {heli: {x: 10, y: 50, z: -20, heading: 0.7, pitch: 0.1, roll: -0.2}};
  eq([...cameraViewsFor(undefined)], ['behind', 'cockpit', 'cable', 'side'], 'no gear: four views');
  for (const gear of [stockGear, gearFor('tv', false), fireGear, medGear]) eq([...cameraViewsFor(gear)], ['behind', 'cockpit', 'cable', 'side'], 'four views');
  eq([...cameraViewsFor(tvGear)], ['behind', 'cockpit', 'cable', 'side', 'nose'], 'the TV skin adds a fifth view');
  eq([...HELI_CAMERA_VIEWS], ['behind', 'cockpit', 'cable', 'side'], 'the base list is unchanged');
  eq(heliCameraPose(view, 4, tvGear).name, 'nose', 'the fifth view is the nose camera');
  eq(heliCameraPose(view, 4, stockGear).name, 'behind', 'without the gear the view after "side" wraps to "behind"');
  eq(heliCameraPose(view, 5, tvGear).name, 'behind', 'and the fifth wraps to the first');
  eq(heliCameraPose(view, -1, tvGear).name, 'nose', 'one before the first is the last');
  for (let i = 0; i < 4; i++) eq(heliCameraPose(view, i, tvGear), heliCameraPose(view, i, undefined), `view ${i} is the same with the TV gear`);
  const pose = heliCameraPose(view, 4, tvGear);
  eq(pose.position.y, pose.target.y, 'level with the horizon');
  const tilted = heliCameraPose({heli: {...view.heli, pitch: -0.4, roll: 0.5}}, 4, tvGear);
  eq(tilted, pose, 'steady: pitch and roll do not move it');
  const turned = heliCameraPose({heli: {...view.heli, heading: view.heli.heading + 0.5}}, 4, tvGear);
  ok(turned.target.x !== pose.target.x, 'it follows the heading');
  const ahead = {x: Math.sin(view.heli.heading), z: Math.cos(view.heli.heading)};
  near(Math.hypot(pose.position.x - view.heli.x, pose.position.z - view.heli.z), 3, 1e-9, 'on the nose, 3 m ahead');
  near((pose.target.x - pose.position.x) * ahead.x + (pose.target.z - pose.position.z) * ahead.z, 40, 1e-9, 'looking straight ahead');
  eq(heliCameraPose(null, 4, tvGear), null, 'no helicopter: no pose');
}

Math.random = real.random; Date.now = real.now;
console.log(`test-heli-skin-gear: ${checks} checks passed`);
