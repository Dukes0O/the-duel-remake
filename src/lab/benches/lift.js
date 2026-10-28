// Lift and weight (docs/LAB.md 4.1): Kestrel One on a weighing pad. Weight is the helicopter's own
// (heliMass: empty, pilot, fuel) plus the cargo; the most lift is availableThrust, the rotor's own
// function, with the skids on the ground. The bench never keeps its own copy of either.
import {GRAVITY, KESTREL, createHeliState, heliMass, availableThrust} from '../../heli/heli-flight.js';
import {control, makeBench} from './bench-core.js';

const controls = [
  control('fuelKg', 'Fuel', 'kg', 0, KESTREL.tankKg, 10, 200),
  control('cargoKg', 'Cargo on the hook', 'kg', 0, 3000, 50, 0),
  control('collective', 'Collective', '', 0, 1, 0.05, 0),
];

function weigh(fuelKg, cargoKg) {
  const state = createHeliState({fuelKg});
  const massKg = heliMass(state) + cargoKg;
  const maxLiftN = availableThrust(state, 0);
  return {state, massKg, weightN: massKg * GRAVITY, maxLiftN, maxLoadKg: maxLiftN / GRAVITY - heliMass(state)};
}

export const liftBench = makeBench({
  id: 'lift', controls, cues: ['lab.clunk'],
  run({fuelKg, cargoKg, collective}) {
    const {massKg, weightN, maxLiftN, maxLoadKg} = weigh(fuelKg, cargoKg);
    const liftN = collective * maxLiftN;
    return {massKg, weightN, maxLiftN, liftN, maxLoadKg, hookLimitKg: KESTREL.hookLimitKg,
      overHookLimit: cargoKg > KESTREL.hookLimitKg, leavesGround: liftN > weightN};
  },
  // The goal: the player has found a load that will not leave the ground even at full collective.
  goalMet: history => history.some(({result}) => result.settings.collective === 1 && !result.leavesGround),
  // The most cargo a full tank can lift, and the pull of gravity on one tonne: the numbers Brian quotes.
  facts: () => ({
    fullTankMaxCargoKg: weigh(KESTREL.tankKg, 0).maxLoadKg,
    emptyTankMaxCargoKg: weigh(0, 0).maxLoadKg,
    weightOfOneTonneN: 1000 * GRAVITY,
  }),
});
