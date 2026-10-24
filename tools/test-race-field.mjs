// Racing a full field (docs/CIRCUITS.md 3.2, card P4-FIELD): grid, start
// lights, no jump starts, passing and defending, corner sharing, slipstream,
// catch-up and repeatability. Every race here is headless and seeded.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import { Duel } from '../src/game.js';
import { COURSE, CARS, DRIVE } from '../src/config.js';
import { Course } from '../src/course.js';
import { FEATURE_STATES } from '../src/feature-flags.js';
import { normalizeRaceSettings } from '../src/race-settings.js';
import { createProfile } from '../src/progression.js';
import { testCourseAccess } from './career-fixture.mjs';
import { racingLineFor, buildSpeedProfile } from '../src/race-lines.js';
import { FIELD, FIELD_TUNING, CATCH_UP_GAP_SEC, gridPose, chooseRacers, performanceIndex, racerSpec, catchUpFactor,
  classify } from '../src/race-field.js';
import { runtimeOf, followLimitMph, CPU_NITRO, stepCpuNitro, playerPaceMph, closePassRefill, cpuNitroExtraMph, cpuNitroAcceleration } from '../src/race-field-driver.js';
import { shortRacerName, runningOrderRows, fieldResultsTable, fieldResultsText } from '../src/screen-field.js';
import { installTestDriver } from './race-field-balance.mjs';
import { App } from '../src/app.js';
import { createFeatureFlags } from '../src/feature-flags.js';
import {summarizeRacecraft, startFormation} from './racecraft-rate.mjs';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };
const close = (actual, expected, tolerance, message) => { assert.ok(Math.abs(actual - expected) <= tolerance, `${message} (got ${actual}, want ${expected})`); checks++; };
const STEP = 1 / 60;

function start({ cpu = 'medium', seed = 1989, fieldSeed = 4242, size = 7, car = 'falcone_f42', flag = true, mode = 'grandprix', racecraft = false } = {}) {
  const duel = new Duel({ seed, featureFlags: { 'grand-prix': flag, 'cpu-racecraft': racecraft } });
  duel.startCampaign({ mode, startStage: 0, car, seed, fieldSeed, fieldSize: size, cpuDifficulty: cpu, difficulty: 'casual' });
  return duel;
}
const racing = duel => { while (duel.state.status === 'countdown') duel.step(STEP); return duel; };
const run = (duel, seconds) => { for (let i = 0; i < seconds * 60 && duel.state.status === 'racing'; i++) duel.step(STEP); return duel; };
const fingerprint = duel => JSON.stringify([duel.state.stageTimeSec.toFixed(3), duel.state.s.toFixed(3), duel.state.speedMph.toFixed(3),
  ...duel.state.opponents.map(r => [r.s.toFixed(3), r.lateral.toFixed(3), r.speedMph.toFixed(3), r.completedLaps, !!r.knock])]);

// GP-RACECRAFT: protect the released simulation before testing opt-in behavior.
check(FEATURE_STATES['cpu-racecraft'] === 'dev', 'racecraft is preview-only');
for (const [seed, hash] of [[1989, 'eb0598fddce54a07f23f36de3675e8ff2ed97d5064025fef0abb8b5572057b66'],
  [42, 'e047afb2d58f76a7a03ceec2514b31a315f3268e21778a92236761d64319192b'],
  [17, '60f430f2b0cf7fc6d360450142f544b4f81296a33315a5ebafac5606e801b214']]) {
  const d = racing(start({seed})); d.setInput({throttle: 1, steer: 0}); run(d, 30);
  const s = d.state;
  equal(createHash('sha256').update(JSON.stringify([s.s, s.lateral, s.speedMph, s.stageTimeSec, s.field, s.opponents])).digest('hex'),
    hash, 'racecraft off preserves the original state and RNG, seed ' + seed);
}
{
  const d = new Duel({seed:1989, featureFlags:{'grand-prix':true, 'cpu-racecraft':true}});
  d.startCampaign({mode:'grandprix', startStage:0, car:'falcone_f42',seed:1989,fieldSeed:4242,fieldSize:7,cpuDifficulty:'medium'});
  for(const r of d.state.opponents) {
    equal(r.field.bias, 0, 'Claude 16 October: grid lanes relax to the racing line exactly as today');
    check(r.field.racecraft === true, 'only opted-in racers have racecraft state');
  }
}
{
  equal(CPU_NITRO.strength, .5, 'CPU nitro is half strength');
  equal(CPU_NITRO.refill, .5, 'CPU nitro refills at half rate');
  const upgraded={upgrades:{nitro:2}},spec={topSpeed:200,nitroSpeedBonus:.02,nitroAcceleration:1.4};
  close(cpuNitroExtraMph(upgraded,spec),19,1e-12,'boost ceiling halves the complete upgraded car bonus');
  close(cpuNitroAcceleration(upgraded,spec),38.22,1e-12,'acceleration halves the complete upgraded car bonus');
  const r = {boost: .8, boosting:false, speedMph:100, upgrades:{nitro:0}, field:{traits:{aggression:.7}}};
  const run = {spec:{boostCapacity:2}};
  stepCpuNitro(r,run,1,{straight:true,attack:true});
  check(r.boosting, 'a racer attacks with nitro on a straight');
  close(r.boost,.8-.19/2,1e-12,'drain uses the actual car tank capacity');
  stepCpuNitro(r,run,1,{straight:false,attack:true});
  check(!r.boosting,'nitro stops before a bend');
  close(r.boost,.8-.19/2+.028*.5,1e-12,'recharge takes twice as long');
  stepCpuNitro(r,run,1,{straight:true,attack:true,pit:true});
  check(!r.boosting,'nitro never runs in the pit lane');
  stepCpuNitro(r,run,1,{straight:true,attack:false,defend:true});
  check(r.boosting,'nitro can defend against an adjacent car');
  r.boost=0; stepCpuNitro(r,run,1,{straight:true,attack:true});
  check(!r.boosting && r.boost>0,'an empty tank recharges instead of creating free thrust');
}

