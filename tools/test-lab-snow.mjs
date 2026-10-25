import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {SKI, SKI_STEP, createSkier, stepSkier, airDensity} from '../src/ski/ski-physics.js';
import {guideRun} from '../src/ski/ski-guide.js';
import {skiZone, zoneGuide} from '../src/ski/runs/summit-zones.js';
import {medalTimes, SCORE, createJudgedRun, stepJudgedRun, finishJudgedRun} from '../src/ski/ski-score.js';
import {launchBench, rangeOf, bestAngle, TARGET, aerialsTips} from '../src/lab/benches/launch.js';
import {waxBench, SNOWS, WAXES, SNOW_DAYS, glideSeconds, snowOfDay, waxSetting, waxRunResult, waxRunSilverS, waxRunFacts} from '../src/lab/benches/wax.js';
import {LAB_UPGRADES, buyUpgrade, aerialsOpen, waxKitOwned, skiWaxFor} from '../src/lab/lab-shop.js';
import {passLesson, labOf} from '../src/lab/lab-save.js';
import {HELI_LESSONS} from '../src/heli/heli-save.js';
import {createProfile} from '../src/progression.js';

// docs/LAB.md 4.3: the Snow lessons on the ski rules (docs/HELI_SKIING.md section 4). The benches are checked against the
// real skier (src/ski/ski-physics.js), not against themselves.
const flagsOf = (...names) => ({enabled: name => names.includes(name)});
const WITH_SKIING = flagsOf('lab', 'helicopter', 'heli-skiing');
const OFF = flagsOf();
const HELI_DONE = {version: 1, fuelKg: 0, lessons: Object.fromEntries(HELI_LESSONS.map(id => [id, true]))};
const rich = (extra = {}) => ({...createProfile(), credits: 5000, heli: HELI_DONE, ...extra});
const passed = (profile, id) => { const out = passLesson(profile, id, {flags: WITH_SKIING}); assert.equal(out.ok, true, out.reason); return out.profile; };
const near = (actual, expected, tolerance, message) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} against ${expected} (+/- ${tolerance})`);

// ---- the launcher against the real skier in the air ------------------------------------------------------------
// A skier let go in the air at a speed and angle over flat snow (or snow 10 m lower), flown by the ski rules' own stepSkier.
function skiFlight(angleDeg, speedMs, lower) {
  const drop = lower ? 10 : 0, world = {ground: () => 0}, a = angleDeg * Math.PI / 180;
  const skier = createSkier({x: 0, z: 0, world});
  Object.assign(skier, {grounded: false, y: drop, vx: 0, vy: speedMs * Math.sin(a), vz: speedMs * Math.cos(a),
    air: {startX: 0, startZ: 0, time: 0, peak: 0, spin: 0, flip: 0, spinMax: 0, flipMax: 0}});
  skier.speed = speedMs;
  for (let step = 0; step < 120 * 60; step++) {
    const land = stepSkier(skier, {}, world).find(event => event.type === 'skiLand');
    if (land) return land.distance;
  }
  throw new Error('the skier never landed');
}

test('launch: the bench\'s range with air matches the ski rules\' own flight, level and 10 m lower', () => {
  // The skier lands on the first fixed step below the snow, and the bench places the landing between steps; the skier's
  // flight also steps by the mean of the old and new speed. So they agree to within two steps of travel.
  for (const lower of [false, true]) for (const [angle, speed] of [[15, 12], [30, 20], [45, 30], [60, 25], [75, 40], [45, 17]]) {
    const bench = rangeOf(angle, speed, {air: true, lower}).rangeM, real = skiFlight(angle, speed, lower);
    near(bench, real, speed * Math.cos(angle * Math.PI / 180) * SKI_STEP * 2 + 0.02, `${angle} degrees at ${speed} m/s ${lower ? 'landing lower' : 'level'}`);
  }
  // The bench uses the sea level air and the skier the air at its own height: the same to a tenth of a percent here.
  assert.ok(Math.abs(airDensity(10) / airDensity(0) - 1) < 0.002);
});

test('launch: with no air 45 degrees goes furthest on the flat; air, or a landing lower down, both bring the best angle below 45', () => {
  for (const speed of [10, 20, 30, 40]) {
    near(bestAngle(speed, {}), 45, 0.11, `${speed} m/s, no air, level: the textbook angle`);
    assert.ok(bestAngle(speed, {air: true}) < 45, `${speed} m/s: air pulls the best angle below 45`);
    assert.ok(bestAngle(speed, {lower: true}) < 45, `${speed} m/s: a landing 10 m lower pulls it below 45`);
    assert.ok(bestAngle(speed, {air: true, lower: true}) < bestAngle(speed, {lower: true}), `${speed} m/s: both pull it lower still`);
  }
  // The real skier agrees: with its own air the longest flight of a 30 m/s launch is below 45 degrees.
  let best = 15;
  for (let angle = 15; angle <= 75; angle++) if (skiFlight(angle, 30, false) > skiFlight(best, 30, false)) best = angle;
  assert.ok(best < 45 && best > 35, `the real skier's best angle at 30 m/s is ${best}`);
  // And over the textbook range: the bench's facts quote these.
  const facts = launchBench.facts();
  near(facts.flatNoAir, 45, 0.11, 'facts: flat, no air'); assert.ok(facts.withAir < 45 && facts.lowerNoAir < 45 && facts.lowerWithAir < facts.withAir);
});

