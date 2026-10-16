// Balance check for racing a full field (docs/CIRCUITS.md 3.2, card P4-FIELD).
// Runs seeded Grand Prix races on Pacific Canyon with the standard scripted
// driver as the player and reports, per difficulty:
//   - how many computer racers finish (target: at least 95%),
//   - first-lap pile-ups, three or more cars crashing in the first 30 s
//     (target: at most 1 race in 20),
//   - passes between computer racers per race (target: at least 3 on Medium),
//   - how often the scripted driver wins (Easy 60 to 80%, Medium 30 to 50%,
//     Hard 10 to 25%).
// Saves are memory-only. Usage:
//   node tools/race-field-balance.mjs [--races 30] [--jobs 8] [--difficulty easy,medium,hard]
//     [--course tremblant-woods] [--check] [--json] [--car falcone_f42] [--probe DIFFICULTY,INDEX]
// --course names an authored circuit (src/circuits/); it joins COURSE for the run
// only, as in the circuit tests. The default is Pacific Canyon.
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createFeatureFlags } from '../src/feature-flags.js';
import { App } from '../src/app.js';
import { COURSE, DRIVE, steerForYaw } from '../src/config.js';
import { ALL_CIRCUITS } from '../src/circuits/index.js';
import { racingLineFor, buildSpeedProfile } from '../src/race-lines.js';
import { courseHasWinterSurfaces } from '../src/race-surfaces.js';

export const DIFFICULTIES = ['easy', 'medium', 'hard'];
// The three audited routes give different layouts; the field seed varies
// everything else (grid order, starts, mistakes, pace rolls).
const ROUTE_SEEDS = [1989, 42, 17];
export const TARGETS = Object.freeze({
  finishShare: .95,
  pileUpRate: 1 / 20,
  mediumPasses: 3,
  winRate: Object.freeze({ easy: [.6, .8], medium: [.3, .5], hard: [.1, .25] }),
});
export const raceSeeds = index => ({ seed: ROUTE_SEEDS[index % ROUTE_SEEDS.length], fieldSeed: (1000 + index * 7919) >>> 0 });

function memoryStorage() {
  const rows = new Map();
  return {
    get length() { return rows.size; },
    key(index) { return [...rows.keys()][index] ?? null; },
    getItem(key) { return rows.get(key) ?? null; },
    setItem(key, value) { rows.set(key, String(value)); },
    removeItem(key) { rows.delete(key); },
  };
}

// One race from the grid to the last racer home (or the time cap).
// An authored circuit that is not on COURSE (its switch is off) is added for the run.
export function stageOf(courseId) {
  if (!courseId) return 0;
  let at = COURSE.findIndex(item => item.id === courseId);
  if (at < 0) {
    const circuit = ALL_CIRCUITS.find(item => item.id === courseId);
    if (!circuit) throw Error(`Unknown course ${courseId}`);
    at = COURSE.push(circuit) - 1;
  }
  return at;
}

