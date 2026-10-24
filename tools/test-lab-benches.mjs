import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {CARS, DRIVE, tyreSlipAngle, tyreSlipGrip} from '../src/config.js';
import {GRAVITY, HELI_STEP, KESTREL, createHeliState, heliMass, availableThrust, airFactor} from '../src/heli/heli-flight.js';
import {BUCKET, DROP_AIM_RINGS, aimPoint} from '../src/heli/heli-bucket.js';
import {FIRE, cellId, spreadStep} from '../src/heli/heli-fire.js';
import {bearing, HELI_DESTINATIONS, SUMMIT_RUN} from '../src/heli/heli-jobs.js';
import {SKI} from '../src/ski/ski-physics.js';
import {readSettings} from '../src/lab/benches/bench-core.js';
import {liftBench} from '../src/lab/benches/lift.js';
import {projectileBench, TARGET as DROP_TARGET, waterDrop, stoneFallAfter} from '../src/lab/benches/projectile.js';
import {fireBench, practiceFire} from '../src/lab/benches/fire.js';
import {pendulumBench, stringPeriod, cablePeriod} from '../src/lab/benches/pendulum.js';
import {altitudeBench, SITES, trueAirShare} from '../src/lab/benches/altitude.js';
import {strengthBench, MATERIALS, ARM, hookArm, lightestArm, loadBar} from '../src/lab/benches/strength.js';
import {rustBench, JARS, jarAfter} from '../src/lab/benches/rust.js';
import {gforceBench, lateralG, gameLimitG} from '../src/lab/benches/gforce.js';
import {headingsBench, leg} from '../src/lab/benches/headings.js';
import {launchBench, rangeOf, bestAngle} from '../src/lab/benches/launch.js';
import {waxBench, SNOWS, WAXES, glideSeconds} from '../src/lab/benches/wax.js';
import {TUNNEL_BENCHES, gripBench, downforceBench, brakingBench, suspensionBench, fuelBench, stopDistance, bestSlideDegrees,
  slipAtAngle, downforce, frontLoadShare, shake, zeroToSixty, PETROL_KG_PER_LITRE, FUEL_RIG} from '../src/lab/benches/tunnel.js';

// docs/LAB.md section 2, "the rule for truth": every number a bench shows is the game's own rule run on the same
// inputs, and every number in Brian's explanation (section 4) is a number the bench produces.
const near = (actual, expected, share, message) => assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * share, `${message}: ${actual} against ${expected}`);
const history = (bench, list) => list.map(settings => ({settings, result: bench.run(settings)}));
const LAB = readFileSync(new URL('../docs/LAB.md', import.meta.url), 'utf8');
const BENCHES = [liftBench, projectileBench, fireBench, pendulumBench, altitudeBench, strengthBench, rustBench, gforceBench, headingsBench,
  launchBench, waxBench, ...Object.values(TUNNEL_BENCHES)];

test('every bench has the same shape, clamps its settings and repeats exactly', () => {
  assert.equal(BENCHES.length, 16, 'twelve Lab benches plus the five wind-tunnel ones, less the one tunnel file counted once');
  assert.deepEqual(BENCHES.map(bench => bench.id), ['lift', 'projectile', 'fire', 'pendulum', 'altitude', 'strength', 'rust', 'gforce', 'headings',
    'launch', 'wax', 'grip', 'downforce', 'braking', 'suspension', 'fuel']);
  for (const bench of BENCHES) {
    assert.ok(Array.isArray(bench.controls) && bench.controls.length > 0, `${bench.id}: controls`);
    assert.equal(typeof bench.run, 'function'); assert.equal(typeof bench.goalMet, 'function'); assert.equal(typeof bench.facts, 'function');
    for (const row of bench.controls) assert.ok(row.id && row.label && (Array.isArray(row.options) ? row.options.includes(row.value) : row.min <= row.value && row.value <= row.max), `${bench.id}.${row.id}: a lawful default`);
    const first = bench.run({}), again = bench.run({});
    assert.deepEqual(first, again, `${bench.id}: one run gives one answer`);
    // Junk, out-of-range and unknown settings still give a lawful run.
    for (const junk of [undefined, null, 'x', {nonsense: 1}, Object.fromEntries(bench.controls.map(row => [row.id, NaN])),
      Object.fromEntries(bench.controls.map(row => [row.id, Array.isArray(row.options) ? '??' : row.max * 1000]))])
      assert.doesNotThrow(() => bench.run(junk), `${bench.id}: junk settings`);
    for (const row of bench.controls) {
      const read = bench.run(Object.fromEntries(bench.controls.map(c => [c.id, Array.isArray(c.options) ? c.options.at(-1) : c.max * 1000]))).settings[row.id];
      if (!Array.isArray(row.options)) assert.equal(read, row.max, `${bench.id}.${row.id}: clamped to its top`); else assert.ok(row.options.includes(read));
    }
    assert.equal(bench.goalMet([]), false, `${bench.id}: no goal before any run`);
    assert.equal(bench.goalMet(undefined), false);
    assert.ok(Array.isArray(bench.cues));
  }
  assert.deepEqual(readSettings([{id: 'a', min: 0, max: 10, step: 5, value: 5}], {a: 7.4}), {a: 5});
  const cues = new Set(BENCHES.flatMap(bench => bench.cues));
  for (const cue of ['lab.clunk', 'lab.splash', 'lab.burner', 'lab.tick', 'lab.creak', 'lab.snap', 'lab.fizz', 'lab.fan']) assert.ok(cues.has(cue), `${cue} is played by some bench`);
  assert.equal(strengthBench.run({loadKg: 2500}).cue, 'lab.snap');
  assert.equal(strengthBench.run({loadKg: 100}).cue, 'lab.creak');
  assert.equal(strengthBench.run({loadKg: 0}).cue, null);
});

