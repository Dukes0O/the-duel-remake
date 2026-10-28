// CAREER-REBUILD: builds a career file for the two players whose saves were lost
// when the browser cleared its storage (Kyle's description, 28 October 2026).
// Every id and number comes from the game's own save code, so a field is valid for
// the current save version. The result is the same export the game already writes.
// The game carries it as src/career-restore-2026-10-28.js and adds the two players once
// at start-up (src/career-restore.js).
//
//   node tools/career-rebuild.mjs [--out <file.json>] [--module]    print what is in it;
//   write the export file; --module rewrites src/career-restore-2026-10-28.js
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CARS, COURSE} from '../src/config.js';
import {CAREER_FORMAT, parseCareerExport} from '../src/career-backup.js';
import {CIRCUIT_MANIFESTS} from '../src/circuit-manifests.js';
import {COURSE_PRICES, courseUnlockRequirement} from '../src/course-access.js';
import {DRIVERS} from '../src/drivers.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {PAINT_PRESETS} from '../src/paint-presets.js';
import {PLAYERS_KEY, UPGRADE_TYPES, createProfile, loadPlayers, normalizeProfile, playerName} from '../src/progression.js';
import {normalizeRaceSettings} from '../src/race-settings.js';
import {settleWarlordResult} from '../src/arena/warlord-settlement.js';
import {TERRITORIES} from '../src/wasteland-career.js';
import {WARLORDS, WARLORD_LADDER} from '../src/warlords.js';

// Kyle (Dukes00) and Gratian (Spikey Ferns) have the same garage; they differ in credits, the Deep
// and the Wasteland. `beaten` lists the warlords with a settled win, in the game's own order
// (WARLORD_LADDER). `held` lists the territories held at 100, which a warlord fight needs.
export const KYLE = {id: 'player-dukes00', name: 'Dukes00', credits: 15000, deep: {kit: true},
  beaten: WARLORD_LADDER.slice(0, 3), held: WARLORD_LADDER.slice(0, 3)};
// Not beaten: the Tollkeeper, and the Baron, whose fight opens only after the Tollkeeper falls
// (warlordUnlockSatisfied). Both territories are held so the Tollkeeper fight is open.
export const GRATIAN = {id: 'player-spikey-ferns', name: 'Spikey Ferns', credits: 23000,
  deep: {kit: true, found: ['kelp-coast'], logged: ['turtle']},
  beaten: WARLORD_LADDER.filter(id => !['tollkeeper', 'blackiron'].includes(id)), held: Object.keys(TERRITORIES)};
// The car that won the warlord fights; the warlord kits are installed on it.
const WINNING_CAR = 'falcone_f42';
// Warlord pay depends on the CPU level of the fight; the lowest level gives the smallest scrap.
const FIGHT_LEVEL = 'easy';
const MAXED = Object.fromEntries(Object.keys(UPGRADE_TYPES).map(type => [type, 3]));

// Released switches only: a course behind a development switch is not unlockable today.
const flags = createFeatureFlags({storage: null, qa: false, search: ''});
export function unlockableCourseIds() {
  return COURSE.filter(course => {
    const manifest = CIRCUIT_MANIFESTS.find(item => item.id === course.id);
    return !course.practice && Object.hasOwn(COURSE_PRICES, course.id) && !courseUnlockRequirement(course) &&
      (!manifest || flags.enabled(manifest.flag));
  }).map(course => course.id);
}
// The cars a new career can reach by buying: the roster without earned (medal, Deep, Lab) cars.
export const baseRosterCars = () => Object.keys(CARS).filter(car => !CARS[car].unlockRequirement);
export const earnedWithAllMaxed = () => Object.keys(CARS).filter(car => CARS[car].unlockRequirement === 'max-all-other-cars');
export const ordinaryPaints = () => Object.values(PAINT_PRESETS).filter(paint => !paint.reward && !paint.car).map(paint => paint.id);
export const purchasableDrivers = () => Object.values(DRIVERS).filter(driver => !driver.unlockCar).map(driver => driver.id);

// A real warlord win, settled by the game's own rule (src/arena/warlord-settlement.js).
function arenaWon(id) {
  const warlord = WARLORDS[id], size = warlord.team?.length ?? 1;
  const cpus = Array.from({length: size}, (_, index) => `cpu-${index + 1}`);
  return {version: 1, venueId: warlord.venue ?? 'scrapdome', mode: 'warlord', warlordId: id, warlordBossId: 'cpu-1',
    phase: 'over', result: {reason: 'three-wrecks', winnerId: 'player', placings: ['player', ...cpus]},
    participants: [{id: 'player', kind: 'player', team: 'a', wrecks: 3, wrecked: 0},
      ...cpus.map(cpu => ({id: cpu, kind: 'cpu', team: 'b', wrecks: 0, wrecked: 3}))]};
}
function beatWarlords(profile, player) {
  let current = profile;
  for (const id of player.beaten) {
    const settled = settleWarlordResult(current, {runId: 'career-rebuild-' + id, ownerPlayerId: player.id,
      activePlayerId: player.id, arena: arenaWon(id), car: WINNING_CAR, cpuDifficulty: FIGHT_LEVEL, warlordCardsEnabled: true});
    if (!settled.awarded) throw new Error('The game refused the ' + id + ' win.');
    current = settled.profile;
  }
  return current;
}

