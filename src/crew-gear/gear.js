// Settled numbers from docs/CREW.md section 1. These are gear-local until
// the tuning owner grants the shared catalog; released weapons stay unchanged.
import {wastelandRulesActive} from '../wasteland-access.js';
export const SIGNATURE_GEAR = Object.freeze({
  rook: Object.freeze({id: 'rpg', name: 'LONGHORN RPG', capacity: 3}),
  nell: Object.freeze({id: 'sticky-bomb', name: 'STICKY BOMBS', capacity: 3,
    range: 18, fuse: 3, radius: 5, carDamage: 25, fighterDamage: 60}),
  jax: Object.freeze({id: 'grapple', name: 'GRAPPLE', capacity: null,
    range: 25, maximumKph: 90, recharge: 6}),
  odessa: Object.freeze({id: 'scrap-turret', name: 'SCRAP TURRET', capacity: null,
    range: 35, lifetime: 20, cadence: .8, health: 60, recharge: 30,
    carDamage: 4, fighterDamage: 10}),
  cinder: Object.freeze({id: 'hand-flamer', name: 'HAND FLAMER', capacity: 4,
    range: 6, cone: 35 * Math.PI / 180, carDamage: 10,
    fighterDamage: 30, refill: .5}),
  dune: Object.freeze({id: 'marksman', name: 'MARKSMAN CROSSBOW', capacity: 8,
    range: 150, speed: 90, carDamage: 15, reload: 1.5, magnification: 3}),
  wren: Object.freeze({id: 'smoke-grenade', name: 'SMOKE GRENADES', capacity: 2,
    range: 20, radius: 2.5, lifetime: 6}),
  tusk: Object.freeze({id: 'scrap-cannon', name: 'SCRAP CANNON', capacity: 2,
    reload: 4, carDamage: 20, shoveMass: 1450, shoveMph: 35}),
});

export const GEAR_EPSILON = 1e-8;
export function crewGearEnabled(duel) {
  return duel.state.mode === 'wasteland' && !!duel.state.combat &&
    wastelandRulesActive(duel.state) &&
    duel.featureFlags?.enabled('crew-gear') === true;
}
export function signatureFor(crewId) {
  return Object.hasOwn(SIGNATURE_GEAR, crewId) ? SIGNATURE_GEAR[crewId] : SIGNATURE_GEAR.rook;
}
export function crewRpgTiming(duel, crewId) {
  return crewGearEnabled(duel) && crewId === 'rook'
    ? {lockSeconds: .6, reloadSeconds: 1.8} : null;
}
