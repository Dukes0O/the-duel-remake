// Tuning (docs/LAB.md section 5, card LAB-TUNE): each step moves its numbers by the table's amount, a stock
// tune drives exactly as no tune, the settings are a trade and never a free lunch (shown with the test driver in
// Node), the fuel runs dry and the pit stop refills it, and the stock lap and the tuned-lap bonus pay once.
import assert from 'node:assert/strict';
import {COURSE, CARS, DRIVE} from '../src/config.js';
import '../src/circuits/index.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createProfile} from '../src/progression.js';
import {TUNE_SETTINGS, labOf, setTune, stockKey, createLab, normalizeLab, withLab, TUNED_BONUS} from '../src/lab/lab-save.js';
import {passLesson} from '../src/lab/lab-save.js';
import {
  LAB_TUNE, normalizeTune, isStockTune, tunedCar, tunedGrip, fuelPlan, bestLap, ruleSetOf, seedStockLaps, settleTunedLap,
} from '../src/lab/lab-tune.js';
import {PIT, stepPitService} from '../src/pit-lane.js';
import {driveCircuit} from './track-script-drive.mjs';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};
const flagsOf = (...names) => ({enabled: name => names.includes(name)});
const TUNING = flagsOf('lab', 'lab-tuning');
const CAR = 'falcone_f42';
const base = {...CARS[CAR], roughnessScale: 1, offRoadGrip: DRIVE.offRoadGrip};

// ---- Stock is the same car -------------------------------------------------------------------------------------------
{
  for (const stock of [undefined, null, {}, {pressure: 0, wing: 0, brakes: 0, springs: 0, fuel: 0}, {fuel: -2}, {pressure: 'x', wing: NaN, brakes: 1.5, springs: 9, fuel: -9}])
    ok(tunedCar(base, stock) === base, `a stock tune (${JSON.stringify(stock)}) gives back the very same car`);
  ok(isStockTune({fuel: -2}) && !isStockTune({fuel: 1}) && !isStockTune({wing: -1}), 'what counts as stock');
  same(normalizeTune({pressure: 9, wing: -9, brakes: 1.5, springs: '1', fuel: -2}), {pressure: 0, wing: 0, brakes: 0, springs: 0, fuel: 0},
    'forged steps read as 0 (out of range, fractions, text, a negative fuel step)');
  same(Object.keys(normalizeTune(null)), TUNE_SETTINGS, 'the five settings');
  ok(tunedGrip(base, 80, 1) === base.grip && tunedGrip(base, 80, 0) === base.grip, 'an untuned car\'s grip is its own value, bit for bit');
  // A partly tuned car changes only what the setting touches.
  const wingOnly = tunedCar(base, {wing: 1});
  for (const key of ['accel', 'grip', 'braking', 'offRoadGrip', 'roughnessScale']) ok(wingOnly[key] === base[key], `a wing step leaves ${key} bit for bit`);
  ok(tunedGrip(wingOnly, 0, 0) === base.grip, 'and the grip at rest and without the brake is untouched');
  ok(tunedGrip(tunedCar(base, {pressure: 1}), 80, 1) === tunedCar(base, {pressure: 1}).grip, 'a step that is not wing or brakes does not move the grip with speed or brake');
}