test('launch: the target is one launch within 2 m of the mark, and the splash is the landing sound', () => {
  assert.deepEqual({...TARGET}, {rangeM: 30, withinM: 2});
  const history = settings => [{settings, result: launchBench.run(settings)}];
  assert.equal(launchBench.goalMet(history({angleDeg: 45, speedMs: 17})), true, '17 m/s at 45 degrees lands within 2 m of 30 m');
  assert.equal(launchBench.goalMet(history({angleDeg: 45, speedMs: 20})), false, 'a long launch is not a hit');
  assert.equal(launchBench.goalMet(history({angleDeg: 30, speedMs: 12})), false, 'a short one is not');
  assert.equal(launchBench.goalMet([]), false, 'no launch, no pass');
  assert.deepEqual([...launchBench.cues], ['lab.splash']);
});

// ---- the wax against the real skier and the real slalom ---------------------------------------------------------
// From rest on a steady slope, before the air matters, the real skier speeds up at g (sin slope - friction x cos slope).
function pickedUpSpeed(wax) {
  const slope = 10 * Math.PI / 180, world = {ground: (x, z) => -Math.tan(slope) * z}, skier = createSkier({x: 0, z: 0, heading: 0, world, wax});
  for (let step = 0; step < 60; step++) stepSkier(skier, {}, world);
  return skier.speed;
}
test('wax: the real skier\'s pull-away matches the bench\'s friction numbers, and the right wax is faster for each snow', () => {
  const slope = 10 * Math.PI / 180, seconds = 60 * SKI_STEP;
  for (const [wax, friction] of [['right', SKI.wax.right], ['wrong', SKI.wax.wrong], [null, SKI.snowFriction]]) {
    const expected = 9.81 * (Math.sin(slope) - friction * Math.cos(slope)) * seconds;
    near(pickedUpSpeed(wax), expected, expected * 0.01, `friction ${friction}`);
  }
  assert.ok(pickedUpSpeed('right') > pickedUpSpeed(null) && pickedUpSpeed(null) > pickedUpSpeed('wrong'));
  for (const snow of Object.keys(SNOWS)) {
    const right = waxBench.run({snow, wax: SNOWS[snow].wax}), wrong = waxBench.run({snow, wax: WAXES.find(wax => wax !== SNOWS[snow].wax)});
    assert.equal(right.friction, SKI.wax.right); assert.equal(wrong.friction, SKI.wax.wrong);
    assert.equal(right.glideS, glideSeconds(SKI.wax.right));
    assert.ok(right.glideS < wrong.glideS, `${snow}: the right wax glides faster`);
  }
});

test('wax: on the slalom the right wax is faster than no wax, which is faster than the wrong wax', () => {
  const facts = waxRunFacts(), zone = skiZone('slalom');
  const run = wax => guideRun({line: zone.line, world: zone, wax, ...(zone.guide ? {lookAhead: zone.guide} : {})}).bestTime;
  assert.equal(facts.seconds.right, run('right')); assert.equal(facts.seconds.none, run(null)); assert.equal(facts.seconds.wrong, run('wrong'));
  assert.ok(facts.seconds.right < facts.seconds.none && facts.seconds.none < facts.seconds.wrong);
  // The silver time is the game's own medal time from the guide's run, which skis with no wax.
  assert.equal(waxRunSilverS(), medalTimes(zoneGuide('slalom').time).silver);
});

