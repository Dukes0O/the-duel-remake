import { CARS, DRIVE } from './config.js';

export const DEFAULT_DRIVER = 'club';
const specialist = (id, name, title, price, cars, modifiers, description) => Object.freeze({
  id, name, title, price, cars: Object.freeze(cars), modifiers: Object.freeze(modifiers), description,
});
// Passive skills are small, car-specific multipliers. No driver alters lives,
// rewards, collision shells, top speed, boost, jump physics or shift timing.
export const DRIVERS = Object.freeze({
  club: specialist('club', 'Club Driver', 'Your own racing line', 0, [], {}, 'No performance changes. The original handling and record class.'),
  mara_vale: specialist('mara_vale', 'Mara Vale', 'Classic corner specialist', 1200, ['falcone_f42', 'falcone_heritage'], { grip: 1.05 }, '5% more corner grip in the Falcone F42 and Heritage.'),
  iko_ren: specialist('iko_ren', 'Iko Ren', 'AWD precision specialist', 1400, ['stuttgart_959s'], { grip: 1.04, braking: 1.04 }, '4% more corner grip and braking in the Stuttgart 959-S.'),
  sana_marlow: specialist('sana_marlow', 'Sana Marlow', 'GT and prototype specialist', 1800, ['aurora_gt', 'viper_proto'], { grip: 1.04, braking: 1.03 }, '4% more corner grip and 3% more braking in the Aurora and Viper.'),
  jules_reyes: specialist('jules_reyes', 'Jules Reyes', 'Muscle launch specialist', 1800, ['banshee_muscle'], { accel: 1.05, braking: 1.03 }, '5% more acceleration and 3% more braking in the Banshee.'),
  nia_frost: specialist('nia_frost', 'Nia Frost', 'Rally traction specialist', 2000, ['dusthawk_rally'], { offRoadGrip: 1.06, grip: 1.02 }, '6% more loose-surface grip and 2% more corner grip in the Dusthawk.'),
  boone_ward: specialist('boone_ward', 'Boone Ward', 'Heavy vehicle specialist', 2200, ['titan_monster'], { braking: 1.06, offRoadGrip: 1.04 }, '6% more braking and 4% more loose-surface grip in the Titan.'),
});
const NEUTRAL = Object.freeze({});
const DEFAULT_STATE = Object.freeze({ version: 1, unlocked: Object.freeze([DEFAULT_DRIVER]), selected: DEFAULT_DRIVER });
export const normalizeDriverId = value => typeof value === 'string' && Object.hasOwn(DRIVERS, value) ? value : DEFAULT_DRIVER;
export function normalizeDrivers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return DEFAULT_STATE;
  const unlocked = [...new Set([DEFAULT_DRIVER, ...(Array.isArray(value.unlocked) ? value.unlocked : []).filter(id => typeof id === 'string' && Object.hasOwn(DRIVERS, id))])];
  const selected = unlocked.includes(value.selected) ? value.selected : DEFAULT_DRIVER;
  return unlocked.length === 1 ? DEFAULT_STATE : Object.freeze({ version: 1, unlocked: Object.freeze(unlocked), selected });
}
export const getDriverState = profile => normalizeDrivers(profile?.drivers);
export const getEquippedDriverId = profile => getDriverState(profile).selected;
export const isDriverUnlocked = (profile, id) => Object.hasOwn(DRIVERS, id) && getDriverState(profile).unlocked.includes(id);
export function getDriverModifiers(driverId, carKey) {
  const driver = DRIVERS[normalizeDriverId(driverId)];
  return driver.cars.includes(carKey) ? driver.modifiers : NEUTRAL;
}
// Empty means the exact legacy performance class, including off-specialty cars.
// The values, not a driver's display name, identify an enhanced record class.
export function driverModifierSignature(driverId, carKey) {
  const modifiers = getDriverModifiers(driverId, carKey), keys = Object.keys(modifiers).sort();
  return keys.length ? `v1:${keys.map(key => `${key}=${modifiers[key]}`).join(',')}` : '';
}
export function driverRecordMetadata(value, carKey = value?.car) {
  if (value?.driverId != null && !Object.hasOwn(DRIVERS, value.driverId)) return null;
  const driverId = normalizeDriverId(value?.driverId), current = driverModifierSignature(driverId, carKey);
  const driverSignature = value?.driverSignature ?? current;
  if (typeof driverSignature !== 'string') return null;
  if (driverSignature !== '') {
    if (!/^v1:(?:accel|braking|grip|offRoadGrip)=1\.\d+(?:,(?:accel|braking|grip|offRoadGrip)=1\.\d+)*$/.test(driverSignature)) return null;
    const parts = driverSignature.slice(3).split(','), keys = parts.map(part => part.split('=')[0]);
    if (new Set(keys).size !== keys.length || keys.join(',') !== [...keys].sort().join(',') || parts.some(part => +part.split('=')[1] <= 1 || +part.split('=')[1] > 1.06)) return null;
  }
  return { driverId, driverSignature };
}
export const isCurrentDriverRecord = row => {
  const metadata = driverRecordMetadata(row);
  return !!metadata && metadata.driverSignature === driverModifierSignature(metadata.driverId, row.car);
};
export function applyDriverModifiers(car, driverId, carKey = Object.keys(CARS).find(key => CARS[key].name === car?.name)) {
  const modifiers = getDriverModifiers(driverId, carKey);
  if (!Object.keys(modifiers).length) return car;
  const adjusted = { ...car };
  for (const [stat, multiplier] of Object.entries(modifiers)) adjusted[stat] = (car[stat] ?? (stat === 'offRoadGrip' ? DRIVE.offRoadGrip : 0)) * multiplier;
  return adjusted;
}
export function purchaseDriver(profile, id) {
  const fail = reason => ({ profile, ok: false, reason, cost: 0 });
  if (!Object.hasOwn(DRIVERS, id)) return fail('Choose an available driver.');
  const state = getDriverState(profile);
  if (state.unlocked.includes(id)) return fail('This driver is already unlocked.');
  const cost = DRIVERS[id].price;
  if (!Number.isFinite(profile?.credits) || profile.credits < cost) return fail(`You need ${Math.max(0, cost - (Number.isFinite(profile?.credits) ? profile.credits : 0))} more credits.`);
  const drivers = normalizeDrivers({ ...state, unlocked: [...state.unlocked, id] });
  return { profile: { ...profile, credits: profile.credits - cost, drivers }, ok: true, reason: '', cost };
}
export function selectDriver(profile, id) {
  if (!isDriverUnlocked(profile, id)) return { profile, ok: false, reason: 'Unlock this driver before selecting them.', cost: 0 };
  const state = getDriverState(profile);
  if (state.selected === id) return { profile, ok: true, reason: '', cost: 0 };
  return { profile: { ...profile, drivers: normalizeDrivers({ ...state, selected: id }) }, ok: true, reason: '', cost: 0 };
}