export function runRace(cpuDifficulty, index, { car = 'falcone_f42', maxSec = null, fieldSize = 7, startStage = 0, course = null, flags = [], onStep = null } = {}) {
  if(!Array.isArray(flags)||flags.some(flag=>flag!=='tyre-slip')) throw Error('Unsupported field flags.');
  const { seed, fieldSeed } = raceSeeds(index);
  if (course) startStage = stageOf(course);
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
  let app;
  try {
    globalThis.localStorage = memoryStorage();
    globalThis.cancelAnimationFrame ??= () => {};
    app = new App();
    app.duel.featureFlags = createFeatureFlags({ storage: null, qa: false, search: '', overrides: { 'grand-prix': true, ...Object.fromEntries(flags.map(flag=>[flag,true])) } });
    // A new circuit costs credits: the memory-only test profile buys it first.
    if (course) {
      app.profile = { ...app.profile, credits: 1e6 }; app._saveProfile();
      if (!app.purchaseCourse(course).ok) throw Error(`Could not unlock ${course}`);
    }
    // The test driver picks winter tyres on a course with snow or ice, as a player would on the setup.
    const tyre = courseHasWinterSurfaces(COURSE[startStage]) ? 'winter' : undefined;
    if (!app.startCampaign({ startStage, seed, fieldSeed, fieldSize, mode: 'grandprix', car, difficulty: 'casual', cpuDifficulty, ...(tyre ? { tyre } : {}) }))
      throw Error(`Could not start ${cpuDifficulty} race ${index}`);
    app.autopilot = true;
    app._scriptedCrashDone = true;
    installTestDriver(app);
    const duel = app.duel, state = duel.state;
    state.field.deferFinish = true;
    // A long authored circuit needs longer than the 7 minutes that suit a three-lap Pacific Canyon.
    if (maxSec == null) maxSec = duel.course.script ? Math.max(420, duel.course.raceLength / 14) : 420;
    const started = performance.now();
    const step = 1 / 60;
    let sinceGo = 0;
    while (state.status === 'racing' || state.status === 'countdown') {
      app.advance(step, step);
      if (state.status === 'racing') sinceGo += step;
      onStep?.(duel);
      const done = state.completedLaps >= state.lapsTotal && state.opponents.every(r => r.finished);
      if (done || sinceGo > maxSec) break;
    }
    const field = state.field, stats = field.stats;
    const playerTime = stats.playerFinish ?? null;
    const times = state.opponents.map(r => (r.finished ? +r.lapStartedAt.toFixed(3) : null));
    const best = Math.min(...[playerTime, ...times].filter(t => t != null));
    // A racer that has not finished well after the winner counts as stuck.
    const cutoff = best * 1.5 + 30;
    const finished = times.filter(t => t != null && t <= cutoff).length;
    const faster = times.filter(t => t != null && playerTime != null && t < playerTime).length;
    const slower = times.filter(t => t == null).length;
    const position = playerTime == null ? state.opponents.length + 1 : 1 + faster;
    const first30 = new Set(stats.crashes.filter(crash => crash.t <= 30).map(crash => crash.index));
    return {
      ...(flags.length ? {flags,tyreSlipRules:state.tyreSlipRules} : {}),
      cpuDifficulty, index, seed, fieldSeed, racers: state.opponents.length, finished,
      playerTime, position, won: position === 1, unfinished: slower,
      passes: stats.passes, passesAfterStart: stats.passesAfterStart,
      crashes: stats.crashes.length, crashingCarsInFirst30: first30.size, pileUp: first30.size >= 3,
      recoveries: stats.recoveries, lapTimes: [...state.lapTimes],
      names: state.opponents.map(r => `${r.name} (${r.car})`),
      bestAi: +Math.min(...times.filter(t => t != null)).toFixed(2),
      simSec: +(state.stageTimeSec).toFixed(1), wallSec: +((performance.now() - started) / 1000).toFixed(1),
    };
  } finally {
    try { app?.dispose(); } finally {
      if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
      else delete globalThis.localStorage;
      if (previousCancel) Object.defineProperty(globalThis, 'cancelAnimationFrame', previousCancel);
      else delete globalThis.cancelAnimationFrame;
    }
  }
}