{
  const d=racing(start({racecraft:true})), s=d.state;
  const line=racingLineFor(d.course), profile=buildSpeedProfile(line,d.car);
  playerPaceMph(d);
  for(let i=0;i<720;i++){
    s.s+=profile.at(s.s)*DRIVE.mphToWorld*.85/60;s.stageTimeSec+=1/60;
    playerPaceMph(d);
  }
  const pace=playerPaceMph(d);s.speedMph=0;
  equal(playerPaceMph(d),pace,'instant braking cannot erase measured road pace');
  close(pace/profile.at(s.s),.85,.001,'player pace uses comparable two-second road sectors');
}
{
  // GP-PASSING-2 step A: nitro stays locked for every car until the first braking zone's apex on lap 1.
  const off=start(), on=start({racecraft:true});
  equal(off.state.field.nitroArmS, undefined, 'switch off keeps the field state without a nitro lock');
  const armS=on.state.field.nitroArmS;
  check(armS>on.state.s+50, 'the first apex lies ahead of the grid');
  racing(on); on.state.boost=1; on.setInput({throttle:1,steer:0,boost:true});
  let boostedEarly=false, cpuBoostedEarly=false;
  for(let i=0;i<60*40 && on.state.s<armS-20;i++){
    on.step(STEP);
    if(on.state.boosting) boostedEarly=true;
    if(on.state.opponents.some(r=>r.boosting && r.s<armS)) cpuBoostedEarly=true;
  }
  check(!boostedEarly, 'the player cannot nitro before the first apex');
  check(!cpuBoostedEarly, 'no computer car uses nitro before the first apex');
  check(on.state.s<armS+1, 'the locked-phase test stopped before the apex');
  on.state.s=armS+5; on.state.lateral=racingLineFor(on.course).offsetAt(armS+5); on.state.headingError=0; on.state.speedMph=100;
  on.step(STEP);
  check(on.state.boosting, 'the player can nitro once past the first apex');
  const offBoost=racing(start()); offBoost.state.boost=1; offBoost.state.speedMph=100; offBoost.setInput({throttle:1,steer:0,boost:true}); offBoost.step(STEP);
  check(offBoost.state.boosting, 'switch off: nitro works from the start as before');
}
{
  const a=start({racecraft:true}),b=start({racecraft:true});
  for(const d of [a,b]){racing(d);d.setInput({throttle:1,steer:0});run(d,18);}
  equal(JSON.stringify(a.state),JSON.stringify(b.state),'enabled racecraft repeats from seed and inputs');
}

