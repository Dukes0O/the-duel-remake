import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { createFeatureFlags } from '../src/feature-flags.js';
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
const baselineSeeds = [1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998];
const usage = 'Usage: node tools/combat-balance.mjs [--flags wasteland2] [--check] [--verbose] | --baseline-only | --probe=DIFFICULTY,SEED';

function selectedFlags(flags = []) {
  if (!Array.isArray(flags) || flags.some(flag => flag !== 'wasteland2'))
    throw Error('Unsupported flags; expected wasteland2.');
  return [...new Set(flags)];
}

export function parseArgs(args = []) {
  const options = { flags: [], check: false, verbose: false, baselineOnly: false, probe: null };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    const key = argument.startsWith('--probe=') ? '--probe' : argument;
    if (seen.has(key)) throw Error(usage);
    seen.add(key);
    if (argument === '--flags') {
      const value = args[++index];
      if (!value) throw Error(usage);
      options.flags = selectedFlags(value.split(','));
    } else if (argument === '--check') options.check = true;
    else if (argument === '--verbose') options.verbose = true;
    else if (argument === '--baseline-only') options.baselineOnly = true;
    else if (key === '--probe') {
      const parts = argument.slice('--probe='.length).split(',');
      const [cpuDifficulty, seedText] = parts;
      if (parts.length !== 2 || !difficulties.includes(cpuDifficulty) ||
          !/^-?\d+$/.test(seedText) || !Number.isSafeInteger(Number(seedText)))
        throw Error('Probe needs easy, medium or hard and an integer seed.');
      options.probe = { cpuDifficulty, seed: Number(seedText) };
    } else throw Error(usage);
  }
  if (options.baselineOnly && (options.check || options.verbose || options.probe) ||
      options.probe && (options.check || options.verbose)) throw Error(usage);
  return options;
}

function simulationFlags(flags) {
  return createFeatureFlags({ storage: null, search: '', qa: false,
    overrides: { wasteland2: flags.includes('wasteland2') } });
}

function emptyWrecks() {
  return { player: 0, opponent: 0, traffic: 0,
    byOwner: { player: 0, cpu: 0, raider: 0, environment: 0, unknown: 0 } };
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
  const keys = ['all', 'pursuit'].includes(policy) ? ['ufo', 'bomb', 'crossbow', 'star'] : [policy === 'ufo-max' ? 'ufo' : policy];
  return keys.filter(key => state.combat.cooldowns[key] <= 0 &&
    (key !== 'crossbow' || gap >= 0 && gap <= 120) &&
    (key !== 'star' || state.combat.shield <= 0));
}