test('lift: weight and most lift are the helicopter\'s own, and a too-heavy load stays on the ground', () => {
  const run = liftBench.run({fuelKg: 200, cargoKg: 1000, collective: 1});
  const state = createHeliState({fuelKg: 200});
  assert.equal(run.weightN, (heliMass(state) + 1000) * GRAVITY);
  assert.equal(run.maxLiftN, availableThrust(state, 0));
  assert.equal(run.leavesGround, true);
  const heavy = liftBench.run({fuelKg: 400, cargoKg: 3000, collective: 1});
  assert.equal(heavy.leavesGround, false);
  assert.ok(heavy.weightN > heavy.maxLiftN);
  assert.equal(liftBench.run({fuelKg: 200, cargoKg: 1000, collective: 0.5}).leavesGround, false, 'half collective is half the lift');
  assert.equal(liftBench.run({cargoKg: 1550}).overHookLimit, true, 'the hook limit is shown');
  assert.equal(liftBench.run({}).hookLimitKg, KESTREL.hookLimitKg);
  // The load a full tank can lift is where weight and lift meet.
  const edge = liftBench.facts().fullTankMaxCargoKg;
  assert.equal(liftBench.run({fuelKg: 400, cargoKg: Math.floor(edge / 50) * 50, collective: 1}).leavesGround, true);
  assert.equal(liftBench.run({fuelKg: 400, cargoKg: Math.ceil(edge / 50) * 50, collective: 1}).leavesGround, false);
  assert.equal(liftBench.goalMet(history(liftBench, [{fuelKg: 200, cargoKg: 1000, collective: 1}])), false);
  assert.equal(liftBench.goalMet(history(liftBench, [{fuelKg: 200, cargoKg: 1000, collective: 1}, {fuelKg: 400, cargoKg: 3000, collective: 1}])), true);
  assert.equal(liftBench.goalMet(history(liftBench, [{fuelKg: 400, cargoKg: 3000, collective: 0.5}])), false, 'half collective proves nothing');
});

test('projectile: the water lands where the bucket\'s own parcel model says, the stone falls 5, 20 and 45 m', () => {
  for (const [heightM, speedMs] of [[10, 0], [30, 10], [60, 30], [45, 17]]) {
    const run = projectileBench.run({heightM, speedMs});
    const direct = aimPoint({x: 0, y: heightM + BUCKET.hang, z: 0, vx: 0, vy: 0, vz: speedMs, water: 0}, {dt: HELI_STEP});
    assert.equal(run.water.distanceM, direct.z); assert.equal(run.water.seconds, direct.seconds); assert.equal(run.water.fallM, direct.fall);
    assert.equal(run.stone.distanceM, speedMs * Math.sqrt(2 * heightM / GRAVITY));
    if (speedMs > 0) assert.ok(run.water.distanceM < run.stone.distanceM, 'air slows the water more than a stone');
  }
  assert.equal(projectileBench.run({heightM: 20, speedMs: 0}).water.distanceM, 0, 'dropped with no forward speed it lands under the hand');
  const facts = projectileBench.facts();
  near(facts.stoneFallM[0], 5, 0.025, 'first second'); near(facts.stoneFallM[1], 20, 0.025, 'two seconds'); near(facts.stoneFallM[2], 45, 0.025, 'three seconds');
  assert.equal(facts.stoneFallM[1], stoneFallAfter(2));
  facts.waterFallM.forEach((fall, i) => assert.ok(fall < facts.stoneFallM[i], `water falls shorter in ${i + 1} s`));
  assert.equal(facts.waterTopSpeedMs, BUCKET.fallSpeed);
  assert.equal(DROP_TARGET.radiusM, DROP_AIM_RINGS[0]);
  // A forward speed that carries the parcel onto the target counts; the one that falls short does not.
  const hit = projectileBench.run({heightM: 60, speedMs: 30}), miss = projectileBench.run({heightM: 10, speedMs: 0});
  assert.equal(projectileBench.goalMet([{settings: {}, result: miss}]), false);
  assert.equal(projectileBench.goalMet([{settings: {}, result: miss}, {settings: {}, result: hit}]), hit.hit);
  const candidates = [];
  for (let h = 10; h <= 60; h += 10) for (let v = 0; v <= 30; v += 5) candidates.push({heightM: h, speedMs: v});
  assert.ok(candidates.some(settings => projectileBench.run(settings).hit), 'some setting reaches the target');
  assert.ok(waterDrop(30, 10).distanceM > 0);
});