{
  const courses=['panorama-ridge','tremblant-woods','pacific-canyon'];
  const rows=courses.flatMap(course=>Array.from({length:20},(_,index)=>['normal','slow','nitro'].flatMap(mode=>[false,true].map(enabled=>
    ({course,index,mode,enabled,wide:true,startSnapshot:{pairs:[[0,1],[2,3]],lateralSpread:3},passes:enabled?4:2,crashes:0,pileUp:false,passedPlayer:true,firstLapPosition:2,finished:7,playerFinished:true,meanCpuTime:100}))))).flat(2);
  check(summarizeRacecraft(rows,{courses,races:20}).passed,'reporter accepts complete qualifying fixture data');
  check(!summarizeRacecraft(rows.slice(1),{courses,races:20}).passed,'a missing measurement cannot become a pass');
  const incomplete=rows.map((r,i)=>i? r : {...r,finished:6,meanCpuTime:null});
  check(!summarizeRacecraft(incomplete,{courses,races:20}).passed,'unfinished measurement cannot hide behind averages');
  check(!summarizeRacecraft(rows.filter(r=>r.index===0),{courses,races:1}).passed,'a probe cannot count as the twenty-race acceptance');
  const threshold=rows.map(r=>r.course==='panorama-ridge'&&r.mode==='normal'&&r.enabled&&r.index>=15 ?
    {...r,startSnapshot:{pairs:[[0,1]],lateralSpread:2.999}} : r);
  check(summarizeRacecraft(threshold,{courses,races:20}).passed,'exactly fifteen starts satisfy both approved thresholds');
  const tooNarrow=threshold.map(r=>r.course==='panorama-ridge'&&r.mode==='normal'&&r.enabled&&r.index===14 ?
    {...r,startSnapshot:{...r.startSnapshot,lateralSpread:2.999}} : r);
  check(summarizeRacecraft(tooNarrow,{courses,races:20}).passed,'Claude: start spread is reported for Kyle rather than gating');
  const tooFewPairs=threshold.map(r=>r.course==='panorama-ridge'&&r.mode==='normal'&&r.enabled&&r.index===14 ?
    {...r,startSnapshot:{...r.startSnapshot,pairs:[[0,1]]}} : r);
  check(summarizeRacecraft(tooFewPairs,{courses,races:20}).passed,'Claude: start pair count is reported for Kyle rather than gating');
  equal(summarizeRacecraft(rows.map(({startSnapshot,...row})=>row),{courses,races:20}).summary[0].baselineMeanSpread,null,'missing old start data remains unknown rather than invented');
  const reported=rows.map(r=>({...r,startSnapshot:{pairs:[],lateralSpread:0}}));
  check(summarizeRacecraft(reported,{courses,races:20}).passed,'zero start pairs remain reported without waiving other requirements');
  const busy=rows.map(r=>r.mode==='normal'?{...r,crashes:r.enabled?11:10,pileUp:r.index<(r.enabled?5:4)}:r);
  check(summarizeRacecraft(busy,{courses,races:20}).passed,'exact 10 percent crashes and baseline plus one pile-up boundaries pass');
  check(!summarizeRacecraft(busy.map(r=>r.enabled&&r.mode==='normal'?{...r,crashes:12}:r),{courses,races:20}).passed,'crash mean beyond ten percent fails');
  check(!summarizeRacecraft(busy.map(r=>r.enabled&&r.mode==='normal'?{...r,pileUp:r.index<6}:r),{courses,races:20}).passed,'pile-ups beyond baseline plus one fail');
  check(!summarizeRacecraft(rows.map(r=>r.enabled&&r.mode==='normal'?{...r,crashes:8}:r),{courses,races:20}).passed,'more races with eight crashes than off still fail');
  const reportOnly=rows.map(r=>r.enabled?{...r,passes:0,passedPlayer:false,firstLapPosition:1}:r);
  check(summarizeRacecraft(reportOnly,{courses,races:20}).passed,'Claude 24 October: passes, slower player passed and nitro leader are report-only');
  const duplicate=[rows[1],...rows.slice(1)];
  check(!summarizeRacecraft(duplicate,{courses,races:20}).passed,'a duplicate cannot replace the missing paired baseline case');
}

{
  const r={boost:.2,speedMph:100,completedLaps:0,contactCooldown:0,field:{}};
  const run={halfWidth:1};const c={index:2,ds:1,dl:3,hw:1};
  closePassRefill(r,run,[c],1);c.ds=-1;closePassRefill(r,run,[c],1+1/60);
  close(r.boost,.2+.22*.5,1e-12,'a real close pass awards half the player recharge');
  closePassRefill(r,run,[c],1+2/60);
  close(r.boost,.31,1e-12,'the same close pass cannot refill every frame');
  const contact={...r,boost:.2,field:{},contactCooldown:1};c.ds=1;
  closePassRefill(contact,run,[c],2);c.ds=-1;closePassRefill(contact,run,[c],2+1/60);
  close(contact.boost,.2,1e-12,'contact cannot earn close-pass recharge');
}

// Claude's revised first-braking contract: distinct real body overlaps and
// population lateral spread, measured together at the same entry snapshot.
{
  const actors = Array.from({length: 6}, (_, i) => ({
    id: i, s: 100 - Math.floor(i / 2) * 12, lateral: i % 2 ? 3 : -3,
    halfLength: 2, halfWidth: 1,
  }));
  const formation = startFormation(actors);
  equal(formation.pairs.length, 3, 'three separate overlapping pairs count once each');
  equal(new Set(formation.pairs.flat()).size, 6, 'one car cannot supply two pairs');
  equal(formation.lateralSpread, 3, 'first six use population standard deviation');
  const singleFile = startFormation(actors.map(row => ({...row, lateral: 0})));
  equal(singleFile.pairs.length, 0, 'overlapping bodies in one lane are not side by side');
  equal(singleFile.lateralSpread, 0, 'a single-file field has no lateral spread');
  const gap = startFormation([{...actors[0], s: 100}, {...actors[1], s: 102.01}]);
  equal(gap.pairs.length, 0, 'less than half a car length of overlap does not count');
  const boundary = startFormation([{...actors[0], s: 100}, {...actors[1], s: 102}]);
  equal(boundary.pairs.length, 1, 'exactly half a car length counts');
  equal(boundary.lateralSpread, null, 'fewer than six cars cannot supply the spread acceptance');
  const shared = startFormation([actors[0], actors[1], {...actors[2], s: 100}]);
  equal(shared.pairs.length, 1, 'two potential pairings sharing a car are only one pair');
  const tail = startFormation([...actors, {...actors[0], id: 6, s: 0, lateral: 100}]);
  equal(tail.lateralSpread, 3, 'a distant seventh car cannot inflate the leading-six spread');
}