// The scripted driver, made to race among other cars. Its pace is the standard
// autopilot's (same cornering and braking); on top of that it keeps to a free
// lane and does not drive into the car ahead. Only legal driver inputs are used.
// On an authored circuit (src/circuits/) the standard autopilot cannot be used as it
// is: it judges a corner from three points ahead and cannot brake for a hairpin
// at the end of a long straight. There the driver takes its line and speed from
// the circuit's racing line: the speed profile the computer racers use, built for
// the player's own car at LINE_SKILL of its limit (the standard autopilot is at
// about .93 on Pacific Canyon).
export const LINE_SKILL = Number(process.env.LINE_SKILL) || .86;
export function installTestDriver(app, { lineSkill = LINE_SKILL } = {}) {
  const base = app._driveAutopilot.bind(app);
  let lane = null, laneSince = -Infinity, stuck = 0, profile = null, profileCourse = null;
  app._driveAutopilot = dt => {
    base(dt);
    const duel = app.duel, state = duel.state;
    if (state.status !== 'racing' || state.impactTimer > 0 || state.input == null) return;
    // Pushed far off the road and stuck, the marshals put the scripted driver back, as they do the computer racers.
    stuck = state.speedMph < 8 && state.stageTimeSec > 8 ? stuck + dt : 0;
    if (stuck > 4) { duel._safeReset(state); stuck = 0; state.field.stats.playerRecoveries = (state.field.stats.playerRecoveries || 0) + 1; }
    const halfWidth = duel.course.roadHalfWidthAt?.(state.s) ?? DRIVE.roadHalfWidth;
    const line = duel.course.script ? duel.course.racingLine : null;
    const metres = Math.max(15, state.speedMph * DRIVE.mphToWorld);
    const cruise = line ? clampTo(line.offsetAt(state.s + Math.max(12, metres * .45)), halfWidth - 1.8) : -Math.min(DRIVE.laneOffset, halfWidth * .48);
    const cars = state.opponents.filter(car => !car.finished && !car.crushed).map(car => {
      const ds = duel.relativeS(car.s, state.s) - state.s;
      return { car, ds, lateral: car.lateral, speed: car.speedMph };
    });
    // On an authored circuit only a car alongside or just behind blocks a move (the pack is tight there).
    const behind = line ? -7 : -16, wide = line ? 2.7 : 3.1;
    const free = candidate => cars.every(item => !(item.ds > behind && item.ds < 40 + Math.max(0, state.speedMph - item.speed) * DRIVE.mphToWorld * 1.2 &&
      Math.abs(item.lateral - candidate) < wide));
    if (lane == null || line || state.stageTimeSec - laneSince > .8) {
      const options = [cruise, cruise - 1.6, cruise + 1.8, ...(line ? [cruise - 3, cruise + 3.2, cruise - 4.2, cruise + 4.4] : [0, 3.4, 4.8, -4.8])].filter(value => Math.abs(value) <= halfWidth - 1.8)
        .sort((a, b) => Math.abs(a - cruise) - Math.abs(b - cruise));
      const pick = options.find(free) ?? cruise;
      if (pick !== lane) { lane = pick; laneSince = state.stageTimeSec; }
    }
    // The base driver's heading controller, aimed at the chosen lane.
    const frame = duel.course.at(state.s);
    const headingTarget = Math.atan((lane - state.lateral) * 2.5 / metres);
    const look = duel.course.at(state.s + metres * .18);
    let desiredYaw = look.curvature * metres + (headingTarget - state.headingError) * 6;
    if (line) {
      // The computer racers' own controller: follow the line's heading and bend.
      const raceLine = racingLineFor(duel.course), ahead = state.s + Math.max(6, metres * .3);
      const wanted = raceLine.relHeadingAt(ahead) + Math.atan((lane - state.lateral) * 2.4 / Math.max(15, metres));
      const error = Math.atan2(Math.sin(Math.max(-1.2, Math.min(1.2, wanted)) - state.headingError), Math.cos(Math.max(-1.2, Math.min(1.2, wanted)) - state.headingError));
      desiredYaw = raceLine.curvatureAt(ahead) * metres + error * 6;
    }
    const surface = duel._drivingSurface(state.s, state.lateral);
    let { throttle, brake } = state.input;
    if (line) {
      // The same speed profile the computer racers use, built for the player's own car.
      if (profileCourse !== duel.course) {
        profileCourse = duel.course;
        profile = buildSpeedProfile(racingLineFor(duel.course), duel.car, { cornerFactor: lineSkill, topFactor: 1 });
      }
      const surfaceNow = duel._drivingSurface(state.s, state.lateral);
      const aim = Math.min(surfaceNow.speedLimit, duel.car.topSpeed * .97, profile.at(state.s + metres * .05) * Math.sqrt(surfaceNow.traction || 1));
      throttle = state.speedMph < aim ? 1 : 0;
      brake = state.speedMph > aim + 3 ? Math.min(1, (state.speedMph - aim) / 14) : 0;
    }
    // Do not run into the car ahead in the lane being driven.
    let cap = Infinity;
    // A circuit that asks its racers for more room (`fieldFollow`) gets the same care from this driver:
    // it watches the lane it is moving to too, keeps the first-lap gap and allows for a leader that brakes hard.
    const care = duel.course.def.fieldFollow;
    for (const item of cars) {
      const beside = care ? Math.min(Math.abs(item.lateral - state.lateral), Math.abs(item.lateral - lane)) : Math.abs(item.lateral - state.lateral);
      if (item.ds <= 0 || beside > 2.9) continue;
      const gap = item.ds - 4.7;
      const comfortable = DRIVE.brakeAccel * duel.car.braking * .62 * DRIVE.mphToWorld;
      const lead = item.speed * DRIVE.mphToWorld;
      const room = Math.max(0, gap - (care && state.completedLaps === 0 && care.firstLap?.margin || 2.2)) + lead * lead / (2 * comfortable * (care?.leadBraking ?? 1.15));
      cap = Math.min(cap, comfortable * (-.22 + Math.sqrt(.22 * .22 + 2 * room / comfortable)) / DRIVE.mphToWorld);
    }
    if (state.speedMph > cap) { throttle = 0; brake = Math.max(brake, Math.min(1, (state.speedMph - cap) / 12)); }
    const steer = steerForYaw(desiredYaw, {speedMph:state.speedMph,grip:duel.car.grip,traction:surface.traction,car:duel.car,brake:brake,tyreSlip:state.tyreSlipRules===true&&!state.airborne&&state.speedMph>=0});
    duel.setInput({ throttle, brake, steer, boost: false });
  };
}

