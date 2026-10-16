// WILD-SURVEY (docs/HELI_WILDLIFE.md section 4): the wildlife count. The job,
// the 800 m square, counting, scaring, coverage on the 20 m grid, the estimate,
// the pay and the rule that money moves once. Memory-only: no real save is
// read or written, and nothing here uses a clock or Math.random.
import assert from 'node:assert/strict';
import {createProfile} from '../src/progression.js';
import {HELI_RADIO_LINES} from '../src/heli/heli-radio-lines.js';
import * as wildlife from '../src/wildlife.js';
const {COURSE_SPECIES, RARE_CHANCE, SPECIES} = wildlife;
import {heliHash, createHeli, createMissions, heliOf, missionsOf, setMissions} from '../src/heli/heli-save.js';
import {
  HELI_DESTINATIONS, JOB_ROUTES, JOB_CARS, REAL_PAY_BONUS, JOBS_PER_DAY, RECOVERY, HOME_COURSE,
  dayJobs, jobPay, jobTitle, legFuelKg, destinationsFor, bearing, wreckFor, recoveryJob, recoveryTitle, recoveryJobOf,
  finishRecovery, surveyTitle, surveyJobOf, finishSurvey,
} from '../src/heli/heli-jobs.js';
import {
  SURVEY, SURVEY_PAY, SURVEY_TARGETS, SURVEY_NAMES, SURVEY_LINES, SURVEY_CELLS, SURVEY_REPORT_TOO_SOON,
  surveyCourses, surveyJob, planSurvey as planBare, createSurveyRun, isSurveyRun, stepSurvey, surveyShare, surveyPercent, canReport, reportSurvey,
} from '../src/heli/heli-survey.js';

// The session hands the species tables in; the tests do the same unless they say otherwise.
const planSurvey = (job, options = {}) => planBare(job, {wildlife, ...options});

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};

// Nothing in the count may use a clock or the page's own random numbers.
const real = {random: Math.random, now: Date.now, perf: globalThis.performance?.now};
function noClocks(fn) {
  Math.random = () => { throw new Error('Math.random used'); };
  Date.now = () => { throw new Error('Date.now used'); };
  if (globalThis.performance) globalThis.performance.now = () => { throw new Error('performance.now used'); };
  try { return fn(); } finally {
    Math.random = real.random; Date.now = real.now;
    if (globalThis.performance) globalThis.performance.now = real.perf;
  }
}

// ---- the switch-off proof: a fingerprint taken before this card -------------
// Every existing job-board answer (the day's jobs, the legs, the destinations
// and the recovery job), hashed. The value was taken from heli-jobs.js as it
// stood at RESCUE-ENGINE's merge, before the count was added.
const BOARD_FINGERPRINT = 3895189678;
function boardFingerprint() {
  const out = [];
  for (let d = 0; d < 60; d++) {
    const jobs = dayJobs(d);
    out.push(jobs, jobs.map(j => [jobPay(j), jobPay(j, 'real'), jobTitle(j)]));
  }
  out.push(HELI_DESTINATIONS, JOB_ROUTES, JOB_CARS, REAL_PAY_BONUS, JOBS_PER_DAY, RECOVERY, HOME_COURSE);
  for (const opts of [{}, {summitRun: true}]) {
    const table = destinationsFor(opts);
    out.push(Object.keys(table));
    for (const a of Object.keys(table)) for (const b of Object.keys(table)) out.push([legFuelKg(a, b, opts), bearing(a, b, opts)]);
  }
  for (let d = 1; d < 40; d++) {
    const wreck = wreckFor({seed: d * 7919, courseId: 'panorama-ridge', x: d, z: -d, day: d});
    out.push(wreck, recoveryTitle(recoveryJob(wreck, d + 1)));
    for (let age = -1; age <= 5; age++) out.push(recoveryJob(wreck, d + age));
    let p = createProfile('P');
    p = {...p, credits: 1000 * d, heli: {version: 1, playDay: {last: null, count: d + 1}}};
    p = setMissions(p, {...createMissions(), wreck}, {enabled: true}).profile;
    for (const enabled of [false, true]) for (const mode of ['assisted', 'real']) {
      out.push(recoveryJobOf(p, {enabled}), finishRecovery(p, {enabled, mode}));
    }
  }
  return heliHash(JSON.stringify(out));
}
equal(boardFingerprint(), BOARD_FINGERPRINT, 'the existing job board answers are what they were before the count');

// ---- the numbers, written once ---------------------------------------------
equal(SURVEY.size, 800, 'the square is 800 m'); equal(SURVEY.cell, 20, 'the grid is 20 m');
equal(SURVEY.countReach, 60, 'counting reaches 60 m sideways'); equal(SURVEY.countHeight, 150, 'counting to 150 m above the ground');
equal(SURVEY.scareHeight, 60, 'scared below 60 m'); equal(SURVEY.scareReach, 100, 'scared within 100 m');
equal(SURVEY.scareSeconds, 120, 'scared for 2 minutes'); equal(SURVEY.coverReach, 60, 'coverage reaches 60 m');
same([...SURVEY.minShare], [1, 4], 'a report needs a quarter'); same([...SURVEY.animals], [6, 14], '6 to 14 animals');
same([...SURVEY.herds], [2, 6], '2 to 6 herds'); equal(SURVEY_CELLS, 1600, '40 by 40 cells');
same(SURVEY_PAY.bands.map(b => [b.band, b.withinPercent, b.pay]), [['good', 20, 600], ['close', 40, 400]], 'within 20% pays 600, within 40% pays 400');
same([SURVEY_PAY.off.band, SURVEY_PAY.off.pay, SURVEY_PAY.rareBonus], ['off', 200, 100], 'further off pays 200; the rare animal adds 100');
ok(Object.isFrozen(SURVEY) && Object.isFrozen(SURVEY_PAY) && Object.isFrozen(SURVEY_TARGETS), 'the tables are frozen');
equal(RARE_CHANCE, 1 / 5, 'the rare animal is the races\' one in five');
for (const [courseId, rows] of Object.entries(SURVEY_TARGETS)) {
  const table = COURSE_SPECIES[courseId];
  ok(table, `${courseId} has animals`);
  for (const row of rows) {
    ok(table.common.some(r => r.species === row.species) || table.rare.species === row.species, `${row.species} lives at ${courseId}`);
    ok(SURVEY_NAMES[row.species], `${row.species} has a name`);
    ok(SPECIES[row.species].kind === 'ground', `${row.species} is counted from the air as a ground animal`);
  }
}
same(SURVEY_TARGETS['tremblant-woods'].map(r => r.species), ['moose', 'black-bear', 'white-tailed-deer'], 'Woods: moose, black bear or deer');
same(SURVEY_TARGETS['tremblant-snow'].map(r => r.species), ['white-tailed-deer', 'moose'], 'Snow: deer or moose');
same(SURVEY_TARGETS['panorama-ridge'].map(r => r.species), ['eastern-grey-kangaroo'], 'Panorama: kangaroos');
same(SURVEY_TARGETS['summit-run'].map(r => r.species), ['bighorn-sheep', 'cougar'], 'Summit: bighorn sheep or (rarely) cougar');
ok(SURVEY_TARGETS['summit-run'][1].weight < SURVEY_TARGETS['summit-run'][0].weight, 'the cougar is the rarer ask');
for (const course of ['tremblant-woods', 'tremblant-snow']) ok(!SURVEY_TARGETS[course].some(r => r.species === 'cougar'), `never a cougar at ${course}`);
for (const line of Object.values(SURVEY_LINES)) ok(HELI_RADIO_LINES[line], `${line} is a real radio line`);
same(surveyCourses(), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge'], 'no Summit Run with its switch off');
same(surveyCourses({summitRun: true}), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'summit-run'], 'Summit Run joins with its switch');