// ---- the switch and the old modes ----
check(FEATURE_STATES['grand-prix'] === 'on', 'the Grand Prix switch is released (on, 11 October 2026)');
{
  const off = start({ flag: false });
  equal(off.state.mode, 'duel', 'with the switch off a Grand Prix request is an ordinary Duel');
  check(!off.state.field && off.state.opponents.length === 1, 'with the switch off there is no field, just the rival');
  const other = new Duel({ seed: 1989, featureFlags: { 'grand-prix': true } });
  other.startCampaign({ mode: 'grandprix', startStage: 3, seed: 1989 });
  equal(other.state.mode, 'duel', 'a circuit without a Grand Prix stays an ordinary Duel');
}
{
  // The switch must not change an ordinary race by a single digit.
  const a = start({ flag: false, mode: 'duel' }), b = start({ flag: true, mode: 'duel' });
  for (const duel of [a, b]) { racing(duel); duel.setInput({ throttle: 1, steer: 0 }); run(duel, 12); }
  equal(JSON.stringify([a.state.s, a.state.speedMph, a.state.rival?.s, a.state.traffic.length]),
    JSON.stringify([b.state.s, b.state.speedMph, b.state.rival?.s, b.state.traffic.length]), 'an ordinary Duel is identical with the switch on');
  check(a.state.traffic.length > 0, 'the ordinary Duel still has traffic');
}
{
  const profile = createProfile();
  equal(normalizeRaceSettings({ mode: 'grandprix' }, profile).mode, 'grandprix', 'the race setup remembers Grand Prix on Pacific Canyon');
  equal(normalizeRaceSettings({ mode: 'grandprix', eventId: COURSE[3].id }, { ...profile, courses: testCourseAccess() }).mode === 'grandprix', false,
    'the race setup does not offer Grand Prix where the circuit has none');
}

// ---- the field, grid and cars ----
for (const cpu of ['easy', 'medium', 'hard']) {
  const duel = start({ cpu }), s = duel.state;
  equal(s.mode, 'grandprix', `${cpu}: a Grand Prix`);
  equal(s.opponents.length, 7, `${cpu}: seven computer racers`);
  equal(s.field.size, 8, `${cpu}: eight cars`);
  equal(s.lapsTotal, 3, `${cpu}: three laps`);
  equal(s.traffic.length, 0, `${cpu}: no traffic`);
  equal(duel.course.features.radarTraps.length, 0, `${cpu}: no radar trap`);
  check(!s.police.pursuit && !s.police.triggered, `${cpu}: no police`);
  const names = s.opponents.map(r => r.name);
  equal(new Set(names).size, names.length, `${cpu}: every racer has their own name`);
  for (const name of ['Mara Vale', 'Iko Ren', 'Sana Marlow', 'Jules Reyes', 'Nia Frost', 'Boone Ward']) check(names.includes(name), `${cpu}: ${name} races`);
  equal(names.includes('Axel Storm'), cpu === 'hard', `${cpu}: Axel Storm races on Hard only`);
  equal(names.includes('Dex Calloway'), cpu !== 'hard', `${cpu}: the filler racer, Dex Calloway, fills the last slot unless Axel does`);
  // The grid: two by two, staggered, 8 m between rows, nobody off the road.
  const cars = [{ s: s.s, lateral: s.lateral }, ...s.opponents.map(r => ({ s: r.s, lateral: r.lateral }))].sort((a, b) => b.s - a.s);
  equal(new Set(cars.map(c => `${c.s}|${c.lateral}`)).size, 8, `${cpu}: eight different grid slots`);
  for (let slot = 0; slot < 8; slot++) {
    const pose = gridPose(slot);
    check(cars.some(c => Math.abs(c.s - pose.s) < 1e-9 && Math.abs(c.lateral - pose.lateral) < 1e-9), `${cpu}: slot ${slot + 1} is used`);
    check(Math.abs(pose.lateral) < DRIVE.roadHalfWidth - 2, `${cpu}: slot ${slot + 1} is on the road`);
    check(pose.s < 0, `${cpu}: slot ${slot + 1} is behind the line`);
  }
  equal(gridPose(2).s - gridPose(0).s, -FIELD.rowGap, `${cpu}: 8 m between rows`);
  equal(gridPose(1).s - gridPose(0).s, -FIELD.stagger, `${cpu}: the right-hand car sits behind its row`);
  const place = 1 + cars.findIndex(c => c.s === s.s && c.lateral === s.lateral);
  equal(place, { easy: 5, medium: 6, hard: 8 }[cpu], `${cpu}: you start ${{ easy: 'fifth', medium: 'sixth', hard: 'eighth' }[cpu]}`);
  check(place > 4, `${cpu}: you start in the back half`);
  // Cars are within 10% of your performance index; Easy slower half, Hard faster half.
  const mine = performanceIndex(duel.car, duel.course), indexes = s.opponents.map(r => performanceIndex(racerSpec(r.car, r.upgrades, r.driverId), duel.course));
  for (const [i, index] of indexes.entries()) check(Math.abs(index / mine - 1) <= FIELD.carWindow + 1e-9, `${cpu}: ${s.opponents[i].name}'s car is within 10% of yours`);
  const average = indexes.reduce((a, b) => a + b, 0) / indexes.length;
  if (cpu === 'easy') check(average <= mine, 'easy: the field drives the slower half');
  if (cpu === 'hard') check(average >= mine, 'hard: the field drives the faster half');
}
{
  const duel = start({ size: 3 });
  equal(duel.state.opponents.length, 3, 'a smaller field is allowed');
  equal(chooseRacers('hard', 7)[0].id, 'axel_storm', 'Axel Storm is the first name on a Hard field');
  const solo = start({ size: 1 });
  check(solo.state.field.playerSlot <= 1, 'with one opponent you take the last slot there is');
  const trucks = start({ car: 'titan_monster' });
  check(trucks.state.opponents.every(r => r.car === 'titan_monster'), 'when no road car is near your class the field drives your own car');
}

