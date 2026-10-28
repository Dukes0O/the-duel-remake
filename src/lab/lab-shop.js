// What the Lab sells (docs/LAB.md section 4) and the rule for buying it. Pure: no screen, no clock.
import {LAB_LESSONS} from './lab-lessons.js';
import {labReady, withLab} from './lab-save.js';
import {waxSetting} from './benches/wax.js';
import {buildFan} from './lab-fan.js';

const MAX_CREDITS = 1_000_000_000;
// lesson: the lesson that opens it (null: the secret). needs: an upgrade that must be owned first.
const upgrade = (id, name, price, lesson, needs = null) => Object.freeze({id, name, price, lesson, needs});
export const LAB_UPGRADES = Object.freeze([
  upgrade('engine-1', 'Engine 1', 2500, 'lift'),
  upgrade('engine-2', 'Engine 2', 4000, 'lift', 'engine-1'),
  upgrade('light-frame', 'Light frame', 3000, 'lift'),
  upgrade('big-bucket', 'Bigger bucket', 2500, 'projectile'),
  upgrade('retardant', 'Retardant tank', 3000, 'fire'),
  upgrade('long-cable', 'Long cable', 1500, 'pendulum'),
  upgrade('altitude-tune', 'Altitude tune', 3500, 'altitude'),
  upgrade('heavy-hook', 'Heavy hook', 2000, 'strength'),
  upgrade('carbon-plates', 'Carbon plates', 1500, 'strength'),
  upgrade('galvanised', 'Galvanised finish', 600, 'rust'),
  upgrade('gmeter', 'G-meter and racing seat', 800, 'gforce'),
  upgrade('moving-map', 'Moving map', 1200, 'headings'),
  upgrade('aerials', 'Aerials', 0, 'launch'),
  upgrade('wax-kit', 'Wax kit', 400, 'wax'),
  // Section 6: built on the fan bench once the REVERSE switch has been found. Never listed on the board.
  upgrade('speirling', 'McMurtry Spéirling', 15000, null),
]);

// Takes the price once, after the lesson that opens the upgrade. Owned means owned: a second buy takes nothing.
export function buyUpgrade(profile, id, {flags} = {}) {
  if (id === 'speirling') return buildFan(profile, {flags});
  const {lab, refusal} = labReady(profile, flags);
  if (refusal) return refusal;
  const row = LAB_UPGRADES.find(item => item.id === id);
  const failure = reason => ({ok: false, reason, profile});
  if (!row) return failure('That is not for sale.');
  if (lab.owned[id] === true) return failure('You already have that.');
  if (row.lesson === null ? lab.secret.reverse !== true : lab.done[row.lesson] !== true)
    return failure(row.lesson === null ? 'There is nothing to build yet.'
      : `Pass ${LAB_LESSONS.find(item => item.id === row.lesson).name} first.`);
  if (row.needs && lab.owned[row.needs] !== true)
    return failure(`Buy ${LAB_UPGRADES.find(item => item.id === row.needs).name} first.`);
  const wallet = Number.isFinite(profile.credits) ? Math.max(0, Math.min(MAX_CREDITS, Math.floor(profile.credits))) : 0;
  if (wallet < row.price) return failure(`You need ${row.price - wallet} more credits.`);
  return {ok: true, reason: '', price: row.price,
    profile: withLab(profile, {...lab, owned: {...lab.owned, [id]: true}}, {credits: wallet - row.price})};
}

// What the Snow lessons' rewards do for skiing (docs/LAB.md 4.3). With the Lab off nothing is gated and no wax is chosen,
// so the ski runs are exactly the ski rules'.
// The Aerials run: offered like any other run with the Lab off; with it on, once the free Aerials reward is owned.
export function aerialsOpen(profile, flags) {
  if (flags?.enabled?.('lab') !== true) return true;
  const {lab, refusal} = labReady(profile, flags);
  return !refusal && lab.owned.aerials === true;
}
export function waxKitOwned(profile, flags) {
  const {lab, refusal} = labReady(profile, flags);
  return !refusal && lab.owned['wax-kit'] === true;
}
// The wax for createSkier({wax}) on a day: the pick judged against the day's snow with the Wax kit, otherwise nothing
// (the plain snow's friction).
export const skiWaxFor = (profile, flags, day, pick) => waxKitOwned(profile, flags) ? waxSetting(pick, day) : null;