test('fire: a fire needs heat, fuel and air; each way of putting it out takes one away; the strip stops the game\'s spread', () => {
  const lit = fireBench.run({});
  assert.equal(lit.burning, true); assert.deepEqual(lit.missing, []);
  for (const [name, takes] of [['water', 'heat'], ['sand', 'air'], ['cleared strip', 'fuel']]) {
    const out = fireBench.run({putOut: name});
    assert.equal(out.burning, false, name); assert.deepEqual(out.missing, [takes], `${name} takes away ${takes}`);
  }
  for (const missing of ['heat', 'fuel', 'air']) assert.equal(fireBench.run({[missing]: 'off'}).burning, false, `no ${missing}, no fire`);
  // The practice fire is the game's spreadStep on 20 m cells.
  const open = practiceFire(), cleared = practiceFire({cleared: true});
  assert.equal(open.reachedFarSide, true); assert.equal(cleared.reachedFarSide, false);
  assert.ok(cleared.burningCells < cleared.forestCells);
  const cells = new Map();
  for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) cells.set(cellId(i, j), {i, j, x: (i + 0.5) * FIRE.cell, y: 0, z: (j + 0.5) * FIRE.cell});
  let fire = {seed: 1989, steps: 0, burning: [[cellId(0, 2), FIRE.startPercent]], burnt: [], damp: []};
  for (let step = 0; step < 14; step++) fire = spreadStep(fire, {cells}, null);
  assert.equal(open.burningCells, fire.burning.length, 'the bench is the game\'s spread rule, not a copy');
  const ways = ['water', 'sand', 'cleared strip'];
  assert.equal(fireBench.goalMet(history(fireBench, ways.slice(0, 2).map(putOut => ({putOut})))), false);
  assert.equal(fireBench.goalMet(history(fireBench, ways.map(putOut => ({putOut})))), true);
});

test('pendulum: 5, 15 and 25 m strings swing in 4.5, 7.8 and 10 s whatever hangs on them; the game\'s cable agrees', () => {
  const facts = pendulumBench.facts();
  near(facts.stringPeriodsS[0], 4.5, 0.01, '5 m'); near(facts.stringPeriodsS[1], 7.8, 0.01, '15 m'); near(facts.stringPeriodsS[2], 10, 0.01, '25 m');
  assert.equal(stringPeriod(15), 2 * Math.PI * Math.sqrt(15 / GRAVITY));
  for (const weightKg of [1, 20, 100]) assert.equal(pendulumBench.run({kind: 'string', lengthM: 15, weightKg}).periodS, stringPeriod(15), 'weight does not matter');
  for (const length of [15, 25]) for (const weightKg of [800, 1250, 1500]) {
    near(cablePeriod(length, weightKg), stringPeriod(length), 0.05, `the game's ${length} m cable with ${weightKg} kg`);
    const run = pendulumBench.run({kind: 'cable', lengthM: length, weightKg});
    assert.equal(run.periodS, cablePeriod(length, weightKg)); assert.equal(run.formulaS, stringPeriod(length));
  }
  near(cablePeriod(15, 800), cablePeriod(15, 1500), 0.01, 'a heavier car swings no slower');
  assert.ok(cablePeriod(25, 1250) > cablePeriod(15, 1250), 'a longer cable swings slower');
  assert.equal(pendulumBench.run({kind: 'cable', lengthM: 5}).lengthM, 15, 'there is no 5 m cable');
  const runs = [{lengthM: 5, weightKg: 10}, {lengthM: 15, weightKg: 10}, {lengthM: 25, weightKg: 10}];
  assert.equal(pendulumBench.goalMet(history(pendulumBench, runs)), false, 'three lengths are not enough: weight must change too');
  assert.equal(pendulumBench.goalMet(history(pendulumBench, [...runs, {lengthM: 15, weightKg: 90}])), true);
});

