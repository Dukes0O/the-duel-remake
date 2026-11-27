// The wind tunnel (docs/LAB.md 4.4): a car on a rolling road with smoke, a fan dial and a scale under each wheel.
// Five benches, one per lesson. Where the game has the rule they use it: the tyre-slip rules for Grip (config.js),
// the heli table's car masses for Fuel. Braking brakes each car at a real car's deceleration (LAB-BRAKING-REAL), which
// is gentler than the race's. Where the game has no rule yet (a wing's push, spring rates, brake balance) the
// bench is plain physics with its constants written here, which LAB-TUNE then makes the game's own.
import {CARS, DRIVE, TYRE_SLIP, tyreSlipAngle, tyreSlipGrip, tyreSlipRawSound} from '../../config.js';
import {GRAVITY} from '../../heli/heli-flight.js';
import {carMassKg} from '../../heli/heli-cable.js';
// For the classroom lesson, which reads the helicopter's rules only through this bench.
export {carMassKg};
import {control, choice, makeBench} from './bench-core.js';

const MPH = DRIVE.mphToWorld;
const carIds = Object.keys(CARS);

// ---- Grip: grip against slide ------------------------------------------------------------------------
// The slide angle the tyre-slip rule draws at a given slip, inverted by bisection (the angle only grows with slip).
export function slipAtAngle(angleRad) {
  let low = 0, high = 2;
  for (let i = 0; i < 60; i++) { const mid = (low + high) / 2; (tyreSlipAngle(mid, -1) < angleRad ? low = mid : high = mid); }
  return (low + high) / 2;
}
// The slide angle where grip is last at its best (slip 1), in degrees.
export const bestSlideDegrees = () => tyreSlipAngle(1, -1) * 180 / Math.PI;

export const gripBench = makeBench({
  id: 'grip', cues: ['lab.fan'],
  controls: [// 12 degrees is as far as the game's tyre model draws a slide (slip 1.25 is 12.03 degrees).
    control('slideDeg', 'Slide', 'degrees', 0, 12, 0.5, 2), choice('driver', 'Driver level', ['casual', 'pro'], 'casual')],
  run({slideDeg, driver}) {
    const slip = slipAtAngle(slideDeg * Math.PI / 180);
    return {slip, grip: tyreSlipGrip(slip, driver), squeal: tyreSlipRawSound(slip), bestSlideDeg: bestSlideDegrees()};
  },
  // The goal: a run on the best slide with full grip, and one past it where grip has fallen.
  goalMet: history => history.some(({result}) => result.grip === 1 && result.settings.slideDeg >= 3) && history.some(({result}) => result.grip < 1),
  facts: () => ({bestSlideDeg: bestSlideDegrees(), gripPast: tyreSlipGrip(1 + TYRE_SLIP.width, 'casual')}),
});

// ---- Downforce: push against speed -------------------------------------------------------------------
export const WING = Object.freeze({airDensity: 1.225, bodyDragArea: 0.65, wings: Object.freeze({flat: 0, small: 0.9, big: 1.8}), dragPerLift: 0.18});
export function downforce(speedMph, wing) {
  const v = speedMph * MPH, liftArea = WING.wings[wing];
  const downforceN = 0.5 * WING.airDensity * liftArea * v * v, dragN = 0.5 * WING.airDensity * (WING.bodyDragArea + WING.dragPerLift * liftArea) * v * v;
  return {downforceN, downforceKg: downforceN / GRAVITY, dragN};
}
// The car on the tunnel's scale (the bench's car, as Braking's is) and a force in newtons read as kilograms on a scale.
export const tunnelCar = Object.freeze({id: carIds[0], kg: carMassKg(carIds[0]), topMph: CARS[carIds[0]].topSpeed});
export const kgForce = newtons => newtons / GRAVITY;
export const downforceBench = makeBench({
  id: 'downforce', cues: ['lab.fan'],
  controls: [control('speedMph', 'Fan speed', 'mph', 50, 150, 10, 50), choice('wing', 'Wing', Object.keys(WING.wings), 'flat')],
  run({speedMph, wing}) {
    const now = downforce(speedMph, wing), flat = downforce(speedMph, 'flat');
    // Top speed where the engine's power (taken as fixed) meets the drag: speed goes as 1 / cube root of the drag area.
    return {...now, topSpeedShare: Math.cbrt(flat.dragN / now.dragN)};
  },
  goalMet: history => history.some(({result}) => result.settings.wing !== 'flat' && result.settings.speedMph === 50)
    && history.some(({result}) => result.settings.wing !== 'flat' && result.settings.speedMph === 100),
  facts: () => ({doubleSpeedRatio: downforce(100, 'big').downforceN / downforce(50, 'big').downforceN,
    bigWingTopSpeedShare: Math.cbrt(downforce(100, 'flat').dragN / downforce(100, 'big').dragN)}),
});