// ---- the five-light start, no jump start ----
{
  const duel = start({ seed: 1989, fieldSeed: 77 }), s = duel.state;
  const hold = s.field.hold;
  check(hold >= FIELD.holdMin && hold <= FIELD.holdMax, 'the lights stay on for 0.4 to 1.2 seconds');
  equal(s.status, 'countdown', 'the race waits for the lights');
  duel.setInput({ throttle: 1, steer: 0 });
  const lit = [], events = [];
  duel.onChange((_, event) => { if (event.startLight) lit.push([event.startLight, +s.field.start.elapsed.toFixed(2)]); if (event.lightsOut) events.push(+s.field.start.elapsed.toFixed(2)); });
  const startS = s.s;
  let ticks = 0;
  while (s.status === 'countdown' && ticks++ < 60 * 8) {
    duel.step(STEP);
    if (s.status === 'countdown') {
      equal(s.s, startS, 'throttle does nothing before the lights go out');
      check(s.opponents.every(r => r.speedMph === 0), 'nobody moves before the lights go out');
    }
  }
  equal(lit.length, 5, 'five lights come on');
  lit.forEach(([n, at], i) => { equal(n, i + 1, 'one at a time'); close(at, i + 1, .02, `light ${i + 1} comes on at ${i + 1} s`); });
  close(events[0], 5 + hold, .02, 'the lights go out after the seeded wait');
  equal(s.status, 'racing', 'the race starts when the lights go out');
  equal(s.speedMph, 0, 'the car starts from rest, nothing more');
  const again = start({ seed: 1989, fieldSeed: 77 });
  equal(again.state.field.hold, hold, 'the same seed gives the same wait');
  check(start({ seed: 1989, fieldSeed: 78 }).state.field.hold !== hold, 'another seed gives another wait');
  // Holding the throttle at lights out gives a clean launch and no more than any other start.
  run(duel, 3);
  check(s.speedMph > 40 && s.speedMph < 120, 'a clean launch');
  check(s.opponents.every(r => r.field.reaction >= .1), 'no computer racer leaves before the lights go out');
  check(s.opponents.some(r => r.speedMph > 10), 'the computer racers get away');
}

// ---- the racing line and speed profile ----
{
  const course = new Course(COURSE[0], 1989);
  const line = racingLineFor(course);
  check(racingLineFor(course) === line, 'a course keeps one racing line');
  for (let s = 0; s < course.length; s += 24) check(Math.abs(line.offsetAt(s)) <= course.roadHalfWidthAt(s) - 1.5 + 1e-6, 'the line stays 1.5 m inside the road edge');
  const profile = buildSpeedProfile(line, CARS.falcone_f42);
  const apex = profile.corners[0];
  check(profile.corners.length >= 3, 'the profile finds the braking zones');
  check(apex.speedMph < apex.entryMph && apex.entryS !== apex.apexS, 'a braking zone slows from its entry to its apex');
  for (let s = 0; s < course.length; s += 40) check(profile.at(s) <= CARS.falcone_f42.topSpeed + 1e-6, 'the profile never beats the top speed');
  const slower = buildSpeedProfile(line, CARS.falcone_f42, { cornerFactor: .9, topFactor: .9 });
  check(slower.at(apex.apexS) < profile.at(apex.apexS), 'a less skilled racer takes a corner slower');
  // A course may bring its own line (the track script's).
  const own = { ...course, racingLine: { offsetAt: () => 1.25 } };
  Object.setPrototypeOf(own, Object.getPrototypeOf(course));
  equal(Math.round(racingLineFor(own).offsetAt(500) * 100), 125, 'a line from the course is used when it has one');
}

