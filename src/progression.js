import { weaponSignature } from './weapon-upgrades.js';
import { CARS, COURSE, DEFAULT_CAR, DRIVE, CPU_DIFFICULTY, POLICE } from './config.js';
import { normalizeCosmetics } from './paint-presets.js';
import { normalizeRaceSettings } from './race-settings.js';
import {
  DRIVERS,
  normalizeDrivers,
  getDriverState,
  normalizeDriverId,
  driverModifierSignature
} from './drivers.js';
import { normalizeCourseAccess } from './course-access.js';
import { rivalSignature } from './rival-settings.js';
import { COMBAT_TUNING } from './wasteland-tuning.js';
import { normalizeWasteland } from './wasteland-progress.js';
import { combatNotoriety, MAX_NOTORIETY_XP, rankForXp } from './notoriety.js';

export const PROFILE_KEY = 'the-duel-profile-v1';
export const PLAYERS_KEY = 'the-duel-players-v2';
export const UPGRADE_COSTS = Object.freeze([350, 600, 950]);
export const CAR_PRICES = Object.freeze(
  Object.fromEntries(
    Object.entries(CARS)
      .filter(([, car]) => car.price > 0 && !car.unlockRequirement)
      .map(([key, car]) => [key, car.price])
  )
);
export const CPU_REWARDS = Object.freeze(
  Object.fromEntries(Object.entries(CPU_DIFFICULTY).map(([key, item]) => [key, item.winReward]))
);
export const DRIVING_MILESTONES = Object.freeze({
  clean_debut: {
    name: 'Clean debut',
    description: 'Win a race with no crashes or missed fuel stop.',
    reward: 100
  },
  faster_again: {
    name: 'Faster again',
    description: 'Beat an existing comparable car best.',
    reward: 150
  },
  circuit_tour: {
    name: 'Circuit tour',
    description: 'Win all three campaign circuits.',
    reward: 400
  },
  trail_winner: { name: 'Trail winner', description: 'Win Ridge Rally.', reward: 300 },
  night_escape: {
    name: 'Night escape',
    description: 'Finish Midnight Muscle Chase before the deadline.',
    reward: 350
  },
  arena_show: {
    name: 'Arena show',
    description: 'Win the Titan arena with 3 landed jumps or 2 player crushes.',
    reward: 500
  }
});
export const UPGRADE_TYPES = Object.freeze({
  engine: { name: 'Engine', description: 'More power and higher top speed.' },
  nitro: { name: 'Nitro', description: 'Stronger boost that lasts longer.' },
  handling: { name: 'Handling', description: 'More grip through fast corners.' },
  tires: { name: 'Tires', description: 'Grip on asphalt and dirt.' },
  brakes: { name: 'Brakes', description: 'Slow down faster before a corner.' },
  suspension: { name: 'Suspension', description: 'Less bounce and better control on dirt.' },
  tank: { name: 'Nitro tank', description: 'More boost capacity for longer bursts.' }
});
const FREE_CARS = ['falcone_f42', 'stuttgart_959s'];
const completionCars = () =>
  Object.keys(CARS).filter(car => CARS[car].unlockRequirement === 'max-all-other-cars');
const maxUpgradeLevels = () =>
  Object.fromEntries(Object.keys(UPGRADE_TYPES).map(type => [type, 3]));
const integer = (value, max) => Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
const combatCount = value => Number.isSafeInteger(value) && value > 0 ? value : 0;
function combatCreditBonus(result, base) {
  const tuning = COMBAT_TUNING.creditBonus;
  const cap = Math.round(base * tuning.maximumBaseFraction);
  const hits = Math.min(combatCount(result.hitsLanded), Math.ceil(cap / tuning.perHit));
  const wrecks = Math.min(combatCount(result.wrecksCaused), Math.ceil(cap / tuning.perWreck));
  return Math.min(cap, hits * tuning.perHit + wrecks * tuning.perWreck);
}
const upgradeLevel = value =>
  ['number', 'string'].includes(typeof value) && Number.isFinite(Number(value))
    ? integer(value, 3)
    : 0;