function playerProfile(player) {
  const cars = baseRosterCars();
  const drivers = {version: 1, unlocked: purchasableDrivers(), selected: 'club'};
  // Every owned car, the Jesko included, owns every paint a player can buy.
  const cosmetics = Object.fromEntries([...cars, ...earnedWithAllMaxed()].map(car => [car, {owned: ordinaryPaints(), selected: 'factory'}]));
  const wasteland = {...createProfile().wasteland, discoveredGate: true, pacificFinishes: 10,
    territories: Object.fromEntries(Object.keys(TERRITORIES).map(id => [id, {hold: player.held.includes(id) ? 100 : 0, claimed: false}]))};
  // The maxed roster earns the Jesko by the game's rule; normalizing grants it with its driver.
  return beatWarlords(normalizeProfile({...createProfile(), credits: player.credits, unlockedCars: cars,
    upgrades: Object.fromEntries(cars.map(car => [car, {...MAXED}])), cosmetics, drivers,
    courses: {version: 1, unlocked: unlockableCourseIds()}, wasteland,
    // The dive kit and what was logged (the Deep's hints and log code).
    deep: player.deep}), player);
}
function finish(profile) {
  const settled = normalizeProfile(profile);
  return normalizeProfile({...settled, raceSettings: normalizeRaceSettings({}, settled)});
}

export function buildCareer() {
  const players = [
    {id: KYLE.id, name: playerName(KYLE.name), profile: finish(playerProfile(KYLE))},
    {id: GRATIAN.id, name: playerName(GRATIAN.name), profile: finish(playerProfile(GRATIAN))},
  ];
  return {version: 2, activePlayerId: GRATIAN.id, players};
}
// The same export the game writes when a career has no archived rows (src/career-backup.js).
export function buildCareerFile(now = new Date('2026-10-28T00:00:00.000Z')) {
  const registry = buildCareer();
  const text = JSON.stringify({format: CAREER_FORMAT, version: 1, exportedAt: now.toISOString(),
    entries: {[PLAYERS_KEY]: JSON.stringify(registry)}}, null, 2);
  parseCareerExport(text);
  // Loading must change nothing: what is written is what the game would keep.
  const loaded = loadPlayers({getItem: key => key === PLAYERS_KEY ? JSON.stringify(registry) : null});
  if (JSON.stringify(loaded) !== JSON.stringify(registry)) throw new Error('The game would change this career when loading it.');
  return {text, registry};
}

function describe(registry) {
  const lines = [];
  for (const {name, profile} of registry.players) {
    const wasteland = profile.wasteland;
    lines.push(name + ': ' + profile.credits + ' credits');
    lines.push('  cars: ' + profile.unlockedCars.join(', '));
    lines.push('  maxed: ' + Object.entries(profile.upgrades).filter(([, levels]) => Object.values(levels).every(level => level === 3)).map(([car]) => car).join(', '));
    lines.push('  drivers: ' + profile.drivers.unlocked.join(', '));
    lines.push('  courses: ' + profile.courses.unlocked.join(', '));
    lines.push('  paints: ' + JSON.stringify(profile.cosmetics));
    if (profile.deep) lines.push('  deep: ' + JSON.stringify(profile.deep));
    lines.push('  wasteland gate: ' + wasteland.discoveredGate + ', warlords beaten: ' +
      Object.entries(wasteland.warlords).filter(([, item]) => item.defeated).map(([id]) => id).join(', ') +
      ', claimed: ' + Object.entries(wasteland.territories).filter(([, item]) => item.claimed).map(([id]) => id).join(', '));
    lines.push('  crew: ' + wasteland.crew.unlocked.join(', ') + '; weapons: ' + wasteland.weapons.unlocked.join(', ') +
      '; kits: ' + JSON.stringify(wasteland.kits) + '; scrap: ' + wasteland.scrap + '; title: ' + (wasteland.title ?? 'none'));
  }
  return lines.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--out'), {text, registry} = buildCareerFile();
  console.log(describe(registry));
  if (at >= 0 && process.argv[at + 1]) {
    const out = resolve(process.argv[at + 1]);
    mkdirSync(dirname(out), {recursive: true});
    writeFileSync(out, text + '\n');
    console.log('Wrote ' + out);
  }
  if (process.argv.includes('--module')) {
    const out = fileURLToPath(new URL('../src/career-restore-2026-10-28.js', import.meta.url));
    writeFileSync(out, '// Written by tools/career-rebuild.mjs. Removed by CAREER-RESTORE-REMOVE once Kyle confirms.\n' +
      'export const CAREER_RESTORE_2026_10_28 = ' + JSON.stringify(JSON.parse(text)) + ';\n');
    console.log('Wrote ' + out);
  }
}
