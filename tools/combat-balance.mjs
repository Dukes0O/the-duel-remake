import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { createFeatureFlags } from '../src/feature-flags.js';
import { App } from '../src/app.js';
import { Duel } from '../src/game.js';
import { stepCombat, supportsCombat } from '../src/combat.js';
import { COURSE, DRIVE, steerForYaw } from '../src/config.js';
import { DEFAULT_DRIVER } from '../src/drivers.js';
import {createProfile, createPlayerRegistry, savePlayers} from '../src/progression.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {point, velocity} from '../src/combat-weapons.js';
import { winRateFailures } from './balance-targets.mjs';
import {ROCKET_RULES} from '../src/arsenal/rockets.js';

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
const usage = 'Usage: node tools/combat-balance.mjs [--flags arsenal,arsenal-wave3,cpu-crews,seeker-rockets,tyre-slip] [--check] [--verbose] | --baseline-only | --probe=DIFFICULTY,SEED | --wave-two-only | --wave-three-only | --seeker-pair';
const BALANCE_FLAGS = ['arsenal', 'arsenal-wave3', 'cpu-crews', 'seeker-rockets', 'tyre-slip'];

function selectedFlags(flags = []) {
  if (!Array.isArray(flags) || flags.some(flag => !BALANCE_FLAGS.includes(flag)))
    throw Error('Unsupported flags; expected arsenal, arsenal-wave3, cpu-crews, seeker-rockets or tyre-slip.');
  return [...new Set(flags)];
}

export function parseArgs(args = []) {
  const options = { flags: [], check: false, verbose: false, baselineOnly: false,
    waveTwoOnly: false, waveThreeOnly: false, seekerPair: false, probe: null };
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
    else if (argument === '--wave-two-only') options.waveTwoOnly = true;
    else if (argument === '--wave-three-only') options.waveThreeOnly = true;
    else if (argument === '--seeker-pair') options.seekerPair = true;
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
      options.probe && (options.check || options.verbose) ||
      options.waveTwoOnly && (options.baselineOnly || options.probe || options.verbose || options.waveThreeOnly) ||
      options.waveThreeOnly && (options.baselineOnly || options.probe || options.verbose) ||
      options.seekerPair && (options.baselineOnly || options.probe || options.verbose ||
        options.waveTwoOnly || options.waveThreeOnly))
    throw Error(usage);
  return options;
}