// ---- passing, defending, sharing a corner ----
function placeScene(duel, scene) {
  // Put the racers on a stretch of road at set places, at speed, with the lights already out.
  const s = duel.state;
  racing(duel);
  s.opponents.forEach((r, i) => {
    const spot = scene[i];
    if (spot) Object.assign(r, { s: spot.s, prevS: spot.s, lateral: spot.lateral, prevLateral: spot.lateral, speedMph: spot.v, headingError: 0, finished: false });
    else Object.assign(r, { s: -5000 - i * 30, prevS: -5000 - i * 30, lateral: 0, speedMph: 0, contactExempt: true, finished: true });
    r.field.intent = r.lateral; r.field.bias = 0; r.field.reaction = 0; r.field.formAmp = 0;
  });
  Object.assign(s, { s: -4000, prevS: -4000, lateral: 0, speedMph: 0 });
  s.invulnerableSec = 99;
  s.stageTimeSec = 20; // past the opening seconds, when nobody attempts a pass
}
function quietStretch(duel) {
  // A place where the racing line runs nearly straight and no braking zone is close.
  const line = racingLineFor(duel.course), profile = runtimeOf(duel, duel.state.opponents[0]).profile;
  for (let s = 40; s < duel.course.length - 400; s += 10) {
    let calm = true;
    for (let d = 0; d <= 420 && calm; d += 10) calm = Math.abs(line.curvatureAt(s + d)) < 1 / 700 && profile.at(s + d) >= profile.topMph * .97;
    if (calm) return s;
  }
  return null;
}
{
  const duel = start({ cpu: 'hard', seed: 1989, fieldSeed: 9 });
  const base = quietStretch(start({ cpu: 'hard', seed: 1989, fieldSeed: 9 }));
  check(base != null, 'Pacific Canyon has a straight to test on');
  const lineAt = distance => racingLineFor(duel.course).offsetAt(distance);
  // Passing: a faster car 15 m behind a slower one on a straight pulls out to the side with room.
  placeScene(duel, [{ s: base + 20, lateral: lineAt(base + 20), v: 110 }, { s: base + 4, lateral: lineAt(base + 4), v: 138 }]);
  const slow = duel.state.opponents[0], fast = duel.state.opponents[1];
  slow.field.skillRoll = .8; fast.field.skillRoll = 1.0;
  delete slow.field.pass;
  run(duel, .05);
  let widest = 0, started = false;
  for (let i = 0; i < 60 * 8; i++) {
    duel.step(STEP);
    if (fast.field.pass) started = true;
    widest = Math.max(widest, Math.abs(fast.lateral - slow.lateral));
    slow.speedMph = 110; slow.field.rolled = true;
  }
  check(started, 'a faster car close behind a slower one on a straight tries to pass');
  check(widest > 2.3, 'it pulls out to the side with room to spare');
  check(duel.relativeS(fast.s, slow.s) - slow.s > 0 || fast.field.passes.done > 0, 'and gets by');
}
{
  // Defending: one move to cover the inside before a braking zone, never once the attacker is alongside.
  const duel = start({ cpu: 'hard', seed: 1989, fieldSeed: 9 });
  racing(duel);
  const runtime = runtimeOf(duel, duel.state.opponents[0]);
  const corner = runtime.profile.corners.find(c => c.entryMph - c.speedMph > 30);
  const before = corner.entryS - 150;
  const lineAt = distance => runtime.line.offsetAt(distance);
  const setup = (attackerGap, attackerLateral) => {
    const d = start({ cpu: 'hard', seed: 1989, fieldSeed: 9 });
    placeScene(d, [{ s: before, lateral: lineAt(before), v: 150 }, { s: before - attackerGap, lateral: attackerLateral ?? lineAt(before), v: 156 }]);
    d.state.opponents[0].field.traits.defend = 1;
    return d;
  };
  const watch = d => {
    const defender = d.state.opponents[0];
    let moves = 0, lastSide = 0, switched = false;
    for (let i = 0; i < 60 * 5; i++) {
      d.step(STEP);
      const side = Math.sign(defender.field.defendSide);
      if (side !== 0 && lastSide === 0) moves++;
      if (side !== 0 && lastSide !== 0 && side !== lastSide) switched = true;
      lastSide = side || lastSide;
    }
    return { moves, switched, defendSide: defender.field.defendSide, lateral: defender.lateral };
  };
  const covered = watch(setup(14));
  equal(covered.moves, 1, 'the car ahead covers the inside once');
  check(!covered.switched, 'and does not weave back');
  equal(Math.sign(covered.defendSide), corner.dir, 'toward the inside of the corner');
  const alongside = watch(setup(0, lineAt(before) + (corner.dir > 0 ? -3.2 : 3.2)));
  equal(alongside.moves, 0, 'it makes no move once the attacker is alongside');
}
{
  // Sharing a corner: two cars side by side keep their sides and do not touch.
  const duel = start({ cpu: 'hard', seed: 1989, fieldSeed: 9 });
  racing(duel);
  const runtime = runtimeOf(duel, duel.state.opponents[0]);
  const corner = runtime.profile.corners[0];
  const at = corner.entryS - 120;
  placeScene(duel, [{ s: at, lateral: runtime.line.offsetAt(at) - 1.6, v: 140 }, { s: at + .5, lateral: runtime.line.offsetAt(at) + 1.9, v: 140 }]);
  const [a, b] = duel.state.opponents;
  let minimum = Infinity, swapped = false;
  const leftFirst = a.lateral < b.lateral;
  for (let i = 0; i < 60 * 3; i++) {
    duel.step(STEP);
    // While they overlap along the road; once one is clear ahead they may share a line.
    if (Math.abs(a.s - b.s) < 6) {
      minimum = Math.min(minimum, Math.abs(a.lateral - b.lateral));
      if ((a.lateral < b.lateral) !== leftFirst) swapped = true;
    }
  }
  check(!swapped, 'cars alongside through a corner keep their sides');
  check(minimum > 2.1, 'and nobody turns into the other car');
  check(!a.knock && !b.knock, 'with no contact');
}

