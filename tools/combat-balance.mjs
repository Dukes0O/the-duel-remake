import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { createFeatureFlags } from '../src/feature-flags.js';
import { App } from '../src/app.js';
import { Duel } from '../src/game.js';
import { stepCombat, supportsCombat } from '../src/combat.js';
import { COURSE, DRIVE } from '../src/config.js';
import { DEFAULT_DRIVER } from '../src/drivers.js';
import {createProfile, createPlayerRegistry, savePlayers} from '../src/progression.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {point} from '../src/combat-weapons.js';
import { winRateFailures } from './balance-targets.mjs';

// Headless runs use the production App, its standard scripted driving line,
// fixed-step Duel physics, and disposable in-memory saves.
const policies = ['none', 'ufo', 'ufo-max', 'bomb', 'crossbow', 'star', 'all'];
const difficulties = ['easy', 'medium', 'hard'];
// BALANCE-SAMPLE: win rates are judged on 30 races per difficulty and the
// single-race targets on the mean of three seeds, so one close finish cannot
// move a result by ten points (CRASH-05 showed the old ten-race sample flip).
const baselineSeeds = Array.from({ length: 30 }, (_, index) => 1989 + index);
const repeatSeeds = baselineSeeds.slice(0, 6);
// CPU-hit bands are for the mean over all thirty no-weapon races. The old
// bands (easy 0-3, medium 2-6, hard 4-10) came from one race; the live game
// itself averages 7.3 on Medium over thirty (CRASH-RELEASE).
export const CPU_HIT_BANDS = Object.freeze({ easy: [1, 4], medium: [4, 9], hard: [4, 10] });
const usage = 'Usage: node tools/combat-balance.mjs [--flags wasteland2,arsenal] [--check] [--verbose] | --baseline-only | --probe=DIFFICULTY,SEED';
const BALANCE_FLAGS = ['wasteland2', 'arsenal'];

function selectedFlags(flags = []) {
  if (!Array.isArray(flags) || flags.some(flag => !BALANCE_FLAGS.includes(flag)))
    throw Error('Unsupported flags; expected wasteland2 or arsenal.');
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
    overrides: { wasteland2: flags.includes('wasteland2'), arsenal: flags.includes('arsenal') } });
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

function saveArsenalCareer(storage) {
  const profile = createProfile();
  profile.wasteland = normalizeWasteland({...profile.wasteland,
    xp: 3500, scrap: 3000, discoveredGate: true});
  const registry = createPlayerRegistry(profile);
  registry.players[0].name = 'Arsenal Balance';
  if (!savePlayers(registry, storage)) throw Error('Could not save the memory-only Arsenal career.');
}

function equipArsenalPolicy(app, policy) {
  for (const [slot, id] of ['oil', 'smoke'].entries()) {
    if (!app.purchaseArsenalWeapon(id).ok || !app.equipCarWeapon(slot, id).ok)
      throw Error('Could not purchase and equip ' + id + ' through the native Armory.');
  }
  // Historical policies still request their original weapons. Rear weapons
  // occupy unused slots; all/pursuit retain all four original starter slots.
  const selected = policy === 'none' ? 'crossbow' : policy === 'ufo-max' ? 'ufo' : policy;
  const loadout = ['all', 'pursuit'].includes(policy) ? ['ufo', 'bomb', 'crossbow', 'star'] :
    ['oil', 'smoke', selected, selected === 'star' ? 'crossbow' : 'star'];
  for (const [slot, id] of loadout.entries()) {
    if (!app.equipCarWeapon(slot, id).ok) throw Error('Could not equip native policy weapon ' + id + '.');
  }
  if (policy === 'ufo-max') for (let level = 0; level < 3; level++) {
    if (!app.purchaseWeapon('ufo').ok) throw Error('Could not buy the native maximum UFO level.');
  }
}

