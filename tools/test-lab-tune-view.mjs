// LAB-TUNE-VIEW: the Tune page's rows and buttons, the tuned-lap result line, the pit board's fuel words and the five
// wind-tunnel lessons turning on. Rules that run without a browser (the screens are tools/scenarios/lab-tune-view.mjs).
import assert from 'node:assert/strict';
import test from 'node:test';
import {createProfile} from '../src/progression.js';
import {passLesson, setTune, labOf, stockKey} from '../src/lab/lab-save.js';
import {TUNNEL_LESSONS, TUNE_SETTING_OF} from '../src/lab/lab-lessons.js';
import {challengeState, challengeKindOf, openBench, setControl, runBench, goalMet, CHALLENGE_KIND} from '../src/lab/lab-model.js';
import {tuneRows, tunePanel, usableTune, resetTuneIn, stepIn, tunedLapLines, fuelBoardText, effectLine, TUNE_ROWS} from '../src/lab/tune-view.js';
import {pitView, PIT} from '../src/pit-lane.js';
import {App} from '../src/app.js';

const flagsOf = (...names) => ({enabled: name => names.includes(name)});
const TUNING = flagsOf('lab', 'lab-tuning'), LAB_ONLY = flagsOf('lab'), OFF = flagsOf();
const CAR = createProfile().unlockedCars[0];
const driven = () => ({...createProfile(), credits: 5000, drivingLessons: {version: 1, done: {corner: true}, best: {corner: .4}, rewarded: {corner: true}}});
const withDone = (profile, ...ids) => ids.reduce((p, id) => {
  const next = passLesson(p, id, {flags: LAB_ONLY});
  assert.equal(next.ok, true, `${id}: ${next.reason}`);
  return next.profile;
}, profile);
const withLab = (profile, extra) => ({...profile, lab: {...labOf(profile), ...extra}});
const time = seconds => `T${seconds.toFixed(2)}`;

test('the page has five rows, the two ends named, and nothing while a switch is off', () => {
  const profile = withDone(driven(), 'grip', 'downforce');
  assert.deepEqual(tuneRows(profile, CAR, OFF), []);
  assert.deepEqual(tuneRows(profile, CAR, LAB_ONLY), [], 'the Lab alone does not show the page');
  assert.deepEqual(tuneRows(profile, 'no-such-car', TUNING), []);
  const rows = tuneRows(profile, CAR, TUNING);
  assert.deepEqual(rows.map(row => row.setting), ['pressure', 'wing', 'brakes', 'springs', 'fuel']);
  assert.deepEqual(rows.map(row => row.open), [true, true, false, false, false], 'a setting is open when its lesson is passed');
  assert.match(rows.find(row => row.setting === 'brakes').note, /Braking/);
  const wing = TUNE_ROWS.find(row => row.setting === 'wing');
  assert.deepEqual([wing.low, wing.high], ['Less wing', 'More wing']);
  assert.deepEqual(TUNE_ROWS.find(row => row.setting === 'fuel').steps, [0, 1, 2], 'a tank has no step below a full one');
  for (const row of TUNE_ROWS) assert.ok(row.trade.length > 40, `${row.setting} says its trade`);
});

test('the page markup: pressed step, locked rows disabled, no page for a stock tune with everything shut', () => {
  const profile = withLab(withDone(driven(), 'downforce'), {tune: {[CAR]: {pressure: 0, wing: 2, brakes: 0, springs: 0, fuel: 0}}});
  const html = tunePanel({rows: tuneRows(profile, CAR, TUNING), carName: 'Test'});
  assert.ok(html.includes('data-tune="wing:2"') && html.includes('aria-pressed="true"'));
  assert.ok(/data-tune="wing:2" aria-pressed="true"/.test(html.replace(/<button type="button" class="tune-step on" /,'')), 'the saved step is pressed');
  assert.ok(/data-tune="brakes:1"[^>]*disabled/.test(html), 'a shut setting is disabled');
  assert.ok(!/data-tune="wing:1"[^>]*disabled/.test(html), 'an open one is not');
  assert.ok(html.includes('Less wing') && html.includes('More wing') && html.includes('RESET ALL TO 0') && html.includes('TUNED'));
  assert.equal(tunePanel({rows: []}), '');
  assert.ok(tunePanel({rows: tuneRows(driven(), CAR, TUNING)}).includes('STANDARD'));
  assert.ok(!html.includes('NaN') && !html.includes('undefined'));
});

