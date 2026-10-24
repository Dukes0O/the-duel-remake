// G-force (docs/LAB.md 4.2): a car on a turning arm. A weight on a string leans and a meter reads g. The turn is
// v^2 / r with the game's own speed units (DRIVE.mphToWorld); the cornering the game allows is DRIVE.maxLateralAccel
// times the car's grip, shown beside the reading.
import {GRAVITY} from '../../heli/heli-flight.js';
import {CARS, DRIVE} from '../../config.js';
import {control, makeBench} from './bench-core.js';

const controls = [
  control('speedMph', 'Speed', 'mph', 10, 150, 5, 40),
  control('radiusM', 'Radius', 'm', 10, 200, 5, 50),
];

export const lateralG = (speedMph, radiusM) => (speedMph * DRIVE.mphToWorld) ** 2 / radiusM / GRAVITY;
// The most turning the game allows a car, in g.
export const gameLimitG = carId => DRIVE.maxLateralAccel * CARS[carId].grip / GRAVITY;

export const gforceBench = makeBench({
  id: 'gforce', controls, cues: [],
  run({speedMph, radiusM}) {
    const g = lateralG(speedMph, radiusM);
    return {g, leanDegrees: Math.atan(g) * 180 / Math.PI, sidePushOfWeight: g};
  },
  goalMet: history => history.some(({result}) => result.g >= 2),
  facts() {
    const limits = Object.keys(CARS).map(gameLimitG);
    return {doubleSpeedRatio: lateralG(80, 50) / lateralG(40, 50), halfRadiusRatio: lateralG(40, 25) / lateralG(40, 50),
      lowestCarLimitG: Math.min(...limits), highestCarLimitG: Math.max(...limits)};
  },
});