// ---- Each step moves its numbers by the table's amount -----------------------------------------------------------------
{
  for (const step of [-2, -1, 1, 2]) {
    const pressure = tunedCar(base, {pressure: step});
    near(pressure.grip / base.grip, 1 - 0.01 * step, 1e-12, `pressure ${step}: grip -/+1% a step (lower adds)`);
    near(pressure.topSpeed / base.topSpeed, 1 + 0.005 * step, 1e-12, `pressure ${step}: top speed +/-0.5% a step`);
    near(pressure.gears[2] / base.gears[2], 1 + 0.005 * step, 1e-12, `pressure ${step}: the gears follow the top speed`);
    const wing = tunedCar(base, {wing: step});
    near(wing.topSpeed / base.topSpeed, 1 - 0.01 * step, 1e-12, `wing ${step}: top speed -1% a step`);
    near(tunedGrip(wing, 100, 0) / base.grip, 1 + 0.03 * step, 1e-12, `wing ${step}: grip at 100 mph +3% a step`);
    near(tunedGrip(wing, 50, 0) / base.grip, 1 + 0.03 * step * 0.25, 1e-12, `wing ${step}: scaled by (speed / 100 mph) squared`);
    near(tunedGrip(wing, 200, 0) / base.grip, 1 + 0.03 * step * 4, 1e-12, `wing ${step}: twice the speed, four times the push`);
    const brakes = tunedCar(base, {brakes: step});
    near(brakes.braking / base.braking, 1 + 0.01 * step, 1e-12, `brakes ${step}: braking +1% a step rearward`);
    near(tunedGrip(brakes, 60, 1) / base.grip, 1 + (-0.02 * step) / 0.8, 1e-12, `brakes ${step}: 80% of the cornering grip left becomes ${(80 - 2 * step)}% at full brake`);
    near(tunedGrip(brakes, 60, 0.5) / base.grip, 1 + (-0.02 * step) / 0.8 * 0.5, 1e-12, `brakes ${step}: half the brake, half the change`);
    ok(tunedGrip(brakes, 60, 0) === base.grip, `brakes ${step}: nothing changes off the brake`);
    const springs = tunedCar(base, {springs: step});
    near(springs.grip / base.grip, 1 + 0.01 * step, 1e-12, `springs ${step}: grip +1% a step stiffer`);
    near(springs.offRoadGrip / base.offRoadGrip, 1 - 0.02 * step, 1e-12, `springs ${step}: off-road grip +2% a step softer`);
    near(springs.roughnessScale / base.roughnessScale, 1 + 0.08 * step, 1e-12, `springs ${step}: bumps 8% smaller a step softer`);
  }
  for (const step of [1, 2]) {
    const fuel = tunedCar(base, {fuel: step});
    near(fuel.accel / base.accel, 1 + 0.015 * step, 1e-12, `fuel ${step}: acceleration +1.5% a step`);
    near(fuel.braking / base.braking, 1 + 0.015 * step, 1e-12, `fuel ${step}: braking +1.5% a step`);
    ok(fuel.topSpeed === base.topSpeed && fuel.grip === base.grip, `fuel ${step}: top speed and grip are not touched`);
  }
  same(Object.keys(tunedCar(base, {wing: 1}).tune), TUNE_SETTINGS, 'a tuned car carries its tune');
  ok(Object.isFrozen(tunedCar(base, {wing: 1}).tune), 'frozen');
  // Every step trades: what a step buys, it pays for in the opposite number.
  const bought = (a, b) => a > b;
  for (const sign of [1, -1]) {
    const brakes = tunedCar(base, {brakes: sign});
    ok(bought(brakes.braking, base.braking) === bought(base.grip, tunedGrip(brakes, 60, 1)) === true || sign < 0 && brakes.braking < base.braking && tunedGrip(brakes, 60, 1) > base.grip,
      `brakes ${sign}: ${sign > 0 ? 'shorter stops and less cornering grip while braking' : 'longer stops and more cornering grip while braking'}`);
    const springs = tunedCar(base, {springs: sign});
    ok(sign > 0 ? springs.grip > base.grip && springs.roughnessScale > 1 && springs.offRoadGrip < base.offRoadGrip
      : springs.grip < base.grip && springs.roughnessScale < 1 && springs.offRoadGrip > base.offRoadGrip, `springs ${sign}: smooth-road grip against bumps and dirt`);
  }
}

// ---- Fuel plan ------------------------------------------------------------------------------------------------------------
{
  const race = {grandPrix: true, pitLane: true, petrol: true};
  near(fuelPlan({fuel: 2}, 10000, race).tankM, 5500, 1e-9, 'a half tank lasts 55% of the race');
  near(fuelPlan({fuel: 1}, 10000, race).tankM, 8250, 1e-9, 'a three-quarter tank lasts 82.5%');
  ok(fuelPlan({fuel: 0}, 10000, race) === null && fuelPlan({fuel: -2}, 10000, race) === null, 'a full tank (steps 0 and below) is never dry');
  ok(fuelPlan({fuel: 2}, 10000, {...race, grandPrix: false}) === null, 'only in a Grand Prix');
  ok(fuelPlan({fuel: 2}, 10000, {...race, pitLane: false}) === null, 'only on a course with a pit lane');
  ok(fuelPlan({fuel: 2}, 10000, {...race, petrol: false}) === null, 'only for a petrol car');
  ok(fuelPlan({fuel: 2}, 0, race) === null && fuelPlan({fuel: 2}, NaN, race) === null, 'a race with no length has no tank');
  same(LAB_TUNE.fuel.dryPower, 0.4, 'empty is 40% power');
  same(LAB_TUNE.fuel.stopSec, 5, 'the stop takes 5 s longer');
}