const validStrings = value => [
  ...new Set(
    (Array.isArray(value) ? value : []).filter(
      key => typeof key === 'string' && key.length > 0 && key.length <= 180
    )
  )
];
export const playerName = value =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);
const newId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createProfile() {
  return {
    version: 2,
    credits: 0,
    wasteland: normalizeWasteland(),
    unlockedCars: [...FREE_CARS],
    upgrades: {},
    cosmetics: normalizeCosmetics(),
    drivers: normalizeDrivers(),
    courses: normalizeCourseAccess(),
    raceSettings: null,
    settledResults: [],
    settledPoliceFines: [],
    pbBonusRuns: [],
    personalBests: {},
    milestones: [],
    circuitWins: [],
    winStreak: 0,
    history: [],
    activeRace: null
  };
}
export function normalizeProfile(value) {
  if (!value || typeof value !== 'object' || ![1, 2].includes(value.version))
    return createProfile();
  let profile = createProfile();
  profile.credits = integer(value.credits, 1_000_000_000);
  profile.unlockedCars = [
    ...new Set([
      ...FREE_CARS,
      ...(Array.isArray(value.unlockedCars)
        ? value.unlockedCars.filter(car => Object.hasOwn(CARS, car))
        : [])
    ])
  ];
  for (const car of profile.unlockedCars) profile.upgrades[car] = getUpgradeLevels(value, car);
  // Reward old, fully built garages on load, before validating the selected car.
  // A previously earned reward stays owned if the roster grows in a later update.
  profile = grantCompletionCars(profile);
  profile.cosmetics = normalizeCosmetics(value.cosmetics);
  profile.wasteland = normalizeWasteland(value.wasteland, value.weapons);
  profile.drivers = getDriverState({ ...profile, drivers: value.drivers });
  profile.courses = normalizeCourseAccess(value.courses, value);
  profile.raceSettings =
    value.raceSettings == null ? null : normalizeRaceSettings(value.raceSettings, profile);
  profile.settledResults = validStrings(value.settledResults || value.awardedWins);
  profile.pbBonusRuns = validStrings(value.pbBonusRuns);
  profile.settledPoliceFines = validStrings(value.settledPoliceFines);
  profile.milestones = validStrings(value.milestones).filter(id =>
    Object.hasOwn(DRIVING_MILESTONES, id)
  );
  profile.circuitWins = validStrings(value.circuitWins).filter(id =>
    COURSE.some((stage, index) => !stage.kind && stageEventId(index) === id)
  );
  profile.winStreak = integer(value.winStreak, 1_000_000);
  if (value.personalBests && typeof value.personalBests === 'object')
    for (const [key, time] of Object.entries(value.personalBests))
      if (key.length <= 400 && Number.isFinite(time) && time > 0) profile.personalBests[key] = time;
  profile.history = (Array.isArray(value.history) ? value.history : [])
    .filter(
      row =>
        row &&
        typeof row.key === 'string' &&
        typeof row.won === 'boolean' &&
        Number.isFinite(row.reward)
    )
    .slice(-60)
    .map(row => ({ ...row }));
  const race = value.activeRace;
  if (
    race &&
    typeof race.runId === 'string' &&
    race.runId.length > 0 &&
    race.runId.length <= 128 &&
    Number.isInteger(race.stageIndex) &&
    COURSE[race.stageIndex] &&
    Object.hasOwn(CARS, race.car)
  ) {
    const pendingPoliceFineCount = integer(race.pendingPoliceFineCount, 1_000_000);
    profile.activeRace = {
      runId: race.runId,
      stageIndex: race.stageIndex,
      key: `${race.runId}:${race.stageIndex}`,
      car: race.car,
      driverId: normalizeDriverId(race.driverId),
      cpuDifficulty: Object.hasOwn(CPU_REWARDS, race.cpuDifficulty) ? race.cpuDifficulty : 'easy',
      pendingPoliceFineCount,
      pendingPoliceFines: pendingPoliceFineCount * POLICE.ticketBaseFine
    };
  }
  return profile;
}
export function createPlayerRegistry(profile = createProfile()) {
  return {
    version: 2,
    activePlayerId: 'player-1',
    players: [{ id: 'player-1', name: 'Player 1', profile: normalizeProfile(profile) }]
  };
}
function normalizeRegistry(value) {
  if (value?.version !== 2 || !Array.isArray(value.players)) return null;
  const seenIds = new Set(),
    seenNames = new Set(),
    players = [];
  for (const p of value.players) {
    const name = playerName(p?.name),
      id = String(p?.id || '');
    if (!name || !/^[\w-]{1,80}$/.test(id) || seenIds.has(id) || seenNames.has(name.toLowerCase()))
      continue;
    seenIds.add(id);
    seenNames.add(name.toLowerCase());
    players.push({ id, name, profile: normalizeProfile(p.profile) });
  }
  if (!players.length) return null;
  return {
    version: 2,
    activePlayerId: players.some(p => p.id === value.activePlayerId)
      ? value.activePlayerId
      : players[0].id,
    players
  };
}
export function loadPlayers(storage) {
  let target;
  try {
    target = storage ?? globalThis.localStorage;
  } catch {
    return createPlayerRegistry();
  }
  try {
    const raw = target?.getItem(PLAYERS_KEY);
    if (raw) {
      const value = normalizeRegistry(JSON.parse(raw));
      if (value) return value;
    }
  } catch {}
  try {
    const raw = target?.getItem(PROFILE_KEY);
    return createPlayerRegistry(raw ? normalizeProfile(JSON.parse(raw)) : createProfile());
  } catch {
    return createPlayerRegistry();
  }
}
export function savePlayers(registry, storage) {
  try {
    const target = storage ?? globalThis.localStorage,
      normalized = normalizeRegistry(registry);
    if (!target || !normalized) return false;
    if (normalized.players.some(player => Number.isSafeInteger(player.profile.wasteland?.version) &&
      player.profile.wasteland.version > 1)) return false;
    target.setItem(PLAYERS_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}
export function activePlayer(registry) {
  return registry.players.find(p => p.id === registry.activePlayerId) || registry.players[0];
}
export function createPlayer(registry, name) {
  name = playerName(name);
  if (!name) return { registry, ok: false, reason: 'Enter a player name.' };
  if (registry.players.some(p => p.name.toLowerCase() === name.toLowerCase()))
    return { registry, ok: false, reason: 'That player already exists. Select them instead.' };
  const player = { id: newId(), name, profile: createProfile() };
  return {
    registry: { ...registry, activePlayerId: player.id, players: [...registry.players, player] },
    ok: true,
    player
  };
}
export function selectPlayer(registry, id) {
  return registry.players.some(p => p.id === id) ? { ...registry, activePlayerId: id } : registry;
}
export function replacePlayerProfile(registry, id, profile) {
  return {
    ...registry,
    players: registry.players.map(p =>
      p.id === id ? { ...p, profile: normalizeProfile(profile) } : p
    )
  };
}
// Compatibility for callers that only need the active local profile.
export function loadProfile(storage) {
  return activePlayer(loadPlayers(storage)).profile;
}
export function saveProfile(profile, storage) {
  const registry = loadPlayers(storage);
  return savePlayers(replacePlayerProfile(registry, registry.activePlayerId, profile), storage);
}
export function isCarUnlocked(profile, car) {
  return (
    Object.hasOwn(CARS, car) && (FREE_CARS.includes(car) || !!profile?.unlockedCars?.includes(car))
  );
}
export function getUpgradeLevels(profile, car = DEFAULT_CAR) {
  if (CARS[car]?.factoryMaxed) return maxUpgradeLevels();
  const levels = profile?.upgrades?.[car];
  return Object.fromEntries(
    Object.keys(UPGRADE_TYPES).map(type => [type, upgradeLevel(levels?.[type])])
  );
}
export function completionCarProgress(profile, car = 'koenigsegg_jesko') {
  const required =
    CARS[car]?.unlockRequirement === 'max-all-other-cars'
      ? Object.keys(CARS).filter(key => key !== car)
      : [];
  const maxed = required.filter(
    key =>
      isCarUnlocked(profile, key) &&
      Object.values(getUpgradeLevels(profile, key)).every(level => level === 3)
  ).length;
  return {
    car,
    maxed,
    total: required.length,
    eligible: required.length > 0 && maxed === required.length,
    unlocked: isCarUnlocked(profile, car),
    requirementLabel: required.length
      ? `Fully upgrade all ${required.length} other cars in all ${Object.keys(UPGRADE_TYPES).length} upgrade categories.`
      : ''
  };
}
function grantCompletionCars(profile) {
  const earned = completionCars().filter(
    car => !isCarUnlocked(profile, car) && completionCarProgress(profile, car).eligible
  );
  const updated = earned.length
    ? {
        ...profile,
        unlockedCars: [...profile.unlockedCars, ...earned],
        upgrades: {
          ...profile.upgrades,
          ...Object.fromEntries(earned.map(car => [car, maxUpgradeLevels()]))
        }
      }
    : profile;
  return { ...updated, drivers: getDriverState(updated) };
}
export function stageEventId(index) {
  const stage = COURSE[index];
  return stage ? String(stage.id || `course-${index}`) : '';
}
// Only archival validation supplies the second argument. Ordinary callers
// always key new races against the current layout, regardless of payload extras.
export function eventKey({ stageIndex, seed = 1989, laps } = {}, layoutVersion) {
  const stage = COURSE[stageIndex];
  return stage
    ? `${stageEventId(stageIndex)}|layout:${layoutVersion ?? stage.layoutVersion ?? 1}|seed:${seed >>> 0}|laps:${laps || stage.laps || 2}`
    : '';
}
export function bestKey(
  result,
  layoutVersion,
  signature = driverModifierSignature(result.driverId, result.car)
) {
  const rival = rivalSignature(result);
  return [
    eventKey(result, layoutVersion),
    result.car,
    result.mode || 'duel',
    result.difficulty || 'casual',
    result.cpuDifficulty || 'easy',
    ...(signature ? [`driver:${signature}`] : []),
    ...(rival ? [`rival:${rival}`] : []),
    ...(weaponSignature(result) ? [`weapons:${weaponSignature(result)}`] : [])
  ].join('|');
}
function isCompletedRace(result) {
  const stage = COURSE[result?.stageIndex];
  return (
    !!stage &&
    !stage.practice &&
    result.completed === true &&
    result.abandoned !== true &&
    result.timeout !== true &&
    Number.isFinite(result.timeSec) &&
    result.timeSec > 0 &&
    Number.isInteger(result.laps) &&
    result.laps === (stage.laps || 2) &&
    Object.hasOwn(CARS, result.car) &&
    (result.driverId == null || Object.hasOwn(DRIVERS, result.driverId))
  );
}
export function isValidFinish(result) {
  if (!isCompletedRace(result)) return false;
  const stage = COURSE[result.stageIndex];
  if (!stage.stuntTrial && !['drift', 'checkpoint'].includes(stage.kind)) return true;
  const cpu = Object.hasOwn(CPU_REWARDS, result.cpuDifficulty) ? result.cpuDifficulty : 'easy';
  if (stage.stuntTrial) {
    const target = stage.stuntTrial;
    return (
      result.won === true &&
      result.targetsMet === true &&
      result.objectiveMissed !== true &&
      Number.isSafeInteger(result.jumps) &&
      result.jumps >= target.jumps &&
      Number.isSafeInteger(result.crushCount) &&
      result.crushCount >= target.crushes &&
      result.timeSec <= target.timeLimitSec[cpu]
    );
  }
  if (stage.kind === 'checkpoint') {
    const required = stage.checkpointRush.gatesPerLap * (stage.laps || 2);
    return (
      result.won === true &&
      result.targetsMet === true &&
      result.objectiveMissed !== true &&
      result.checkpointsPassed === required &&
      result.checkpointsRequired === required &&
      result.checkpointMisses === 0 &&
      result.timeSec <=
        stage.checkpointRush.initialTimeSec[cpu] + required * stage.checkpointRush.extensionSec[cpu]
    );
  }
  return (
    result.won === true &&
    result.targetsMet === true &&
    result.objectiveMissed !== true &&
    Number.isFinite(result.driftScore) &&
    result.driftScore >= stage.driftTrial.targets[cpu] &&
    result.timeSec <= stage.driftTrial.timeLimitSec[cpu]
  );
}
export function milestoneProgress(profile) {
  const circuits = COURSE.flatMap((stage, index) => (stage.kind ? [] : [stageEventId(index)]));
  return Object.entries(DRIVING_MILESTONES).map(([id, milestone]) => {
    const earned = profile?.milestones?.includes(id) || false,
      total = id === 'circuit_tour' ? circuits.length : 1,
      progress = earned
        ? total
        : id === 'circuit_tour'
          ? circuits.filter(event => profile?.circuitWins?.includes(event)).length
          : 0;
    return { id, ...milestone, earned, progress, total };
  });
}
function finishMilestones(profile, result, { finished, won, improved }) {
  const stage = COURSE[result.stageIndex],
    earned = [...(profile.milestones || [])],
    circuitWins = [...(profile.circuitWins || [])],
    awards = [];
  if (!finished) return { earned, circuitWins, awards, reward: 0 };
  if (won && !stage.kind && !circuitWins.includes(stageEventId(result.stageIndex)))
    circuitWins.push(stageEventId(result.stageIndex));
  const validCount = (value, min) => Number.isInteger(value) && value >= min;
  const conditions = {
    clean_debut: won && result.clean === true,
    faster_again: improved,
    circuit_tour:
      won &&
      !stage.kind &&
      COURSE.every((event, index) => event.kind || circuitWins.includes(stageEventId(index))),
    trail_winner: won && stage.kind === 'rally',
    night_escape: won && stage.kind === 'chase',
    arena_show:
      won && stage.arena && (validCount(result.jumps, 3) || validCount(result.crushCount, 2))
  };
  for (const [id, eligible] of Object.entries(conditions))
    if (eligible && !earned.includes(id)) {
      earned.push(id);
      awards.push({ id, ...DRIVING_MILESTONES[id] });
    }
  return {
    earned,
    circuitWins,
    awards,
    reward: awards.reduce((sum, award) => sum + award.reward, 0)
  };
}

// Catches accrue against this race's future earnings, never the banked wallet.
// Keep legacy settled IDs for duplicate protection, but do not turn earlier
// saved fines into new pending debt. Only a new catch in the active race accrues.
export function settlePoliceFine(profile, ticket = {}) {
  const valid =
    typeof ticket?.runId === 'string' &&
    ticket.runId.length > 0 &&
    ticket.runId.length <= 128 &&
    Number.isInteger(ticket.stageIndex) &&
    !!COURSE[ticket.stageIndex] &&
    Number.isSafeInteger(ticket.ticketIndex) &&
    ticket.ticketIndex > 0;
  const ignored = { profile, accrued: false, charge: 0, pendingFine: 0, pendingFineTotal: 0 };
  if (!valid) return ignored;
  const stageKey = `${ticket.runId}:${ticket.stageIndex}`,
    key = `${stageKey}:${ticket.ticketIndex}`,
    settled = profile.settledPoliceFines || [];
  if (
    profile.activeRace?.key !== stageKey ||
    profile.settledResults?.includes(stageKey) ||
    settled.includes(key)
  )
    return ignored;
  const pendingPoliceFineCount = integer(profile.activeRace.pendingPoliceFineCount, 1_000_000) + 1,
    pendingPoliceFines = pendingPoliceFineCount * POLICE.ticketBaseFine;
  return {
    profile: {
      ...profile,
      activeRace: { ...profile.activeRace, pendingPoliceFineCount, pendingPoliceFines },
      settledPoliceFines: [...settled, key]
    },
    accrued: true,
    charge: 0,
    pendingFine: POLICE.ticketBaseFine,
    pendingFineTotal: pendingPoliceFines
  };
}

// Every race settles once, whether won, lost or abandoned by a terminal crash.
// Each stage can pay for a comparable best improvement; its settlement key
// prevents repeats even when another stage in the campaign already paid a best.
export function settleRace(profile, result = {}) {
  const valid =
    typeof result.runId === 'string' &&
    result.runId.length > 0 &&
    result.runId.length <= 128 &&
    Number.isInteger(result.stageIndex) &&
    !!COURSE[result.stageIndex] &&
    typeof result.won === 'boolean';
  const key = `${result.runId}:${result.stageIndex}`;
  if (!valid || COURSE[result.stageIndex]?.practice ||
    profile.settledResults.includes(key) ||
    profile.wasteland?.settledResults?.includes(key))
    return { profile, reward: 0, awarded: false, personalBest: false, breakdown: {} };
  // Race earnings are deferred until the finish. Leaving discards that attempt
  // and its pending fines without touching any credits already in the bank.
  if (result.abandoned === true) {
    const breakdown = {
      base: 0,
      clean: 0,
      personalBest: 0,
      streak: 0,
      jumps: 0,
      crush: 0,
      drift: 0,
      police: 0,
      manual: 0,
      milestones: 0,
      policeFines: 0
    };
    const updated = {
      ...profile,
      winStreak: 0,
      settledResults: [...profile.settledResults, key],
      activeRace: profile.activeRace?.key === key ? null : profile.activeRace,
      history: [
        ...profile.history,
        {
          key,
          eventId: stageEventId(result.stageIndex),
          car: result.car,
          won: false,
          completed: false,
          abandoned: true,
          timeSec: null,
          cpuDifficulty: Object.hasOwn(CPU_REWARDS, result.cpuDifficulty)
            ? result.cpuDifficulty
            : 'easy',
          reward: 0,
          charge: 0,
          policeFineCharge: 0,
          breakdown,
          milestones: [],
          at: Date.now()
        }
      ].slice(-60)
    };
    return {
      profile: updated,
      reward: 0,
      charge: 0,
      policeFineCharge: 0,
      awarded: true,
      personalBest: false,
      personalBestStatus: 'ineligible',
      previousBest: null,
      best: null,
      breakdown,
      winStreak: 0,
      milestones: []
    };
  }
  const cpu = Object.hasOwn(CPU_REWARDS, result.cpuDifficulty) ? result.cpuDifficulty : 'easy',
    base = CPU_REWARDS[cpu],
    finished = isCompletedRace(result),
    combatRace = result.mode === 'wasteland' && result.combatRewardsEnabled === true,
    recordEligible = isValidFinish(result),
    won = result.won && recordEligible;
  const notoriety = profile.wasteland?.version === 1
    ? combatNotoriety(result, { finished, won }) : null;
  const previousXp = integer(profile.wasteland?.xp, MAX_NOTORIETY_XP);
  const notorietyEarned = notoriety
    ? Math.min(MAX_NOTORIETY_XP - previousXp, notoriety.total) : 0;
  const totalXp = previousXp + notorietyEarned;
  const notorietyRank = notoriety ? rankForXp(totalXp) : null;
  const comparison = bestKey({ ...result, cpuDifficulty: cpu }),
    previous = profile.personalBests[comparison],
    personalBest = recordEligible && (previous == null || result.timeSec < previous - 0.005);
  const improved = personalBest && previous != null,
    streak = won ? profile.winStreak + 1 : 0;
  const jumps = won && COURSE[result.stageIndex].arena ? integer(result.jumps, 3) : 0;
  const crushed = won && COURSE[result.stageIndex].arena ? integer(result.crushCount, 4) : 0;
  const driftRatio =
    won && COURSE[result.stageIndex].kind === 'drift'
      ? result.driftScore / COURSE[result.stageIndex].driftTrial.targets[cpu]
      : 0;
  const driftBonus =
    driftRatio >= 2 ? 0.15 : driftRatio >= 1.5 ? 0.1 : driftRatio >= 1.25 ? 0.05 : 0;
  const policeEscapes =
    recordEligible && result.objectiveMissed !== true && Number.isSafeInteger(result.policeEscapes)
      ? Math.min(3, Math.max(0, result.policeEscapes))
      : 0;
  const personalBestStatus = !recordEligible
    ? 'ineligible'
    : previous == null
      ? 'baseline'
      : !improved
        ? 'not-improved'
        : 'improved';
  const milestones = finishMilestones(profile, result, { finished, won, improved });
  const breakdown = {
    base: won ? base : combatRace ? 0 : -Math.round(base * 0.5),
    clean: won && result.clean === true ? Math.round(base * 0.1) : 0,
    personalBest: personalBestStatus === 'improved' ? Math.round(base * 0.2) : 0,
    streak: won && streak >= 3 ? Math.round(base * 0.2) : 0,
    jumps: Math.round(base * 0.1 * jumps),
    crush: Math.round(base * 0.05 * crushed),
    drift: Math.round(base * driftBonus),
    police: Math.round(base * 0.1 * policeEscapes),
    ...(combatRace ? { combat: finished ? combatCreditBonus(result, base) : 0 } : {}),
    manual: 0,
    milestones: milestones.reward
  };
  // Pro doubles positive recurring earnings. Loss charges and lifetime milestones
  // stay separate, including when a completed loss improves a comparable best.
  const recurringBonus =
    breakdown.clean +
    breakdown.personalBest +
    breakdown.streak +
    breakdown.jumps +
    breakdown.crush +
    breakdown.drift +
    breakdown.police +
    (breakdown.combat || 0);
  breakdown.manual = result.difficulty === 'pro' ? (won ? base : 0) + recurringBonus : 0;
  const charge = won || combatRace ? 0 : Math.min(profile.credits, -breakdown.base),
    bonus = recurringBonus + breakdown.manual + breakdown.milestones;
  const grossReward = (won ? base : -charge) + bonus;
  const pendingFines =
    profile.activeRace?.key === key
      ? integer(profile.activeRace.pendingPoliceFineCount, 1_000_000) * POLICE.ticketBaseFine
      : 0;
  const policeFineCharge = recordEligible ? Math.min(pendingFines, Math.max(0, grossReward)) : 0;
  breakdown.policeFines = -policeFineCharge;
  const balance = integer(profile.credits + grossReward - policeFineCharge, 1_000_000_000),
    reward = balance - profile.credits;
  const updated = {
    ...profile,
    ...(notoriety ? { wasteland: {
      ...profile.wasteland,
      xp: totalXp,
      rank: notorietyRank,
      settledResults: [...(profile.wasteland.settledResults || []), key].slice(-1000),
    } } : {}),
    credits: balance,
    winStreak: streak,
    settledResults: [...profile.settledResults, key],
    activeRace: profile.activeRace?.key === key ? null : profile.activeRace,
    pbBonusRuns:
      breakdown.personalBest && !profile.pbBonusRuns.includes(result.runId)
        ? [...profile.pbBonusRuns, result.runId]
        : profile.pbBonusRuns,
    personalBests: personalBest
      ? { ...profile.personalBests, [comparison]: result.timeSec }
      : profile.personalBests,
    milestones: milestones.earned,
    circuitWins: milestones.circuitWins,
    history: [
      ...profile.history,
      {
        key,
        eventId: stageEventId(result.stageIndex),
        car: result.car,
        won,
        completed: finished,
        timeSec: finished ? result.timeSec : null,
        cpuDifficulty: cpu,
        reward,
        charge,
        policeFineCharge,
        breakdown,
        ...(notoriety ? { notorietyXp: notorietyEarned, notorietyRank } : {}),
        milestones: milestones.awards.map(award => award.id),
        at: Date.now()
      }
    ].slice(-60)
  };
  return {
    profile: updated,
    reward,
    charge,
    policeFineCharge,
    awarded: true,
    personalBest,
    personalBestStatus,
    previousBest: previous ?? null,
    best: updated.personalBests[comparison] ?? null,
    breakdown,
    ...(notoriety ? { notorietyEarned, notorietyRank,
      notorietyBreakdown: notoriety.breakdown } : {}),
    winStreak: streak,
    milestones: milestones.awards
  };
}
export const awardCourseWin = settleRace;
export function purchaseUpgrade(profile, car, type) {
  const failure = reason => ({ profile, ok: false, reason, cost: 0 });
  if (!isCarUnlocked(profile, car)) return failure('Unlock this car first.');
  if (!Object.hasOwn(UPGRADE_TYPES, type)) return failure('Choose an available upgrade.');
  const levels = getUpgradeLevels(profile, car),
    current = levels[type];
  if (current >= 3) return failure('This upgrade is complete.');
  const cost = UPGRADE_COSTS[current];
  if (profile.credits < cost) return failure(`You need ${cost - profile.credits} more credits.`);
  const upgraded = {
      ...profile,
      credits: profile.credits - cost,
      upgrades: { ...profile.upgrades, [car]: { ...levels, [type]: current + 1 } }
    },
    updated = grantCompletionCars(upgraded);
  return {
    profile: updated,
    ok: true,
    reason: '',
    cost,
    level: current + 1,
    earnedCars: updated.unlockedCars.filter(key => !isCarUnlocked(profile, key))
  };
}
export function unlockCar(profile, car) {
  if (CARS[car]?.unlockRequirement === 'max-all-other-cars') {
    if (isCarUnlocked(profile, car))
      return { profile, ok: false, reason: 'This car is already in your garage.', cost: 0 };
    const progress = completionCarProgress(profile, car);
    if (!progress.eligible)
      return { profile, ok: false, reason: progress.requirementLabel, cost: 0 };
    return {
      profile: grantCompletionCars(profile),
      ok: true,
      reason: '',
      cost: 0,
      earnedCars: [car]
    };
  }
  const cost = CAR_PRICES[car];
  if (!Object.hasOwn(CARS, car) || !Number.isFinite(cost))
    return { profile, ok: false, reason: 'This car is already included.', cost: 0 };
  if (isCarUnlocked(profile, car))
    return { profile, ok: false, reason: 'This car is already in your garage.', cost: 0 };
  if (profile.credits < cost)
    return {
      profile,
      ok: false,
      reason: `You need ${cost - profile.credits} more credits.`,
      cost: 0
    };
  // Unowned cars cannot carry upgrades. This also keeps direct callers from
  // turning stale or malformed save data into a completed prerequisite.
  const upgrades = Object.hasOwn(profile.upgrades || {}, car)
    ? { ...profile.upgrades, [car]: getUpgradeLevels(null, car) }
    : profile.upgrades;
  return {
    profile: {
      ...profile,
      credits: profile.credits - cost,
      unlockedCars: [...profile.unlockedCars, car],
      upgrades
    },
    ok: true,
    reason: '',
    cost
  };
}
export function upgradedCar(car, levels = {}) {
  if (car.factoryMaxed) levels = maxUpgradeLevels();
  const engine = integer(levels.engine, 3),
    handling = integer(levels.handling, 3),
    tires = integer(levels.tires, 3),
    brakes = integer(levels.brakes, 3),
    suspension = integer(levels.suspension, 3),
    tank = integer(levels.tank, 3),
    speed = 1 + engine * 0.035;
  return {
    ...car,
    topSpeed: car.topSpeed * speed,
    gears: car.gears.map(v => v * speed),
    accel: car.accel * (1 + engine * 0.04),
    grip: Math.min(1.2, car.grip + handling * 0.045 + tires * 0.025),
    braking: car.braking * (1 + tires * 0.06 + brakes * 0.12),
    offRoadGrip: Math.min(
      1.15,
      (car.offRoadGrip ?? DRIVE.offRoadGrip) + suspension * 0.04 + tires * 0.02
    ),
    boostCapacity: (car.boostCapacity ?? 1) * (1 + tank * 0.25),
    roughnessScale: 1 / (1 + suspension * 0.18)
  };
}