// ---- the day's job ----------------------------------------------------------
noClocks(() => {
  same(surveyJob(17), surveyJob(17), 'the same day gives the same job');
  same(surveyJob(17, {summitRun: true}), surveyJob(17, {summitRun: true}), '...also with Summit Run');
  ok(Object.isFrozen(surveyJob(3)), 'a job is frozen');
  equal(surveyJob(17).id, 's17', 'the job id is s<day>'); equal(surveyJob(17).kind, 'survey', 'its kind is survey');
  equal(surveyJob(17).pay, 600, 'the board shows the top band, 600');
  equal(surveyJob(-5).id, 's0', 'a bad day reads as day 0'); equal(surveyJob(NaN).id, 's0', 'NaN reads as day 0'); equal(surveyJob(2.5).id, 's0', 'a fraction reads as day 0');
  const seenSpecies = new Map(), seenCourses = new Map();
  let cougars = 0, sheep = 0;
  for (let day = 0; day < 600; day++) {
    const job = surveyJob(day);
    ok(surveyCourses().includes(job.courseId), 'the course is one of the three');
    ok(SURVEY_TARGETS[job.courseId].some(r => r.species === job.species), 'the species belongs to the course');
    equal(job.to, job.courseId, 'the job goes to the course');
    seenSpecies.set(`${job.courseId}:${job.species}`, true); seenCourses.set(job.courseId, (seenCourses.get(job.courseId) ?? 0) + 1);
    ok(job.species !== 'cougar', 'no cougar without Summit Run');
    const withSummit = surveyJob(day, {summitRun: true});
    ok(surveyCourses({summitRun: true}).includes(withSummit.courseId), 'with Summit Run the course is one of four');
    if (withSummit.courseId === 'summit-run') withSummit.species === 'cougar' ? cougars++ : sheep++;
  }
  equal(seenSpecies.size, 3 + 2 + 1, 'every ask at the three courses came up over 600 days');
  for (const course of surveyCourses()) near(seenCourses.get(course) / 600, 1 / 3, 0.07, `${course} is asked about a third of days`);
  ok(cougars > 0 && sheep > cougars * 2, `cougars are rare at Summit Run (${cougars} of ${cougars + sheep})`);
  near(cougars / (cougars + sheep), 1 / 5, 0.07, 'about one Summit Run count in five is a cougar');
  const days = new Set(Array.from({length: 40}, (_, d) => JSON.stringify(surveyJob(d)))); ok(days.size > 8, 'the job changes from day to day');
});
equal(surveyTitle(surveyJob(0)), `Count the ${SURVEY_NAMES[surveyJob(0).species]} at ${HELI_DESTINATIONS[surveyJob(0).courseId].name}`, 'the board title');
equal(surveyTitle({courseId: 'tremblant-woods', species: 'moose'}), 'Count the moose at Tremblant Woods', 'Count the moose at Tremblant Woods');
equal(surveyTitle({courseId: 'summit-run', species: 'bighorn-sheep'}), 'Count the bighorn sheep at Summit Run', 'Summit Run is named');
equal(surveyTitle({courseId: 'panorama-ridge', species: 'eastern-grey-kangaroo'}), 'Count the kangaroos at Panorama Ridge', 'kangaroos');