test('altitude: the game\'s thrust falloff and the true air density are both shown', () => {
  for (const [id, site] of Object.entries(SITES)) {
    const run = altitudeBench.run({site: id});
    assert.equal(run.gameShare, airFactor(site.altitudeM));
    assert.equal(run.trueShare, trueAirShare(site.altitudeM));
    near(run.liftShare, airFactor(site.altitudeM), 1e-9, `lift at ${id} follows the air`);
  }
  assert.equal(SITES['panorama-ridge'].altitudeM, HELI_DESTINATIONS['panorama-ridge'].baseAltitude);
  assert.equal(SITES['summit-run'].altitudeM, SUMMIT_RUN.baseAltitude);
  const facts = altitudeBench.facts();
  assert.equal(facts.summitAltitudeM, 2860);
  near(facts.summitTrueShare, 0.75, 0.02, 'about three quarters of the air');
  near(facts.summitGameShare, 0.71, 0.01, 'the game rounds this down to 71%');
  assert.ok(facts.summitGameShare < facts.summitTrueShare);
  assert.equal(altitudeBench.run({site: 'summit-run'}).tunedShare > facts.summitGameShare, true, 'Altitude tune keeps more power');
  assert.equal(altitudeBench.goalMet(history(altitudeBench, [{site: 'sea'}, {site: 'panorama-ridge'}])), false);
  assert.equal(altitudeBench.goalMet(history(altitudeBench, Object.keys(SITES).map(site => ({site})))), true);
});

test('strength: aluminium weighs a third of steel; metals bend and carbon snaps; the arm puzzle has a lightest answer', () => {
  near(strengthBench.facts().aluminiumOverSteelDensity, 1 / 3, 0.05, 'aluminium against steel');
  assert.deepEqual(strengthBench.facts().snapped, ['carbon fibre']);
  // Same weight of bar: the carbon one is the thickest and the strongest, steel the thinnest and the weakest.
  const bars = Object.fromEntries(['aluminium', 'steel', 'carbon fibre'].map(name => [name, loadBar(name, 0)]));
  assert.ok(bars['carbon fibre'].thicknessMm > bars.aluminium.thicknessMm && bars.aluminium.thicknessMm > bars.steel.thicknessMm);
  assert.ok(loadBar('carbon fibre', 0).loadAtFailureKg > loadBar('aluminium', 0).loadAtFailureKg && loadBar('aluminium', 0).loadAtFailureKg > loadBar('steel', 0).loadAtFailureKg);
  assert.equal(loadBar('steel', 0).state, 'springs back');
  assert.equal(loadBar('steel', 30).state, 'bent for good');
  assert.equal(loadBar('carbon fibre', 1000).state, 'springs back');
  assert.equal(loadBar('carbon fibre', 2500).state, 'snapped');
  assert.ok(loadBar('steel', 5).tipDropMm < loadBar('steel', 10).tipDropMm, 'more load, more bend');
  const failure = loadBar('aluminium', 0).loadAtFailureKg;
  assert.equal(loadBar('aluminium', failure * 0.99).state, 'springs back'); assert.equal(loadBar('aluminium', failure * 1.01).state, 'bent for good');
  for (const m of Object.values(MATERIALS)) assert.ok(m.density > 0 && m.stiffness > 0 && m.strength > 0);
  // The hook arm: thin ones fail, the lightest that holds is one the bench can find, and it is not steel.
  const lightest = lightestArm();
  assert.equal(lightest.holds, true);
  assert.equal(hookArm(lightest.material, lightest.thicknessMm - 1).holds, false, 'one millimetre thinner fails');
  assert.equal(hookArm('steel', 20).holds, false); assert.equal(hookArm('steel', 80).holds, true);
  assert.equal(ARM.loadKg, 2000, 'the arm holds the Heavy hook\'s 2,000 kg');
  const answer = {part: 'hook arm', material: lightest.material, thicknessMm: lightest.thicknessMm};
  assert.equal(strengthBench.goalMet(history(strengthBench, [{part: 'hook arm', material: 'steel', thicknessMm: 100}])), false, 'heavy steel holds but is far from lightest');
  assert.equal(strengthBench.goalMet(history(strengthBench, [answer])), true);
  assert.equal(strengthBench.goalMet(history(strengthBench, [{part: 'hook arm', material: lightest.material, thicknessMm: 5}])), false, 'too thin does not hold');
});