function weaponUseCounter(duel) {
  const uses = {player: {}, cpu: {}}, unattributed = {};
  let serial = duel.state.combat?.serial || 0;
  const count = (role, weapon) => { uses[role][weapon] = (uses[role][weapon] || 0) + 1; };
  return {uses, unattributed, observe(event) {
    const state = duel.state, combat = state.combat;
    if (!combat) return;
    const projectiles = combat.projectiles.filter(item => item.id > serial);
    const bursts = combat.bursts.filter(item => item.id > serial);
    serial = combat.serial;
    const rear = ['oil', 'smoke'].find(id => event.arsenalCue === 'weapon.' + id + '.deploy');
    if (rear) {
      if (event.actor === state) count('player', rear);
      else if (state.opponents.includes(event.actor)) count('cpu', rear);
      return;
    }
    const weapon = event.weaponFired;
    if (weapon === 'bomb' || weapon === 'crossbow') {
      // A native Bomb batch is one use, irrespective of its pellet count.
      const product = projectiles.find(item => item.kind === weapon);
      if (product) count(product.enemy ? 'cpu' : 'player', weapon);
    } else if (weapon === 'ufo') {
      if (event.enemy === true && state.opponents[event.opponentIndex]) count('cpu', weapon);
      else if (bursts.some(item => item.kind === weapon) && combat.lastUfo) count('player', weapon);
    } else if (weapon === 'star') {
      // Star has no actor in its event. Its new native burst and active shield
      // identify the car; pickup bursts were already observed on their own event.
      const product = bursts.find(item => item.kind === weapon);
      if (!product) return;
      const actors = [state, ...state.opponents].filter(actor => {
        const shield = actor === state ? combat.shield : actor === state.rival ? combat.rivalShield : actor.combatShield;
        if (!(shield > 0)) return false;
        const at = point(duel, actor);
        return at.x === product.x && at.y === product.y && at.z === product.z;
      });
      if (actors.length === 1) count(actors[0] === state ? 'player' : 'cpu', weapon);
      else unattributed[weapon] = (unattributed[weapon] || 0) + 1;
    }
  }};
}

