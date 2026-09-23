import assert from 'node:assert/strict';
import { CARS, COURSE } from '../src/config.js';
import { createProfile, savePlayers, loadPlayers, PLAYERS_KEY, PROFILE_KEY, UPGRADE_TYPES, eventKey } from '../src/progression.js';
import { saveLeaderboard, loadLeaderboard, LEADERBOARD_KEY } from '../src/leaderboard.js';
import { saveGhosts, loadGhosts, ghostKey, GHOST_KEY, MAX_GHOST_BYTES, MAX_GHOST_SAMPLES } from '../src/ghost.js';
import { DRIVERS } from '../src/drivers.js';
import { WEAPON_IDS } from '../src/weapon-upgrades.js';

// A measured planning envelope, not a cap on a player's career. The three
// collections below remain unbounded in production: players, record keys and
// archived ghosts. The boundary probe proves why a hard 4 MiB claim is unsafe.
const MODEL = Object.freeze({
  players: 8,
  historyPerPlayer: 60, // current profile loader retains the latest 60
  personalBestsPerPlayer: 128, // scenario assumption; no production cap
  settledKeysPerPlayer: 128, // scenario assumption; no production cap
  currentRecordsPerPlayer: 24, // 12 events x 2 car/mode combinations
  archivedRecordsPerPlayer: 12, // scenario assumption; no production cap
  archivedGhosts: 1, // scenario assumption; no production cap
  legacySharedBests: 200, // OLD-02 retires this unbounded legacy key
  activeGhostBytes: MAX_GHOST_BYTES, // reserve the real active ghost cap
});
const BUDGET = 4 * 1024 * 1024;
const cars = Object.keys(CARS);
const upgradeTypes = Object.keys(UPGRADE_TYPES);
const recordStages = COURSE.map((stage, index) => ({ stage, index }))
  .filter(({ stage }) => !stage.practice && !stage.stuntTrial && !['drift', 'checkpoint'].includes(stage.kind));
assert.equal(recordStages.length, 12);
assert.equal(MAX_GHOST_SAMPLES, 1800);

function storage() {
  const map = new Map();
  return {
    entries: () => [...map],
    getItem: key => map.get(String(key)) ?? null,
    setItem: (key, value) => map.set(String(key), String(value)),
    removeItem: key => map.delete(String(key)),
  };
}

function fullProfile(index) {
  const profile = createProfile();
  profile.credits = 1_000_000;
  profile.unlockedCars = [...cars];
  profile.upgrades = Object.fromEntries(cars.map(car => [car, Object.fromEntries(upgradeTypes.map(type => [type, 3]))]));
  profile.cosmetics = Object.fromEntries(cars.map(car => [car, { owned: ['factory', 'copper_metallic', 'glacier_satin'], selected: 'glacier_satin' }]));
  profile.drivers = { version: 1, unlocked: Object.keys(DRIVERS), selected: 'mara_vale' };
  profile.courses = { version: 1, unlocked: COURSE.map(course => course.id) };
  profile.raceSettings = { version: 1, eventId: 'pacific-canyon', mode: 'wasteland', car: 'falcone_f42',
    difficulty: 'pro', cpuDifficulty: 'hard', routeVariant: 'route_c', lightingMood: 'golden', ghostEnabled: true };
  profile.weapons = { version: 1, unlocked: [...WEAPON_IDS], levels: Object.fromEntries(WEAPON_IDS.map(id => [id, 3])) };
  profile.personalBests = Object.fromEntries(Array.from({ length: MODEL.personalBestsPerPlayer },
    (_, n) => [`synthetic-best-player-${index}-seed-${n}|layout:4|falcone_f42|duel`, 100 + n / 10]));
  for (const field of ['settledResults', 'settledPoliceFines', 'pbBonusRuns']) {
    profile[field] = Array.from({ length: MODEL.settledKeysPerPlayer }, (_, n) => `synthetic-player-${index}-${field}-${n}`);
  }
  profile.history = Array.from({ length: MODEL.historyPerPlayer }, (_, n) => ({
    key: `synthetic-player-${index}-race-${n}`, eventId: 'pacific-canyon', car: 'falcone_f42',
    won: n % 3 !== 0, completed: true, reward: 500 + n, charge: 0, policeFineCharge: 0,
    timeSec: 120 + n, cpuDifficulty: 'easy', breakdown: { base: 500, style: 100, clean: 0 },
    milestones: [], at: n,
  }));
  profile.milestones = ['clean_debut', 'faster_again', 'circuit_tour', 'trail_winner', 'night_escape', 'arena_show'];
  profile.circuitWins = ['pacific-canyon', 'high-country', 'harbor-highlands'];
  return profile;
}

function row(playerIndex, { stage, index }, mode, archived = false) {
  const car = mode === 'timetrial' ? 'stuttgart_959s' : 'falcone_f42';
  const layoutVersion = archived ? 99 : stage.layoutVersion ?? 1;
  return {
    playerId: `budget-player-${playerIndex}`, playerName: `Budget ${playerIndex}`,
    eventKey: eventKey({ stageIndex: index, seed: 1989, laps: stage.laps }, layoutVersion),
    eventId: stage.id, layoutVersion, seed: 1989, laps: stage.laps, car, timeSec: 180,
    cpuDifficulty: 'easy', difficulty: 'casual', mode, driverId: 'club',
    driverSignature: '', lapTimes: [90, 90], recordedAt: playerIndex + 1,
  };
}