export function run(policy, cpuDifficulty, seed = 1989, { flags = [], maxFrames = 30 * 600 } = {}) {
  flags = selectedFlags(flags);
  if (!(policies.includes(policy) || policy === 'pursuit') || !difficulties.includes(cpuDifficulty) ||
      !Number.isSafeInteger(seed) || !Number.isSafeInteger(maxFrames) || maxFrames < 0)
    throw Error('Invalid race policy, difficulty, seed or frame limit.');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
  let app;
  try {
    globalThis.localStorage = memoryStorage();
    globalThis.cancelAnimationFrame ??= () => {};
    app = new App();
    app.duel.featureFlags = simulationFlags(flags);
    if (!app.startCampaign({ startStage: 0, seed, mode: 'wasteland', car: 'falcone_f42',
      difficulty: 'casual', cpuDifficulty, driverId: DEFAULT_DRIVER })) {
      throw Error(`Could not start ${policy}/${cpuDifficulty}`);
    }
    app.autopilot = true;
    app._scriptedCrashDone = true;
    if (policy === 'pursuit') {
      const drive = app._driveAutopilot.bind(app);
      app._driveAutopilot = dt => {
        drive(dt);
        const duel = app.duel, state = duel.state;
        if (state.status !== 'racing' || state.impactTimer > 0 ||
            !state.rival || state.rival.finished) return;
        const gap = duel.relativeS(state.rival.s, state.s) - state.s;
        const targetSpeed = Math.max(15, state.rival.speedMph +
          Math.max(-45, Math.min(35, (gap - 30) * .4)));
        // Follow the normal steering controller; use only legal driver inputs
        // to keep firing opportunities after hits slow the target down.
        duel.setInput({throttle: state.speedMph < targetSpeed ? 1 : 0,
          brake: state.speedMph > targetSpeed + 3 ? .45 : 0, boost: false});
      };
    }
    const duel = app.duel;
    if (policy === 'ufo-max') {
      duel.state.combat.levels.ufo = 3;
      duel.state.weaponLevels.ufo = 3;
    }
    const shots = { ufo: 0, bomb: 0, crossbow: 0, star: 0 };
    let cpuHits = 0, unattributedEnemyHits = 0, playerOpponentWrecks = 0;
    const wrecks = emptyWrecks();
    const wreckedTraffic = new WeakSet();
    const recordTrafficWreck = (actor, owner) => {
      if (actor && typeof actor === 'object') {
        if (wreckedTraffic.has(actor)) return;
        wreckedTraffic.add(actor);
      }
      wrecks.traffic++;
      wrecks.byOwner[Object.hasOwn(wrecks.byOwner, owner) ? owner : 'unknown']++;
    };
    duel.onChange((_, event) => {
      if (event.combatWreck) {
        const victim = event.victim === 'rival' ? 'opponent' : event.victim;
        if (['player', 'opponent', 'traffic'].includes(victim)) {
          wrecks[victim]++;
          const owner = event.owner ?? (event.source === 'scenery' ? 'environment' : 'unknown');
          if (victim === 'opponent' && owner === 'player') playerOpponentWrecks++;
          wrecks.byOwner[Object.hasOwn(wrecks.byOwner, owner) ? owner : 'unknown']++;
        }
      }
      if (event.trafficWrecked) {
        // sim-contacts emits this event only for the player's traffic collision.
        recordTrafficWreck(event.trafficWrecked.actor, 'player');
      }
      const impact = event.roadsideImpact;
      if (impact?.kind === 'traffic' && impact.outcome === 'obliterate') {
        // actor is the traffic victim. Current events do not identify its attacker.
        recordTrafficWreck(impact.actor, impact.owner);
      }
      if (!event.combatHit || !event.enemy) return;
      if (!event.victim) unattributedEnemyHits++;
      else if (event.victim === 'player') cpuHits++;
    });
    let frames = 0;
    while (!['stage_result', 'gameover', 'complete'].includes(duel.state.status) && frames++ < maxFrames) {
      for (const weapon of eligibleWeapons(policy, duel)) {
        if (duel.fireWeapon(weapon)) shots[weapon]++;
      }
      app.advance(1 / 30, 1 / 30);
    }
    const state = duel.state;
    const result = {
      policy, cpuDifficulty, seed, flags, wrecks, playerOpponentWrecks, status: state.status,
      completed: state.results?.completed === true,
      won: state.results?.won === true,
      timeSec: rounded(state.results?.timeSec ?? state.stageTimeSec),
      rivalTimeSec: state.rival?.finishTime == null ? null : rounded(state.rival.finishTime),
      shots, rivalHits: state.combat?.hits ?? 0,
      cpuHits: unattributedEnemyHits ? null : cpuHits, unattributedEnemyHits,
      majorCrashes: state.stageCrashes,
    };
    return result;
  } finally {
    try { app?.dispose(); }
    finally {
      if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
      else delete globalThis.localStorage;
      if (previousCancel) Object.defineProperty(globalThis, 'cancelAnimationFrame', previousCancel);
      else delete globalThis.cancelAnimationFrame;
    }
  }
}

