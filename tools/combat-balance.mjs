import { performance } from 'node:perf_hooks';
import { App } from '../src/app.js';
import { Duel } from '../src/game.js';
import { stepCombat, supportsCombat } from '../src/combat.js';
import { COURSE, DRIVE } from '../src/config.js';
import { DEFAULT_DRIVER } from '../src/drivers.js';

// Headless runs use the production App, its standard scripted driving line,
// fixed-step Duel physics, and disposable in-memory saves.
const policies = ['none', 'ufo', 'bomb', 'crossbow', 'star', 'all'];
const difficulties = ['easy', 'medium', 'hard'];
const check = process.argv.includes('--check');
const verbose = process.argv.includes('--verbose');
globalThis.cancelAnimationFrame ??= () => {};
if (process.argv.slice(2).some(argument => !['--check', '--verbose'].includes(argument))) {
  throw Error('Usage: node tools/combat-balance.mjs [--check] [--verbose]');
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
  const keys = policy === 'all' ? ['ufo', 'bomb', 'crossbow', 'star'] : [policy];
  return keys.filter(key => state.combat.cooldowns[key] <= 0 &&
    (key !== 'crossbow' || gap >= 0 && gap <= 120) &&
    (key !== 'star' || state.combat.shield <= 0));
}

function run(policy, cpuDifficulty) {
  globalThis.localStorage = memoryStorage();
  const app = new App();
  if (!app.startCampaign({ startStage: 0, seed: 1989, mode: 'wasteland', car: 'falcone_f42',
    difficulty: 'casual', cpuDifficulty, driverId: DEFAULT_DRIVER })) {
    throw Error(`Could not start ${policy}/${cpuDifficulty}`);
  }
  app.autopilot = true;
  app._scriptedCrashDone = true;
  const duel = app.duel;
  const shots = { ufo: 0, bomb: 0, crossbow: 0, star: 0 };
  let cpuHits = 0;
  duel.onChange((_, event) => { if (event.combatHit && event.enemy) cpuHits++; });
  let frames = 0;
  while (!['stage_result', 'gameover', 'complete'].includes(duel.state.status) && frames++ < 30 * 600) {
    for (const weapon of eligibleWeapons(policy, duel)) {
      if (duel.fireWeapon(weapon)) shots[weapon]++;
    }
    app.advance(1 / 30, 1 / 30);
  }
  const state = duel.state;
  const result = {
    policy, cpuDifficulty, status: state.status,
    completed: state.results?.completed === true,
    won: state.results?.won === true,
    timeSec: rounded(state.results?.timeSec ?? state.stageTimeSec),
    shots, rivalHits: state.combat?.hits ?? 0, cpuHits,
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

const started = performance.now();
const runs = [];
let firstTwelveSec = null;
for (const policy of policies) for (const cpuDifficulty of difficulties) {
  runs.push(run(policy, cpuDifficulty));
  if (runs.length === 12) firstTwelveSec = rounded((performance.now() - started) / 1000);
}
const by = (policy, difficulty) => runs.find(run => run.policy === policy && run.cpuDifficulty === difficulty);
const gainSec = Object.fromEntries(policies.filter(policy => policy !== 'none').map(policy => [policy,
  rounded(average(difficulties.map(difficulty => by('none', difficulty).timeSec - by(policy, difficulty).timeSec)))]));
const crossbow = runs.filter(run => run.policy === 'crossbow');
const crossbowShots = crossbow.reduce((total, run) => total + run.shots.crossbow, 0);
const crossbowHits = crossbow.reduce((total, run) => total + run.rivalHits, 0);
const crossbowAim = crossbowProbe();
const ownBombs = bombSpeedProbe();
const elapsedSec = rounded((performance.now() - started) / 1000);
const cpuHitsByDifficulty = Object.fromEntries(difficulties.map(difficulty => [difficulty, by('none', difficulty).cpuHits]));
const winRateByDifficulty = Object.fromEntries(difficulties.map(difficulty => [difficulty,
  rounded(runs.filter(run => run.cpuDifficulty === difficulty && run.won).length / policies.length)]));
const report = { runs: runs.length, firstTwelveSec, elapsedSec, winRateByDifficulty,
  gainSec, crossbowRace: { shots: crossbowShots, rivalHits: crossbowHits },
  crossbowAim: { shots: crossbowAim.shots, hits: crossbowAim.hits, hitRate: crossbowAim.hitRate },
  ownBombs: { maxSpeedLossPct: ownBombs.maxSpeedLossPct },
  cpuHitsByDifficulty };
console.log(JSON.stringify(report, null, 2));
if (verbose) console.log(JSON.stringify({ races: runs, crossbowCases: crossbowAim.cases, bombCases: ownBombs.cases }, null, 2));

if (check) {
  const failures = [];
  if (firstTwelveSec >= 120) failures.push(`12-run pace ${firstTwelveSec}s exceeds 120s`);
  if (runs.some(run => !run.completed)) failures.push('one or more races did not complete');
  if (gainSec.ufo > 4) failures.push(`UFO time gain ${gainSec.ufo}s exceeds 4s`);
  if (crossbowAim.hitRate < .35 || crossbowAim.hitRate > .60) failures.push(`crossbow hit rate ${crossbowAim.hitRate} is outside 0.35–0.60`);
  if (ownBombs.maxSpeedLossPct > 15) failures.push(`own bomb speed loss ${ownBombs.maxSpeedLossPct}% exceeds 15%`);
  for (const [difficulty, low, high] of [['easy', 0, 3], ['medium', 2, 6], ['hard', 4, 10]]) {
    if (cpuHitsByDifficulty[difficulty] < low || cpuHitsByDifficulty[difficulty] > high) {
      failures.push(`${difficulty} CPU hits ${cpuHitsByDifficulty[difficulty]} is outside ${low}–${high}`);
    }
  }
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
}