// ---- the square and its animals ----------------------------------------------
const SITE = {minX: -3000, maxX: 3000, minZ: -2000, maxZ: 4000};
const insideSquare = (a, sq) => a.x >= sq.x0 && a.x <= sq.x1 && a.z >= sq.z0 && a.z <= sq.z1;
noClocks(() => {
  const job = surveyJob(9, {summitRun: true});
  same(planSurvey(job, {site: SITE}), planSurvey(job, {site: SITE}), 'the same day and site give the same square and animals');
  ok(Object.isFrozen(planSurvey(job, {site: SITE})) && Object.isFrozen(planSurvey(job, {site: SITE}).animals[0]), 'a plan is frozen');
  const origin = planSurvey(job);
  equal(origin.square.x0, -400, 'with no site the square is centred on the origin (x)'); equal(origin.square.z0, -400, '...(z)');
  equal(origin.square.size, 800, 'the square is 800 m');
  equal(origin.square.x1 - origin.square.x0, 800, 'x1 is 800 m on'); equal(origin.square.z1 - origin.square.z0, 800, 'z1 is 800 m on');
  const narrow = planSurvey(job, {site: {minX: 0, maxX: 500, minZ: 0, maxZ: 5000}});
  equal(narrow.square.x0, -150, 'a site narrower than the square is centred on it');
  const seenX = new Set();
  let herdCounts = new Set(), totals = new Set(), withRare = 0, others = 0;
  for (let day = 0; day < 500; day++) {
    const j = surveyJob(day, {summitRun: true}), plan = planSurvey(j, {site: SITE});
    const sq = plan.square;
    ok(sq.x0 >= SITE.minX && sq.x1 <= SITE.maxX && sq.z0 >= SITE.minZ && sq.z1 <= SITE.maxZ, 'the square lies inside the site');
    seenX.add(Math.round(sq.x0));
    const targets = plan.animals.filter(a => a.role === 'target');
    equal(plan.truth, targets.length, 'the true number is the animals of the species');
    ok(plan.truth >= 6 && plan.truth <= 14, `the true number is 6 to 14 (${plan.truth})`);
    ok(targets.every(a => a.species === j.species), 'every counted animal is the species asked for');
    const herds = new Set(targets.map(a => a.herd)); herdCounts.add(herds.size); totals.add(plan.truth);
    ok(herds.size >= 2 && herds.size <= 6, `2 to 6 herds (${herds.size})`);
    ok(plan.animals.every(a => insideSquare(a, sq)), 'every animal stands in the square');
    equal(new Set(plan.animals.map(a => a.id)).size, plan.animals.length, 'animal ids are different');
    const inHerd = h => targets.filter(a => a.herd === h).length;
    ok([...herds].every(h => inHerd(h) >= 1), 'no empty herd');
    const wild = plan.animals.filter(a => a.role !== 'target');
    ok(wild.every(a => a.species !== j.species), 'other animals are never the species counted');
    ok(wild.every(a => !SPECIES[a.species].lake && SPECIES[a.species].kind !== 'decal'), 'no shore-bound or track animals in the square');
    const rare = plan.animals.filter(a => a.role === 'rare');
    if (rare.length) { withRare++; ok(rare.every(a => a.species === COURSE_SPECIES[j.courseId].rare.species), 'the rare animal is the course\'s own'); }
    others += plan.animals.filter(a => a.role === 'other').length;
    if (j.species === 'cougar') equal(rare.length, 0, 'a cougar count has no separate rare animal');
    equal(plan.rareSpecies, COURSE_SPECIES[j.courseId].rare.species, 'the plan names the course\'s rare animal');
  }
  ok(seenX.size > 100, 'the square moves about the site');
  same([...herdCounts].sort(), [2, 3, 4, 5, 6], 'every herd count from 2 to 6 comes up');
  same([...totals].sort((a, b) => a - b), [6, 7, 8, 9, 10, 11, 12, 13, 14], 'every true number from 6 to 14 comes up');
  near(withRare / 500, RARE_CHANCE, 0.07, 'the rare animal stands in about one square in five');
  ok(others > 400, 'other species stand in the square too');
  // A mixed day: the same day with another site gives other places, the same animals.
  const a = planSurvey(job, {site: SITE}), b = planSurvey(job, {site: {...SITE, minX: -2000}});
  same(a.animals.map(x => x.species), b.animals.map(x => x.species), 'the site moves the square, not what stands in it');
  equal(a.truth, b.truth, 'the true number is the day\'s, not the site\'s');
  // canStand is respected, and a square with hardly any good ground still holds the whole count.
  const lake = (x, z) => Math.hypot(x - a.square.cx, z - a.square.cz) > 300;
  const dry = planSurvey(job, {site: SITE, canStand: lake});
  ok(dry.animals.length > 0, 'animals are placed');
  const moved = planSurvey(job, {site: SITE, canStand: (x, z) => !(x > a.square.cx - 380 && x < a.square.cx + 380 && z > a.square.cz - 380 && z < a.square.cz + 380)});
  ok(moved.truth >= 6, 'a square with almost no standable ground still holds the whole count');
  const forbid = (x, z) => (Math.floor(x / 7) + Math.floor(z / 7)) % 2 === 0;
  const checker = planSurvey(job, {site: SITE, canStand: forbid});
  const good = checker.animals.filter(an => forbid(an.x, an.z)).length;
  ok(good / checker.animals.length > 0.9, `animals stand where they may (${good} of ${checker.animals.length})`);
});
// Without the species tables the square holds only the animals being counted.
{
  const bare = planBare(surveyJob(9), {site: SITE});
  ok(bare.animals.every(a => a.role === 'target'), 'no tables: no other species and no rare animal');
  equal(bare.rareSpecies, null, '...and no rare species named');
  same(bare.animals.map(a => a.id), planSurvey(surveyJob(9), {site: SITE}).animals.filter(a => a.role === 'target').map(a => a.id), 'the counted animals are the same with or without the tables');
  same(bare.animals.map(a => [a.x, a.z]), planSurvey(surveyJob(9), {site: SITE}).animals.filter(a => a.role === 'target').map(a => [a.x, a.z]), '...and stand in the same places');
}
// Nothing was drawn from the page's own random numbers; the race's generator is never touched.
{
  const before = Math.random;
  planSurvey(surveyJob(1), {site: SITE});
  equal(Math.random, before, 'planning does not touch Math.random');
}