// ---- slipstream ----
{
  const duel = start({ seed: 1989, fieldSeed: 9 });
  const base = quietStretch(duel);
  const s = duel.state;
  placeScene(duel, [{ s: base + 200, lateral: 0, v: 150 }]);
  const lead = s.opponents[0];
  lead.field.skillRoll = 1.1;
  // You, 20 m behind and in line, in the tow.
  Object.assign(s, { s: base + 180, prevS: base + 180, lateral: 0, speedMph: 150, headingError: 0 });
  duel.setInput({ throttle: 1 });
  let marker = 0;
  for (let i = 0; i < 60; i++) { duel.step(STEP); lead.speedMph = 150; lead.lateral = 0; lead.headingError = 0; lead.s = Math.max(lead.s, s.s + 20); marker = Math.max(marker, s.field.tow); }
  check(marker > .9, 'following within 30 m and 2.5 m builds the tow, which the HUD shows');
  equal(s.field.towBehind, 0, 'the tow knows which car it follows');
  // Fast in the tow: the car passes its own top speed, by no more than 5%.
  Object.assign(s, { speedMph: 200, gear: CARS.falcone_f42.gears.length - 1 });
  for (let i = 0; i < 60 * 3; i++) { duel.step(STEP); s.lateral = 0; s.headingError = 0; lead.speedMph = 215; lead.lateral = 0; lead.headingError = 0; lead.s = Math.max(lead.s, s.s + 20); }
  check(s.speedMph > CARS.falcone_f42.topSpeed + 1 && s.speedMph <= CARS.falcone_f42.topSpeed * 1.05 + .5, 'the tow lifts top speed, by no more than 5%');
  // Out of range: fades.
  lead.s = s.s + 60;
  for (let i = 0; i < 90; i++) { duel.step(STEP); lead.speedMph = 150; lead.lateral = 0; lead.s = Math.max(lead.s, s.s + 60); }
  equal(s.field.tow, 0, 'the tow fades once you are more than 30 m back');
  const side = start({ seed: 1989, fieldSeed: 9 });
  placeScene(side, [{ s: base + 200, lateral: 0, v: 150 }]);
  Object.assign(side.state, { s: base + 180, prevS: base + 180, lateral: 3.4, speedMph: 150 });
  for (let i = 0; i < 60; i++) { side.step(STEP); side.state.opponents[0].speedMph = 150; side.state.opponents[0].lateral = 0; side.state.opponents[0].s = Math.max(side.state.opponents[0].s, side.state.s + 20); }
  equal(side.state.field.tow, 0, 'more than 2.5 m to the side is out of the tow');
  // The tow adds 5% to top speed, and the player's cap is the same 5%.
  const free = start({ seed: 1989, fieldSeed: 9 }); placeScene(free, []);
  const topFree = (() => { Object.assign(free.state, { s: base, prevS: base, lateral: 0, speedMph: 190, headingError: 0 }); free.setInput({ throttle: 1 }); for (let i = 0; i < 240; i++) free.step(STEP); return free.state.speedMph; })();
  check(topFree <= CARS.falcone_f42.topSpeed + 1, 'without a tow you stay at the car\'s top speed');
  check(s.field.stats !== undefined && FIELD.towTopSpeed === .05 && FIELD.towRange === 30 && FIELD.towSide === 2.5, 'the tow is 30 m, 2.5 m and 5%');
}

// ---- catch-up ----
{
  const gap = CATCH_UP_GAP_SEC;
  equal(gap, 8, 'catch-up starts at 8 seconds');
  equal(catchUpFactor(FIELD_TUNING.hard, 30), 1, 'no catch-up on Hard');
  equal(catchUpFactor(FIELD_TUNING.medium, 5), 1, 'none within 8 seconds');
  close(catchUpFactor(FIELD_TUNING.medium, 20), .98, 1e-9, 'Medium: a racer far ahead eases off 2%');
  close(catchUpFactor(FIELD_TUNING.easy, 20), .96, 1e-9, 'Easy: 4%');
  check(catchUpFactor(FIELD_TUNING.medium, 9) > catchUpFactor(FIELD_TUNING.medium, 11), 'the easing comes in smoothly');
  check(FIELD_TUNING.easy.leaderMistakes > FIELD_TUNING.medium.leaderMistakes && FIELD_TUNING.hard.mistakes === 0, 'the Easy leader makes more mistakes; Hard none');
}

// ---- repeatable from seed and inputs ----
{
  const a = racing(start({ seed: 1989, fieldSeed: 31 })), b = racing(start({ seed: 1989, fieldSeed: 31 })), c = racing(start({ seed: 1989, fieldSeed: 32 }));
  for (const duel of [a, b, c]) { duel.setInput({ throttle: 1, steer: 0 }); run(duel, 25); }
  equal(fingerprint(a), fingerprint(b), 'the same seeds and inputs give the same race');
  check(fingerprint(a) !== fingerprint(c), 'another field seed gives another race');
  equal(a.state.field.stats.passes, b.state.field.stats.passes, 'including the passes');
}