test('rust: water and air rust iron, salt water far faster, and a zinc coat saves the steel for the week', () => {
  const week = rustBench.facts().daySeven;
  assert.equal(week.dry.rust, 0);
  assert.ok(week.fresh.rust > 0 && week.salt.rust > week.fresh.rust);
  assert.ok(rustBench.facts().saltOverFresh >= 3, 'salt water rusts much faster');
  assert.equal(week.zinc.rust, 0, 'the steel under the zinc is clean');
  assert.ok(week.zinc.zincLeft < 1 && week.zinc.zincLeft > 0, 'the zinc has been used up first, and is not all gone');
  for (const jar of JARS) { let last = 0; for (let d = 0; d <= 7; d++) { const rust = jarAfter(jar, d).rust; assert.ok(rust >= last && rust <= 1); last = rust; } }
  assert.equal(jarAfter(JARS.find(j => j.id === 'zinc'), 40).rust > 0, true, 'once the zinc is gone the steel rusts too');
  assert.equal(rustBench.run({days: 0}).jars.every(jar => jar.rust === 0), true);
  assert.equal(rustBench.goalMet(history(rustBench, [{days: 3}])), false);
  assert.equal(rustBench.goalMet(history(rustBench, [{days: 3}, {days: 7}])), true);
});

test('gforce: v squared over r, in the game\'s own speed units, beside what the game allows', () => {
  const run = gforceBench.run({speedMph: 60, radiusM: 100});
  assert.equal(run.g, (60 * DRIVE.mphToWorld) ** 2 / 100 / GRAVITY);
  near(run.g, lateralG(60, 100), 1e-12, 'g');
  const facts = gforceBench.facts();
  near(facts.doubleSpeedRatio, 4, 1e-9, 'twice the speed'); near(facts.halfRadiusRatio, 2, 1e-9, 'half the radius');
  near(facts.lowestCarLimitG, 2.5, 0.02, 'the game allows about 2.5 g at least');
  assert.equal(gameLimitG('falcone_f42'), DRIVE.maxLateralAccel * CARS.falcone_f42.grip / GRAVITY);
  assert.ok(run.leanDegrees > 0 && run.leanDegrees < 90);
  assert.equal(gforceBench.run({speedMph: 10, radiusM: 200}).g < 0.1, true);
  assert.equal(gforceBench.goalMet(history(gforceBench, [{speedMph: 40, radiusM: 100}])), false);
  assert.equal(gforceBench.goalMet(history(gforceBench, [{speedMph: 80, radiusM: 50}])), true, '80 mph on 50 m is about 2.6 g');
});

test('headings: the game\'s own pilot map, north 0, east 90, one map unit a kilometre', () => {
  const facts = headingsBench.facts();
  assert.equal(facts.north, 0);
  const unit = bearing('tremblant-woods', 'panorama-ridge', {summitRun: true});
  assert.equal(leg('tremblant-woods', 'panorama-ridge').headingDeg, (Math.atan2(unit.x, unit.z) * 180 / Math.PI + 360) % 360);
  near(facts.woodsToPanorama.headingDeg, 319.4, 0.002, 'north-west'); near(facts.woodsToPanorama.distanceUnits, 9.22, 0.005, 'distance');
  near(facts.woodsToSnow.headingDeg, 14.7, 0.01, 'just east of north');
  const back = leg('panorama-ridge', 'tremblant-woods').headingDeg;
  near((back - facts.woodsToPanorama.headingDeg + 360) % 360, 180, 1e-9, 'the way back is half a turn');
  assert.equal(headingsBench.run({from: 'tremblant-woods', to: 'tremblant-woods'}).truth, null);
  assert.equal(facts.unitMetres, 1000);
  const right = headingsBench.run({from: 'tremblant-woods', to: 'panorama-ridge', headingDeg: 319, rulerUnits: 9.2});
  assert.equal(right.correct, true);
  assert.equal(headingsBench.run({from: 'tremblant-woods', to: 'panorama-ridge', headingDeg: 139, rulerUnits: 9.2}).correct, false, 'the opposite heading is wrong');
  assert.equal(headingsBench.run({from: 'tremblant-woods', to: 'panorama-ridge', headingDeg: 319, rulerUnits: 5}).correct, false);
  assert.equal(headingsBench.goalMet(history(headingsBench, [{from: 'tremblant-woods', to: 'panorama-ridge', headingDeg: 319, rulerUnits: 9.2}])), true);
});