const clampTo = (value, limit) => Math.max(-limit, Math.min(limit, value));

export function summarize(results) {
  const out = {};
  for (const cpu of DIFFICULTIES) {
    const rows = results.filter(row => row.cpuDifficulty === cpu);
    if (!rows.length) continue;
    const racers = rows.reduce((sum, row) => sum + row.racers, 0);
    const finished = rows.reduce((sum, row) => sum + row.finished, 0);
    const mean = key => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
    out[cpu] = {
      races: rows.length, finishShare: finished / Math.max(1, racers),
      pileUps: rows.filter(row => row.pileUp).length, pileUpRate: rows.filter(row => row.pileUp).length / rows.length,
      passes: mean('passes'), passesAfterStart: mean('passesAfterStart'), crashes: mean('crashes'), recoveries: mean('recoveries'),
      winRate: rows.filter(row => row.won).length / rows.length,
      meanPosition: mean('position'),
    };
  }
  return out;
}

export function checkTargets(summary) {
  const failures = [];
  for (const [cpu, row] of Object.entries(summary)) {
    if (row.finishShare < TARGETS.finishShare) failures.push(`${cpu}: only ${(row.finishShare * 100).toFixed(1)}% of racers finished`);
    if (row.pileUpRate > TARGETS.pileUpRate + 1e-9) failures.push(`${cpu}: ${row.pileUps} of ${row.races} races had a first-lap pile-up`);
    if (cpu === 'medium' && row.passes < TARGETS.mediumPasses) failures.push(`medium: only ${row.passes.toFixed(1)} passes between computer racers per race`);
    const [low, high] = TARGETS.winRate[cpu];
    if (row.winRate < low - 1e-9 || row.winRate > high + 1e-9)
      failures.push(`${cpu}: the test driver won ${(row.winRate * 100).toFixed(0)}% (target ${low * 100} to ${high * 100}%)`);
  }
  return failures;
}

