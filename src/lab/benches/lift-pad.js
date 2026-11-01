// The teaching pad reads the real flight rules. It owns no flight or save state.
import {KESTREL, GRAVITY, createHeliState, heliMass, availableThrust} from '../../heli/heli-flight.js';
import {carMassKg, CRATE} from '../../heli/heli-cable.js';
export {KESTREL, GRAVITY};

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