test('a step is saved through the Lab and refused when out of range, shut or with the switch off', () => {
  const profile = withDone(driven(), 'downforce');
  const ok = stepIn(profile, CAR, 'wing', -2, TUNING);
  assert.equal(ok.ok, true);
  assert.equal(ok.profile.lab.tune[CAR].wing, -2);
  for (const bad of [3, -3, 1.5, NaN, '1', null, undefined, Infinity]) assert.equal(stepIn(profile, CAR, 'wing', bad, TUNING).ok, false, `step ${bad}`);
  assert.equal(stepIn(profile, CAR, 'brakes', 1, TUNING).ok, false, 'Braking has not been passed');
  assert.equal(stepIn(profile, CAR, 'wing', 1, LAB_ONLY).ok, false, 'tuning switch off');
  assert.equal(stepIn(profile, CAR, 'wing', 1, OFF).ok, false);
  assert.equal(stepIn(profile, CAR, 'wing__proto__', 1, TUNING).ok, false);
  assert.equal(stepIn(profile, '__proto__', 'wing', 1, TUNING).ok, false);
  assert.equal(stepIn(profile, 'no-such-car', 'wing', 1, TUNING).ok, false);
  assert.equal(profile.lab?.tune?.[CAR]?.wing ?? 0, 0, 'the profile that went in is unchanged');
});

test('Reset puts every setting at 0, also a forged value on a shut setting, and needs the switches', () => {
  const forged = withLab(driven(), {tune: {[CAR]: {pressure: 2, wing: -2, brakes: 1, springs: -1, fuel: 2}}});
  const reset = resetTuneIn(forged, CAR, TUNING);
  assert.equal(reset.ok, true);
  assert.deepEqual(reset.profile.lab.tune[CAR], {pressure: 0, wing: 0, brakes: 0, springs: 0, fuel: 0});
  assert.equal(resetTuneIn(forged, CAR, LAB_ONLY).ok, false);
  assert.equal(resetTuneIn(forged, CAR, OFF).ok, false);
  assert.equal(resetTuneIn(forged, 'no-such-car', TUNING).ok, false);
  assert.equal(resetTuneIn({...forged, lab: {version: 2, anything: true}}, CAR, TUNING).ok, false, 'a later game\'s Lab is not written over');
  assert.deepEqual(resetTuneIn({...forged, lab: {version: 2, anything: true}}, CAR, TUNING).profile.lab, {version: 2, anything: true});
});

test('a race uses only settings the Lab has opened; forged, out-of-range and old saves read as no tune', () => {
  const tune = {pressure: 2, wing: 2, brakes: 2, springs: 2, fuel: 2};
  const forged = withLab(driven(), {tune: {[CAR]: tune}});
  assert.deepEqual(usableTune(forged, CAR), {pressure: 0, wing: 0, brakes: 0, springs: 0, fuel: 0}, 'nothing is open');
  const some = withDone(forged, 'downforce', 'fuel');
  assert.deepEqual(usableTune(some, CAR), {pressure: 0, wing: 2, brakes: 0, springs: 0, fuel: 2});
  const wild = withLab(withDone(driven(), 'grip', 'downforce'), {tune: {[CAR]: {pressure: 99, wing: 1.5, brakes: '2', springs: NaN, fuel: -2}}});
  assert.deepEqual(usableTune(wild, CAR), {pressure: 0, wing: 0, brakes: 0, springs: 0, fuel: 0}, 'out-of-range values read as 0');
  assert.equal(usableTune(driven(), CAR), undefined, 'an old save without a tune');
  assert.equal(usableTune({...driven(), lab: {version: 7, tune: {[CAR]: tune}}}, CAR), undefined, 'a later game\'s Lab');
  assert.equal(usableTune(forged, 'no-such-car'), undefined);
  assert.equal(usableTune(forged, '__proto__'), undefined);
  assert.equal(usableTune(null, CAR), undefined);
});

test('the app hands a race the usable tune only, and only with both switches on', () => {
  const app = new App();
  const profile = withLab(withDone({...app.profile, ...driven(), unlockedCars: app.profile.unlockedCars}, 'downforce'), {tune: {[CAR]: {pressure: 2, wing: 2, brakes: 0, springs: 0, fuel: 0}}});
  app.profile = profile;
  app._switches = () => TUNING;
  assert.deepEqual(app._labTuneOf(CAR), {pressure: 0, wing: 2, brakes: 0, springs: 0, fuel: 0}, 'pressure is shut: it is not used');
  app._switches = () => LAB_ONLY;
  assert.equal(app._labTuneOf(CAR), undefined);
  app._switches = () => OFF;
  assert.equal(app._labTuneOf(CAR), undefined);
});