function simulationFlags(flags) {
  return createFeatureFlags({ storage: null, search: '', qa: false,
    overrides: { 'seeker-rockets': flags.includes('seeker-rockets'), arsenal: flags.includes('arsenal'),
      'arsenal-wave3': flags.includes('arsenal-wave3'), 'cpu-crews': flags.includes('cpu-crews') } });
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

function saveBalanceCareer(storage, arsenalRank) {
  const profile = createProfile();
  const xp = arsenalRank > 1 ? Array.from({length: arsenalRank - 1}, (_, index) =>
    400 + 150 * index).reduce((sum, amount) => sum + amount, 0) : 0;
  profile.wasteland = normalizeWasteland({...profile.wasteland,
    xp, scrap: arsenalRank >= 13 ? 4000 : arsenalRank > 1 ? 3000 : 0,
    discoveredGate: true});
  const registry = createPlayerRegistry(profile);
  registry.players[0].name = 'Arsenal Balance';
  if (!savePlayers(registry, storage)) throw Error('Could not save the memory-only Arsenal career.');
}

function equipArsenalPolicy(app, policy) {
  if (policy.startsWith('wave-three')) {
    const weapons = policy === 'wave-three-decoy' ? ['crossbow', 'star', 'tesla', 'nitro'] :
      ['mortar', 'tesla', 'decoy', 'nitro'];
    for (const [slot, id] of weapons.entries()) {
      if (!['crossbow', 'star'].includes(id) && !app.purchaseArsenalWeapon(id).ok ||
          !app.equipCarWeapon(slot, id).ok) throw Error('Could not purchase and equip ' + id + '.');
    }
    return;
  }
  if (policy === 'wave-two' || policy === 'wave-two-close') {
    for (const [slot, id] of ['rockets', 'flamethrower', 'magnet'].entries()) {
      if (!app.purchaseArsenalWeapon(id).ok || !app.equipCarWeapon(slot, id).ok)
        throw Error('Could not purchase and equip ' + id + ' through the native Armory.');
    }
    return;
  }
  for (const [slot, id] of ['oil', 'smoke'].entries()) {
    if (!app.purchaseArsenalWeapon(id).ok || !app.equipCarWeapon(slot, id).ok)
      throw Error('Could not purchase and equip ' + id + ' through the native Armory.');
  }
  // Historical policies still request their original weapons. Rear weapons
  // occupy unused slots; all/pursuit retain all four original starter slots.
  const selected = ['none', 'rear-defense'].includes(policy) ? 'crossbow' : policy === 'ufo-max' ? 'ufo' : policy;
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
  const countedRocketVolleys = new Set();
  let serial = duel.state.combat?.serial || 0;
  const count = (role, weapon) => { uses[role][weapon] = (uses[role][weapon] || 0) + 1; };
  return {uses, unattributed, observe(event) {
    const state = duel.state, combat = state.combat;
    if (!combat) return;
    const projectiles = combat.projectiles.filter(item => item.id > serial);
    const bursts = combat.bursts.filter(item => item.id > serial);
    serial = combat.serial;
    const rear = ['oil', 'smoke', 'caltrops'].find(id => event.arsenalCue === 'weapon.' + id + '.deploy');
    if (rear) {
      if (event.actor === state) count('player', rear);
      else if (state.opponents.includes(event.actor)) count('cpu', rear);
      return;
    }
    if (event.arsenalCue === 'weapon.harpoon.fire' && event.projectile?.kind === 'harpoon') {
      count(event.projectile.enemy ? 'cpu' : 'player', 'harpoon');
      return;
    }
    const waveTwoCue = { 'weapon.rockets.fire': 'rockets',
      'weapon.flame.start': 'flamethrower', 'weapon.magnet.hum': 'magnet' }[event.arsenalCue];
    if (waveTwoCue) {
      if (waveTwoCue === 'rockets') {
        const volleyId = event.projectile?.volleyId;
        if (countedRocketVolleys.has(volleyId)) return;
        countedRocketVolleys.add(volleyId);
      }
      if (event.actor === state) count('player', waveTwoCue);
      else if (state.opponents.includes(event.actor)) count('cpu', waveTwoCue);
      else unattributed[waveTwoCue] = (unattributed[waveTwoCue] || 0) + 1;
      return;
    }
    const weapon = event.weaponFired;
    const waveThreeCue = {'weapon.mortar.fire': 'mortar', 'weapon.tesla.charge': 'tesla',
      'weapon.decoy.deploy': 'decoy', 'weapon.nitro.start': 'nitro'}[event.arsenalCue];
    if (waveThreeCue) {
      if (event.actor === state) count('player', waveThreeCue);
      else if (state.opponents.includes(event.actor)) count('cpu', waveThreeCue);
      else unattributed[waveThreeCue] = (unattributed[waveThreeCue] || 0) + 1;
      return;
    }
    if (weapon === 'bomb' || weapon === 'crossbow' || weapon === 'harpoon') {
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

// Native Rocket Pods blast emits actual removed armor / 60, then its hit
// cue with the same position object. Match by identity, not nearby coordinates
// or hit count: another weapon's damage must never enter this measurement.
export function createRocketDamageCounter(duel) {
  const volleys = new Map(), damageAt = new WeakMap(), settledShots = new Set();
  let unattributed = 0;
  return {
    observe(event) {
      const at = event.hitPosition;
      if (event.combatHit && at && typeof at === 'object' &&
          Number.isFinite(event.strength) && event.strength > 0) {
        damageAt.set(at, (damageAt.get(at) || 0) + event.strength * 60);
      }
      const shot = event.projectile;
      if (shot?.kind !== 'rocket-pod' || shot.volleyId == null) return;
      if (event.arsenalCue === 'weapon.rockets.fire') {
        let volley = volleys.get(shot.volleyId);
        if (!volley) {
          const role = event.actor === duel.state ? 'player' :
            duel.state.opponents.includes(event.actor) ? 'cpu' : null;
          if (!role) unattributed++;
          volley = {id: shot.volleyId, role, launchedRockets: 0, armorRemoved: 0};
          volleys.set(shot.volleyId, volley);
        }
        volley.launchedRockets++;
      } else if (event.arsenalCue === 'weapon.rockets.hit' && !settledShots.has(shot.id)) {
        settledShots.add(shot.id);
        const volley = volleys.get(shot.volleyId);
        if (!volley) {unattributed++; return;}
        volley.armorRemoved += at && damageAt.get(at) || 0;
        if (at) damageAt.delete(at);
      }
    },
    snapshot() {
      const result = {player: {firings: 0, armorRemoved: 0},
        cpu: {firings: 0, armorRemoved: 0}, unattributed,
        volleys: [...volleys.values()].map(volley => ({...volley}))};
      for (const volley of result.volleys) if (volley.role) {
        result[volley.role].firings++;
        result[volley.role].armorRemoved += volley.armorRemoved;
      }
      return result;
    },
  };
}

export function buildSeekerDamageReport(offRaces, onRaces) {
  if (!offRaces.length || offRaces.length !== onRaces.length ||
      new Set(offRaces.map(race => race.seed)).size !== offRaces.length ||
      new Set(onRaces.map(race => race.seed)).size !== onRaces.length)
    throw Error('Seeker report needs matched, unique seeds.');
  const enabledBySeed = new Map(onRaces.map(race => [race.seed, race]));
  const pairs = offRaces.map(off => {
    const on = enabledBySeed.get(off.seed);
    const offFlags = [...off.flags].sort();
    const onFlags = [...(on?.flags || [])].filter(flag => flag !== 'seeker-rockets').sort();
    if (!on || off.flags.includes('seeker-rockets') || !on.flags.includes('seeker-rockets') ||
        JSON.stringify(offFlags) !== JSON.stringify(onFlags) ||
        ['policy', 'cpuDifficulty', 'arsenalRank'].some(key => off[key] !== on[key]))
      throw Error('Seeker report needs matched settings with only seeker-rockets changed.');
    return {seed: off.seed, off: {completed: off.completed, rocketPods: off.rocketPods},
      on: {completed: on.completed, rocketPods: on.rocketPods}};
  });
  const summarize = races => {
    const result = {firings: 0, armorRemoved: 0,
      player: {firings: 0, armorRemoved: 0}, cpu: {firings: 0, armorRemoved: 0},
      completed: races.filter(race => race.completed).length, unattributed: 0};
    for (const race of races) {
      for (const role of ['player', 'cpu']) {
        const sample = race.rocketPods?.[role];
        if (!Number.isSafeInteger(sample?.firings) || sample.firings < 0 ||
            !Number.isFinite(sample?.armorRemoved) || sample.armorRemoved < 0)
          throw Error('Missing or invalid native Rocket Pods damage measurement.');
        result[role].firings += sample.firings;
        result[role].armorRemoved += sample.armorRemoved;
        result.firings += sample.firings;
        result.armorRemoved += sample.armorRemoved;
      }
      result.unattributed += race.rocketPods.unattributed;
    }
    for (const row of [result, result.player, result.cpu])
      row.averageArmorRemoved = row.firings ? row.armorRemoved / row.firings : null;
    return result;
  };
  const off = summarize(offRaces), on = summarize(onRaces);
  const allowedOnAverage = off.averageArmorRemoved === null ? null : off.averageArmorRemoved * 1.3;
  return {
    scope: 'Matched Medium rank-13 wave-two races with native Armory purchases and legal inputs. Only seeker-rockets changes. One firing is one native volley activation, including misses, shields and interrupted volleys. Damage is actual armor removed by that volley, including remaining-armor clipping; pooled totals include player and CPU. Aimed boss rockets are excluded.',
    damagePerRocket: {off: ROCKET_RULES.damage, on: ROCKET_RULES.seekerDamage},
    racesPerVariant: pairs.length,
    settings: {policy: offRaces[0].policy, cpuDifficulty: offRaces[0].cpuDifficulty,
      arsenalRank: offRaces[0].arsenalRank, flagsOff: offRaces[0].flags, flagsOn: onRaces[0].flags},
    off, on, ratio: off.averageArmorRemoved > 0 ? on.averageArmorRemoved / off.averageArmorRemoved : null,
    maximumRatio: 1.3, allowedOnAverage,
    passed: off.completed === pairs.length && on.completed === pairs.length &&
      off.unattributed === 0 && on.unattributed === 0 && off.firings > 0 && on.firings > 0 &&
      on.averageArmorRemoved <= allowedOnAverage,
    pairs,
  };
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
  const keys = policy === 'wave-three-decoy' ? ['crossbow', 'star', 'tesla', 'nitro'] :
    policy.startsWith('wave-three') ? ['mortar', 'tesla', 'decoy', 'nitro'] :
    ['wave-two', 'wave-two-close'].includes(policy) ?
    ['rockets', 'flamethrower', 'magnet'] :
    ['all', 'pursuit'].includes(policy) ? ['ufo', 'bomb', 'crossbow', 'star'] :
    [policy === 'ufo-max' ? 'ufo' : policy === 'rear-defense' ? 'crossbow' : policy];
  return keys.filter(key => (state.combat.cooldowns[key] ?? 0) <= 0 &&
    (key !== 'crossbow' || gap >= 0 && gap <= 120) &&
    (key !== 'star' || state.combat.shield <= 0));
}

function forwardSpeedMph(duel, actor) {
  const at = point(duel, actor), motion = velocity(actor, at);
  const along = motion.x * Math.sin(at.heading) + motion.z * Math.cos(at.heading);
  const frame = duel.course.at(actor.s);
  return Math.max(0, along / Math.max(.25, 1 - frame.curvature * actor.lateral) / DRIVE.mphToWorld);
}

function driveRearDefense(app, goalGap = 18, shadowSec = Infinity) {
  const drive = app._driveAutopilot.bind(app);
  let stallSec = 0, reverseSec = 0;
  app._driveAutopilot = dt => {
    drive(dt);
    const duel = app.duel, state = duel.state;
    if (Number.isFinite(shadowSec) && state.status === 'racing' &&
        state.impactTimer <= 0 && state.stageTimeSec > 10) {
      stallSec = Math.abs(state.speedMph) < 3 ? stallSec + dt : 0;
      if (stallSec >= 2) {reverseSec = 3; stallSec = 0;}
      if (reverseSec > 0) {
        reverseSec -= dt;
        duel.setInput({throttle: 0, brake: 1,
          steer: -Math.sign(state.headingError || 1) * .8, boost: false});
        return;
      }
    }
    if (state.status === 'countdown') {
      duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
      return;
    }
    if (state.status !== 'racing' || state.stageTimeSec >= shadowSec || state.impactTimer > 0 ||
        !state.rival || state.rival.finished || state.offRoad || state.airborne ||
        state.rival.offRoad || state.rival.knock || state.rival.combatWrecking) return;
    const gap = duel.relativeS(state.rival.s, state.s) - state.s;
    const halfWidth = duel.course.roadHalfWidthAt?.(state.s) ?? DRIVE.roadHalfWidth;
    const targetLat = Math.max(-halfWidth + 1.8, Math.min(halfWidth - 1.8, state.rival.lateral));
    const trafficConflict = state.traffic.some(actor => {
      if (!actor.alive) return false;
      const ahead = duel.relativeS(actor.s, state.s) - state.s;
      const closing = Math.max(0, state.speedMph - actor.dir * actor.speedMph) * DRIVE.mphToWorld;
      return ahead > -28 && ahead < 35 + closing * 1.15 && Math.abs(actor.lateral - targetLat) < 2.7;
    });
    if (trafficConflict) return;
    const targetSpeed = Math.max(15, forwardSpeedMph(duel, state.rival) +
      Math.max(-45, Math.min(35, (gap - goalGap) * .4)));
    const speed = forwardSpeedMph(duel, state);
    // Keep App's passing line while the CPU is behind. Shadow only a car
    // genuinely ahead; aim through our own forward course lookahead.
    const brake = speed > targetSpeed + 3 ? .45 : 0;
    let steer = state.input.steer;
    if (gap >= Math.min(8, goalGap) && gap <= 120) {
      const metresPerSec = Math.max(0, state.speedMph) * DRIVE.mphToWorld;
      const headingTarget = Math.atan((targetLat - state.lateral) * 2.5 / Math.max(15, metresPerSec));
      const look = duel.course.at(state.s + metresPerSec * .18);
      const desiredYaw = look.curvature * metresPerSec + (headingTarget - state.headingError) * 6;
      const surface = duel._drivingSurface(state.s, state.lateral);
      steer = steerForYaw(desiredYaw, {speedMph:state.speedMph,grip:duel.car.grip,traction:surface.traction,car:duel.car,brake:brake,tyreSlip:state.tyreSlipRules===true&&!state.airborne&&state.speedMph>=0});
    }
    duel.setInput({throttle: speed < targetSpeed ? 1 : 0,
      brake, steer, boost: false});
  };
}

export function run(policy, cpuDifficulty, seed = 1989,
  { flags = [], maxFrames = 30 * 600, arsenalRank = 6 } = {}) {
  flags = selectedFlags(flags);
  if (!(policies.includes(policy) || ['pursuit', 'rear-defense', 'wave-two', 'wave-two-close',
      'wave-three', 'wave-three-close', 'wave-three-decoy'].includes(policy)) || !difficulties.includes(cpuDifficulty) ||
      !Number.isSafeInteger(seed) || !Number.isSafeInteger(maxFrames) || maxFrames < 0)
    throw Error('Invalid race policy, difficulty, seed or frame limit.');
  if (!Number.isSafeInteger(arsenalRank) || arsenalRank < 1 || arsenalRank > 30 ||
      ['wave-two', 'wave-two-close'].includes(policy) &&
        (!flags.includes('arsenal') || arsenalRank < 13))
    throw Error('Wave-two policy needs the arsenal switch and earned rank 13.');
  if (policy.startsWith('wave-three') && (!flags.includes('arsenal') ||
      !flags.includes('arsenal-wave3') || arsenalRank < 21))
    throw Error('Wave-three policy needs both Arsenal switches and earned rank 21.');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
  let app;
  try {
    globalThis.localStorage = memoryStorage();
    globalThis.cancelAnimationFrame ??= () => {};
    saveBalanceCareer(globalThis.localStorage, flags.includes('arsenal') ? arsenalRank : 1);
    app = new App();
    app.duel.featureFlags = simulationFlags(flags);
    if (flags.includes('arsenal')) equipArsenalPolicy(app, policy);
    if (!app.startCampaign({ startStage: 0, seed, mode: 'wasteland', discoveredGate: true, car: 'falcone_f42',
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
        // Pursuit must keep the ordinary driver's turn braking and coasting.
        duel.setInput({throttle: Math.min(state.input.throttle, state.speedMph < targetSpeed ? 1 : 0),
          brake: Math.max(state.input.brake, state.speedMph > targetSpeed + 3 ? .45 : 0), boost: false});
      };
    }
    if (policy === 'rear-defense') driveRearDefense(app);
    if (policy === 'wave-two-close') driveRearDefense(app, 7);
    if (policy === 'wave-three-close') driveRearDefense(app, 7);
    if (policy === 'wave-three-decoy') driveRearDefense(app, 45, 120);
    const duel = app.duel;
    const cpuLoadout = policy.startsWith('wave-three') || ['wave-two', 'wave-two-close'].includes(policy)
      ? [...(duel.state.rival?.weaponLoadout || [])] : null;
    if (policy === 'ufo-max' && !flags.includes('arsenal')) {
      duel.state.combat.levels.ufo = 3;
      duel.state.weaponLevels.ufo = 3;
    }
    const shots = { ufo: 0, bomb: 0, crossbow: 0, star: 0,
      ...(policy.startsWith('wave-three') ? {mortar: 0, tesla: 0, decoy: 0, nitro: 0} : {}),
      ...(['wave-two', 'wave-two-close'].includes(policy)
        ? {rockets: 0, flamethrower: 0, magnet: 0} : {}) };
    let cpuHits = 0, unattributedEnemyHits = 0, playerOpponentWrecks = 0;
    const cpuCrew = {repairs: 0, ambushes: 0, attacks: 0, returns: 0, respawns: 0};
    const wrecks = emptyWrecks();
    const weaponCounter = weaponUseCounter(duel);
    const rocketCounter = createRocketDamageCounter(duel);
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
      rocketCounter.observe(event);
      if (event.cpuCrewExited) cpuCrew[event.reason === 'repair' ? 'repairs' : 'ambushes']++;
      if (event.cpuCrewEntered) cpuCrew.returns++;
      if (event.cpuCrewRespawned) cpuCrew.respawns++;
      if (event.enemy && (event.footWeaponFired ||
          ['crew.turret.deploy', 'crew.flamer.start'].includes(event.crewGearCue))) cpuCrew.attacks++;
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
      policy, cpuDifficulty, seed, flags, arsenalRank, wrecks, playerOpponentWrecks, status: state.status,
      ...(flags.includes('cpu-crews') ? {cpuCrew} : {}),
      ...(cpuLoadout ? {cpuLoadout} : {}),
      completed: state.results?.completed === true,
      ...(!state.results?.completed ? {unfinished: {s: state.s, speedMph: state.speedMph,
        input: state.input, onFoot: state.onFoot, lateral: state.lateral,
        gear: state.gear, revs: state.revs, headingError: state.headingError,
        knock: state.knock, airHeight: state.airHeight, combatWrecking: state.combatWrecking}} : {}),
      won: state.results?.won === true,
      timeSec: rounded(state.results?.timeSec ?? state.stageTimeSec),
      rivalTimeSec: state.rival?.finishTime == null ? null : rounded(state.rival.finishTime),
      shots, weaponUses: weaponCounter.uses, unattributedWeaponUses: weaponCounter.unattributed,
      rocketPods: rocketCounter.snapshot(),
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
    duel.startCampaign({ mode: 'wasteland', startStage: event.index, discoveredGate: true,
      car: event.stage.requiredCar ?? 'falcone_f42',
      ...(flags.includes('arsenal') ? {arsenalRank: 6} : {}) });
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
    duel.startCampaign({ mode: 'wasteland', startStage: 0, discoveredGate: true,
      ...(flags.includes('arsenal') ? {arsenalRank: 6} : {}) });
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
  crossbowAim, ownBombs, rearDefenseRuns = [] }) {
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
  const report = { flags, policyRuns: runs.length,
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
  if (rearDefenseRuns.length) report.rearDefense = {
    scope: 'Separate supplemental rear-defense races with natural CPU loadouts, legal driving and native Crossbow damage; excluded from every historical sample and target.',
    races: rearDefenseRuns,
    weaponUses: sumWeaponUses(rearDefenseRuns),
  };
  if (flags.includes('cpu-crews')) report.cpuCrew = {
    scope: 'Native exit, attack, return and respawn events across the unchanged complete-race samples.',
    races: allRuns.filter(race => race.completed).length,
    incomplete: allRuns.filter(race => !race.completed).map(({cpuDifficulty, seed}) => ({cpuDifficulty, seed})),
    byDifficulty: Object.fromEntries(difficulties.map(difficulty => [difficulty,
      allRuns.filter(race => race.cpuDifficulty === difficulty).reduce((total, race) => {
        for (const key of Object.keys(total)) total[key] += race.cpuCrew?.[key] || 0;
        return total;
      }, {repairs: 0, ambushes: 0, attacks: 0, returns: 0, respawns: 0})])),
  };
  return report;
}

export function reportFailures(report, runs, baselineRuns) {
  const { winRateByDifficulty: baselineWins, firstTwelveSec, ufoGainByDifficulty,
    crossbowAim, ownBombs, cpuHitsByDifficulty } = report;
  const failures = [];
  const rearDefenseRuns = report.rearDefense?.races || [];
  const observedRuns = [...runs, ...baselineRuns, ...rearDefenseRuns];
  failures.push(...winRateFailures(baselineWins));
  if (firstTwelveSec >= 120) failures.push(`12-run pace ${firstTwelveSec}s exceeds 120s`);
  if (runs.some(run => !run.completed)) failures.push('one or more policy races did not complete');
  if (baselineRuns.some(run => !run.completed)) failures.push('one or more baseline win-rate races did not complete');
  if (observedRuns.some(run => run.unattributedEnemyHits || run.cpuHits === null)) failures.push('enemy hit events lack victim identity');
  if (observedRuns.some(run => Object.values(run.unattributedWeaponUses || {}).some(count => count > 0)))
    failures.push('weapon use events lack actor attribution');
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
  if (rearDefenseRuns.some(race => !race.completed)) failures.push('one or more rear-defense supplemental races did not complete');
  const measuredUses = sumWeaponUses([{weaponUses: report.weaponUses},
    ...rearDefenseRuns.filter(race => race.completed)]);
  if (report.flags.includes('arsenal')) for (const weapon of ['oil', 'smoke', 'harpoon', 'caltrops']) {
    if (!(measuredUses.cpu[weapon] > 0)) failures.push('CPU ' + weapon + ' has no measured native use');
  }
  return failures;
}

function main(args) {
  const { flags, check, verbose, baselineOnly, waveTwoOnly, waveThreeOnly, seekerPair, probe } = parseArgs(args);
  const options = { flags };
  if (seekerPair) {
    if (!flags.includes('arsenal')) throw Error('Seeker paired report needs --flags arsenal.');
    const started = performance.now(), off = [], on = [];
    const flagsOff = flags.filter(flag => flag !== 'seeker-rockets');
    const flagsOn = [...flagsOff, 'seeker-rockets'];
    for (const seed of baselineSeeds) {
      off.push(run('wave-two', 'medium', seed, {flags: flagsOff, arsenalRank: 13}));
      on.push(run('wave-two', 'medium', seed, {flags: flagsOn, arsenalRank: 13}));
    }
    const report = buildSeekerDamageReport(off, on);
    report.elapsedSec = rounded((performance.now() - started) / 1000);
    console.log(JSON.stringify(report, null, 2));
    if (check && !report.passed) {
      console.error('Seeker paired report requires complete attributed samples and average actual armor damage per firing no greater than 1.3 times off.');
      process.exitCode = 1;
    }
    return;
  }
  if (waveThreeOnly) {
    if (!flags.includes('arsenal') || !flags.includes('arsenal-wave3'))
      throw Error('Wave-three report needs --flags arsenal,arsenal-wave3.');
    const started = performance.now();
    const races = baselineSeeds.map(seed => run('wave-three', 'hard', seed, {flags, arsenalRank: 21}));
    const supplements = ['wave-three-close', 'wave-three-decoy'].flatMap(policy =>
      repeatSeeds.map(seed => run(policy, 'hard', seed, {flags, arsenalRank: 21})));
    const all = [...races, ...supplements], weaponUses = sumWeaponUses(all);
    const report = {flags, scope: 'Thirty complete Hard races at earned rank 21. Twelve separately labelled complete close-range and Crossbow-defense races use legal driving and naturally seeded CPU loadouts. Historical samples and targets remain unchanged.',
      races: races.length, completed: races.filter(race => race.completed).length,
      wins: races.filter(race => race.won).length, weaponUses,
      supplements: supplements.map(({policy, seed, completed, cpuLoadout, weaponUses}) =>
        ({policy, seed, completed, cpuLoadout, weaponUses})),
      incomplete: all.filter(race => !race.completed).map(({policy, seed, status, timeSec}) =>
        ({policy, seed, status, timeSec})),
      unattributedWeaponUses: all.reduce((sum, race) => sum +
        Object.values(race.unattributedWeaponUses).reduce((a, b) => a + b, 0), 0),
      elapsedSec: rounded((performance.now() - started) / 1000)};
    console.log(JSON.stringify(report, null, 2));
    if (check && (report.completed !== 30 || report.incomplete.length || report.unattributedWeaponUses ||
        ['mortar', 'tesla', 'decoy', 'nitro'].some(id => !(weaponUses.cpu[id] > 0)))) {
      console.error('Wave-three report needs thirty completions, complete supplements, actor attribution and native CPU use of all four weapons.');
      process.exitCode = 1;
    }
    return;
  }
  if (waveTwoOnly) {
    if (!flags.includes('arsenal')) throw Error('Wave-two report needs --flags arsenal.');
    const started = performance.now();
    const races = baselineSeeds.map(seed => run('wave-two', 'medium', seed,
      {flags, arsenalRank: 13}));
    const closeRange = run('wave-two-close', 'medium', 1989,
      {flags, arsenalRank: 13});
    const uses = sumWeaponUses(races);
    const measuredUses = sumWeaponUses([...races, closeRange]);
    const report = { flags, scope: 'Separate thirty-seed Medium wave-two policy at earned rank 13 with native Armory purchases, legal trigger inputs and natural seeded CPU loadouts. One separately labelled complete close-range race uses legal vehicle inputs to exercise the CPU flamethrower. Win rate is descriptive. Historical samples and targets are unchanged.',
      races: races.length, completed: races.filter(race => race.completed).length,
      incomplete: races.filter(race => !race.completed).map(race =>
        ({seed: race.seed, status: race.status, timeSec: race.timeSec})),
      wins: races.filter(race => race.won).length,
      winRate: rounded(average(races.map(race => Number(race.won)))),
      meanTimeSec: rounded(average(races.map(race => race.timeSec))),
      shots: Object.fromEntries(['rockets', 'flamethrower', 'magnet'].map(id =>
        [id, races.reduce((sum, race) => sum + race.shots[id], 0)])),
      cpuEquippedRaces: Object.fromEntries(['rockets', 'flamethrower', 'magnet'].map(id =>
        [id, races.filter(race => race.cpuLoadout.includes(id)).length])),
      weaponUses: uses, unattributedWeaponUses: races.reduce((sum, race) =>
        sum + Object.values(race.unattributedWeaponUses).reduce((a, b) => a + b, 0), 0),
      closeRange: {seed: closeRange.seed, completed: closeRange.completed,
        cpuLoadout: closeRange.cpuLoadout, weaponUses: closeRange.weaponUses,
        unattributedWeaponUses: closeRange.unattributedWeaponUses},
      cpuHits: races.reduce((sum, race) => sum + (race.cpuHits || 0), 0),
      rivalHits: races.reduce((sum, race) => sum + race.rivalHits, 0),
      elapsedSec: rounded((performance.now() - started) / 1000) };
    console.log(JSON.stringify(report, null, 2));
    if (check && (report.completed !== 30 || !closeRange.completed ||
        report.unattributedWeaponUses ||
        Object.values(closeRange.unattributedWeaponUses).some(count => count > 0) ||
        ['rockets', 'flamethrower', 'magnet'].some(id => !(measuredUses.cpu[id] > 0)))) {
      console.error('Wave-two report requires thirty normal completions, a completed close-range race, actor-attributed uses and native CPU use of each weapon.');
      process.exitCode = 1;
    }
    return;
  }
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
  const rearDefenseRuns = flags.includes('arsenal')
    ? ['medium', 'hard', 'easy'].flatMap(difficulty =>
      [1991, 1992, ...(difficulty === 'medium' ? [1997] : [])]
      .map(seed => run('rear-defense', difficulty, seed, options))) : [];
  const report = buildReport({ flags, runs, baselineRuns, firstTwelveSec, rearDefenseRuns,
    elapsedSec: rounded((performance.now() - started) / 1000), crossbowAim, ownBombs });
  const pursuitRuns = difficulties.map(difficulty => run('pursuit', difficulty, 1989, options));
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
