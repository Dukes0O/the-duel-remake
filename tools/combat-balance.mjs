import { performance } from 'node:perf_hooks';
import { App } from '../src/app.js';
import { Duel } from '../src/game.js';
import { stepCombat, supportsCombat } from '../src/combat.js';
import { COURSE, DRIVE } from '../src/config.js';
import { DEFAULT_DRIVER } from '../src/drivers.js';
import { winRateFailures } from './balance-targets.mjs';

// Headless runs use the production App, its standard scripted driving line,
// fixed-step Duel physics, and disposable in-memory saves.
const policies = ['none', 'ufo', 'ufo-max', 'bomb', 'crossbow', 'star', 'all'];
const difficulties = ['easy', 'medium', 'hard'];
const check = process.argv.includes('--check');
const verbose = process.argv.includes('--verbose');
const baselineOnly = process.argv.includes('--baseline-only');
const probe = process.argv.find(argument => argument.startsWith('--probe='));
globalThis.cancelAnimationFrame ??= () => {};
if (process.argv.slice(2).some(argument => !['--check', '--verbose', '--baseline-only'].includes(argument) &&
      !argument.startsWith('--probe=')) ||
    baselineOnly && (check || verbose || probe) || probe && (check || verbose)) {
  throw Error('Usage: node tools/combat-balance.mjs [--check] [--verbose] | --baseline-only | --probe=DIFFICULTY,SEED');
}
const rounded = value => Math.round(value * 100) / 100;
const average = values => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

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

function eligibleWeapons(policy, duel) {
  if (policy === 'none') return [];
  const { state } = duel;
  if (state.status !== 'racing' || !state.combat || !state.rival) return [];
  const gap = duel.relativeS(state.rival.s, state.s) - state.s;
  const keys = policy === 'all' ? ['ufo', 'bomb', 'crossbow', 'star'] : [policy === 'ufo-max' ? 'ufo' : policy];
  return keys.filter(key => state.combat.cooldowns[key] <= 0 &&
    (key !== 'crossbow' || gap >= 0 && gap <= 120) &&
    (key !== 'star' || state.combat.shield <= 0));
}

function run(policy, cpuDifficulty, seed = 1989) {
  globalThis.localStorage = memoryStorage();
  const app = new App();
  if (!app.startCampaign({ startStage: 0, seed, mode: 'wasteland', car: 'falcone_f42',
    difficulty: 'casual', cpuDifficulty, driverId: DEFAULT_DRIVER })) {
    throw Error(`Could not start ${policy}/${cpuDifficulty}`);
  }
  app.autopilot = true;
  app._scriptedCrashDone = true;
  const duel = app.duel;
  if (policy === 'ufo-max') {
    duel.state.combat.levels.ufo = 3;
    duel.state.weaponLevels.ufo = 3;
  }
  const shots = { ufo: 0, bomb: 0, crossbow: 0, star: 0 };
  let cpuHits = 0, unattributedEnemyHits = 0;
  duel.onChange((_, event) => {
    if (!event.combatHit || !event.enemy) return;
    if (!event.victim) unattributedEnemyHits++;
    else if (event.victim === 'player') cpuHits++;
  });
  let frames = 0;
  while (!['stage_result', 'gameover', 'complete'].includes(duel.state.status) && frames++ < 30 * 600) {
    for (const weapon of eligibleWeapons(policy, duel)) {
      if (duel.fireWeapon(weapon)) shots[weapon]++;
    }
    app.advance(1 / 30, 1 / 30);
  }
  const state = duel.state;
  const result = {
    policy, cpuDifficulty, seed, status: state.status,
    completed: state.results?.completed === true,
    won: state.results?.won === true,
    timeSec: rounded(state.results?.timeSec ?? state.stageTimeSec),
    rivalTimeSec: state.rival?.finishTime == null ? null : rounded(state.rival.finishTime),
    shots, rivalHits: state.combat?.hits ?? 0,
    cpuHits: unattributedEnemyHits ? null : cpuHits, unattributedEnemyHits,
    majorCrashes: state.stageCrashes,
  };
  app.dispose();
  return result;
}