test('launch: 45 degrees goes furthest with no air on flat ground; air, and landing lower, both pull the best angle below 45', () => {
  const facts = launchBench.facts();
  assert.equal(facts.flatNoAir, 45);
  assert.ok(facts.withAir < 45, 'air drag'); assert.ok(facts.lowerNoAir < 45, 'landing lower'); assert.ok(facts.lowerWithAir < facts.withAir && facts.lowerWithAir < facts.lowerNoAir);
  near(rangeOf(45, 20, {}).rangeM, 20 * 20 / GRAVITY, 1e-9, 'v squared over g');
  assert.ok(rangeOf(45, 30, {air: true}).rangeM < rangeOf(45, 30, {}).rangeM, 'air shortens the throw');
  assert.ok(rangeOf(45, 30, {lower: true}).rangeM > rangeOf(45, 30, {}).rangeM, 'landing lower lengthens it');
  assert.equal(bestAngle(30, {}), 45);
  // The drag is the ski rules' own: a skier's mass and drag area, not a number made up here.
  assert.ok(SKI.massKg > 0 && SKI.standingArea > 0);
  const near40 = launchBench.run({angleDeg: 45, speedMs: 20, air: 'no air', landing: 'level'});
  assert.equal(near40.hit, Math.abs(near40.rangeM - 40) <= 2);
  assert.equal(launchBench.goalMet(history(launchBench, [{angleDeg: 20, speedMs: 10}])), false);
  assert.equal(launchBench.goalMet(history(launchBench, [{angleDeg: 45, speedMs: 20}])), true, '20 m/s at 45 degrees goes 40.8 m');
});

test('wax: the ski rules\' own friction, one right wax for each snow, and the right wax glides faster', () => {
  const facts = waxBench.facts();
  assert.equal(facts.rightFriction, SKI.wax.right); assert.equal(facts.wrongFriction, SKI.wax.wrong);
  assert.ok(facts.rightS < facts.wrongS);
  for (const snow of Object.keys(SNOWS)) {
    const rights = WAXES.filter(wax => waxBench.run({snow, wax}).right);
    assert.equal(rights.length, 1, `${snow} has one right wax`);
    const right = waxBench.run({snow, wax: rights[0]}), wrong = waxBench.run({snow, wax: WAXES.find(wax => wax !== rights[0])});
    assert.equal(right.friction, SKI.wax.right); assert.equal(wrong.friction, SKI.wax.wrong); assert.ok(right.glideS < wrong.glideS);
  }
  assert.deepEqual(['powder', 'cold', 'wet'].map(snow => SNOWS[snow].wax), ['hard', 'medium', 'soft'], 'harder wax for colder snow');
  assert.ok(SNOWS.powder.celsius < SNOWS.cold.celsius && SNOWS.cold.celsius < SNOWS.wet.celsius);
  assert.equal(glideSeconds(SKI.wax.right), facts.rightS);
  assert.equal(waxBench.goalMet(history(waxBench, [{snow: 'powder', wax: 'hard'}, {snow: 'cold', wax: 'medium'}])), false);
  assert.equal(waxBench.goalMet(history(waxBench, [{snow: 'powder', wax: 'hard'}, {snow: 'cold', wax: 'medium'}, {snow: 'wet', wax: 'soft'}])), true);
});

test('wind tunnel grip: full grip up to the tyre-slip rule\'s best slide, less beyond, a squeal at the limit', () => {
  const best = bestSlideDegrees();
  assert.equal(best, tyreSlipAngle(1, -1) * 180 / Math.PI);
  near(best, 4.3, 0.01, 'a few degrees');
  assert.equal(gripBench.facts().bestSlideDeg, best);
  near(slipAtAngle(best * Math.PI / 180), 1, 1e-6, 'slip at the best slide');
  for (const deg of [0, 1, 2, 3, 4]) assert.equal(gripBench.run({slideDeg: deg}).grip, 1, `${deg} degrees keeps all its grip`);
  for (const deg of [6, 8, 12]) assert.ok(gripBench.run({slideDeg: deg}).grip < 1, `${deg} degrees loses grip`);
  const sweep = [...Array(31).keys()].map(i => gripBench.run({slideDeg: i / 2}));
  sweep.reduce((last, row) => { assert.ok(row.grip <= last + 1e-12, 'grip never rises past the peak'); return row.grip; }, 1);
  assert.equal(gripBench.run({slideDeg: 8}).grip, tyreSlipGrip(gripBench.run({slideDeg: 8}).slip, 'casual'));
  assert.ok(gripBench.run({slideDeg: 8, driver: 'pro'}).grip < gripBench.run({slideDeg: 8, driver: 'casual'}).grip);
  assert.equal(gripBench.run({slideDeg: 1}).squeal, 0, 'quiet well inside the limit');
  assert.ok(gripBench.run({slideDeg: 8}).squeal > 0.4, 'a squeal beyond it');
  assert.equal(gripBench.goalMet(history(gripBench, [{slideDeg: 4}])), false);
  assert.equal(gripBench.goalMet(history(gripBench, [{slideDeg: 4}, {slideDeg: 10}])), true);
});