// ---- counting, scaring and coverage ------------------------------------------
// A hand-made plan so each distance and height is exact.
const SQUARE = {x0: 0, z0: 0, x1: 800, z1: 800, size: 800, cx: 400, cz: 400};
function planOf(animals, truth = animals.filter(a => a.role === 'target').length) {
  return {jobId: 's1', courseId: 'tremblant-woods', species: 'moose', square: SQUARE, truth, rareSpecies: 'eastern-wolf',
    animals: animals.map((a, i) => ({id: `t${i}`, role: 'target', species: 'moose', herd: `t${i}`, ...a}))};
}
// Flies through points at a speed in steps of 1/hz, ending exactly on each point.
function fly(run, points, {agl = 100, speed = 30, hz = 30} = {}) {
  const events = [];
  let [px, pz] = points[0];
  events.push(...stepSurvey(run, {dt: 0, x: px, z: pz, agl}));
  for (const [x, z] of points.slice(1)) {
    const length = Math.hypot(x - px, z - pz), seconds = length / speed, steps = Math.max(1, Math.ceil(seconds * hz));
    for (let i = 1; i <= steps; i++) {
      const dt = i === steps ? seconds - (steps - 1) / hz : 1 / hz, u = i / steps;
      events.push(...stepSurvey(run, {dt, x: px + (x - px) * u, z: pz + (z - pz) * u, agl}));
    }
    px = x; pz = z;
  }
  return events;
}
const countedBy = (animals, points, options) => {
  const run = createSurveyRun(planOf(animals));
  fly(run, points, options);
  return run.count;
};
// An animal at (400, 400); the helicopter passes along z = 400 - side, from x = 0 to x = 800.
const pass = side => [[0, 400 - side], [800, 400 - side]];
noClocks(() => {
  // Counting distance: within 60 m sideways.
  equal(countedBy([{x: 400, z: 400}], pass(0)), 1, 'directly under the path: counted');
  equal(countedBy([{x: 400, z: 400}], pass(59)), 1, '59 m sideways: counted');
  equal(countedBy([{x: 400, z: 400}], pass(60)), 1, 'exactly 60 m sideways: counted');
  equal(countedBy([{x: 400, z: 400}], pass(60.5)), 0, '60.5 m sideways: not counted');
  equal(countedBy([{x: 400, z: 400}], pass(150)), 0, '150 m sideways: not counted');
  equal(countedBy([{x: 400, z: 400}], pass(-59)), 1, 'the other side too');
  // Counting height: no more than 150 m above the ground.
  equal(countedBy([{x: 400, z: 400}], pass(0), {agl: 150}), 1, 'at 150 m above the ground: counted');
  equal(countedBy([{x: 400, z: 400}], pass(0), {agl: 150.5}), 0, 'above 150 m: not counted');
  equal(countedBy([{x: 400, z: 400}], pass(0), {agl: 400}), 0, 'at 400 m: not counted');
  equal(countedBy([{x: 400, z: 400}], pass(0), {agl: 60}), 1, 'at exactly 60 m: not low enough to scare, counted');
  // Each animal counts once, however many passes.
  equal(countedBy([{x: 400, z: 400}], [[0, 400], [800, 400], [0, 400], [800, 400], [400, 400]]), 1, 'an animal counts once');
  equal(countedBy([{x: 400, z: 400}, {x: 420, z: 400}, {x: 600, z: 100}], pass(0)), 2, 'each animal in a herd counts; one far away does not');
  // Only the species asked for counts.
  {
    const run = createSurveyRun(planOf([{x: 400, z: 400}, {x: 410, z: 400, role: 'other', species: 'white-tailed-deer'}], 1));
    const events = fly(run, pass(0));
    equal(run.count, 1, 'other species do not count'); same(events.map(e => e.type), ['count'], 'only the counted animal clicks the shutter');
  }
  // The events: one count per animal, with its id.
  {
    const run = createSurveyRun(planOf([{x: 200, z: 400}, {x: 600, z: 400}]));
    const events = fly(run, pass(0));
    same(events.filter(e => e.type === 'count').map(e => e.id), ['t0', 't1'], 'the shutter clicks once each, in order');
  }
  // The same count at any frame rate, and for one huge step.
  for (const hz of [144, 60, 30, 5, 1, 0.1]) {
    equal(countedBy([{x: 100, z: 360}, {x: 400, z: 459}, {x: 700, z: 340}, {x: 500, z: 470}], pass(0), {hz}), 3, `the same animals count at ${hz} steps a second`);
  }
  {
    const run = createSurveyRun(planOf([{x: 400, z: 400}]));
    stepSurvey(run, {dt: 0, x: 0, z: 400, agl: 100}); stepSurvey(run, {dt: 60, x: 800, z: 400, agl: 100});
    equal(run.count, 1, 'one step across the whole square still counts what the path passed');
  }
  // A step with bad numbers changes nothing.
  {
    const run = createSurveyRun(planOf([{x: 400, z: 400}]));
    const before = JSON.stringify([run.time, run.last, run.coveredCells, run.count]);
    for (const bad of [{dt: -1, x: 400, z: 400, agl: 100}, {dt: NaN, x: 400, z: 400, agl: 100}, {dt: 1, x: Infinity, z: 400, agl: 100}, {dt: 1, x: 400, z: 400, agl: undefined}])
      same(stepSurvey(run, bad), [], 'a bad step gives no events');
    equal(JSON.stringify([run.time, run.last, run.coveredCells, run.count]), before, 'a bad step changes nothing');
  }

  // Scaring: below 60 m and within 100 m, and not countable for 2 minutes.
  const scareRun = (agl, side) => {
    const run = createSurveyRun(planOf([{x: 400, z: 400}]));
    const events = fly(run, pass(side), {agl});
    return {run, events};
  };
  {
    const low = scareRun(59, 0);
    equal(low.run.count, 0, 'flying at 59 m over an animal: scared, not counted');
    same(low.events.map(e => e.type), ['scare'], 'one scare event');
    equal(scareRun(60, 0).events.some(e => e.type === 'scare'), false, 'at 60 m: not low enough to scare');
    equal(scareRun(30, 99).events.some(e => e.type === 'scare'), true, '99 m away at 30 m high: scared');
    equal(scareRun(30, 100).events.some(e => e.type === 'scare'), true, '100 m away at 30 m high: scared');
    equal(scareRun(30, 101).events.some(e => e.type === 'scare'), false, '101 m away at 30 m high: not scared');
    // Scared before it could be counted: 60 m is inside 100 m.
    equal(scareRun(30, 60).run.count, 0, 'a low pass within counting reach counts nothing');
    equal(scareRun(30, 100).run.count, 0, '...and neither does one at the scare edge');
  }
  {
    // 2 minutes: scared at the time of the pass; return high and level.
    const base = () => {
      const run = createSurveyRun(planOf([{x: 400, z: 400}]));
      stepSurvey(run, {dt: 0, x: 400, z: 400, agl: 20});          // scares at time 0
      return run;
    };
    const waitThenPass = wait => {
      const run = base();
      stepSurvey(run, {dt: wait, x: 400, z: 400, agl: 100});      // high and level above it, after the wait
      return run.count;
    };
    equal(waitThenPass(119), 0, 'still hidden 119 s later');
    equal(waitThenPass(119.9), 0, 'still hidden at 119.9 s');
    equal(waitThenPass(120), 1, 'countable again after 120 s');
    equal(waitThenPass(300), 1, 'and later');
    // Another low pass starts the two minutes again.
    const again = base();
    stepSurvey(again, {dt: 100, x: 400, z: 400, agl: 20});
    stepSurvey(again, {dt: 100, x: 400, z: 400, agl: 100});
    equal(again.count, 0, 'frightened again at 100 s: 100 s later it is still hidden');
    stepSurvey(again, {dt: 20, x: 400, z: 400, agl: 100});
    equal(again.count, 1, '...and countable 120 s after the last fright');
    // One scare event per fright, not one per step.
    const run = createSurveyRun(planOf([{x: 400, z: 400}]));
    const events = fly(run, [[300, 400], [500, 400]], {agl: 20});
    equal(events.filter(e => e.type === 'scare').length, 1, 'a long low pass is one scare');
    // A counted animal stays counted when it is frightened later.
    const counted = createSurveyRun(planOf([{x: 400, z: 400}]));
    fly(counted, [[0, 400], [800, 400]], {agl: 100});
    fly(counted, [[800, 400], [400, 400]], {agl: 10});
    equal(counted.count, 1, 'a counted animal stays counted');
    // Other animals are frightened too: a rare one is not seen.
    const rareRun = createSurveyRun(planOf([{x: 200, z: 200, role: 'rare', species: 'eastern-wolf'}], 0));
    fly(rareRun, [[0, 200], [800, 200]], {agl: 20});
    equal(rareRun.rareSeen, false, 'a frightened rare animal is not seen');
    const rareOk = createSurveyRun(planOf([{x: 200, z: 200, role: 'rare', species: 'eastern-wolf'}], 0));
    const rareEvents = fly(rareOk, [[0, 200], [800, 200]], {agl: 100});
    equal(rareOk.rareSeen, true, 'a rare animal within counting reach is seen'); same(rareEvents.map(e => e.type), ['rare'], 'one rare event');
    equal(rareOk.count, 0, 'the rare animal is not in the tally');
    const rareFar = createSurveyRun(planOf([{x: 200, z: 200, role: 'rare', species: 'eastern-wolf'}], 0));
    fly(rareFar, [[0, 400], [800, 400]], {agl: 100});
    equal(rareFar.rareSeen, false, 'a rare animal too far away is not seen');
  }
});