export function crossbowProbe({ flags = [] } = {}) {
  flags = selectedFlags(flags);
  const cases = [];
  const combatStages = COURSE.map((stage, index) => ({ stage, index })).filter(({ stage }) => supportsCombat(stage));
  for (let index = 0; index < 26; index++) {
    const duel = new Duel({ seed: 1989 + index, featureFlags: simulationFlags(flags) });
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
  return { flags, shots: cases.length, hits: cases.filter(item => item.hit).length,
    hitRate: rounded(cases.filter(item => item.hit).length / cases.length), cases };
}

export function bombSpeedProbe({ flags = [] } = {}) {
  flags = selectedFlags(flags);
  const cases = [];
  // Include the four speeds named for BUG-05 (roughly 48/97/193/320 km/h).
  for (const speedMph of [20, 30, 40, 60, 80, 100, 120, 130, 160, 200]) {
    const duel = new Duel({ seed: 1989, featureFlags: simulationFlags(flags) });
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
  return { flags, maxSpeedLossPct: Math.max(...cases.map(item => item.speedLossPct)), cases };
}

export function buildReport({ flags = [], runs, baselineRuns, firstTwelveSec, elapsedSec,
  crossbowAim, ownBombs }) {
  flags = selectedFlags(flags);
  const by = (policy, difficulty) => runs.find(run => run.policy === policy && run.cpuDifficulty === difficulty);
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
  const cpuHitsByDifficulty = Object.fromEntries(difficulties.map(difficulty => [difficulty, by('none', difficulty).cpuHits]));
  const allRuns = [...runs, ...baselineRuns];
  const wrecksByDifficulty = Object.fromEntries(difficulties.map(difficulty => {
    const total = emptyWrecks();
    for (const race of allRuns.filter(race => race.cpuDifficulty === difficulty)) {
      for (const victim of ['player', 'opponent', 'traffic']) total[victim] += race.wrecks[victim];
      for (const owner of Object.keys(total.byOwner)) total.byOwner[owner] += race.wrecks.byOwner[owner];
    }
    return [difficulty, total];
  }));
  const hitsByDifficulty = Object.fromEntries(difficulties.map(difficulty => {
    const rows = allRuns.filter(race => race.cpuDifficulty === difficulty);
    return [difficulty, { races: rows.length,
      rivalHits: rows.reduce((sum, row) => sum + row.rivalHits, 0),
      cpuHits: rows.some(row => row.cpuHits == null) ? null : rows.reduce((sum, row) => sum + row.cpuHits, 0),
      unattributedEnemyHits: rows.reduce((sum, row) => sum + row.unattributedEnemyHits, 0) }];
  }));
  return { flags, policyRuns: runs.length,
    baselineRaces: Object.values(baselineWins).reduce((sum, row) => sum + row.races, 0),
    sampleScope: {
      winRateByDifficulty: 'No-weapon policy, ten seeds 1989-1998 per difficulty; seed 1989 reused from policy runs.',
      cpuHitsByDifficulty: 'No-weapon policy, seed 1989 only per difficulty; existing CPU-hit target sample.',
      hitsByDifficulty: 'All seven policies at seed 1989 plus nine additional no-weapon seeds per difficulty (16 unique races). CPU hits count enemy combatHit events whose victim is player; rivalHits uses the existing combat hit counter.',
      wrecksByDifficulty: 'Same 16 races per difficulty; combatWreck events for player/opponents, trafficWrecked collisions and roadsideImpact traffic obliterations. Traffic victims count once; knocks are excluded. byOwner counts the attacker; current roadsideImpact events supply no attacker, so their owner is unknown. Legacy vehicleCrushed events are excluded.',
      weaponProbes: 'Crossbow: 26 moving-target cases across combat courses. Own bombs: ten speeds from 20 to 200 mph.',
      gainSec: 'Policy time compared with no-weapon time at seed 1989, averaged across three difficulties.'
    },
    hitsByDifficulty, wrecksByDifficulty,
    firstTwelveSec, elapsedSec, winRateByDifficulty: baselineWins,
    gainSec, ufoGainByDifficulty, crossbowRace: { shots: crossbowShots, rivalHits: crossbowHits },
    crossbowAim: { shots: crossbowAim.shots, hits: crossbowAim.hits, hitRate: crossbowAim.hitRate },
    ownBombs: { maxSpeedLossPct: ownBombs.maxSpeedLossPct },
    cpuHitsByDifficulty };
}

export function reportFailures(report, runs, baselineRuns) {
  const { winRateByDifficulty: baselineWins, firstTwelveSec, ufoGainByDifficulty,
    crossbowAim, ownBombs, cpuHitsByDifficulty } = report;
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
  return failures;
}

function main(args) {
  const { flags, check, verbose, baselineOnly, probe } = parseArgs(args);
  const options = { flags };
  if (probe) {
    console.log(JSON.stringify(run('none', probe.cpuDifficulty, probe.seed, options), null, 2));
    return;
  }
  if (baselineOnly) {
    const races = difficulties.flatMap(difficulty => baselineSeeds.map(seed => run('none', difficulty, seed, options)));
    const summary = Object.fromEntries(difficulties.map(difficulty => {
      const rows = races.filter(race => race.cpuDifficulty === difficulty);
      return [difficulty, { wins: rows.filter(race => race.won).length,
        races: rows.length, results: rows.map(({ seed, won, timeSec, rivalTimeSec, cpuHits, majorCrashes, wrecks }) =>
          ({ seed, won, timeSec, rivalTimeSec, cpuHits, majorCrashes, wrecks })) }];
    }));
    console.log(JSON.stringify({ flags, ...summary }, null, 2));
    return;
  }
  const started = performance.now();
  const runs = [];
  let firstTwelveSec = null;
  for (const policy of policies) for (const difficulty of difficulties) {
    runs.push(run(policy, difficulty, 1989, options));
    if (runs.length === 12) firstTwelveSec = rounded((performance.now() - started) / 1000);
  }
  const baselineRuns = difficulties.flatMap(difficulty => baselineSeeds.slice(1)
    .map(seed => run('none', difficulty, seed, options)));
  const crossbowAim = crossbowProbe(options);
  const ownBombs = bombSpeedProbe(options);
  const report = buildReport({ flags, runs, baselineRuns, firstTwelveSec,
    elapsedSec: rounded((performance.now() - started) / 1000), crossbowAim, ownBombs });
  const pursuitRuns = flags.includes('wasteland2')
    ? difficulties.map(difficulty => run('pursuit', difficulty, 1989, options)) : [];
  if (pursuitRuns.length) report.strongPolicy = {
    scope: 'Separate legal-input pursuit, seed 1989 per difficulty; does not replace historical win or hit samples.',
    races: pursuitRuns,
  };
  report.elapsedSec = rounded((performance.now() - started) / 1000);
  console.log(JSON.stringify(report, null, 2));
  if (verbose) console.log(JSON.stringify({ policyRaces: runs, baselineRaces: baselineRuns,
    crossbowCases: crossbowAim.cases, bombCases: ownBombs.cases }, null, 2));
  if (check) {
    const failures = reportFailures(report, runs, baselineRuns);
    if (pursuitRuns.some(race => !race.completed)) failures.push('strong pursuit race did not complete');
    if (pursuitRuns.length && !pursuitRuns.some(race => race.playerOpponentWrecks > 0))
      failures.push('strong pursuit caused no player-owned opponent wreck');
    if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
