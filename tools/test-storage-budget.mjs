import assert from 'node:assert/strict';
import { CARS, COURSE } from '../src/config.js';
import { createProfile, savePlayers, loadPlayers, PLAYERS_KEY, PROFILE_KEY, UPGRADE_TYPES, eventKey } from '../src/progression.js';
import { saveLeaderboard, loadLeaderboard, LEADERBOARD_KEY } from '../src/leaderboard.js';
import { saveGhosts, loadGhosts, ghostKey, GHOST_KEY, MAX_GHOST_BYTES, MAX_GHOST_SAMPLES } from '../src/ghost.js';
import { DRIVERS } from '../src/drivers.js';
import { WEAPON_IDS } from '../src/weapon-upgrades.js';
import {prepareCareerArchives,ARCHIVE_POINTER_KEY} from '../src/career-archives.js';
import {backupCareer} from '../src/career-backup.js';
import {prepareCareerBudget,originStorageBytes} from '../src/career-budget.js';

// A measured planning envelope, not a cap on a player's career. Players,
// record keys and archived ghosts remain unbounded in IndexedDB. The raw
// boundary probe explains why moving only the old archives was insufficient.
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
const BUDGET = 4_000_000; // SPEC.md uses decimal MB, not binary MiB
const cars = Object.keys(CARS);
const upgradeTypes = Object.keys(UPGRADE_TYPES);
const recordStages = COURSE.map((stage, index) => ({ stage, index }))
  .filter(({ stage }) => !stage.practice && !stage.stuntTrial && !['drift', 'checkpoint'].includes(stage.kind));
assert.equal(recordStages.length, 12);
assert.equal(MAX_GHOST_SAMPLES, 1800);

function storage() {
  const map = new Map();
  return {
    get length(){return map.size;},
    key:index=>[...map.keys()][index]??null,
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
  profile.wasteland.kits = Object.fromEntries(cars.map(car => [car,
    {owned: ['scrapper', 'raider', 'warlord'], equipped: 'warlord'}]));
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
assert.ok(modeledBytes < BUDGET, `modeled origin uses ${modeledBytes} bytes, over 4 MB`);
let failingArchives = MODEL.archivedGhosts + 1;
while (projectedBytes(failingArchives) < BUDGET) failingArchives++;
const archives = Array.from({ length: failingArchives }, (_, n) => archivedGhost(n));
assert.ok(saveGhosts({ version: 1, records: [], archivedRecords: archives }, origin));
assert.equal(loadGhosts(origin).archivedRecords.length, failingArchives,
  'archive loader retained every synthetic old-layout ghost, without a cap');
assert.ok(projectedBytes(failingArchives) >= BUDGET);
assert.ok(failingArchives > MODEL.archivedGhosts);
const records=new Map(),idb={
  async save(record){records.set(record.id,structuredClone(record));},
  async load(id){return structuredClone(records.get(id));},
};
const rawOrigin=origin.entries();
const migrated=await prepareCareerArchives({storage:origin,store:idb,backup:()=>backupCareer(origin,idb,'before-archive-migration')});
assert.equal(migrated.leaderboardRows.length,MODEL.players*MODEL.archivedRecordsPerPlayer);
assert.equal(migrated.ghostRows.length,failingArchives);
assert.equal(loadLeaderboard(origin).archivedEntries.length,migrated.leaderboardRows.length);
assert.equal(loadGhosts(origin).archivedRecords.length,failingArchives);
assert.ok(origin.getItem(ARCHIVE_POINTER_KEY));
const interrupted=storage();
for(const [key,value] of rawOrigin)interrupted.setItem(key,value);
interrupted.setItem(ARCHIVE_POINTER_KEY,origin.getItem(ARCHIVE_POINTER_KEY));
await prepareCareerArchives({storage:interrupted,store:idb,backup:()=>backupCareer(interrupted,idb,'resume-archive-migration')});
assert.equal(loadLeaderboard(interrupted).archivedEntries.length,migrated.leaderboardRows.length,
  'large pointer-first interrupted migration retains every leaderboard archive');
assert.equal(loadGhosts(interrupted).archivedRecords.length,migrated.ghostRows.length,
  'large pointer-first interrupted migration retains every ghost archive');
const localBytes=origin.entries().reduce((sum,[key,value])=>sum+2*(key.length+value.length),0);
const activeGhostReservation=2*(GHOST_KEY.length+MAX_GHOST_BYTES+64);
const maximumModelBytes=localBytes+activeGhostReservation;
assert.ok(maximumModelBytes<BUDGET,`modeled maximum after archive migration uses ${maximumModelBytes} bytes, over 4 MB`);

const activeOnly=storage();
let activePlayers=MODEL.players;
do{
  activePlayers*=2;
  const many={version:2,activePlayerId:'budget-player-0',players:Array.from({length:activePlayers},(_,index)=>({
    id:`budget-player-${index}`,name:`Budget ${index}`,profile:fullProfile(index),
  }))};
  assert.ok(savePlayers(many,activeOnly));
}while(activeOnly.entries().reduce((sum,[key,value])=>sum+2*(key.length+value.length),0)<BUDGET&&activePlayers<1024);
const activeOnlyBytes=activeOnly.entries().reduce((sum,[key,value])=>sum+2*(key.length+value.length),0);
assert.ok(activeOnlyBytes>=BUDGET,'unbounded active profiles can still exceed the hard limit');
const activeRows=new Map(),activeDb={
  async save(record){activeRows.set(record.id,structuredClone(record));},
  async load(id){return structuredClone(activeRows.get(id));},
};
const bounded=(await prepareCareerBudget({physical:activeOnly,store:activeDb,
  backup:()=>backupCareer(activeOnly,activeDb,'before-origin-budget-migration')})).storage;
assert.equal(loadPlayers(bounded).players.length,activePlayers);
assert.equal(activeOnly.getItem(PLAYERS_KEY),null);
const boundedBytes=originStorageBytes(activeOnly);
bounded.setItem(GHOST_KEY,'x'.repeat(MAX_GHOST_BYTES));
const futureGhostBytes=originStorageBytes(activeOnly);
assert.ok(futureGhostBytes<BUDGET,`64-player origin plus future active ghost uses ${futureGhostBytes} bytes`);
await bounded.flush();
assert.equal(loadPlayers((await prepareCareerBudget({physical:activeOnly,store:activeDb})).storage).players.length,activePlayers);
console.log(`Storage budget model after archive move: ${(maximumModelBytes/1_000_000).toFixed(2)} MB / 4.00 MB UTF-16 for ${MODEL.players} full players, ${board.entries.length} current records, ${migrated.leaderboardRows.length} archived records, ${failingArchives} archived ghosts in IndexedDB, and full active-ghost reservation.`);
console.log(`HARD ACTIVE-DATA BOUNDARY — ${activePlayers} fully populated players use ${(activeOnlyBytes/1_000_000).toFixed(2)} MB before the origin move; ${boundedBytes} UTF-16 bytes after it, or ${futureGhostBytes} with a maximum future ghost journal write. Both fit under 4,000,000 bytes without trimming a career.`);