function crossbowProbe() {
  const cases = [];
  const combatStages = COURSE.map((stage, index) => ({ stage, index })).filter(({ stage }) => supportsCombat(stage));
  for (let index = 0; index < 26; index++) {
    const duel = new Duel({ seed: 1989 + index });
    const event = combatStages[index % combatStages.length];
    duel.startCampaign({ mode: 'wasteland', startStage: event.index, car: event.stage.requiredCar ?? 'falcone_f42' });
    const state = duel.state, gap = 20 + index % 13 * 7, lateral = (index % 7 - 3) * .85;
    state.status = 'racing';
    state.s = state.prevS = 100 + (index * 379) % (duel.course.length - 300);
    state.lateral = state.prevLateral = 0;
    state.speedMph = 85;
    state.rival.s = state.rival.prevS = state.s + gap;
    state.rival.lateral = lateral;
    state.rival.speedMph = 75;
    state.combat.aiTimer = Infinity;
    if (!duel.fireWeapon('crossbow')) throw Error('Crossbow probe could not fire.');
    for (let tick = 0; tick < 150 && state.combat.projectiles.length; tick++) {
      state.prevS = state.s;
      state.s += state.speedMph * DRIVE.mphToWorld * .02;
      duel._rival(.02);
      stepCombat(duel, .02);
    }
    cases.push({ event: event.stage.id, gap, lateral, hit: state.combat.hits > 0 });
  }
  return { shots: cases.length, hits: cases.filter(item => item.hit).length,
    hitRate: rounded(cases.filter(item => item.hit).length / cases.length), cases };
}

function bombSpeedProbe() {
  const cases = [];
  // Include the four speeds named for BUG-05 (roughly 48/97/193/320 km/h).
  for (const speedMph of [20, 30, 40, 60, 80, 100, 120, 130, 160, 200]) {
    const duel = new Duel({ seed: 1989 });
    duel.startCampaign({ mode: 'wasteland', startStage: 0 });
    const state = duel.state;
    state.status = 'racing';
    state.s = state.prevS = 100;
    state.lateral = state.prevLateral = 0;
    state.speedMph = speedMph;
    state.invulnerableSec = 0;
    state.combat.aiTimer = Infinity;
    if (!duel.fireWeapon('bomb')) throw Error('Bomb speed probe could not fire.');
    let minimum = speedMph;
    for (let tick = 0; tick < 100 && state.combat.projectiles.length; tick++) {
      state.prevS = state.s;
      state.s += state.speedMph * DRIVE.mphToWorld * .02;
      stepCombat(duel, .02);
      minimum = Math.min(minimum, state.speedMph);
    }
    cases.push({ speedMph, speedLossPct: rounded(100 * (1 - minimum / speedMph)) });
  }
  return { maxSpeedLossPct: Math.max(...cases.map(item => item.speedLossPct)), cases };
}

if (probe) {
  const [cpuDifficulty, seedText] = probe.slice('--probe='.length).split(',');
  const seed = Number(seedText);
  if (!difficulties.includes(cpuDifficulty) || !Number.isSafeInteger(seed))
    throw Error('Probe needs easy, medium or hard and an integer seed.');
  console.log(JSON.stringify(run('none', cpuDifficulty, seed), null, 2));
  process.exit(0);
}