// Coverage: how much of the square lay within 60 m of the path, on the 20 m grid.
function expectedCovered(points) {
  let n = 0;
  for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) {
    const cx = (i + 0.5) * 20, cz = (j + 0.5) * 20;
    let hit = false;
    for (let k = 1; k < points.length && !hit; k++) {
      const [ax, az] = points[k - 1], [bx, bz] = points[k], dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
      const t = len2 ? Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / len2)) : 0;
      hit = Math.hypot(cx - ax - dx * t, cz - az - dz * t) <= 60;
    }
    if (hit) n++;
  }
  return n;
}
noClocks(() => {
  const empty = createSurveyRun(planOf([]));
  equal(empty.coveredCells, 0, 'nothing is covered before the flight'); equal(surveyShare(empty), 0, 'no share'); equal(canReport(empty), false, 'no report yet');
  // One straight line across the middle.
  {
    const line = [[0, 400], [800, 400]], run = createSurveyRun(planOf([]));
    fly(run, line);
    equal(run.coveredCells, expectedCovered(line), 'one line covers the cells within 60 m of it');
    equal(run.coveredCells, 40 * 6, 'a 120 m wide strip of 20 m cells is 6 rows of 40');
    near(surveyShare(run), 0.15, 1e-9, 'a single line covers 15%'); equal(surveyPercent(run), 15, '...15% on the panel');
    equal(canReport(run), false, 'one line is under a quarter');
  }
  // Frame rate does not change the cover.
  for (const hz of [144, 30, 2, 0.2]) {
    const run = createSurveyRun(planOf([]));
    fly(run, [[100, 90], [700, 610]], {hz});
    equal(run.coveredCells, expectedCovered([[100, 90], [700, 610]]), `a slanted line covers the same cells at ${hz} steps a second`);
  }
  // Parallel lines 120 m apart cover all of it.
  {
    const lines = [];
    for (let k = 0; k < 7; k++) lines.push(k % 2 ? [[800, 60 + 120 * k], [0, 60 + 120 * k]] : [[0, 60 + 120 * k], [800, 60 + 120 * k]]);
    const run = createSurveyRun(planOf([]));
    for (const line of lines) fly(run, line);
    equal(run.coveredCells, 1600, 'lines 120 m apart cover the whole square');
    equal(surveyPercent(run), 100, '100% on the panel'); equal(canReport(run), true, 'reportable');
  }
  // Lines 240 m apart leave gaps; checked against the brute-force answer for the whole path.
  {
    const path = [[0, 100], [800, 100], [800, 340], [0, 340], [0, 580], [800, 580]];
    const run = createSurveyRun(planOf([]));
    fly(run, path);
    equal(run.coveredCells, expectedCovered(path), 'lines 240 m apart cover what is within 60 m of the path');
    ok(run.coveredCells > 400 && run.coveredCells < 1200, 'about half the square');
    equal(canReport(run), true, 'half the square can be reported');
  }
  // Outside the square covers nothing; partly in covers what is in.
  {
    const run = createSurveyRun(planOf([])); fly(run, [[-500, 400], [-100, 400]]);
    equal(run.coveredCells, 0, 'a path more than 60 m outside the square covers nothing');
    const edge = createSurveyRun(planOf([])); fly(edge, [[-50, 400], [-50, 500]]);
    ok(edge.coveredCells > 0 && edge.coveredCells < 40, 'a path just outside the edge covers a sliver');
    equal(edge.coveredCells, expectedCovered([[-50, 400], [-50, 500]]), '...the cells within 60 m');
  }
  // Cover grows only while the helicopter is at counting height (Director, 16 October); fright does not change it.
  {
    const high = createSurveyRun(planOf([])); fly(high, [[0, 400], [800, 400]], {agl: 400});
    equal(high.coveredCells, 0, 'a 400 m sweep covers 0 cells');
    const edge = createSurveyRun(planOf([])); fly(edge, [[0, 400], [800, 400]], {agl: 150.5});
    equal(edge.coveredCells, 0, 'just above 150 m covers nothing');
    const limit = createSurveyRun(planOf([])); fly(limit, [[0, 400], [800, 400]], {agl: 150});
    equal(limit.coveredCells, 240, 'at 150 m it covers');
    const low = createSurveyRun(planOf([])); fly(low, [[0, 400], [800, 400]], {agl: 100});
    equal(low.coveredCells, 240, 'a 100 m sweep covers as before');
    const scared = createSurveyRun(planOf([{x: 400, z: 400}])); fly(scared, [[0, 400], [800, 400]], {agl: 10});
    equal(scared.coveredCells, 240, 'low flying that frightens animals still covers');
    const mixed = createSurveyRun(planOf([]));
    fly(mixed, [[0, 400], [400, 400]], {agl: 400}); fly(mixed, [[400, 400], [800, 400]], {agl: 100});
    equal(mixed.coveredCells, expectedCovered([[400, 400], [800, 400]]), 'a mixed path covers only its low part');
    ok(mixed.coveredCells > 0 && mixed.coveredCells < 240, '...which is part of the strip');
    const quick = createSurveyRun(planOf([])); fly(quick, [[0, 100], [800, 100], [800, 300], [0, 300], [0, 500], [800, 500], [800, 700], [0, 700]], {agl: 300, speed: 80});
    equal(quick.coveredCells, 0, 'a quick high pass covers nothing');
    equal(reportSurvey(quick).ok, false, '...so it cannot be reported for the 200 minimum');
  }
  // Each cell counts once.
  {
    const run = createSurveyRun(planOf([])); fly(run, [[0, 400], [800, 400], [0, 400], [800, 400]]);
    equal(run.coveredCells, 240, 'flying a line twice covers it once');
    equal(run.covered.reduce((a, b) => a + b, 0), run.coveredCells, 'the count matches the grid');
  }
  // A quarter: exactly 400 cells.
  const cells = n => { const r = createSurveyRun(planOf([])); r.coveredCells = n; return r; };
  equal(canReport(cells(399)), false, '399 of 1600 cells is under a quarter'); equal(canReport(cells(400)), true, '400 of 1600 is a quarter');
  equal(canReport(cells(1600)), true, 'all of it can be reported');
});

