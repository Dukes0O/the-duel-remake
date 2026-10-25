// Restoring the Falcone Sirena on the Rust bench (docs/LAB.md section 7, docs/THE_DEEP.md 6.2). Pure rules: who is offered the
// restoration, what it costs and does to a save, and the minute-long sequence as a function of time. Nothing here draws,
// plays a sound or reads a clock. The save change is small on purpose: 2,500 credits go and `falcone_sirena` joins
// `unlockedCars` in one step, and nothing the player has is removed (the garage's own states read that list).
import {labOf} from './lab-save.js';
import {isCarUnlocked, getUpgradeLevels} from '../progression.js';
import {sirenaState, SIRENA_CAR} from '../deep/sirena-car.js';

export const RESTORE_PRICE = 2500;
const MAX_CREDITS = 1_000_000_000;

// The sequence, in order, with its length in seconds (about a minute). `weeks` is the fast-forwarded soak.
export const RESTORE_STAGES = Object.freeze([
  Object.freeze({id: 'soak', seconds: 24, label: 'Soaking in fresh water'}),
  Object.freeze({id: 'current', seconds: 12, label: 'A small electric current loosens the rust'}),
  Object.freeze({id: 'strip', seconds: 10, label: 'Stripping back to bare metal'}),
  Object.freeze({id: 'rebuild', seconds: 8, label: 'Rebuilding'}),
  Object.freeze({id: 'paint', seconds: 6, label: 'Red paint, then the white stripe'}),
]);
export const RESTORE_SECONDS = RESTORE_STAGES.reduce((sum, stage) => sum + stage.seconds, 0);
// Museums soak wreck metal in fresh water for months; the readout runs a half year in the first stage and ends at 4% of the salt.
export const SOAK_WEEKS = 26;
export const SALT_LEFT = 0.04;

const on = (flags, name) => flags?.enabled?.(name) === true;

// {state, price, canBuy, note}: 'hidden' (nothing shows), 'locked' (waiting, but the lesson is not passed), 'offered' (restore it),
// 'again' (already restored: the free replay). Both switches must be on.
export function restoreOffer(profile, flags) {
  const none = {state: 'hidden', price: RESTORE_PRICE, canBuy: false, note: ''};
  if (!on(flags, 'lab') || !on(flags, 'the-deep') || !profile || typeof profile !== 'object') return none;
  const car = sirenaState(profile);
  if (car === 'restored' || car === 'cupDone') return {...none, state: 'again'};
  if (car !== 'waiting') return none;
  if (labOf(profile).done.rust !== true) return {...none, state: 'locked', note: 'The Sirena is waiting. Pass the Rust lesson first.'};
  const credits = Number.isFinite(profile.credits) ? Math.floor(profile.credits) : 0;
  const short = RESTORE_PRICE - credits;
  return {state: 'offered', price: RESTORE_PRICE, canBuy: short <= 0, note: short > 0 ? `${short} more credits` : ''};
}

// Takes the price once and makes the car the player's, in one step. Returns {ok, reason, profile, price}; on any refusal
// the very same profile comes back.
export function restoreSirena(profile, {flags} = {}) {
  const refuse = reason => ({ok: false, reason, profile, price: 0});
  const offer = restoreOffer(profile, flags);
  if (offer.state === 'hidden') return refuse(on(flags, 'lab') && on(flags, 'the-deep') ? 'There is nothing to restore.' : 'The Lab is not available yet.');
  if (offer.state === 'again') return refuse('The Sirena is already yours.');
  if (offer.state === 'locked') return refuse(offer.note);
  if (!offer.canBuy) return refuse(`You need ${offer.note}.`);
  if (isCarUnlocked(profile, SIRENA_CAR)) return refuse('The Sirena is already yours.');
  const wallet = Math.max(0, Math.min(MAX_CREDITS, Math.floor(profile.credits)));
  // As buying any car does: an unowned car carries no upgrades into the garage.
  const upgrades = Object.hasOwn(profile.upgrades || {}, SIRENA_CAR) ? {...profile.upgrades, [SIRENA_CAR]: getUpgradeLevels(null, SIRENA_CAR)} : profile.upgrades;
  return {ok: true, reason: '', price: RESTORE_PRICE, profile: {...profile, credits: wallet - RESTORE_PRICE,
    unlockedCars: [...(Array.isArray(profile.unlockedCars) ? profile.unlockedCars : []), SIRENA_CAR], upgrades}};
}

const ease = t => t * t * (3 - 2 * t);
const clamp01 = t => Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;

// Where the sequence is `seconds` in: the stage, how far through it, the readouts and what each part looks like (all 0 to 1).
//   weeks, saltShare: the soak readout; rust: how crusted the wreck is; wreck, car: how visible each model is;
//   red: the car's finish (bare grey, then red); stripe: the white livery; bubbles: the current's fizz.
export function stageAt(seconds) {
  const t = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  let start = 0, index = RESTORE_STAGES.length - 1;
  for (let i = 0; i < RESTORE_STAGES.length; i++) {
    if (t < start + RESTORE_STAGES[i].seconds) { index = i; break; }
    start += RESTORE_STAGES[i].seconds;
  }
  const stage = RESTORE_STAGES[index], into = t >= RESTORE_SECONDS ? 1 : clamp01((t - start) / stage.seconds);
  const done = t >= RESTORE_SECONDS;
  const soak = index === 0 ? ease(into) : 1;
  const weeks = SOAK_WEEKS * soak;
  const saltShare = Math.exp(Math.log(SALT_LEFT) * weeks / SOAK_WEEKS);
  const rust = index === 0 ? 1 - 0.2 * ease(into) : index === 1 ? 0.8 - 0.45 * ease(into) : index === 2 ? 0.35 * (1 - ease(into)) : 0;
  const swap = index === 3 ? ease(into) : index > 3 ? 1 : 0;
  const red = done ? 1 : index === 4 ? ease(clamp01(into / 0.6)) : 0;
  return Object.freeze({stage: stage.id, label: stage.label, index, into, done, overall: clamp01(t / RESTORE_SECONDS),
    weeks, saltShare, rust, wreck: 1 - swap, car: swap, red,
    stripe: done ? 1 : index === 4 ? ease(clamp01((into - 0.6) / 0.4)) : 0, bubbles: index === 1 ? 1 : index === 2 ? 0.4 : 0});
}