if (baselineOnly) {
  const seeds = [1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998];
  const races = difficulties.flatMap(cpuDifficulty => seeds.map(seed => run('none', cpuDifficulty, seed)));
  const summary = Object.fromEntries(difficulties.map(cpuDifficulty => {
    const rows = races.filter(race => race.cpuDifficulty === cpuDifficulty);
    return [cpuDifficulty, {wins: rows.filter(race => race.won).length,
      races: rows.length, results: rows.map(({seed, won, timeSec, rivalTimeSec, cpuHits, majorCrashes}) =>
        ({seed, won, timeSec, rivalTimeSec, cpuHits, majorCrashes}))}];
  }));
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const started = performance.now();
const runs = [];
let firstTwelveSec = null;
for (const policy of policies) for (const cpuDifficulty of difficulties) {
  runs.push(run(policy, cpuDifficulty));
  if (runs.length === 12) firstTwelveSec = rounded((performance.now() - started) / 1000);
}
const by = (policy, difficulty) => runs.find(run => run.policy === policy && run.cpuDifficulty === difficulty);
const baselineSeeds = [1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998];
const baselineRuns = difficulties.flatMap(difficulty => baselineSeeds.slice(1).map(seed => run('none', difficulty, seed)));
const baselineWins = Object.fromEntries(difficulties.map(difficulty => {
  const samples = [by('none', difficulty), ...baselineRuns.filter(run => run.cpuDifficulty === difficulty)];
  return [difficulty, { wins: samples.filter(sample => sample.won).length, races: samples.length,
    winRate: rounded(samples.filter(sample => sample.won).length / samples.length) }];
}));
const gainSec = Object.fromEntries(policies.filter(policy => policy !== 'none').map(policy => [policy,
  rounded(average(difficulties.map(difficulty => by('none', difficulty).timeSec - by(policy, difficulty).timeSec)))]));
const ufoGainByDifficulty = Object.fromEntries(['ufo', 'ufo-max'].map(policy => [policy,
  Object.fromEntries(difficulties.map(difficulty => [difficulty,
    rounded(by('none', difficulty).timeSec - by(policy, difficulty).timeSec)]))]));
const crossbow = runs.filter(run => run.policy === 'crossbow');
const crossbowShots = crossbow.reduce((total, run) => total + run.shots.crossbow, 0);
const crossbowHits = crossbow.reduce((total, run) => total + run.rivalHits, 0);
const crossbowAim = crossbowProbe();
const ownBombs = bombSpeedProbe();
const elapsedSec = rounded((performance.now() - started) / 1000);
const cpuHitsByDifficulty = Object.fromEntries(difficulties.map(difficulty => [difficulty, by('none', difficulty).cpuHits]));
const report = { policyRuns: runs.length, baselineRaces: baselineSeeds.length * difficulties.length,
  firstTwelveSec, elapsedSec, winRateByDifficulty: baselineWins,
  gainSec, ufoGainByDifficulty, crossbowRace: { shots: crossbowShots, rivalHits: crossbowHits },
  crossbowAim: { shots: crossbowAim.shots, hits: crossbowAim.hits, hitRate: crossbowAim.hitRate },
  ownBombs: { maxSpeedLossPct: ownBombs.maxSpeedLossPct },
  cpuHitsByDifficulty };
console.log(JSON.stringify(report, null, 2));
if (verbose) console.log(JSON.stringify({ policyRaces: runs, baselineRaces: baselineRuns,
  crossbowCases: crossbowAim.cases, bombCases: ownBombs.cases }, null, 2));

if (check) {
  const failures = [];
  failures.push(...winRateFailures(baselineWins));
  if (firstTwelveSec >= 120) failures.push(`12-run pace ${firstTwelveSec}s exceeds 120s`);
  if (runs.some(run => !run.completed)) failures.push('one or more policy races did not complete');
  if (baselineRuns.some(run => !run.completed)) failures.push('one or more baseline win-rate races did not complete');
  if ([...runs, ...baselineRuns].some(run => run.unattributedEnemyHits)) failures.push('enemy hit events lack victim identity');
  for (const [policy, samples] of Object.entries(ufoGainByDifficulty)) for (const [difficulty, gain] of Object.entries(samples)) {
    if (gain > 4) failures.push(`${policy}/${difficulty} time gain ${gain}s exceeds 4s`);
  }
  if (crossbowAim.hitRate < .35 || crossbowAim.hitRate > .60) failures.push(`crossbow hit rate ${crossbowAim.hitRate} is outside 0.35–0.60`);
  if (ownBombs.maxSpeedLossPct > 15) failures.push(`own bomb speed loss ${ownBombs.maxSpeedLossPct}% exceeds 15%`);
  for (const [difficulty, low, high] of [['easy', 0, 3], ['medium', 2, 6], ['hard', 4, 10]]) {
    if (cpuHitsByDifficulty[difficulty] != null && (cpuHitsByDifficulty[difficulty] < low || cpuHitsByDifficulty[difficulty] > high)) {
      failures.push(`${difficulty} CPU hits ${cpuHitsByDifficulty[difficulty]} is outside ${low}–${high}`);
    }
  }
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
}