// ---- the day's snow ---------------------------------------------------------------------------------------------
test('the day\'s snow: the same day gives the same snow, every sample turns up, and the temperature lies in its band', () => {
  const days = Array.from({length: 90}, (_, index) => `2026-${String(1 + Math.floor(index / 30)).padStart(2, '0')}-${String(1 + index % 30).padStart(2, '0')}`);
  const seen = new Set();
  for (const day of days) {
    const snow = snowOfDay(day);
    assert.deepEqual(snow, snowOfDay(day), 'repeatable');
    seen.add(snow.snow);
    const band = SNOW_DAYS[snow.snow];
    assert.ok(snow.celsius >= band.low && snow.celsius <= band.high, `${day}: ${snow.celsius} C is in the ${snow.snow} band`);
    assert.equal(snow.wax, SNOWS[snow.snow].wax);
  }
  assert.deepEqual([...seen].sort(), Object.keys(SNOWS).sort(), 'all three snows turn up over three months');
  // The sample's own temperature is inside its band, and the bands are apart, colder first: a temperature belongs to one snow.
  for (const [id, sample] of Object.entries(SNOWS)) assert.ok(sample.celsius >= SNOW_DAYS[id].low && sample.celsius <= SNOW_DAYS[id].high, `${id}: ${sample.celsius} C`);
  assert.ok(SNOW_DAYS.powder.high < SNOW_DAYS.cold.low && SNOW_DAYS.cold.high < SNOW_DAYS.wet.low, 'the bands do not overlap');
  for (const junk of [undefined, null, NaN, {}, [], Infinity]) assert.deepEqual(snowOfDay(junk), snowOfDay(undefined), 'junk is one lawful day');
  assert.deepEqual(snowOfDay(7), snowOfDay('7'), 'a day number or its text is the same day');
  assert.ok(Object.is(snowOfDay('2026-10-20').celsius, snowOfDay('2026-10-20').celsius) && !Object.is(snowOfDay('x').celsius, -0));
});

// ---- the Wax kit, the wax run and the Aerials reward ------------------------------------------------------------
test('the Wax kit: with it, a pick is judged against the day\'s snow; without it, or with the Lab off, nothing changes', () => {
  const waxed = passed(rich(), 'wax'), kit = buyUpgrade(waxed, 'wax-kit', {flags: WITH_SKIING});
  assert.equal(kit.ok, true); assert.equal(kit.price, 400); assert.equal(kit.profile.credits, waxed.credits - 400);
  const day = '2026-10-20', right = snowOfDay(day).wax, wrong = WAXES.find(wax => wax !== right);
  assert.equal(skiWaxFor(kit.profile, WITH_SKIING, day, right), 'right');
  assert.equal(skiWaxFor(kit.profile, WITH_SKIING, day, wrong), 'wrong');
  assert.equal(skiWaxFor(kit.profile, WITH_SKIING, day, undefined), null, 'no pick: the plain snow');
  assert.equal(skiWaxFor(kit.profile, WITH_SKIING, day, 'banana'), null, 'junk is no pick');
  assert.equal(skiWaxFor(waxed, WITH_SKIING, day, right), null, 'passed but not bought: no pick');
  assert.equal(skiWaxFor(kit.profile, OFF, day, right), null, 'Lab off: no pick');
  assert.equal(skiWaxFor(rich(), WITH_SKIING, day, right), null, 'nothing done: no pick');
  assert.equal(waxKitOwned(kit.profile, WITH_SKIING), true); assert.equal(waxKitOwned(kit.profile, OFF), false);
  assert.equal(waxSetting(right, day), 'right');
  // It cannot be bought before the lesson is passed.
  assert.equal(buyUpgrade(rich(), 'wax-kit', {flags: WITH_SKIING}).ok, false);
  // No pick is today's slalom, exactly: the guide, who skis with no wax, sets the same time.
  const zone = skiZone('slalom');
  const plain = guideRun({line: zone.line, world: zone, wax: skiWaxFor(rich(), OFF, day, right), ...(zone.guide ? {lookAhead: zone.guide} : {})});
  assert.equal(plain.time, zoneGuide('slalom').time);
});