// ---- The switch off, and a stock tune, drive exactly as before ----------------------------------------------------------------
const rest = (course, options) => {
  let last = '';
  const result = driveCircuit(COURSE.find(item => item.id === course), {opponentCount: 0, maxSeconds: 30, fps: 60, ...options,
    onTick: (s, d) => { last = JSON.stringify({s, key: d.car.grip}); }});
  return JSON.stringify({result, last});
};
{
  const plain = rest('tremblant-woods', {mode: 'timetrial'});
  same(rest('tremblant-woods', {mode: 'timetrial', flags: ['lab-tuning'], tune: {pressure: 0, wing: 0, brakes: 0, springs: 0, fuel: 0}}), plain,
    'with the switch on, a stock tune: the race and every state number are the same, byte for byte');
  same(rest('tremblant-woods', {mode: 'timetrial', tune: {pressure: -2, wing: 2, brakes: 2, springs: 2, fuel: 2}}), plain,
    'with the switch off, any tune: the race is the same, byte for byte');
  ok(rest('tremblant-woods', {mode: 'timetrial', flags: ['lab-tuning'], tune: {wing: 2}}) !== plain, 'with the switch on, a tune changes the race');
  // A lesson run never takes the tune.
  const duel = new Duel({featureFlags: createFeatureFlags({storage: null, qa: false, search: '', overrides: {'lab-tuning': true}})});
  duel.startCampaign({mode: 'timetrial', car: CAR, startStage: COURSE.findIndex(item => item.id === 'tremblant-woods'), seed: 1989, opponentCount: 0, tune: {wing: 2}});
  same(duel.state.tune, {pressure: 0, wing: 2, brakes: 0, springs: 0, fuel: 0}, 'the race setup carries the tune');
  ok(duel.car.tune && duel.car.topSpeed < CARS[CAR].topSpeed, 'and the car is the tuned car');
  duel.startCampaign({mode: 'timetrial', car: CAR, startStage: COURSE.findIndex(item => item.id === 'tremblant-woods'), seed: 1989, opponentCount: 0});
  ok(!('tune' in duel.state) && !duel.car.tune, 'the next race without a tune has none left over');
}

// ---- No free lunch (docs/LAB.md 5.2) -----------------------------------------------------------------------------------------
// First laps with the test driver: the line driver on the authored circuits, the demo driver on the older ones.
const LAPS = new Map();
const lap = (course, tune = null) => {
  const key = course + '|' + JSON.stringify(tune);
  if (!LAPS.has(key)) {
    const result = driveCircuit(COURSE.find(item => item.id === course), {mode: 'timetrial', opponentCount: 0, maxSeconds: 400, stopAfterLaps: 1,
      flags: tune ? ['lab-tuning'] : [], tune});
    assert.ok(Number.isFinite(result.bestLap), `${course} ${key}: a first lap`);
    LAPS.set(key, result.bestLap);
  }
  return LAPS.get(key);
};
const gain = (course, tune) => 1 - lap(course, tune) / lap(course);
const POOL = ['tremblant-woods', 'tremblant-snow', 'harbour-lights', 'panorama-ridge', 'ardennes-forest', 'pacific-canyon', 'harbor-highlands', 'cloudbreak-skyway'];
{
  // On each wind-tunnel course some setting beats stock by at least 0.5%.
  const tunnel = {'tremblant-woods': 'pressure', 'panorama-ridge': 'wing', 'harbour-lights': 'brakes', 'tremblant-snow': 'springs', 'summit-run': 'fuel'};
  const settings = ['pressure', 'wing', 'springs'];
  const best = {};
  for (const course of Object.keys(tunnel)) {
    let top = -Infinity, how = '';
    for (const name of settings) for (const step of [-2, 2]) {
      const g = gain(course, {[name]: step});
      if (g > top) { top = g; how = `${name} ${step}`; }
    }
    best[course] = {how, percent: Math.round(top * 1000) / 10};
    ok(top >= 0.005, `${course} (${tunnel[course]}'s course): some setting beats 0 by at least 0.5% (${how}: ${(top * 100).toFixed(2)}%)`);
  }
  console.log('Best setting on each wind-tunnel course:', JSON.stringify(best));

  // Pressure and the wing never win everywhere: each non-zero step is slower than 0 on at least one course, and faster on another.
  for (const name of ['pressure', 'wing']) for (const step of [-2, -1, 1, 2]) {
    const gains = POOL.map(course => gain(course, {[name]: step}));
    ok(gains.some(g => g < 0), `${name} ${step}: slower than 0 on at least one course (worst ${(Math.min(...gains) * 100).toFixed(2)}%)`);
    ok(gains.some(g => g > 0), `${name} ${step}: faster than 0 on at least one course (best ${(Math.max(...gains) * 100).toFixed(2)}%)`);
  }
}