test('wind tunnel downforce: twice the speed, four times the push, and the wing costs top speed', () => {
  near(downforceBench.facts().doubleSpeedRatio, 4, 1e-12, 'v squared');
  assert.equal(downforceBench.run({speedMph: 100, wing: 'flat'}).downforceN, 0);
  const small = downforce(100, 'small'), big = downforce(100, 'big');
  assert.ok(big.downforceN > small.downforceN && big.dragN > small.dragN);
  assert.ok(downforceBench.run({speedMph: 100, wing: 'big'}).topSpeedShare < 1, 'more wing, lower top speed');
  assert.equal(downforceBench.run({speedMph: 100, wing: 'flat'}).topSpeedShare, 1);
  assert.equal(downforceBench.run({speedMph: 100, wing: 'big'}).downforceKg, big.downforceN / GRAVITY);
  assert.equal(downforceBench.goalMet(history(downforceBench, [{speedMph: 50, wing: 'big'}])), false);
  assert.equal(downforceBench.goalMet(history(downforceBench, [{speedMph: 50, wing: 'big'}, {speedMph: 100, wing: 'big'}])), true);
});

test('wind tunnel braking: the car\'s own braking, a hundred needs four times the road of fifty, weight tips forward', () => {
  const id = Object.keys(CARS)[0];
  near(brakingBench.facts().hundredOverFifty, 4, 0.01, 'stopping distance ratio');
  for (const carId of [id, 'koenigsegg_jesko', 'banshee_muscle']) {
    const a = DRIVE.brakeAccel * CARS[carId].braking * DRIVE.mphToWorld;
    near(stopDistance(carId, 100).metres, (100 * DRIVE.mphToWorld) ** 2 / (2 * a), 0.02, `${carId} stops as v squared over 2a`);
    near(stopDistance(carId, 100).metres / stopDistance(carId, 50).metres, 4, 0.03, `${carId}: four times`);
  }
  assert.ok(stopDistance('koenigsegg_jesko', 100).metres < stopDistance('stuttgart_959s', 100).metres === (CARS.koenigsegg_jesko.braking > CARS.stuttgart_959s.braking), 'better brakes stop shorter');
  assert.equal(brakingBench.run({car: id, speedMph: 100}).stopMetres, stopDistance(id, 100).metres);
  assert.ok(frontLoadShare() > 0.5 && frontLoadShare() < 1, 'braking tips weight onto the front tyres');
  const share = frontLoadShare() * 100;
  assert.equal(brakingBench.run({frontShare: Math.ceil(share / 5) * 5}).rearSlides, false, 'enough front brake keeps the back from sliding');
  assert.equal(brakingBench.run({frontShare: 40}).rearSlides, true, 'too much rear brake slides the back');
  assert.equal(brakingBench.goalMet(history(brakingBench, [{speedMph: 50}])), false);
  assert.equal(brakingBench.goalMet(history(brakingBench, [{speedMph: 50}, {speedMph: 100}])), true);
});

test('wind tunnel suspension: stiff springs shake the body harder and lean less; the tyre stays down about as well on both', () => {
  const facts = suspensionBench.facts();
  assert.ok(facts.bumpy.stiff.bodyShake > facts.bumpy.soft.bodyShake, 'the stiff spring passes the bumps up into the body');
  assert.ok(facts.smooth.stiff.bodyShake > facts.smooth.soft.bodyShake);
  assert.ok(facts.bumpy.soft.bodyShake > facts.smooth.soft.bodyShake * 5, 'a bumpy road shakes more than a smooth one');
  assert.ok(facts.bumpy.stiff.leanDeg < facts.bumpy.soft.leanDeg / 2, 'stiff springs keep the car flat in a corner');
  for (const spring of ['soft', 'stiff']) {
    assert.ok(facts.bumpy[spring].contactShare < 1 && facts.bumpy[spring].contactShare > 0.7, `${spring}: the tyre leaves the road on bumps`);
    assert.equal(facts.smooth[spring].contactShare, 1, `${spring}: and stays down on a smooth road`);
  }
  assert.deepEqual(shake('soft', 'bumpy'), shake('soft', 'bumpy'), 'repeatable');
  assert.equal(suspensionBench.goalMet(history(suspensionBench, [{spring: 'soft', road: 'bumpy'}, {spring: 'stiff', road: 'bumpy'}])), false);
  assert.equal(suspensionBench.goalMet(history(suspensionBench, [['soft', 'smooth'], ['soft', 'bumpy'], ['stiff', 'smooth'], ['stiff', 'bumpy']].map(([spring, road]) => ({spring, road})))), true);
});