// ---- the estimate and the pay -------------------------------------------------
function runWith({count, cellsCovered = SURVEY_CELLS, truth = 10, rare = false}) {
  const run = createSurveyRun({...planOf([]), truth});
  run.count = count; run.coveredCells = cellsCovered; run.rareSeen = rare;
  return run;
}
{
  const report = r => reportSurvey(r);
  equal(report(runWith({count: 7, cellsCovered: 800})).estimate, 14, 'the estimate is the count over the share: 7 over a half is 14');
  equal(report(runWith({count: 5, cellsCovered: 400})).estimate, 20, '5 over a quarter is 20');
  equal(report(runWith({count: 9})).estimate, 9, 'all covered: the count itself');
  equal(report(runWith({count: 7, cellsCovered: 1000})).estimate, 11, 'rounded: 11.2 is 11');
  equal(report(runWith({count: 3, cellsCovered: 640})).estimate, 8, 'rounded: 7.5 is 8');
  equal(report(runWith({count: 0, cellsCovered: 900})).estimate, 0, 'nothing counted: an estimate of 0');
  near(report(runWith({count: 7, cellsCovered: 800})).share, 0.5, 1e-12, 'the report carries the share');
  const bad = report(runWith({count: 3, cellsCovered: 399}));
  equal(bad.ok, false, 'under a quarter: no report'); equal(bad.reason, SURVEY_REPORT_TOO_SOON, '...and why');
  equal(report(runWith({count: 3, cellsCovered: 400})).ok, true, 'a quarter: a report');
  // Pay bands (truth 10: 20% is 2, 40% is 4).
  const pay = (estimate, truth = 10, rare = false) => report(runWith({count: estimate, truth, rare}));
  for (const [estimate, band, money] of [[10, 'good', 600], [8, 'good', 600], [12, 'good', 600], [7, 'close', 400], [13, 'close', 400],
    [6, 'close', 400], [14, 'close', 400], [5, 'off', 200], [15, 'off', 200], [0, 'off', 200], [40, 'off', 200]]) {
    const r = pay(estimate);
    same([r.band, r.basePay, r.pay, r.line], [band, money, money, SURVEY_LINES[band]], `truth 10, estimate ${estimate}: ${band} pays ${money}`);
  }
  // The edge is exact for a true number that does not divide into fifths.
  for (const [estimate, band] of [[6, 'good'], [8, 'good'], [5, 'close'], [9, 'close'], [4, 'off'], [10, 'off']]) {
    equal(pay(estimate, 7).band, band, `truth 7, estimate ${estimate}: ${band}`);
  }
  equal(pay(12, 6).band, 'off', 'truth 6, estimate 12: double is off');
  equal(pay(10, 14).band, 'close', 'truth 14, estimate 10: 28.6% off is close');
  // The rare bonus: 100 more.
  same([pay(10, 10, true).pay, pay(10, 10, true).rareBonus, pay(10, 10, true).rare], [700, 100, true], 'good + rare is 700');
  equal(pay(7, 10, true).pay, 500, 'close + rare is 500'); equal(pay(0, 10, true).pay, 300, 'off + rare is 300');
  equal(pay(10).rareBonus, 0, 'no rare animal, no bonus');
  equal(pay(10).truth, 10, 'the report names the true number');
  // A report changes nothing.
  const frozenRun = runWith({count: 4, cellsCovered: 800}), snapshot = JSON.stringify([frozenRun.count, frozenRun.coveredCells, frozenRun.time, frozenRun.rareSeen]);
  report(frozenRun); report(frozenRun);
  equal(JSON.stringify([frozenRun.count, frozenRun.coveredCells, frozenRun.time, frozenRun.rareSeen]), snapshot, 'reporting does not change the run');
}

