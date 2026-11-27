// CAR-DRIVE-WASTE. Fictional handling, compared with the Dusthawk, Banshee and
// Titan in config.js. These are HOUSE values, not real vehicle specifications.
// Dimensions follow the existing Blender models, including the Bully's plough.
const car = (name, spec, parts, steel, minutes, description) => Object.freeze({
  name, description, ingredients: Object.freeze({parts, steel}),
  assemblyTicks: minutes * 32, // A town day is 45 seconds: 32 hourly ticks per minute.
  spec: Object.freeze({name, homage: description, gearbox: 'manual',
    unlockRequirement: 'workshop-built', workshop: true, excludeFromCompletion: true,
    ...spec}),
});

export const WORKSHOP_CARS = Object.freeze({
  rattler: car('Rattler', {
    topSpeed: 145, accel: 8.8, grip: .82, braking: .98, gears: [40, 70, 100, 125, 145],
    mass: 1100, offRoadGrip: .88, offRoadSpeed: 105, offRoadScrub: .25,
    color: 0x9b6640, accent: 0x34302b, collision: {halfWidth: 1.221, halfLength: 2.254},
    height: 1.791, kind: 'muscle', rivalCar: 'banshee_muscle',
  }, 400, 700, 6, 'A light hot rod with a loud engine.'),
  longhaul: car('Longhaul', {
    topSpeed: 82, accel: 4.6, grip: .91, braking: .72, gears: [20, 34, 48, 62, 74, 82],
    mass: 9000, offRoadGrip: .90, offRoadSpeed: 70, offRoadScrub: .18,
    color: 0x857047, accent: 0x3e3931, collision: {halfWidth: 1.593, halfLength: 3.469},
    height: 3.941, kind: 'truck', lowSpeedSteer: true, rivalCar: 'titan_monster',
  }, 2500, 6500, 15, 'A heavy recovery truck with six wheels.'),
  scarab: car('Scarab', {
    topSpeed: 118, accel: 8.5, grip: .96, braking: 1.10, gears: [32, 55, 78, 100, 118],
    mass: 850, offRoadGrip: 1.08, offRoadSpeed: 115, offRoadScrub: .10,
    color: 0x796244, accent: 0x332b23, collision: {halfWidth: 1.134, halfLength: 2.036},
    height: 2.613, kind: 'rally', lowSpeedSteer: true, rivalCar: 'dusthawk_rally',
  }, 350, 500, 8, 'A light buggy that keeps its grip on rough ground.'),
  bully: car('Bully', {
    topSpeed: 65, accel: 3.8, grip: .91, braking: .80, gears: [18, 32, 46, 58, 65],
    mass: 6500, offRoadGrip: .88, offRoadSpeed: 55, offRoadScrub: .18,
    color: 0xa88932, accent: 0x514633, collision: {halfWidth: 1.28, halfLength: 2.9105},
    height: 2.880, kind: 'truck', lowSpeedSteer: true, rivalCar: 'titan_monster',
  }, 2000, 4500, 12, 'A slow school bus with a grinning plough.'),
});

export const isWorkshopCar = id => Object.hasOwn(WORKSHOP_CARS, id);