// ---- finishing a short Grand Prix: everyone finishes, and the results name them ----
function oneLapApp(deferFinish) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const rows = new Map();
  globalThis.localStorage = { get length() { return rows.size; }, key: i => [...rows.keys()][i] ?? null,
    getItem: k => rows.get(k) ?? null, setItem: (k, v) => rows.set(k, String(v)), removeItem: k => rows.delete(k) };
  globalThis.cancelAnimationFrame ??= () => {};
  const app = new App();
  app.duel.featureFlags = createFeatureFlags({ storage: null, qa: false, search: '', overrides: { 'grand-prix': true } });
  app.startCampaign({ startStage: 0, seed: 1989, fieldSeed: 5, fieldSize: 7, mode: 'grandprix', car: 'falcone_f42',
    difficulty: 'casual', cpuDifficulty: 'medium' });
  // One lap keeps the test short; the rules are the same.
  app.duel.state.lapsTotal = 1; app.duel.course.raceLength = app.duel.course.length;
  app.autopilot = true; app._scriptedCrashDone = true;
  installTestDriver(app);
  app.duel.state.field.deferFinish = deferFinish;
  return { app, restore: () => { app.dispose(); if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage; } };
}
{
  const { app, restore } = oneLapApp(true);
  try {
    const duel = app.duel, s = duel.state;
    let guard = 0;
    while (guard++ < 60 * 150 && !(s.completedLaps >= 1 && s.opponents.every(r => r.finished))) app.advance(STEP, STEP);
    check(s.opponents.every(r => r.finished), 'every computer racer finishes');
    s.field.deferFinish = false;
    const rows = classify(duel);
    equal(rows.length, 8, 'eight rows in the finishing order');
    equal(new Set(rows.map(row => row.position)).size, 8, 'each position once');
    check(rows.every((row, i) => i === 0 || row.timeSec >= rows[i - 1].timeSec), 'in order of finishing time');
    check(rows.every(row => row.bestLapSec > 20 && row.carName && row.name && !row.projected), 'with names, cars and best laps');
    equal(rows[0].gapSec, 0, 'the winner has no gap');
    check(rows[1].gapSec > 0, 'and the rest have gaps behind');
    check(s.field.stats.crashes.length < 8, 'a clean race for most');
  } finally { restore(); }
}
{
  // The real ending: results appear when you cross the line, others still racing get a projected time.
  const { app, restore } = oneLapApp(false);
  try {
    const duel = app.duel, s = duel.state;
    let guard = 0;
    while (s.status !== 'stage_result' && guard++ < 60 * 150) app.advance(STEP, STEP);
    equal(s.status, 'stage_result', 'crossing the line ends your Grand Prix');
    const r = s.results;
    check(r.grandPrix && r.completed, 'the results are a Grand Prix result');
    equal(r.field.length, 8, 'the results list every car');
    equal(r.fieldSize, 8, 'out of eight');
    equal(r.won, r.position === 1, 'a win is first place');
    check(r.field.find(row => row.you).position === r.position, 'your row matches your position');
    check(r.field.every(row => row.name && row.carName), 'with names and cars');
    equal(r.creditReward, 0, 'no pay yet, that comes with the career card');
  } finally { restore(); }
}

// ---- what the screens show ----
{
  equal(shortRacerName('Mara Vale'), 'M. VALE', 'racers show as an initial and a surname');
  equal(shortRacerName('Dex Calloway'), 'D. CALLOWAY', 'the filler racer too');
  const duel = racing(start({ seed: 1989, fieldSeed: 31 }));
  run(duel, 6);
  const rows = runningOrderRows(duel.state.field);
  equal((rows.match(/<li/g) || []).length, 8, 'the running order lists all eight cars');
  check(rows.includes('class="you"') && rows.includes('>YOU<'), 'your row is lit');
  const result = { position: 3, fieldSize: 8, fastestLap: { name: 'Mara Vale', timeSec: 49.6, you: false }, field: classify(duel) };
  const table = fieldResultsTable({ field: classify(duel) }, value => value.toFixed(2));
  check(table.includes('<table') && (table.match(/<tr/g) || []).length === 9, 'the finishing table has a row for every car and a header');
  check(fieldResultsText({ ...result, position: 1 }, value => value.toFixed(2)).title.includes('WINNER'), 'the winner is told so');
  check(fieldResultsText({ ...result }, value => value.toFixed(2)).description.includes('3rd of 8'), 'and a third place says so');
}

// The follow-the-leader limit keeps a racer from driving into the car in front.
{
  const run1 = { spec: CARS.falcone_f42 };
  check(followLimitMph(run1, { gap: 5, speed: 0 }) < 40, 'a racer close behind a stopped car must be slow');
  check(followLimitMph(run1, { gap: 40, speed: 150 }) > 150, 'a racer with room behind a fast car can keep up');
  check(followLimitMph(run1, { gap: 3, speed: 150 }) < 150, 'but not tailgate');
}

console.log(`Racing a full field: ${checks} grid, start, passing, defending, tow, catch-up and repeatability checks passed.`);