// ---- the whole count, flown -------------------------------------------------------
function flyLines(run, spacing, {agl = 100, hz = 30, speed = 40} = {}) {
  const events = [];
  let k = 0;
  for (let z = 60; z < 800 + 1e-9; z += spacing, k++) {
    events.push(...fly(run, k % 2 ? [[800, z], [0, z]] : [[0, z], [800, z]], {agl, hz, speed}));
  }
  return events;
}
const SQUARE_AT_ORIGIN = {minX: 0, maxX: 800, minZ: 0, maxZ: 800};
noClocks(() => {
  let rareSeen = 0, perfect = 0;
  for (let day = 0; day < 120; day++) {
    const job = surveyJob(day, {summitRun: true}), plan = planSurvey(job, {site: SQUARE_AT_ORIGIN});
    const run = createSurveyRun(plan), events = flyLines(run, 120);
    equal(run.coveredCells, 1600, 'parallel lines 120 m apart cover all of it');
    equal(run.count, plan.truth, `lines 120 m apart count every animal (day ${day})`);
    equal(events.filter(e => e.type === 'count').length, plan.truth, 'one shutter click each');
    ok(!events.some(e => e.type === 'scare'), 'high and level: nothing scared');
    const report = reportSurvey(run);
    equal(report.estimate, plan.truth, 'the estimate is the true number'); equal(report.band, 'good', 'good'); perfect++;
    const hasRare = plan.animals.some(a => a.role === 'rare');
    equal(report.rare, hasRare, 'the rare bonus goes with a rare animal in the square');
    equal(report.pay, 600 + (hasRare ? 100 : 0), 'the pay');
    if (hasRare) rareSeen++;
  }
  ok(perfect === 120 && rareSeen > 5, `${rareSeen} of 120 squares held a rare animal`);
  // The sampling lesson: cover only part, count that part, divide by the share.
  let good = 0, tried = 0;
  for (let day = 0; day < 120; day++) {
    const plan = planSurvey(surveyJob(day), {site: SQUARE_AT_ORIGIN}), run = createSurveyRun(plan);
    for (let k = 0, z = 60; z < 800; z += 240, k++) fly(run, k % 2 ? [[800, z], [0, z]] : [[0, z], [800, z]]);
    const r = reportSurvey(run);
    ok(r.ok, 'two thirds of the lines still allow a report');
    tried++; if (r.band !== 'off') good++;
  }
  ok(good > tried * 0.4, `sampling half the square often lands within 40% (${good} of ${tried})`);
  // Flying too low scares and spoils the count.
  const plan = planSurvey(surveyJob(4), {site: SQUARE_AT_ORIGIN}), low = createSurveyRun(plan);
  const events = flyLines(low, 120, {agl: 30});
  ok(events.some(e => e.type === 'scare'), 'low flying scares animals'); equal(low.count, 0, 'and nothing is counted');
  equal(reportSurvey(low).band, 'off', 'a spoiled count pays the least'); equal(reportSurvey(low).pay, 200, '200 credits');
  // The same flight at another frame rate gives the same answer.
  const slow = createSurveyRun(plan), fast = createSurveyRun(plan);
  flyLines(slow, 120, {hz: 4}); flyLines(fast, 120, {hz: 120});
  same([slow.count, slow.coveredCells], [fast.count, fast.coveredCells], 'the same flight gives the same count at 4 and 120 steps a second');
  // Starting again the same day: a new run from the same plan is clean.
  const again = createSurveyRun(plan);
  same([again.count, again.coveredCells, again.time, again.rareSeen], [0, 0, 0, false], 'a new run starts clean');
  ok(plan.animals.every((a, i) => again.animals[i].counted === false && again.animals[i].scaredUntil === 0), 'no animal remembers the last attempt');
  same(planSurvey(surveyJob(4), {site: SQUARE_AT_ORIGIN}), plan, 'and the day gives the same square and animals again');
});