function format(summary) {
  const pct = value => `${(value * 100).toFixed(1)}%`;
  const lines = ['difficulty  races  finish   pile-ups  passes(after 15s)  crashes  recov  test-driver wins  mean pos'];
  for (const [cpu, row] of Object.entries(summary)) {
    lines.push(`${cpu.padEnd(10)}  ${String(row.races).padStart(5)}  ${pct(row.finishShare).padStart(6)}  ${`${row.pileUps} (${pct(row.pileUpRate)})`.padStart(9)}  ` +
      `${`${row.passes.toFixed(1)} (${row.passesAfterStart.toFixed(1)})`.padStart(17)}  ${row.crashes.toFixed(1).padStart(7)}  ${row.recoveries.toFixed(1).padStart(5)}  ` +
      `${pct(row.winRate).padStart(16)}  ${row.meanPosition.toFixed(2).padStart(8)}`);
  }
  return lines.join('\n');
}

function parse(args) {
  const options = { races: 30, jobs: 8, difficulties: DIFFICULTIES, check: false, json: false, car: 'falcone_f42', probe: null, worker: null, course: null, flags: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--races') options.races = Number(args[++i]);
    else if (a === '--jobs') options.jobs = Number(args[++i]);
    else if (a === '--difficulty') options.difficulties = args[++i].split(',');
    else if (a === '--car') options.car = args[++i];
    else if (a === '--flags') options.flags = args[++i]?.split(',') ?? [''];
    else if (a === '--course') options.course = args[++i];
    else if (a === '--check') options.check = true;
    else if (a === '--json') options.json = true;
    else if (a === '--probe') options.probe = args[++i];
    else if (a === '--worker') options.worker = args[++i];
    else throw Error(`Unknown option ${a}`);
  }
  if (!Number.isInteger(options.races) || options.races < 1 || !Number.isInteger(options.jobs) || options.jobs < 1 ||
      options.difficulties.some(d => !DIFFICULTIES.includes(d)) || options.flags.some(flag=>flag!=='tyre-slip')) throw Error('Invalid options.');
  return options;
}

function runInChild(cpu, index, car, course, flags) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', `${cpu},${index}`, '--car', car, ...(course ? ['--course', course] : []), ...(flags.length ? ['--flags',flags.join(',')] : [])],
      { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let out = '', err = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { err += chunk; });
    child.on('close', code => {
      const line = out.trim().split('\n').at(-1);
      try { resolve(JSON.parse(line)); } catch { reject(Error(`race ${cpu} ${index} failed (${code}): ${err.slice(-500)}`)); }
    });
  });
}

export async function main(args = process.argv.slice(2)) {
  const options = parse(args);
  if (options.worker) {
    const [cpu, index] = options.worker.split(',');
    console.log(JSON.stringify(runRace(cpu, Number(index), { car: options.car, course: options.course, flags:options.flags })));
    return 0;
  }
  if (options.probe) {
    const [cpu, index] = options.probe.split(',');
    console.log(JSON.stringify(runRace(cpu, Number(index), { car: options.car, course: options.course, flags:options.flags }), null, 1));
    return 0;
  }
  const jobs = [];
  for (const cpu of options.difficulties) for (let i = 0; i < options.races; i++) jobs.push([cpu, i]);
  const results = [];
  let next = 0;
  const started = performance.now();
  await Promise.all(Array.from({ length: Math.min(options.jobs, jobs.length) }, async () => {
    while (next < jobs.length) {
      const [cpu, index] = jobs[next++];
      results.push(await runInChild(cpu, index, options.car, options.course, options.flags));
    }
  }));
  results.sort((a, b) => DIFFICULTIES.indexOf(a.cpuDifficulty) - DIFFICULTIES.indexOf(b.cpuDifficulty) || a.index - b.index);
  const summary = summarize(results);
  if (options.json) console.log(JSON.stringify({ summary, results }, null, 1));
  else {
    console.log(format(summary));
    console.log(`(${results.length} races in ${((performance.now() - started) / 1000).toFixed(0)} s)`);
  }
  const failures = checkTargets(summary);
  if (!options.json) for (const failure of failures) console.log(`MISSES TARGET: ${failure}`);
  return options.check && failures.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 2; });