// ---- Fuel runs dry at 55% and the pit adds fuel ---------------------------------------------------------------------------------
{
  const summit = COURSE.find(item => item.id === 'summit-run');
  const run = tune => {
    let dryAt = null, tank = null, length = null;
    const result = driveCircuit(summit, {mode: 'grandprix', opponentCount: 5, flags: ['grand-prix', ...(tune ? ['lab-tuning'] : [])], tune, maxSeconds: 900,
      onTick: (s, d) => { if (s.fuel && tank === null) { tank = s.fuel.tankM; length = d.course.raceLength; } if (s.fuel?.dry && dryAt === null) dryAt = s.s; }});
    return {result, dryAt, tank, length};
  };
  const stock = run(null);
  ok(stock.tank === null && stock.dryAt === null, 'a stock tune carries no tank');
  const half = run({fuel: 2});
  near(half.tank / half.length, 0.55, 1e-9, 'a half tank is 55% of the race');
  near(half.dryAt / half.length, 0.55, 0.04, 'the car runs dry at about 55% of the race');
  ok(half.result.timeSec > stock.result.timeSec, `the dry engine costs more than the lighter car gains (${half.result.timeSec.toFixed(1)} s against ${stock.result.timeSec.toFixed(1)} s)`);
  const three = run({fuel: 1});
  near(three.dryAt / three.length, 0.825, 0.04, 'a three-quarter tank runs dry at about 82.5%');
  ok(three.result.timeSec > stock.result.timeSec, 'and is slower than stock too');
  const full = run({fuel: -2});
  ok(full.tank === null, 'the full-tank steps carry no tank');

  // The dry engine is 40% of the acceleration; the pit stop takes 5 s longer and fills the tank.
  const flags = createFeatureFlags({storage: null, qa: false, search: '', overrides: {'lab-tuning': true, 'grand-prix': true}});
  const start = tune => {
    const duel = new Duel({featureFlags: flags});
    duel.startCampaign({mode: 'grandprix', car: CAR, startStage: COURSE.findIndex(item => item.id === 'summit-run'), seed: 1989, fieldSeed: 7, opponentCount: 5, playerId: 'p', upgrades: {}, ...(tune ? {tune} : {})});
    return duel;
  };
  const accelOver = (duel, dry) => {
    const s = duel.state;
    s.status = 'racing'; s.speedMph = 30; s.gear = 1; s.s = 200; s.lateral = 0;
    if (s.fuel) s.fuel.dry = dry;
    s.input = {throttle: 1, brake: 0, steer: 0, boost: false, shiftUp: false, shiftDown: false};
    const before = s.speedMph;
    for (let i = 0; i < 20; i++) { if (s.fuel) s.fuel.leftM = dry ? 0 : s.fuel.tankM; duel._drive(1 / 120); }
    return s.speedMph - before;
  };
  const tuned = start({fuel: 2});
  const wet = accelOver(tuned, false), dryAcc = accelOver(start({fuel: 2}), true);
  near(dryAcc / wet, 0.4, 0.03, 'empty means 40% of the acceleration');

  const stopFor = (duel, actor) => {
    const lane = duel.course.pitLane, s = actor;
    s.s = lane.box + (actor === duel.state ? 0 : 0); s.lateral = lane.offsetAt(s.s); s.speedMph = 0; s.headingError = 0;
    let steps = 0;
    for (; steps < 120 * 20; steps++) { stepPitService(duel, actor, 1 / 120); if (actor.pit?.phase === 'ready') break; }
    return steps / 120;
  };
  const fuelled = start({fuel: 2});
  fuelled.state.fuel.leftM = 123;
  near(stopFor(fuelled, fuelled.state), PIT.serviceSec + 5, 0.05, 'the stop takes 5 s longer with a fuel setting');
  near(fuelled.state.fuel.leftM, fuelled.state.fuel.tankM, 1e-9, 'and the tank is full again');
  ok(fuelled.state.fuel.dry === false, 'with the engine pulling again');
  const plainStop = start(null);
  near(stopFor(plainStop, plainStop.state), PIT.serviceSec, 0.05, 'a stock tune stops for the usual 4 s');
  const computer = fuelled.state.opponents[0];
  near(stopFor(fuelled, computer), PIT.serviceSec, 0.05, 'a computer car stops for the usual 4 s');
  ok(!('fuel' in computer), 'and carries no tank');
}

