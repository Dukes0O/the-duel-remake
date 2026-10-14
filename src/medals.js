// Medal sheets and the cars they earn (docs/EARNED_CARS.md). Pure: no screen
// code, no storage. Each car keeps six boxes per named player: Duel and Grand
// Prix rows, Easy, Medium and Hard columns, each counting wins.
import { CARS, CPU_DIFFICULTY } from './config.js';

export const MEDAL_ROWS = Object.freeze(['duel', 'grandprix']);
export const MEDAL_LEVELS = Object.freeze(['easy', 'medium', 'hard']);
export const MEDAL_COLOURS = Object.freeze({ easy: 'bronze', medium: 'silver', hard: 'gold' });
// Kyle, 14 October 2026: a new medal pays once, a quarter of that difficulty's win pay.
export const MEDAL_BONUS_SHARE = 0.25;
const MAX_WINS = 9999;
const MAX_ENTRIES = 64;
const MAX_ID_LENGTH = 64;

const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const emptySheet = () => ({ version: 1, cars: {} });

export const medalBonus = level =>
  Math.round((CPU_DIFFICULTY[level]?.winReward ?? 0) * MEDAL_BONUS_SHARE);

// The cars earned with medals, never bought: {kind: 'medals', medals, gold}.
export const medalRequirement = car => {
  const rule = CARS[car]?.unlockRequirement;
  return isObject(rule) && rule.kind === 'medals' ? rule : null;
};
export const MEDAL_CARS = Object.freeze(Object.keys(CARS).filter(car => medalRequirement(car)));

function normalizeRow(value) {
  if (!Array.isArray(value) || value.length !== MEDAL_LEVELS.length) return null;
  if (!value.every(count => Number.isSafeInteger(count) && count >= 0)) return null;
  return value.map(count => Math.min(MAX_WINS, count));
}
function normalizeEntry(value) {
  if (!isObject(value)) return null;
  const duel = normalizeRow(value.duel), grandprix = normalizeRow(value.grandprix);
  return duel && grandprix ? { duel, grandprix } : null;
}

// A newer version is kept exactly as saved and never written to; anything else
// that is not a version 1 sheet is malformed and starts empty. Entries for car
// ids this build does not know are kept (a later car survives a rollback) but
// never counted; known cars are kept first so they always fit.
export function normalizeMedals(value) {
  if (isObject(value) && Number.isSafeInteger(value.version) && value.version > 1) return value;
  if (!isObject(value) || value.version !== 1) return emptySheet();
  const entries = isObject(value.cars) ? Object.entries(value.cars) : [];
  const ordered = [
    ...entries.filter(([id]) => Object.hasOwn(CARS, id)),
    ...entries.filter(([id]) => !Object.hasOwn(CARS, id)),
  ];
  const cars = {};
  for (const [id, item] of ordered) {
    if (Object.keys(cars).length >= MAX_ENTRIES) break;
    if (!id.length || id.length > MAX_ID_LENGTH) continue;
    const entry = normalizeEntry(item);
    if (entry) cars[id] = entry;
  }
  return { version: 1, cars };
}

// Which row a race fills: Time Trial fills none, even when it beats par.
export function medalRowFor(result) {
  if (result?.mode === 'grandprix') return 'grandprix';
  if (result?.mode === 'timetrial') return null;
  return 'duel';
}

const sheetOf = profile =>
  isObject(profile?.medals) && profile.medals.version === 1 ? profile.medals : null;

// Adds one win to a box. newMedal is set only when the box was empty.
export function countMedalWin(profile, { car, row, cpuDifficulty }) {
  const level = MEDAL_LEVELS.indexOf(cpuDifficulty);
  if (level < 0 || !MEDAL_ROWS.includes(row) || !Object.hasOwn(CARS, car)) return { profile, newMedal: null };
  if (Object.hasOwn(profile, 'medals') && !sheetOf(profile)) return { profile, newMedal: null };
  const sheet = sheetOf(profile) ?? emptySheet();
  const entry = sheet.cars[car] ?? { duel: [0, 0, 0], grandprix: [0, 0, 0] };
  const before = entry[row][level];
  const counts = entry[row].map((count, index) => index === level ? Math.min(MAX_WINS, count + 1) : count);
  const medals = { version: 1, cars: { ...sheet.cars, [car]: { ...entry, [row]: counts } } };
  const newMedal = before === 0
    ? { car, row, level: cpuDifficulty, colour: MEDAL_COLOURS[cpuDifficulty], bonus: medalBonus(cpuDifficulty) }
    : null;
  return { profile: { ...profile, medals }, newMedal };
}

// Filled boxes over the cars this build knows; gold is the filled Hard boxes.
export function medalTotals(profile) {
  const sheet = sheetOf(profile);
  let medals = 0, gold = 0;
  if (sheet) {
    for (const [car, entry] of Object.entries(sheet.cars)) {
      if (!Object.hasOwn(CARS, car)) continue;
      for (const row of MEDAL_ROWS) {
        medals += entry[row].filter(count => count > 0).length;
        if (entry[row][MEDAL_LEVELS.length - 1] > 0) gold++;
      }
    }
  }
  return { medals, gold };
}

export function medalCarProgress(profile, car) {
  const rule = medalRequirement(car);
  if (!rule) return null;
  const { medals, gold } = medalTotals(profile);
  const needMedals = rule.medals, needGold = rule.gold ?? 0;
  return {
    car, medals, needMedals, gold, needGold,
    eligible: medals >= needMedals && gold >= needGold,
    unlocked: !!profile?.unlockedCars?.includes(car),
  };
}

// Medal cars this profile has earned but does not own yet.
export function medalCarsToGrant(profile) {
  return MEDAL_CARS.filter(car => {
    const progress = medalCarProgress(profile, car);
    return !progress.unlocked && progress.eligible;
  });
}

export function medalRequirementLabel(progress) {
  const parts = [`${progress.needMedals} medals needed, you have ${progress.medals}`];
  if (progress.needGold) parts.push(`${progress.needGold} of them gold, you have ${progress.gold}`);
  return `${parts.join('; ')}.`;
}
