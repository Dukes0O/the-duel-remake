// The teaching pad reads the real flight rules. It owns no flight or save state.
import {KESTREL, GRAVITY, createHeliState, heliMass, availableThrust} from '../../heli/heli-flight.js';
import {carMassKg, CRATE} from '../../heli/heli-cable.js';
export {KESTREL};

export const PAD = Object.freeze({canKg: KESTREL.tankKg / 4, crateKg: CRATE.massKg,
  carKg: carMassKg('dusthawk_rally'), hoverHeight: .6, maxCrates: 4});
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
export function padLoad(input = {}) {
  return {fuel: clamp(input.fuel ?? KESTREL.tankKg, 0, KESTREL.tankKg),
    crates: Math.round(clamp(input.crates ?? 0, 0, PAD.maxCrates)),
    car: input.car ? 1 : 0, collective: clamp(input.collective ?? 0, 0, 1)};
}
export function padForces(input = {}, height = 0) {
  const load = padLoad(input), state = createHeliState({fuelKg: load.fuel, y: height, mode: 'real'});
  const cargoKg = load.crates * PAD.crateKg + load.car * PAD.carKg;
  const massKg = heliMass(state) + cargoKg, weightN = massKg * GRAVITY;
  // Cans on the pad represent fuel transferred to the tank; no double counting.
  const maximumN = state.engine ? availableThrust(state, height) : 0;
  const liftN = load.collective * maximumN;
  return {...load, cargoKg, massKg, weightN, maximumN, liftN,
    hoverCollective: weightN / maximumN, shortKg: Math.max(0, (weightN - liftN) / GRAVITY)};
}
export function padOutcome(input) {
  const f = padForces(input), h = padForces(input, PAD.hoverHeight);
  // Hover is a narrow visible band, not an equality puzzle with a mouse.
  // It must both leave the pad and balance at the marked low hover height.
  if (f.liftN <= f.weightN) return 'down';
  if (Math.abs(h.liftN - h.weightN) <= h.weightN * .015) return 'hover';
  return h.liftN < h.weightN ? 'settles' : 'up';
}
export function kilogramsToRemove(input, height = PAD.hoverHeight) {
  return Math.max(1, Math.ceil(padForces({...input, collective: 1}, height).shortKg));
}