function archivedGhost(index) {
  const { stage, index: stageIndex } = recordStages[index % recordStages.length];
  const playerId = `archive-player-${index}`, layoutVersion = 99;
  const options = { stageIndex, seed: 1989, laps: stage.laps, car: 'falcone_f42',
    mode: 'timetrial', difficulty: 'casual', cpuDifficulty: 'easy' };
  const raceLength = stage.lengthU * stage.laps, timeSec = 179.9;
  const samples = Array.from({ length: MAX_GHOST_SAMPLES }, (_, n) => [
    n * 100, Math.round(raceLength * 100 * n / (MAX_GHOST_SAMPLES - 1)),
    0, 0, 0, 800, 0, 1000, 0, 0, 1,
  ]);
  return {
    key: ghostKey(playerId, options, layoutVersion), playerId,
    playerName: `Archive ${index}`, eventId: stage.id, layoutVersion,
    seed: 1989, laps: stage.laps, raceLength, car: options.car, mode: options.mode,
    difficulty: options.difficulty, cpuDifficulty: options.cpuDifficulty,
    driverId: 'club', driverSignature: '', timeSec, samples, recordedAt: index, lastUsedAt: index,
  };
}

const origin = storage();
const registry = { version: 2, activePlayerId: 'budget-player-0',
  players: Array.from({ length: MODEL.players }, (_, index) => ({
    id: `budget-player-${index}`, name: `Budget ${index}`, profile: fullProfile(index),
  })) };
assert.ok(savePlayers(registry, origin));
assert.equal(loadPlayers(origin).players.length, MODEL.players);
origin.setItem(PROFILE_KEY, JSON.stringify(fullProfile(0))); // legacy fallback can coexist
const entries = [], archivedEntries = [];
for (let player = 0; player < MODEL.players; player++) {
  for (const stage of recordStages) {
    entries.push(row(player, stage, 'duel'), row(player, stage, 'timetrial'));
    archivedEntries.push(row(player, stage, 'duel', true));
  }
}
assert.ok(saveLeaderboard({ version: 1, entries, archivedEntries }, origin));
const board = loadLeaderboard(origin);
assert.equal(board.entries.length, MODEL.players * MODEL.currentRecordsPerPlayer);
assert.equal(board.archivedEntries.length, MODEL.players * MODEL.archivedRecordsPerPlayer);
origin.setItem('duel_redline_best_v4', JSON.stringify(Object.fromEntries(
  Array.from({ length: MODEL.legacySharedBests }, (_, n) => [`legacy-best-seed-${n}`, 120 + n / 10]))));
for (const [key, value] of Object.entries({
  duel_route_variant: 'route_c', duel_graphics_quality: 'high', duel_lighting_mood: 'golden',
  duel_ghost_enabled: 'true', duel_audio_muted: 'false',
})) origin.setItem(key, value);

// Count UTF-16 bytes of every key and value, as a conservative localStorage
// estimate. Reserve the full active ghost cap, then add archived ghosts; the
// latter are retained without a limit by normalizeGhostStore.
const otherBytes = origin.entries().reduce((sum, [key, value]) => sum + 2 * (key.length + value.length), 0);
const projectedBytes = count => otherBytes + 2 * (GHOST_KEY.length + MODEL.activeGhostBytes +
  JSON.stringify({ version: 1, records: [], archivedRecords: Array.from({ length: count }, (_, n) => archivedGhost(n)) }).length);
const modeledBytes = projectedBytes(MODEL.archivedGhosts);
assert.ok(modeledBytes < BUDGET, `modeled origin uses ${modeledBytes} bytes, over 4 MiB`);
let failingArchives = MODEL.archivedGhosts + 1;
while (projectedBytes(failingArchives) < BUDGET) failingArchives++;
const archives = Array.from({ length: failingArchives }, (_, n) => archivedGhost(n));
assert.ok(saveGhosts({ version: 1, records: [], archivedRecords: archives }, origin));
assert.equal(loadGhosts(origin).archivedRecords.length, failingArchives,
  'archive loader retained every synthetic old-layout ghost, without a cap');
assert.ok(projectedBytes(failingArchives) >= BUDGET);
assert.ok(failingArchives > MODEL.archivedGhosts);
console.log(`Storage budget model: ${(modeledBytes / 1024 / 1024).toFixed(2)} MiB / 4.00 MiB UTF-16 for ${MODEL.players} full players, ${board.entries.length} current records, ${board.archivedEntries.length} archived records, ${MODEL.archivedGhosts} archived ghost, and the full active-ghost reservation.`);
console.log(`EXPECTED BOUNDARY — no hard 4 MiB guarantee: ${failingArchives} valid archived ghosts in this same origin project to ${(projectedBytes(failingArchives) / 1024 / 1024).toFixed(2)} MiB; player, record and archive counts remain unbounded.`);
