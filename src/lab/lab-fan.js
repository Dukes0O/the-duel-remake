// LAB-FAN: pure secret and build rules. The caller saves the returned profile once.
import {TUNNEL_LESSONS} from './lab-lessons.js';
import {LAB_SAVE_VERSION, labReady, markSecret} from './lab-save.js';

export const FAN_CAR = 'mcmurtry_speirling';
export const FAN_PRICE = 15000;

export const secretOpen = lab => lab?.version === LAB_SAVE_VERSION &&
  TUNNEL_LESSONS.every(id => lab.done?.[id] === true);

export const markReverse = (profile, options = {}) => markSecret(profile, options);

export function buildFan(profile, {flags} = {}) {
  const {lab, refusal} = labReady(profile, flags);
  if (refusal) return refusal;
  const refuse = reason => ({ok: false, reason, profile});
  if (!secretOpen(lab) || lab.secret.reverse !== true) return refuse('There is nothing to build yet.');
  const cars = Array.isArray(profile.unlockedCars) ? profile.unlockedCars : [];
  if (cars.includes(FAN_CAR)) return refuse('The Spéirling is already yours.');
  if (!Number.isSafeInteger(profile.credits) || profile.credits < FAN_PRICE || profile.credits > 1_000_000_000)
    return refuse('You need 15,000 credits to build the Spéirling.');
  return {ok: true, reason: '', price: FAN_PRICE, profile: {...profile,
    credits: profile.credits - FAN_PRICE,
    unlockedCars: [...cars, FAN_CAR]}};
}