// ---- Stock laps and the tuned-lap bonus (5.3) ----------------------------------------------------------------------------------
{
  const profile = {...createProfile(), credits: 1000};
  const lapOf = (lapTimes, tune, rules = '') => ({carId: CAR, courseId: 'tremblant-woods', lapTimes, tune, rules});
  same(bestLap([91, 88.4, 'x', NaN, -1, 0, 90]), 88.4, 'the best lap ignores junk');
  same(bestLap([]), null, 'no laps, no best');

  // Off: nothing happens.
  for (const flags of [flagsOf(), flagsOf('lab'), flagsOf('lab-tuning')]) {
    const result = settleTunedLap(profile, lapOf([90], {}), {flags});
    ok(result.profile === profile && result.tuned === null, 'the switches off: nothing is recorded or paid');
  }
  // A stock run keeps the best lap as the stock lap.
  let state = settleTunedLap(profile, lapOf([92, 90.5, 91], {}), {flags: TUNING});
  same(state.tuned, null, 'a stock run has no tuned result');
  same(labOf(state.profile).stockLaps, {[`${CAR}|tremblant-woods`]: 90.5}, 'its best lap is the stock lap');
  state = settleTunedLap(state.profile, lapOf([89.9], {fuel: -2}), {flags: TUNING});
  same(labOf(state.profile).stockLaps[`${CAR}|tremblant-woods`], 89.9, 'a faster stock lap replaces it (fuel steps below 0 are stock)');
  state = settleTunedLap(state.profile, lapOf([95], {}), {flags: TUNING});
  same(labOf(state.profile).stockLaps[`${CAR}|tremblant-woods`], 89.9, 'a slower one does not');
  const stocked = state.profile;

  // The 1% rule: at least 1% faster than the stock lap, once for the course.
  const tuned = {wing: 1};
  const edge = settleTunedLap(stocked, lapOf([89.9 * 0.99], tuned), {flags: TUNING});
  same(edge.tuned.bonus, TUNED_BONUS, 'exactly 1% faster pays');
  const nearMiss = settleTunedLap(stocked, lapOf([89.9 * 0.9901], tuned), {flags: TUNING});
  same([nearMiss.tuned.bonus, nearMiss.profile === stocked], [0, true], 'just under 1% faster pays nothing and changes nothing');
  same(nearMiss.tuned.percent, 1, 'the result still says how much faster (0.99 of the lap)');
  const slow = settleTunedLap(stocked, lapOf([91], tuned), {flags: TUNING});
  same([slow.tuned.bonus, slow.tuned.percent], [0, 0], 'a slower tuned lap says 0 and pays nothing');
  const paid = settleTunedLap(stocked, lapOf([88.5, 89], tuned), {flags: TUNING});
  same([paid.tuned.bonus, paid.profile.credits - stocked.credits], [400, 400], 'a tuned lap 1.5% faster pays 400');
  same(paid.tuned.percent, 1.6, 'and the card says 1.6% faster');
  same(labOf(paid.profile).tunedBonus, ['tremblant-woods'], 'the course is marked');
  const again = settleTunedLap(paid.profile, lapOf([80], tuned), {flags: TUNING});
  same([again.tuned.bonus, again.profile.credits], [0, paid.profile.credits], 'a second tuned lap on the course pays nothing');
  const other = settleTunedLap(paid.profile, {carId: CAR, courseId: 'panorama-ridge', lapTimes: [50], tune: tuned}, {flags: TUNING});
  same(other.tuned, {percent: 0, bonus: 0}, 'a course with no stock lap pays nothing');
  // A tuned lap is not a stock lap, and bad numbers pay nothing.
  ok(labOf(paid.profile).stockLaps[`${CAR}|tremblant-woods`] === 89.9, 'the tuned lap never becomes the stock lap');
  for (const bad of [NaN, -5, 0, Infinity, 'fast', null]) {
    const result = settleTunedLap(stocked, lapOf([bad], tuned), {flags: TUNING});
    ok(result.profile === stocked && result.tuned === null, `a lap of ${bad} pays nothing`);
  }
  // Another car has its own stock lap.
  const otherCar = settleTunedLap(stocked, {carId: 'aurora_gt', courseId: 'tremblant-woods', lapTimes: [10], tune: tuned}, {flags: TUNING});
  same(otherCar.tuned, {percent: 0, bonus: 0}, 'a car with no stock lap on the course pays nothing');

  // Rule sets: a stock lap and a tuned lap are only compared under the same rules.
  same([ruleSetOf({}), ruleSetOf({tyreSlipRules: true}), ruleSetOf({engineCurveRules: true}), ruleSetOf({tyreSlipRules: true, engineCurveRules: true}), ruleSetOf(null)],
    ['', 'tyre-slip', 'engine-curve', 'engine-curve+tyre-slip', ''], 'the rule set names');
  const slip = settleTunedLap(stocked, lapOf([80], {}, 'tyre-slip'), {flags: TUNING});
  same(labOf(slip.profile).stockLaps, {[`${CAR}|tremblant-woods`]: 89.9, [stockKey(CAR, 'tremblant-woods', 'tyre-slip')]: 80}, 'a stock lap under tyre-slip is kept apart');
  const judged = settleTunedLap(slip.profile, lapOf([85], tuned, 'tyre-slip'), {flags: TUNING});
  same(judged.tuned.bonus, 0, 'a tuned lap under tyre-slip is judged against the tyre-slip stock lap (85 against 80 pays nothing)');
  const crossed = settleTunedLap(stocked, lapOf([85], tuned, 'tyre-slip'), {flags: TUNING});
  same(crossed.tuned, {percent: 0, bonus: 0}, 'and never against the stock lap of the plain rules');
  const plain = settleTunedLap(slip.profile, lapOf([85], tuned), {flags: TUNING});
  same(plain.tuned.bonus, TUNED_BONUS, 'nor the other way: 85 against 89.9 under the plain rules pays');

  // Seeding from the records, once.
  const rows = [
    {playerId: 'p1', mode: 'timetrial', car: CAR, eventId: 'tremblant-woods', lapTimes: [92, 90, 91]},
    {playerId: 'p1', mode: 'timetrial', car: CAR, eventId: 'tremblant-woods', tyreSlipRules: true, lapTimes: [88]},
    {playerId: 'p1', mode: 'duel', car: CAR, eventId: 'panorama-ridge', lapTimes: [70]},
    {playerId: 'p2', mode: 'timetrial', car: CAR, eventId: 'panorama-ridge', lapTimes: [60]},
    {playerId: 'p1', mode: 'timetrial', car: CAR, eventId: 'nowhere', lapTimes: [60]},
    {playerId: 'p1', mode: 'timetrial', car: CAR, eventId: 'harbour-lights', lapTimes: []},
    {playerId: 'p1', mode: 'timetrial', car: 'no-such-car', eventId: 'harbour-lights', lapTimes: [60]},
    {playerId: 'p1', mode: 'timetrial', car: CAR, eventId: 'harbour-lights', engineCurveRules: true, lapTimes: [75]},
  ];
  const seeded = seedStockLaps(profile, rows, 'p1', {flags: TUNING});
  same(labOf(seeded).stockLaps, {[`${CAR}|tremblant-woods`]: 90, [stockKey(CAR, 'tremblant-woods', 'tyre-slip')]: 88, [stockKey(CAR, 'harbour-lights', 'engine-curve')]: 75},
    'only the player\'s own Time Trial laps seed, each under its own rules');
  ok(seedStockLaps(seeded, rows, 'p1', {flags: TUNING}) === seeded, 'seeding again changes nothing');
  const keeps = seedStockLaps(stocked, rows, 'p1', {flags: TUNING});
  ok(keeps === stocked, 'a player who already has stock laps is never reseeded (nothing is wiped or replaced)');
  ok(seedStockLaps(profile, rows, 'p1', {flags: flagsOf('lab')}) === profile, 'the switch off seeds nothing');
  ok(seedStockLaps(profile, null, 'p1', {flags: TUNING}) === profile && seedStockLaps(profile, [null, 7, {}], 'p1', {flags: TUNING}) === profile, 'junk records seed nothing');
}