test('wind tunnel fuel: a 70 litre tank of petrol is 52 kg, and a lighter car gets to 60 sooner', () => {
  const facts = fuelBench.facts();
  near(facts.tankKg, 52, 0.01, '70 litres of petrol');
  assert.equal(facts.kgPerLitre, PETROL_KG_PER_LITRE);
  near(PETROL_KG_PER_LITRE, 0.75, 0.02, 'about three quarters of a kilo a litre');
  assert.equal(FUEL_RIG.tankLitres, 70);
  const id = Object.keys(CARS)[0], full = zeroToSixty(id, 70), half = zeroToSixty(id, 35), empty = zeroToSixty(id, 0);
  assert.ok(empty.seconds < half.seconds && half.seconds < full.seconds);
  near(full.seconds, 60 / (CARS[id].accel * DRIVE.accelScale), 1e-9, 'a full tank is the game\'s own launch');
  assert.ok(empty.massKg < full.massKg && full.massKg - empty.massKg - 70 * PETROL_KG_PER_LITRE < 1e-9);
  assert.equal(fuelBench.run({litres: 35}).fuelKg, 35 * PETROL_KG_PER_LITRE);
  assert.equal(fuelBench.goalMet(history(fuelBench, [{litres: 70}])), false);
  assert.equal(fuelBench.goalMet(history(fuelBench, [{litres: 70}, {litres: 35}])), true);
});

test('the explanations in docs/LAB.md section 4 quote numbers the benches produce', () => {
  const section = LAB.slice(LAB.indexOf('## 4. The lessons'), LAB.indexOf('## 5. Tuning'));
  const quoted = text => assert.ok(section.includes(text), `docs/LAB.md says: ${text}`);
  // Projectile motion: 5, 20 and 45 m falls.
  quoted('about 5 m in the first second, 20 m in two and 45 m in three');
  const falls = projectileBench.facts().stoneFallM; near(falls[0], 5, 0.025, '1 s'); near(falls[1], 20, 0.025, '2 s'); near(falls[2], 45, 0.025, '3 s');
  // Pendulums: 4.5, 7.8 and 10 s.
  quoted('about 4.5 s on 5 m, 7.8 s on 15 m and 10 s on 25 m');
  const swings = pendulumBench.facts().stringPeriodsS; near(swings[0], 4.5, 0.01, '5 m'); near(swings[1], 7.8, 0.01, '15 m'); near(swings[2], 10, 0.01, '25 m');
  // Air and altitude: three quarters of the air, the game's 71%.
  quoted('about three quarters of the air'); quoted('to 71%');
  near(altitudeBench.facts().summitTrueShare, 0.75, 0.02, 'three quarters'); near(altitudeBench.facts().summitGameShare, 0.71, 0.01, '71%');
  // Strength: aluminium about a third of steel.
  quoted('Aluminium weighs about a third as much as steel');
  // Braking: four times the road from 100 as from 50.
  quoted('from 100 mph a car needs four times the road it needs from 50');
  // Fuel: three quarters of a kilo a litre, 52 kg in 70 litres.
  quoted('about three quarters of a kilo a litre'); quoted('a 70-litre tank holds about 52 kg');
  // G-force: twice the speed, four times the push; half the radius, twice the push; the game's 2.5 g.
  quoted('Twice the speed makes four times the push; half the radius makes twice the push');
  quoted('allowed between 2.5 and 3.5 g');
  const g = gforceBench.facts(); near(g.lowestCarLimitG, 2.5, 0.02, 'lowest'); near(g.highestCarLimitG, 3.5, 0.02, 'highest');
  // Launch angles: 45 degrees with no air on flat ground.
  quoted('45 degrees goes furthest');
  // Grip: the game keeps full grip up to its best slide, 4.3 degrees.
  quoted('4.3 degrees');
  // Heights the Lab quotes for places.
  assert.ok(section.includes('860 m') && section.includes('2,860 m'));
  assert.equal(HELI_DESTINATIONS['panorama-ridge'].baseAltitude, 860);
  // Suspension: says what the rig shows.
  quoted('shaken less'); quoted('shaking it harder');
});