// ---- money moves once --------------------------------------------------------------
const profileOn = (day, extra = {}) => {
  const p = createProfile('P');
  return {...p, credits: 1000, heli: {version: 1, playDay: {last: null, count: day}, ...extra}};
};
function goodRunFor(profile, {site = SQUARE_AT_ORIGIN} = {}) {
  const job = surveyJobOf(profile, {enabled: true});
  const plan = planSurvey(job, {site}), run = createSurveyRun(plan);
  noClocks(() => flyLines(run, 120));
  return {job, plan, run, report: reportSurvey(run)};
}
{
  const profile = profileOn(5);
  // Switch off: no job, nothing paid, the profile is handed back as it was.
  equal(surveyJobOf(profile, {enabled: false}), null, 'switch off: no count on the board');
  equal(surveyJobOf(profile, {}), null, 'no switch given: no count');
  equal(surveyJobOf(profile, {enabled: 'yes'}), null, 'only true switches it on');
  const {run} = goodRunFor(profile);
  const off = finishSurvey(profile, run, {enabled: false});
  equal(off.ok, false, 'switch off: no pay'); equal(off.profile, profile, 'switch off: the same profile, untouched');

  const job = surveyJobOf(profile, {enabled: true});
  same(job, surveyJob(5), 'today\'s job is the day\'s job'); equal(job.id, 's5', '...for play day 5');
  same(surveyJobOf(profile, {enabled: true, summitRun: true}), surveyJob(5, {summitRun: true}), 'Summit Run joins with its switch');
  const first = finishSurvey(profile, run, {enabled: true});
  const report = reportSurvey(run);
  ok(first.ok, 'the first report is paid'); equal(first.paid, report.pay, 'it pays the report\'s pay');
  equal(first.profile.credits, 1000 + report.pay, 'the credits rise by the pay');
  equal(missionsOf(first.profile).wildlifeCounts, 1, 'one more toward the wildlife skin');
  same(heliOf(first.profile).survey, {day: 5, done: true}, 'today\'s count is marked done');
  same(first.job, job, 'the job comes back'); same(first.report, report, 'and the report');
  // A second press, a replay with the same run, or the same run on a copy of the profile: no pay.
  const second = finishSurvey(first.profile, run, {enabled: true});
  equal(second.ok, false, 'a second report the same day is refused'); equal(second.profile, first.profile, '...and changes nothing');
  equal(second.profile.credits, first.profile.credits, 'no second pay');
  equal(missionsOf(second.profile).wildlifeCounts, 1, 'no second tally');
  equal(surveyJobOf(first.profile, {enabled: true}), null, 'the count leaves the board once finished');
  // Nothing but the pay, the tally and the day changed.
  const before = profileOn(5, {missions: {...createMissions(), seed: 77, firesOut: 3, badges: ['firefighter'], hoists: 2, wildlifeCounts: 4}});
  const paid = finishSurvey(before, goodRunFor(before).run, {enabled: true});
  const m = missionsOf(paid.profile);
  same([m.seed, m.firesOut, m.badges, m.hoists, m.wildlifeCounts], [77, 3, ['firefighter'], 2, 5], 'an earlier tally goes up by one; other fields stay');
  equal(paid.profile.name ?? null, before.name ?? null, 'the rest of the profile is as it was');
  // The next play day brings a new count, and it pays again.
  const next = {...first.profile, heli: {...first.profile.heli, playDay: {last: null, count: 6}}};
  equal(surveyJobOf(next, {enabled: true})?.id, 's6', 'the next play day has a new count');
  const nextPaid = finishSurvey(next, goodRunFor(next).run, {enabled: true});
  ok(nextPaid.ok && missionsOf(nextPaid.profile).wildlifeCounts === 2, 'and it adds a second toward the skin');
  // A run for another day's job is refused.
  const stale = finishSurvey(next, run, {enabled: true});
  equal(stale.ok, false, 'yesterday\'s run does not pay on the next day'); equal(stale.profile, next, '...and changes nothing');
  equal(finishSurvey(profile, null, {enabled: true}).ok, false, 'no run, no pay');
  equal(finishSurvey(profile, {...run, jobId: 's99'}, {enabled: true}).ok, false, 'a run for another job does not pay');
  // A hand-made object never pays, whatever it says.
  {
    const forged = {jobId: 's5', plan: {jobId: 's5', courseId: job.courseId, species: job.species, truth: 10}, count: 10, coveredCells: 400, rareSeen: true};
    const f = finishSurvey(profile, forged, {enabled: true});
    equal(f.ok, false, 'a forged run pays nothing'); equal(f.profile, profile, '...and changes nothing');
    equal(reportSurvey(forged).ok, false, 'a forged run cannot be reported');
    equal(reportSurvey({...run}).ok, false, 'a copy of a real run is not a real run');
    equal(finishSurvey(profile, {...run}, {enabled: true}).ok, false, 'a copy of a real run does not pay');
    equal(isSurveyRun(run), true, 'a real run is one'); equal(isSurveyRun(null), false, 'null is not');
    equal(finishSurvey(profile, run, {enabled: true}).ok, true, 'the real run still pays');
    // A run planned for another course or species on the same day does not pay.
    let found = null;
    for (let day = 0; day < 200 && !found; day++) {
      const p = profileOn(day), withSummit = surveyJobOf(p, {enabled: true, summitRun: true}), without = surveyJobOf(p, {enabled: true});
      if (withSummit.courseId !== without.courseId) found = {p, withSummit};
    }
    ok(found, 'a day exists where Summit Run changes the course');
    const summitRun = createSurveyRun(planSurvey(found.withSummit, {site: SQUARE_AT_ORIGIN}));
    noClocks(() => flyLines(summitRun, 120));
    const refusedOff = finishSurvey(found.p, summitRun, {enabled: true});
    equal(refusedOff.ok, false, 'a Summit Run count is refused with Summit Run off'); equal(refusedOff.profile, found.p, '...and changes nothing');
    equal(finishSurvey(found.p, summitRun, {enabled: true, summitRun: true}).ok, true, '...and pays with it on');
    const wrongSpecies = createSurveyRun(planSurvey({...job, species: job.species === 'moose' ? 'black-bear' : 'moose'}, {site: SQUARE_AT_ORIGIN}));
    noClocks(() => flyLines(wrongSpecies, 120));
    equal(finishSurvey(profile, wrongSpecies, {enabled: true}).ok, false, 'a run for another species the same day does not pay');
  }
  // Too little covered: no pay, not marked done, and it can be tried again.
  const thin = createSurveyRun(planSurvey(surveyJob(5), {site: SQUARE_AT_ORIGIN}));
  noClocks(() => fly(thin, [[0, 400], [800, 400]]));
  const refused = finishSurvey(profile, thin, {enabled: true});
  equal(refused.ok, false, 'under a quarter covered: refused'); equal(refused.reason, SURVEY_REPORT_TOO_SOON, '...with the reason');
  equal(refused.profile, profile, '...and the profile unchanged');
  ok(surveyJobOf(profile, {enabled: true}), 'the count is still on the board to try again');
  const retry = finishSurvey(profile, run, {enabled: true});
  ok(retry.ok, 'a better run the same day is paid');
  // Pay is the same in Assisted and Real, and capped like every credit change.
  const real = finishSurvey(profile, run, {enabled: true, mode: 'real'});
  equal(real.paid, first.paid, 'Real pays the same as Assisted');
  const rich = finishSurvey({...profile, credits: 999_999_900}, run, {enabled: true});
  equal(rich.profile.credits, 1_000_000_000, 'capped like every credit change'); equal(rich.paid, 100, 'only the room left is paid');
  const broke = finishSurvey({...profile, credits: undefined}, run, {enabled: true});
  equal(broke.profile.credits, report.pay, 'no wallet reads as nothing');
  // A new helicopter with no field reads as play day 0.
  equal(surveyJobOf({credits: 0}, {enabled: true}).id, 's0', 'a profile with no helicopter field has the day 0 count');
  // A survey record from another day does not hide today's count.
  equal(surveyJobOf(profileOn(5, {survey: {day: 4, done: true}}), {enabled: true})?.id, 's5', 'yesterday\'s finished count does not hide today\'s');
  equal(surveyJobOf(profileOn(5, {survey: {day: 5, done: false}}), {enabled: true})?.id, 's5', 'a count not done is still on the board');
  equal(surveyJobOf(profileOn(5, {survey: {day: 5, done: true}}), {enabled: true}), null, 'a count done today is not');
}

// ---- the existing board is untouched ------------------------------------------------
{
  const profile = profileOn(22);
  same(dayJobs(22).map(j => j.id), ['d22-1', 'd22-2', 'd22-3'], 'the day\'s three jobs do not move');
  equal(boardFingerprint(), BOARD_FINGERPRINT, 'the job board is still byte for byte what it was');
  const before = JSON.stringify(profile);
  surveyJobOf(profile, {enabled: false}); finishSurvey(profile, null, {enabled: false});
  equal(JSON.stringify(profile), before, 'nothing in the count changes a profile it is given');
}

console.log(`test-heli-survey: ${checks} checks passed`);