function sumWeaponUses(races) {
  const total = {player: {}, cpu: {}};
  for (const race of races) for (const role of ['player', 'cpu']) {
    for (const [weapon, count] of Object.entries(race.weaponUses?.[role] || {}))
      total[role][weapon] = (total[role][weapon] || 0) + count;
  }
  return total;
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
    if (flags.includes('arsenal')) saveArsenalCareer(globalThis.localStorage);
    app = new App();
    app.duel.featureFlags = simulationFlags(flags);
    if (flags.includes('arsenal')) equipArsenalPolicy(app, policy);
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
    if (policy === 'ufo-max' && !flags.includes('arsenal')) {
      duel.state.combat.levels.ufo = 3;
      duel.state.weaponLevels.ufo = 3;
    }
    const shots = { ufo: 0, bomb: 0, crossbow: 0, star: 0 };
    let cpuHits = 0, unattributedEnemyHits = 0, playerOpponentWrecks = 0;
    const wrecks = emptyWrecks();
    const weaponCounter = weaponUseCounter(duel);
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
      weaponCounter.observe(event);
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
      if (impact?.kind === 'traffic' && ['obliterate', 'smash'].includes(impact.outcome)) {
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
      shots, weaponUses: weaponCounter.uses, unattributedWeaponUses: weaponCounter.unattributed,
      rivalHits: state.combat?.hits ?? 0,
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
    duel.startCampaign({ mode: 'wasteland', startStage: event.index, car: event.stage.requiredCar ?? 'falcone_f42',
      ...(flags.includes('arsenal') ? {discoveredGate: true, arsenalRank: 6} : {}) });
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
    duel.startCampaign({ mode: 'wasteland', startStage: 0,
      ...(flags.includes('arsenal') ? {discoveredGate: true, arsenalRank: 6} : {}) });
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
  // Mean over every seed that has both a no-weapon and a policy race.
  const noWeapon = (difficulty, seed) => [...runs, ...baselineRuns].find(run =>
    run.policy === 'none' && run.cpuDifficulty === difficulty && run.seed === seed);
  const ufoGainByDifficulty = Object.fromEntries(['ufo', 'ufo-max'].map(policy => [policy,
    Object.fromEntries(difficulties.map(difficulty => {
      const pairs = runs.filter(run => run.policy === policy && run.cpuDifficulty === difficulty)
        .map(run => [noWeapon(difficulty, run.seed), run]).filter(([none]) => none);
      return [difficulty, rounded(average(pairs.map(([none, run]) => none.timeSec - run.timeSec)))];
    }))]));
  const crossbow = runs.filter(run => run.policy === 'crossbow');
  const crossbowShots = crossbow.reduce((total, run) => total + run.shots.crossbow, 0);
  const crossbowHits = crossbow.reduce((total, run) => total + run.rivalHits, 0);
  const cpuHitsByDifficulty = Object.fromEntries(difficulties.map(difficulty => {
    const samples = [...runs, ...baselineRuns].filter(run =>
      run.policy === 'none' && run.cpuDifficulty === difficulty);
    return [difficulty, samples.some(sample => sample.cpuHits == null) ? null :
      rounded(average(samples.map(sample => sample.cpuHits)))];
  }));
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
      winRateByDifficulty: 'No-weapon policy, thirty seeds 1989-2018 per difficulty; seed 1989 reused from policy runs.',
      cpuHitsByDifficulty: 'No-weapon policy, mean of all thirty seeds per difficulty.',
      ufoGainByDifficulty: 'UFO and UFO-max policies against no-weapon races, mean of seeds 1989-1994.',
      hitsByDifficulty: 'All policy samples and thirty-seed no-weapon baselines per difficulty. CPU hits count enemy combatHit events whose victim is player; rivalHits uses the existing combat hit counter.',
      wrecksByDifficulty: 'Same policy and baseline samples per difficulty; combatWreck events for player/opponents, trafficWrecked collisions and roadsideImpact traffic obliterations. Traffic victims count once; knocks are excluded. byOwner counts the attacker; current roadsideImpact events supply no attacker, so their owner is unknown. Legacy vehicleCrushed events are excluded.',
      weaponProbes: 'Crossbow: 26 moving-target cases across combat courses. Own bombs: ten speeds from 20 to 200 mph.',
      gainSec: 'Policy time compared with no-weapon time at seed 1989, averaged across three difficulties.',
      weaponUses: 'All historical policy and baseline races. Native actor deployment cues, projectile batches and shield/jump products identify each use; assignments alone never count. Arsenal uses a named, discovered rank-six career with real Armory purchases and policy-compatible equipment.'
    },
    hitsByDifficulty, wrecksByDifficulty, weaponUses: sumWeaponUses(allRuns),
    weaponUsesByDifficulty: Object.fromEntries(difficulties.map(difficulty =>
      [difficulty, sumWeaponUses(allRuns.filter(race => race.cpuDifficulty === difficulty))])),
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
  for (const [difficulty, [low, high]] of Object.entries(CPU_HIT_BANDS)) {
    if (cpuHitsByDifficulty[difficulty] != null && (cpuHitsByDifficulty[difficulty] < low || cpuHitsByDifficulty[difficulty] > high)) {
      failures.push(`${difficulty} CPU hits ${cpuHitsByDifficulty[difficulty]} is outside ${low}–${high}`);
    }
  }
  if (report.flags.includes('arsenal')) for (const weapon of ['oil', 'smoke']) {
    if (!(report.weaponUses?.cpu?.[weapon] > 0)) failures.push('CPU ' + weapon + ' has no measured native use');
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
  for (const policy of ['ufo', 'ufo-max']) for (const difficulty of difficulties)
    for (const seed of repeatSeeds.slice(1)) runs.push(run(policy, difficulty, seed, options));
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