test('the wax run: the right wax for the day\'s snow and a finished run pass; the wrong wax, no wax or an unfinished run do not', () => {
  const day = '2026-10-20', today = snowOfDay(day), silver = waxRunSilverS(), wrong = WAXES.find(wax => wax !== today.wax);
  assert.equal(waxRunResult({day, pick: today.wax, time: silver}).pass, true, 'exactly silver is enough');
  assert.equal(waxRunResult({day, pick: today.wax, time: silver + 100}).pass, true, 'missed-gate time does not fail a correct-wax finish');
  const unsuited = waxRunResult({day, pick: wrong, time: 20});
  assert.equal(unsuited.pass, false); assert.match(unsuited.reason, /does not suit dry powder/i);
  assert.equal(waxRunResult({day, pick: undefined, time: 20}).pass, false);
  assert.equal(waxRunResult({day, pick: today.wax, time: NaN}).pass, false);
  assert.equal(waxRunResult({day, pick: today.wax, time: Infinity}).pass, false);
  assert.equal(waxRunResult({day, pick: today.wax, time: 0}).pass, false);
  // Can it be won? A guide-pace run on the day's right wax is well inside silver, on a day of each snow.
  const zone = skiZone('slalom'), time = guideRun({line: zone.line, world: zone, wax: 'right', ...(zone.guide ? {lookAhead: zone.guide} : {})}).time;
  assert.ok(time <= silver, `a guide-pace run (${time.toFixed(1)} s) beats silver (${silver.toFixed(1)} s)`);
  const seen = new Set();
  for (let index = 0; index < 60; index++) {
    const date = `2026-11-${index}`, snow = snowOfDay(date);
    seen.add(snow.snow);
    assert.equal(waxRunResult({day: date, pick: snow.wax, time}).pass, true, `${snow.snow}: the day's right wax and a guide-pace run pass`);
    assert.equal(waxRunResult({day: date, pick: WAXES.find(wax => wax !== snow.wax), time}).pass, false, `${snow.snow}: another wax does not`);
  }
  assert.equal(seen.size, 3, 'on days of all three snows');
  assert.doesNotThrow(() => waxRunResult(), 'no argument is a run that did not finish');
  // Passing the lesson is saved through the Lab's own call, and opens the kit to buy.
  const profile = passed(rich(), 'wax');
  assert.equal(labOf(profile).done.wax, true);
  assert.equal(LAB_UPGRADES.find(row => row.id === 'wax-kit').lesson, 'wax');
});

test('the Aerials reward: free with Launch angles; with the Lab on the run waits for it, with the Lab off it is offered as it is', () => {
  const fresh = rich(), launched = passed(rich(), 'launch');
  assert.equal(aerialsOpen(fresh, OFF), true, 'Lab off: the run is offered like the others');
  assert.equal(aerialsOpen(fresh, WITH_SKIING), false, 'Lab on, lesson not passed');
  assert.equal(aerialsOpen(launched, WITH_SKIING), true, 'Lab on, lesson passed');
  assert.equal(launched.credits, fresh.credits, 'and it cost nothing');
  assert.equal(labOf(launched).owned.aerials, true);
});

// A skier let go in the air at a given path (over flat snow), with the landing the rules report.
function landingOf(vx, vy, {spin = 0} = {}) {
  const world = {ground: () => 0, safePathAngle: 40}, skier = createSkier({x: 0, z: 0, world});
  Object.assign(skier, {grounded: false, y: 0.2, vx: 0, vy, vz: vx, air: {startX: 0, startZ: 0, time: 0, peak: 0, spin, flip: 0, spinMax: Math.abs(spin), flipMax: 0}});
  for (let step = 0; step < 120 * 30; step++) {
    const land = stepSkier(skier, {}, world).find(event => event.type === 'skiLand');
    if (land) return land;
  }
  throw new Error('the skier never landed');
}
const aerialsScore = landing => {
  const run = createJudgedRun('aerials', {height: 6, distance: 14, rotations: 1, axis: 'spin'});
  stepJudgedRun(run, {}, [landing], 0.01);
  return finishJudgedRun(run);
};