test('step effects quote the table, and a step of 0 is the standard car', () => {
  assert.equal(effectLine('wing', 0), 'Standard: the car as it is.');
  assert.match(effectLine('wing', 2), /Grip at 100 mph \+6%.*top speed -2%/);
  assert.match(effectLine('pressure', -2), /Grip \+2%.*top speed -1%/);
  assert.match(effectLine('brakes', 1), /Braking \+1%.*-2%/);
  assert.match(effectLine('springs', -1), /off-road grip \+2%.*bumps \+8%/);
  assert.match(effectLine('fuel', 2), /Half tank.*3%.*55%/);
  assert.equal(effectLine('nonsense', 1), '');
});

// ---- the result line ----
const COURSE_ID = 'tremblant-woods';
const finished = (over = {}) => ({mode: 'timetrial', car: CAR, lapTimes: [60, 58, 59], assistedLaps: [], ...over});
const lines = ({state, result, stock, bonusPaid = false, flags = TUNING, open = ['downforce']}) => {
  let profile = withDone(driven(), ...open);
  if (stock !== undefined) profile = withLab(profile, {stockLaps: {[stockKey(CAR, COURSE_ID, '')]: stock}, tunedBonus: bonusPaid ? [COURSE_ID] : []});
  return tunedLapLines({profile, flags, state, result: {completed: true, ...result}, courseId: COURSE_ID, time});
};

test('a tuned lap says how it did against the stock lap, the bonus, and that it is not on the leaderboard', () => {
  const tuned = {wing: 2, pressure: 0, brakes: 0, springs: 0, fuel: 0};
  // 58 against 59: 1.7% faster, bonus paid now.
  assert.deepEqual(lines({state: finished({tune: tuned}), result: {tunedLap: {percent: 1.7, bonus: 400}}, stock: 59}),
    ['Tuned lap: 1.7% faster than your stock lap. Bonus 400.', 'Tuned laps are not on the leaderboard.']);
  // Already paid.
  const paid = lines({state: finished({tune: tuned}), result: {tunedLap: {percent: 1.7, bonus: 0}}, stock: 59, bonusPaid: true});
  assert.match(paid[0], /1\.7% faster.*already paid/);
  assert.equal(paid[1], 'Tuned laps are not on the leaderboard.');
  // Faster, but under 1%: 58 against 58.3 is 0.51%.
  const short = lines({state: finished({tune: tuned, lapTimes: [58]}), result: {tunedLap: {percent: 0.5, bonus: 0}}, stock: 58.3});
  assert.match(short[0], /0\.5% faster.*needs 1%/);
  // Slower.
  const slow = lines({state: finished({tune: tuned, lapTimes: [60]}), result: {tunedLap: {percent: 0, bonus: 0}}, stock: 58});
  assert.match(slow[0], /3\.4% slower than your stock lap \(T58\.00\)/);
  const same = lines({state: finished({tune: tuned, lapTimes: [58]}), result: {tunedLap: {percent: 0, bonus: 0}}, stock: 58});
  assert.match(same[0], /no faster than your stock lap/);
  // No stock lap yet.
  const none = lines({state: finished({tune: tuned}), result: {tunedLap: {percent: 0, bonus: 0}}});
  assert.match(none[0], /no stock lap here yet/);
  assert.ok(none[0].includes('not on the leaderboard'));
});

test('a stock run shows its stock lap only to a player with a setting open; nothing without the switches', () => {
  const stock = lines({state: finished(), result: {}, stock: 58, open: ['downforce']});
  assert.deepEqual(stock, ['Stock lap: T58.00. A tuned lap is judged against it.']);
  assert.deepEqual(lines({state: finished(), result: {}, stock: 58, open: []}), [], 'no setting open: nothing to say');
  assert.deepEqual(lines({state: finished(), result: {}, open: ['downforce']}), [], 'no stock lap kept yet');
  assert.deepEqual(lines({state: finished({tune: {wing: 1}}), result: {tunedLap: {percent: 2, bonus: 400}}, stock: 59, flags: LAB_ONLY}), []);
  assert.deepEqual(lines({state: finished({tune: {wing: 1}}), result: {tunedLap: {percent: 2, bonus: 400}}, stock: 59, flags: OFF}), []);
  assert.deepEqual(lines({state: finished({mode: 'duel'}), result: {}, stock: 58}), [], 'only a Time Trial');
  assert.deepEqual(tunedLapLines({profile: driven(), flags: TUNING, state: finished({tune: {wing: 1}}), result: {completed: false}, courseId: COURSE_ID, time}), []);
  assert.deepEqual(tunedLapLines({profile: driven(), flags: TUNING, state: null, result: null, courseId: COURSE_ID, time}), []);
  // A lap that was assisted counts for nothing: with only that lap there is nothing to quote.
  assert.deepEqual(lines({state: finished({tune: {wing: 1}, lapTimes: [57], assistedLaps: [true]}), result: {tunedLap: {percent: 3, bonus: 0}}, stock: 59}), []);
  // Rule sets keep stock laps apart: a tyre-slip run reads its own key.
  const slip = lines({state: finished({tune: {wing: 1}, tyreSlipRules: true}), result: {tunedLap: {percent: 0, bonus: 0}}, stock: 58});
  assert.match(slip[0], /no stock lap here yet/);
});

