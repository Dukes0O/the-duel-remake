import {CIRCUIT_MANIFESTS} from './circuit-manifests.js';

// Existing closed road circuits and manifest-authored Grand Prix circuits.
export const GRAND_PRIX_COURSES = Object.freeze(['pacific-canyon', 'high-country',
  'harbor-highlands', 'eifel-crown', 'alpine-serpent', 'azure-riviera', 'red-mesa',
  'neon-docks', 'cloudbreak-skyway',
  ...CIRCUIT_MANIFESTS.filter(manifest => manifest.grandPrix && manifest.slot === undefined).map(manifest => manifest.id)]);
export const grandPrixCourse = def => !!def && GRAND_PRIX_COURSES.includes(def.id);

// Approved GP position pay; the existing career owns banking and duplicate keys.
export const GRAND_PRIX_SHARES = Object.freeze([1, .75, .55, .40, .30, .20, .15, .10]);
export function validGrandPrixPosition(result) {
  const size = result.fieldSize ?? 8;
  return Number.isSafeInteger(size) && size >= 2 && size <= 8 &&
    Number.isSafeInteger(result.position) && result.position >= 1 && result.position <= size &&
    result.won === (result.position === 1);
}
export function grandPrixPositionPay(result, difficultyBase) {
  return validGrandPrixPosition(result)
    ? Math.round(difficultyBase * GRAND_PRIX_SHARES[result.position - 1]) : 0;
}
export function grandPrixSnowmanPay(result) {
  return Number.isSafeInteger(result.snowmen) && result.snowmen >= 0
    ? Math.min(10, result.snowmen) * 25 : 0;
}

// Optional prospective progress; old history never supplies a finishing position.
export function normalizeGrandPrixPodiums(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter(id => typeof id === 'string' && GRAND_PRIX_COURSES.includes(id)))];
}
export function getGrandPrixPodiums(profile) {
  return profile && Object.hasOwn(profile, 'grandPrixPodiums')
    ? normalizeGrandPrixPodiums(profile.grandPrixPodiums) : [];
}
// Called only after settleRace's existing finish and duplicate guards pass.
export function recordGrandPrixPodium(profile, eventId) {
  if (!GRAND_PRIX_COURSES.includes(eventId)) return profile;
  const podiums = getGrandPrixPodiums(profile);
  return podiums.includes(eventId) ? profile
    : {...profile, grandPrixPodiums: [...podiums, eventId]};
}