test('the aerials tips quote the ski rules\' own numbers, and what they say about landings is what the rules do', () => {
  const lines = aerialsTips(), tips = lines.join('\n'), zone = skiZone('aerials');
  assert.equal(lines.length, 6);
  for (const [name, share] of [['air', SCORE.aerials.air], ['form', SCORE.aerials.form], ['landing', SCORE.aerials.landing]])
    assert.ok(tips.includes(`${Math.round(share * 100)}% for ${name === 'air' ? 'the air' : name === 'form' ? 'form' : 'the landing'}`), `the ${name} share`);
  assert.ok(tips.includes(`against ${zone.scoring.height} m`) && tips.includes(`against ${zone.scoring.distance} m`), 'the height and distance targets');
  assert.ok(tips.includes(`no more than ${zone.safePathAngle} degrees`), 'the landing hill\'s window');
  assert.ok(tips.includes(`within ${Math.round(SKI.safeRotation * 180 / Math.PI)} degrees of a whole turn`), 'the finish of a spin or flip');
  assert.ok(!/flat|crooked/.test(tips), 'a flat landing is the safe one, so the tips never call it a fault');
  assert.equal(zone.safePathAngle, 40);
  // Safe or tumble is the angle between the path and the snow (not how flat it is), and a finished rotation.
  const shallow = landingOf(10, -3), steep = landingOf(10, -12), spinning = landingOf(10, -3, {spin: Math.PI});
  assert.ok(shallow.angle < 40 && shallow.safe, `a shallow landing (${shallow.angle.toFixed(0)} degrees) is safe`);
  assert.ok(steep.angle > 40 && !steep.safe, `a steep one (${steep.angle.toFixed(0)} degrees) tumbles`);
  assert.equal(spinning.safe, false, 'half a turn left over tumbles');
  // Air adds up height and distance; form is proportional; the landing is softened by steepness; a tumble scores 0 for landing.
  const base = {type: 'skiLand', safe: true, angle: 0, height: 0, distance: 0, spin: 360, flip: 0, spinMax: 360, flipMax: 0};
  near(aerialsScore({...base, height: 6, distance: 14}).air, 100, 1e-9, 'both targets: full marks');
  near(aerialsScore({...base, height: 12, distance: 0}).air, 100, 1e-9, 'one target doubled does the same: they add up');
  near(aerialsScore({...base, height: 6, distance: 0}).air, 50, 1e-9, 'half each');
  near(aerialsScore(base).form, 100, 1e-9, 'a whole turn and a steady flip: full form');
  near(aerialsScore({...base, spin: 180}).form, 25 + 50, 1e-9, 'half a turn earns half of the done part');
  near(aerialsScore({...base, flip: 90}).form, 50, 1e-9, 'a flip of 90 degrees earns none of the steady part');
  near(aerialsScore({...base, angle: 20}).landing, 60, 1e-9, '60 of 100 at 20 degrees');
  near(aerialsScore({...base, angle: 35}).landing, 60, 1e-9, 'and no worse above that');
  near(aerialsScore({...base, angle: 0}).landing, 100, 1e-9, 'up to 100 for a gentle one');
  assert.equal(aerialsScore({...base, safe: false}).landing, 0, 'a tumble scores nothing for landing');
  assert.ok(tips.includes(`${Math.round((1 - SCORE.softLanding) * 100)} of 100 at 20 degrees or steeper`));
  assert.deepEqual(aerialsTips(), aerialsTips(), 'repeatable');
});

test('the launch tip is true past the best angle on the bench: steeper means higher and shorter', () => {
  const best = bestAngle(30, {air: true});
  const heightOf = angle => Math.pow(30 * Math.sin(angle * Math.PI / 180), 2) / (2 * 9.81);
  for (const angle of [Math.ceil(best) + 5, Math.ceil(best) + 15]) {
    assert.ok(rangeOf(angle, 30, {air: true}).rangeM < rangeOf(angle - 5, 30, {air: true}).rangeM, `${angle} degrees goes shorter than ${angle - 5}`);
    assert.ok(heightOf(angle) > heightOf(angle - 5), `and higher`);
  }
  assert.ok(aerialsTips()[5].includes(`about ${Math.round(best)} degrees`));
});

test('docs/LAB.md says what the numbers show', () => {
  const text = readFileSync(fileURLToPath(new URL('../docs/LAB.md', import.meta.url)), 'utf8');
  const facts = waxRunFacts();
  const line = text.split('\n').find(row => row.startsWith('| **Ski wax**'));
  assert.ok(line, 'the Ski wax row is in the doc');
  assert.ok(line.includes(`glides about ${Math.round(facts.rightVsWrongPercent)}% faster than the wrong one on a slalom run`), line);
  assert.ok(line.includes(`about ${Math.round(facts.rightVsNonePercent)}% faster than no wax`), line);
  assert.equal(Math.round(facts.rightVsWrongPercent), 3); assert.equal(Math.round(facts.rightVsNonePercent), 1);
  const launch = text.split('\n').find(row => row.startsWith('| **Launch angles**'));
  assert.ok(launch.includes('45 degrees goes furthest') && launch.includes('Aerials'), launch);
});