// ---- Braking: stopping distance and weight transfer ----------------------------------------------------
// The rig brakes each car at a real car's deceleration (LAB-BRAKING-REAL, Claude, 27 November 2026), not at the race's
// quicker braking (DRIVE.brakeAccel, over 2 g), so the tape shows real stopping distances.
// - g is standard gravity, 9.80665 m/s² (the CGPM's value of 1901), written 9.81 as the lesson shows it (GRAVITY).
// - The tyres hold the car to brake strength x g. Strength 1 is a road car on good tyres on a dry road, 1 g: the
//   peak grip of a road tyre on dry asphalt is close to 1 (Michelin, "The tyre: Grip", 2001), and brake tests of road
//   cars on dry asphalt measure 10 to 11 m/s² (Radu, "Comparison of passenger vehicle braking distance when traveling on
//   snow and asphalt", Annals of the University of Oradea, 2020). The road cars in CARS are 0.9 to 1.18 g. Only racing
//   tyres with downforce brake harder: the prototypes and the track hypercars at 1.24 to 1.5 g (racing slicks grip
//   about 1.5 times the load, Milliken and Milliken, "Race Car Vehicle Dynamics", 1995), and the Spéirling at 2.2 g,
//   because its fans press it down with about 2,000 kg although it weighs under 1,000 kg (McMurtry's figures,
//   docs/LAB.md section 6), so its tyres carry three times its weight.
// - Passive drag is 0.27 m/s², the road and the air together: tyres roll against about 0.015 of the car's weight
//   (0.15 m/s²), and 0.65 m² of drag area (WING.bodyDragArea) on a 1,250 kg car slows it by 0.12 m/s² on average over a
//   stop from 100 km/h (half of 1.225 kg/m³ x 0.65 m² x the average v², which is half of 27.78² m²/s², over 1,250 kg).
// - The centre of mass is 0.5 m above the road and the wheels are 2.6 m apart, a road car's usual figures (most road
//   cars' centres of mass are 0.45 to 0.6 m up, and their wheelbases 2.3 to 2.8 m).
export const BRAKE_RIG = Object.freeze({g: GRAVITY, dragMs2: 0.27, centreHeightM: 0.5, wheelbaseM: 2.6, staticFront: 0.5, fanPressPerWeight: 2});
// The deceleration while the brakes are on, in m/s²: the tyres' braking and the passive drag.
export const brakesMs2 = carId => BRAKE_RIG.g * CARS[carId].braking;
export const decelMs2 = carId => brakesMs2(carId) + BRAKE_RIG.dragMs2;
// A steady deceleration a from v stops in v² ÷ (2 × a) and takes v ÷ a.
export function stopDistance(carId, speedMph) {
  const v = speedMph * MPH, a = decelMs2(carId);
  return {metres: v * v / (2 * a), seconds: v / a};
}
// Braking tips the weight forward by (deceleration ÷ g) x (centre height ÷ wheelbase): front share = 0.5 + (a ÷ g) x h ÷ L.
// A fan car's fans press both ends down evenly, so its shift is a share of its weight and the fans' push together.
const loadPerWeight = carId => 1 + (CARS[carId].fanGrip ? BRAKE_RIG.fanPressPerWeight : 0);
export const frontLoadShare = (carId = carIds[0]) => BRAKE_RIG.staticFront + decelMs2(carId) / (BRAKE_RIG.g * loadPerWeight(carId)) * BRAKE_RIG.centreHeightM / BRAKE_RIG.wheelbaseM;
export const brakingBench = makeBench({
  id: 'braking', cues: ['lab.fan'],
  controls: [choice('car', 'Car', carIds, carIds[0]), control('speedMph', 'Speed', 'mph', 20, 150, 10, 50), control('frontShare', 'Brake to the front', '%', 40, 90, 5, 60)],
  run({car, speedMph, frontShare}) {
    const stop = stopDistance(car, speedMph), frontLoad = frontLoadShare(car);
    // The rear tyres hold as much braking as the weight left on them: more rear brake than rear load slides.
    return {stopMetres: stop.metres, stopSeconds: stop.seconds, frontLoadShare: frontLoad, rearLoadShare: 1 - frontLoad,
      rearBrakeShare: 1 - frontShare / 100, rearSlides: 1 - frontShare / 100 > 1 - frontLoad};
  },
  goalMet: history => [50, 100].every(speed => history.some(({result}) => result.settings.speedMph === speed)),
  facts: () => ({hundredOverFifty: stopDistance(carIds[0], 100).metres / stopDistance(carIds[0], 50).metres, frontLoadShare: frontLoadShare()}),
});

// ---- Suspension: a wheel on a shaker rig ----------------------------------------------------------------
// One corner of a 1,300 kg car: 325 kg of body on a spring and a damper, a 40 kg wheel, a stiff tyre. The same
// damper fits both springs. The bump road has 4 cm half-sine bumps a metre long, one every 4 m, taken at 15 m/s; the
// light shows whenever the tyre is pressed on the ground. What the rig finds (see tools/test-lab-benches.mjs): the
// stiff spring passes the bumps up into the body (more body shake) and the soft one lets the body roll more in a
// corner. It does NOT find that soft springs keep the tyre on the road better; here the tyre stays down about as well
// on either, so Brian's explanation says what the rig shows (docs/board/questions/LAB-BENCHES.md).
export const CORNER = Object.freeze({bodyKg: 325, wheelKg: 40, tyreStiffness: 200000, damperNsPerM: 1800, speedMs: 15,
  springs: Object.freeze({soft: 20000, stiff: 60000}), bumpHeightM: 0.04, bumpLengthM: 1, bumpEveryM: 4, smoothRoughnessM: 0.002,
  carMassKg: 1300, centreHeightM: 0.5, trackM: 1.5, cornerG: 0.8});
