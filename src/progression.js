import { CARS, COURSE, DEFAULT_CAR } from './config.js';

export const PROFILE_KEY = 'the-duel-profile-v1';
export const UPGRADE_COSTS = Object.freeze([350, 600, 950]);
export const CAR_PRICES = Object.freeze({ aurora_gt: 2200 });
export const UPGRADE_TYPES = Object.freeze({
  engine: { name: 'Engine', description: 'More power. Higher top speed.' },
  nitro: { name: 'Nitro', description: 'Stronger boost that lasts longer.' },
  handling: { name: 'Handling', description: 'More grip through fast corners.' },
  tires: { name: 'Tires', description: 'Better grip and shorter braking.' },
});
const FREE_CARS = ['falcone_f42', 'stuttgart_959s'];
const integer = (value, max) => Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));

export function createProfile() {
  return { version: 1, credits: 0, unlockedCars: [...FREE_CARS], upgrades: {}, awardedWins: [] };
}

function normalizeProfile(value) {
  if (!value || typeof value !== 'object' || value.version !== 1) return createProfile();
  const profile = createProfile();
  profile.credits = integer(value.credits, 1_000_000_000);
  profile.unlockedCars = [...new Set([...FREE_CARS, ...(Array.isArray(value.unlockedCars) ? value.unlockedCars.filter(car => Object.hasOwn(CARS, car)) : [])])];
  for (const car of profile.unlockedCars) profile.upgrades[car] = getUpgradeLevels(value, car);
  profile.awardedWins = [...new Set((Array.isArray(value.awardedWins) ? value.awardedWins : []).filter(key => typeof key === 'string' && key.length > 0 && key.length <= 150))];
  return profile;
}

export function loadProfile(storage) {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(PROFILE_KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : createProfile();
  } catch { return createProfile(); }
}

export function saveProfile(profile, storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target) return false;
    target.setItem(PROFILE_KEY, JSON.stringify(normalizeProfile(profile)));
    return true;
  } catch { return false; }
}

export function isCarUnlocked(profile, car) {
  return Object.hasOwn(CARS, car) && (FREE_CARS.includes(car) || !!profile?.unlockedCars?.includes(car));
}

export function getUpgradeLevels(profile, car = DEFAULT_CAR) {
  const levels = profile?.upgrades?.[car];
  return Object.fromEntries(Object.keys(UPGRADE_TYPES).map(type => [type, integer(levels?.[type], 3)]));
}

// Each run ID must be created at startCampaign. A repeated result notification or
// reload of the same result cannot award this course twice.
export function awardCourseWin(profile, { runId, stageIndex, won, clean = false, difficulty = 'casual' } = {}) {
  const valid = won === true && typeof runId === 'string' && runId.length > 0 && runId.length <= 128
    && Number.isInteger(stageIndex) && stageIndex >= 0 && stageIndex < COURSE.length;
  const key = `${runId}:${stageIndex}`;
  if (!valid || profile.awardedWins.includes(key)) return { profile, reward: 0, awarded: false };
  const reward = 650 + (clean ? 100 : 0) + (difficulty === 'pro' ? 150 : 0);
  return {
    profile: { ...profile, credits: integer(profile.credits + reward, 1_000_000_000), awardedWins: [...profile.awardedWins, key] },
    reward, awarded: true,
  };
}

export function purchaseUpgrade(profile, car, type) {
  const failure = reason => ({ profile, ok: false, reason, cost: 0 });
  if (!isCarUnlocked(profile, car)) return failure('Unlock this car first.');
  if (!Object.hasOwn(UPGRADE_TYPES, type)) return failure('Choose an available upgrade.');
  const levels = getUpgradeLevels(profile, car), current = levels[type];
  if (current >= 3) return failure('This upgrade is complete.');
  const cost = UPGRADE_COSTS[current];
  if (profile.credits < cost) return failure(`You need ${cost - profile.credits} more credits.`);
  return { profile: { ...profile, credits: profile.credits - cost, upgrades: { ...profile.upgrades, [car]: { ...levels, [type]: current + 1 } } }, ok: true, reason: '', cost, level: current + 1 };
}

export function unlockCar(profile, car) {
  const cost = CAR_PRICES[car];
  if (!Object.hasOwn(CARS, car) || !Number.isFinite(cost)) return { profile, ok: false, reason: 'This car is already included.', cost: 0 };
  if (isCarUnlocked(profile, car)) return { profile, ok: false, reason: 'This car is already in your garage.', cost: 0 };
  if (profile.credits < cost) return { profile, ok: false, reason: `You need ${cost - profile.credits} more credits.`, cost: 0 };
  return { profile: { ...profile, credits: profile.credits - cost, unlockedCars: [...profile.unlockedCars, car] }, ok: true, reason: '', cost };
}

// Keep this preview calculation in step with the physics snapshot taken at start.
export function upgradedCar(car, levels = {}) {
  const engine = integer(levels.engine, 3), handling = integer(levels.handling, 3), tires = integer(levels.tires, 3);
  const speed = 1 + engine * .035;
  return { ...car, topSpeed: car.topSpeed * speed, gears: car.gears.map(value => value * speed), accel: car.accel * (1 + engine * .04), grip: Math.min(1.2, car.grip + handling * .045 + tires * .025), braking: car.braking * (1 + tires * .06) };
}
