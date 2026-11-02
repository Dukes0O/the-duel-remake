// Fuel and weight for the classroom lesson (docs/board/cards/LAB-CLASSROOM-FUEL.md): the wind tunnel's fuel bench
// (petrol on a scale, the car timed from nought to sixty) and the game's Grand Prix tank from the tuning table, read
// through one bench file so the lesson's numbers are the ones the challenge and the game use.
import {fuelBench, FUEL_RIG, PETROL_KG_PER_LITRE} from './tunnel.js';
import {LAB_TUNE} from '../lab-tune.js';
import {DRIVE} from '../../config.js';
export {fuelBench, FUEL_RIG, PETROL_KG_PER_LITRE};

// A litre of water weighs a kilogram: the one number here that is not the bench's.
export const WATER_KG_PER_LITRE = 1;
export const TANK_LITRES = FUEL_RIG.tankLitres;
// The bench pours in its own steps (5 litres).
export const POUR_LITRES = fuelBench.controls.find(c => c.id === 'litres').step;
// Sixty mph in metres a second: the speed the bench times the car to.
export const SIXTY_MS = FUEL_RIG.upToMph * DRIVE.mphToWorld;
const MS_TO_MPH = 1 / DRIVE.mphToWorld;

// One run of the bench on its own car: {fuelKg, carMassKg, zeroToSixtyS, fullTankS, settings}.
export const fuelRun = litres => fuelBench.run({litres});
export const fuelKg = litres => litres * PETROL_KG_PER_LITRE;

// The car on the drag strip t seconds after the start: the same push all the way to sixty, then sixty on.
export function dragAt(litres, t) {
  const seconds = fuelRun(litres).zeroToSixtyS, a = SIXTY_MS / seconds, s = Math.max(0, t);
  if (s <= seconds) return {metres: a * s * s / 2, mph: a * s * MS_TO_MPH, done: false, seconds};
  return {metres: SIXTY_MS * seconds / 2 + SIXTY_MS * (s - seconds), mph: FUEL_RIG.upToMph, done: true, seconds};
}

// The game's Grand Prix tank (LAB_TUNE.fuel): a full tank lasts 110% of the race; Fuel load takes a quarter of the
// tank off a step; an empty tank is 40% power until the pit stop, which takes 5 s longer.
export const GRAND_PRIX = Object.freeze({fullTankShare: LAB_TUNE.fuel.fullTankRaceShare, loadPerStep: LAB_TUNE.fuel.loadPerStep,
  accelPerStep: LAB_TUNE.fuel.accelPerStep, dryPower: LAB_TUNE.fuel.dryPower, stopSec: LAB_TUNE.fuel.stopSec});
// How much of a Grand Prix this much petrol lasts (1 is the whole race).
export const lastsShare = litres => litres / TANK_LITRES * GRAND_PRIX.fullTankShare;
// The litres a share of a Grand Prix burns.
export const litresFor = share => share * TANK_LITRES / GRAND_PRIX.fullTankShare;