function roadHeight(x, road) {
  if (road === 'smooth') return CORNER.smoothRoughnessM * Math.sin(x * 2.1) * Math.sin(x * 0.37);
  const along = x % CORNER.bumpEveryM;
  return along < CORNER.bumpLengthM ? CORNER.bumpHeightM * Math.sin(Math.PI * along / CORNER.bumpLengthM) : 0;
}
export function shake(spring, road, {seconds = 20, dt = 1 / 1000} = {}) {
  const k = CORNER.springs[spring], c = CORNER.damperNsPerM;
  // Heights are measured from where the car rests; the tyre carries the car's weight at rest, and is off the road
  // (no force) whenever the wheel is lifted off it.
  const rest = (CORNER.bodyKg + CORNER.wheelKg) * GRAVITY;
  let zb = 0, vb = 0, zw = 0, vw = 0, touching = 0, steps = 0, sumSquares = 0;
  for (let t = 0; t < seconds; t += dt) {
    const ground = roadHeight(t * CORNER.speedMs, road), tyre = Math.max(0, rest + CORNER.tyreStiffness * (ground - zw));
    const springForce = k * (zw - zb) + c * (vw - vb), bodyAcceleration = springForce / CORNER.bodyKg;
    vb += bodyAcceleration * dt; zb += vb * dt;
    vw += (tyre - rest - springForce) / CORNER.wheelKg * dt; zw += vw * dt;
    if (tyre > 0) touching++;
    sumSquares += bodyAcceleration * bodyAcceleration; steps++;
  }
  // Body lean in a 0.8 g corner: the moment the car's weight makes about its centre, over the roll stiffness of both axles.
  const rollStiffness = 2 * k * CORNER.trackM ** 2 / 2;
  const leanDeg = Math.atan(CORNER.carMassKg * CORNER.cornerG * GRAVITY * CORNER.centreHeightM / rollStiffness) * 180 / Math.PI;
  return {contactShare: touching / steps, bodyShake: Math.sqrt(sumSquares / steps), leanDeg};
}
export const suspensionBench = makeBench({
  id: 'suspension', cues: ['lab.fan'],
  controls: [choice('spring', 'Springs', Object.keys(CORNER.springs), 'soft'), choice('road', 'Road', ['smooth', 'bumpy'], 'bumpy')],
  run: ({spring, road}) => shake(spring, road),
  goalMet: history => ['soft', 'stiff'].every(spring => ['smooth', 'bumpy'].every(road => history.some(({result}) => result.settings.spring === spring && result.settings.road === road))),
  facts: () => ({bumpy: {soft: shake('soft', 'bumpy'), stiff: shake('stiff', 'bumpy')}, smooth: {soft: shake('soft', 'smooth'), stiff: shake('stiff', 'smooth')}}),
});

// ---- Fuel: petrol weighs something ---------------------------------------------------------------------
export const PETROL_KG_PER_LITRE = 0.74;
export const FUEL_RIG = Object.freeze({tankLitres: 70, upToMph: 60});
// 0 to 60 with the car's own launch acceleration (accel x DRIVE.accelScale mph/s) when it carries a full tank, scaled
// by how much lighter it is now: the same push moving less mass.
export function zeroToSixty(carId, litres) {
  const fullMass = carMassKg(carId), mass = fullMass - (FUEL_RIG.tankLitres - litres) * PETROL_KG_PER_LITRE;
  const fullPush = CARS[carId].accel * DRIVE.accelScale;
  return {massKg: mass, seconds: FUEL_RIG.upToMph / (fullPush * fullMass / mass)};
}
export const fuelBench = makeBench({
  id: 'fuel', cues: ['lab.clunk'],
  controls: [choice('car', 'Car', carIds, carIds[0]), control('litres', 'Petrol', 'litres', 0, FUEL_RIG.tankLitres, 5, FUEL_RIG.tankLitres)],
  run({car, litres}) {
    const run = zeroToSixty(car, litres), full = zeroToSixty(car, FUEL_RIG.tankLitres);
    return {fuelKg: litres * PETROL_KG_PER_LITRE, carMassKg: run.massKg, zeroToSixtyS: run.seconds, fullTankS: full.seconds};
  },
  goalMet: history => history.some(({result}) => result.settings.litres === FUEL_RIG.tankLitres) && history.some(({result}) => result.settings.litres <= FUEL_RIG.tankLitres / 2),
  facts: () => ({tankKg: FUEL_RIG.tankLitres * PETROL_KG_PER_LITRE, kgPerLitre: PETROL_KG_PER_LITRE}),
});

export const TUNNEL_BENCHES = Object.freeze({grip: gripBench, downforce: downforceBench, braking: brakingBench, suspension: suspensionBench, fuel: fuelBench});