test('the pit board names the fuel only when the player carries a tank', () => {
  assert.equal(fuelBoardText(undefined), '');
  assert.equal(fuelBoardText({tankM: 0, leftM: 0, dry: false}), '');
  assert.equal(fuelBoardText({tankM: 1000, leftM: 400, dry: false}), 'FUEL 40%');
  assert.equal(fuelBoardText({tankM: 1000, leftM: -5, dry: false}), 'FUEL 0%');
  assert.equal(fuelBoardText({tankM: 1000, leftM: 5000, dry: false}), 'FUEL 100%');
  assert.equal(fuelBoardText({tankM: 1000, leftM: 0, dry: true}), 'TANK EMPTY');
  const duel = fuel => ({course: {pitLane: {}}, state: {status: 'racing', tyre: 'summer', pit: {phase: 'servicing', elapsed: 1, service: PIT.serviceSec + 5, fit: 'winter'}, ...(fuel ? {fuel} : {})}});
  assert.equal(pitView(duel()).text, 'FITTING WINTER TYRES · 8.0 S');
  assert.equal(pitView(duel({tankM: 100, leftM: 0, dry: true})).text, 'FITTING WINTER TYRES AND FUEL · 8.0 S');
});

test('the five wind-tunnel lessons pass on their benches with tuning on, and read "Opens with tuning" with it off', () => {
  const profile = driven();
  for (const id of TUNNEL_LESSONS) {
    assert.equal(CHALLENGE_KIND[id], 'tuning');
    assert.equal(challengeKindOf(id, TUNING), 'bench');
    assert.equal(challengeKindOf(id, LAB_ONLY), 'tuning');
    assert.equal(challengeKindOf('strength', LAB_ONLY), 'bench');
    const off = challengeState(id, {profile, flags: LAB_ONLY, met: true});
    assert.equal(off.label, 'Opens with tuning');
    assert.equal(off.state, 'waiting');
    assert.equal(challengeState(id, {profile, flags: TUNING, met: false}).state, 'waiting');
    const ready = challengeState(id, {profile, flags: TUNING, met: true});
    assert.equal(ready.state, 'ready');
    assert.equal(ready.kind, 'bench');
    assert.equal(challengeState(id, {profile: createProfile(), flags: TUNING, met: true}).state, 'locked', 'wind tunnel opens after driving lesson 1');
  }
});

test('meeting a bench goal passes its lesson and opens exactly that setting on the page', () => {
  const dials = {
    grip: [{slideDeg: 3}, {slideDeg: 8}],
    downforce: [{speedMph: 50, wing: 'big'}, {speedMph: 100, wing: 'big'}],
    braking: [{speedMph: 50}, {speedMph: 100}],
    suspension: [{spring: 'soft', road: 'smooth'}, {spring: 'soft', road: 'bumpy'}, {spring: 'stiff', road: 'smooth'}, {spring: 'stiff', road: 'bumpy'}],
    fuel: [{litres: 70}, {litres: 20}],
  };
  let profile = driven();
  for (const id of TUNNEL_LESSONS) {
    let bench = openBench(id);
    for (const dial of dials[id]) {
      for (const [control, value] of Object.entries(dial)) bench = setControl(bench, control, value);
      bench = runBench(bench);
    }
    assert.equal(goalMet(bench), true, `${id}: its goal is met by the dials above`);
    const passed = passLesson(profile, id, {flags: TUNING});
    assert.equal(passed.ok, true, passed.reason);
    profile = passed.profile;
    const setting = TUNE_SETTING_OF[id];
    const open = tuneRows(profile, CAR, TUNING).filter(row => row.open).map(row => row.setting);
    assert.ok(open.includes(setting), `${setting} is open after ${id}`);
    assert.equal(stepIn(profile, CAR, setting, setting === 'fuel' ? 2 : -1, TUNING).ok, true);
  }
  assert.deepEqual(tuneRows(profile, CAR, TUNING).map(row => row.open), [true, true, true, true, true]);
});