// ---- The save --------------------------------------------------------------------------------------------------------------------------
{
  const forged = normalizeLab({version: 1, tune: {[CAR]: {pressure: 9, wing: 1.5, brakes: '2', springs: null, fuel: -7}, 'no-such-car': {pressure: 1}},
    stockLaps: {[`${CAR}|tremblant-woods`]: -3, [`${CAR}|tremblant-woods|BAD KEY`]: 5, [`${CAR}|nowhere`]: 7, 'x|tremblant-woods': 6, [`${CAR}|panorama-ridge`]: NaN,
      [`${CAR}|harbour-lights|tyre-slip`]: 80, [`${CAR}|harbour-lights|a-later-rule`]: 81, [`${CAR}|harbour-lights|tyre-slip|extra`]: 82}});
  same(forged.tune, {[CAR]: {pressure: 0, wing: 0, brakes: 0, springs: 0, fuel: 0}}, 'a forged tune reads as 0 for each bad step and the unknown car is dropped');
  same(forged.stockLaps, {[`${CAR}|harbour-lights|tyre-slip`]: 80, [`${CAR}|harbour-lights|a-later-rule`]: 81}, 'forged stock laps are dropped; a later game\'s rule name is kept');
  const record = {...createLab(), tune: {[CAR]: {pressure: -2, wing: 1, brakes: 0, springs: 2, fuel: 1}}, stockLaps: {[`${CAR}|tremblant-woods`]: 88.4, [`${CAR}|tremblant-woods|tyre-slip`]: 91.2}, tunedBonus: ['tremblant-woods']};
  same(normalizeLab(JSON.parse(JSON.stringify(record))), record, 'a tune and stock laps come back exactly through a save and a load');
  const old = normalizeLab({version: 1, done: {grip: true}});
  same([old.tune, old.stockLaps, old.tunedBonus], [{}, {}, []], 'an old Lab without them reads as no tune and no stock laps');
  // A newer game's Lab is never written over.
  const later = {version: 2, tune: {[CAR]: {pressure: 1}}};
  ok(normalizeLab(later) === later, 'a later game\'s Lab is returned as it was');
  const wrote = setTune({...createProfile(), lab: later}, CAR, 'pressure', 1, {flags: TUNING});
  ok(!wrote.ok && wrote.profile.lab === later, 'and every write over it is refused');
  // Writing the tune needs the lesson, the Lab and the switch.
  let open = {...createProfile(), drivingLessons: {version: 1, done: {corner: true}, best: {corner: .4}, rewarded: {corner: true}}};
  ok(!setTune(open, CAR, 'pressure', 1, {flags: TUNING}).ok, 'a setting needs its wind-tunnel lesson');
  open = passLesson(open, 'grip', {flags: TUNING}).profile;
  const set = setTune(open, CAR, 'pressure', -2, {flags: TUNING});
  ok(set.ok && labOf(set.profile).tune[CAR].pressure === -2, 'with the lesson passed the step is saved');
  ok(!setTune(open, CAR, 'pressure', -2, {flags: flagsOf('lab')}).ok, 'and not with tuning off');
  void withLab;
}

console.log(`Lab tuning: ${checks} checks passed.`);
