// TOWN-VEHICLES: drivable work vehicles that are not garage cars (docs/WASTELAND_TOWN.md section 11).
// Pure: no DOM, no Three.js, nothing from app.js. A job names its vehicle (`job.vehicle`), the World Job mode
// keeps the running vehicle at `state.arena.worldJob.vehicle`, and the arena's player setup reads the two
// prepared objects on it: `car` (what driving reads, in the units of `CARS`) and `body` (what contacts read).
// Nothing here is added to `CARS`, so no menu, medal, computer field or existing replay sees these vehicles.
import {DRIVE, steeringYawAuthority} from '../config.js';
import {defineMachine} from '../machines/content/machines.js';
import {WORK_VEHICLES} from './content/work-vehicles.js';

const KMH_TO_MPH = 1 / 1.609344;
const WATER_KG_PER_LITRE = 1;
// A truck pulling away is in its low gears; power is turned into push at about this road speed.
const PULL_SPEED_MPS = 8;
const DRIVELINE_SHARE = 0.8;
// The arena's driving multiplies a car's pull by its launch scale, and each gear's pull falls off towards the
// top of the gear (about three quarters on average). Dividing by both makes the pull the real one.
const GEAR_PULL_SHARE = 0.75;
// Holding the bell key rings it again at a bell-rope pace.
export const BELL_REPEAT_SECONDS = 0.8;
export const BELL_CUE = 'town.bell';

const finite = Number.isFinite;
const groupThousands = value => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** The machine-shaped definition of each work vehicle, checked by MACHINE-CORE's own rule. */
export const WORK_VEHICLE_DEFINITIONS = Object.freeze(Object.fromEntries(WORK_VEHICLES.map(row => [row.id,
  defineMachine({...row, massKg:row.emptyMassKg, maxSpeedMps:row.topSpeedKmh / 3.6})])));

export const WORK_VEHICLE_IDS = Object.freeze(Object.keys(WORK_VEHICLE_DEFINITIONS));

export function workVehicleDefinition(id) {
  const definition = WORK_VEHICLE_DEFINITIONS[id];
  if (!definition) throw new RangeError(`Unknown work vehicle: ${id}`);
  return definition;
}

export const isWorkVehicle = id => typeof id === 'string' && Object.hasOwn(WORK_VEHICLE_DEFINITIONS, id);

/** Everything a full vehicle could carry, in kilograms: its bed or hook, and a full tank. */
export function workVehicleFullMassKg(definition) {
  return definition.emptyMassKg + definition.maxLoadKg + (definition.tank?.capacityL ?? 0) * WATER_KG_PER_LITRE;
}

export function workVehicleMassKg(vehicle) {
  const definition = workVehicleDefinition(vehicle.id);
  return definition.emptyMassKg + vehicle.loadKg + vehicle.tankL * WATER_KG_PER_LITRE;
}

/** The turning circle's radius at the rear axle, at full lock: wheelbase over the tangent of the steering angle. */
export function workVehicleTurnRadiusM(definition) {
  return definition.wheelbaseM / Math.tan(definition.maxSteerDeg * Math.PI / 180);
}

/**
 * What driving reads, in the same units as a garage car: mph, mph a second and shares of the base rates.
 * Weight is real: a heavier truck pulls away more slowly, tops out a little lower, stops in a longer distance
 * and corners on less grip. The numbers stay where a child can still drive it.
 */
export function workVehicleCar(definition, massKg) {
  const empty = definition.emptyMassKg, full = workVehicleFullMassKg(definition);
  const loadShare = full > empty ? clamp((massKg - empty) / (full - empty), 0, 1) : 0;
  const topSpeed = definition.topSpeedKmh * KMH_TO_MPH * (1 - 0.12 * loadShare);
  const pullMps2 = DRIVELINE_SHARE * definition.engineKw * 1000 / (massKg * PULL_SPEED_MPS);
  return Object.freeze({
    name:definition.name, workVehicle:definition.id, kind:'work-truck', gearbox:'manual',
    topSpeed, accel:pullMps2 / DRIVE.mphToWorld / (DRIVE.arenaAccelScale * GEAR_PULL_SHARE),
    grip:0.62 * (1 - 0.1 * loadShare), braking:Math.max(0.2, 0.3 * Math.sqrt(empty / massKg)),
    gears:Object.freeze([0.22, 0.4, 0.6, 0.8, 1].map(share => share * topSpeed)),
    offRoadGrip:0.7, offRoadSpeed:topSpeed * 0.7, offRoadScrub:0.3, roughnessScale:1, boostCapacity:1,
    mass:massKg, collision:Object.freeze({halfWidth:definition.halfWidthM, halfLength:definition.halfLengthM}),
    height:definition.heightM,
  });
}

function prepared(vehicle) {
  const definition = workVehicleDefinition(vehicle.id), massKg = workVehicleMassKg(vehicle);
  const car = workVehicleCar(definition, massKg);
  return {...vehicle, massKg, car,
    body:Object.freeze({halfWidth:car.collision.halfWidth, halfLength:car.collision.halfLength, mass:massKg, height:car.height})};
}

/**
 * The running vehicle a job starts with, or null when the job names none (the garage car is driven) or the
 * town's switch is off. `spec` is an id, or {id, loadKg, tankL} to start part full.
 */
export function startWorkVehicle(spec, {enabled = false} = {}) {
  const id = typeof spec === 'string' ? spec : spec?.id;
  if (!enabled || !isWorkVehicle(id)) return null;
  const definition = workVehicleDefinition(id);
  const loadKg = clamp(finite(spec?.loadKg) ? spec.loadKg : definition.startLoadKg ?? 0, 0, definition.maxLoadKg);
  const tankL = definition.tank ? clamp(finite(spec?.tankL) ? spec.tankL : definition.tank.startL, 0, definition.tank.capacityL) : 0;
  return prepared({id, loadKg, tankL, steering:null, bell:definition.bell ? {held:false, lastRingSec:null, rings:0} : null});
}

/** Put kilograms on the bed or the hook. What will not fit is refused with a sentence. */
export function loadWorkVehicle(vehicle, kg) {
  if (!finite(kg) || kg < 0) throw new TypeError('A load in kilograms of zero or more is required.');
  const definition = workVehicleDefinition(vehicle.id);
  const room = Math.max(0, definition.maxLoadKg - vehicle.loadKg), loadedKg = Math.min(room, kg);
  const message = definition.maxLoadKg === 0 ? `The ${definition.name.toLowerCase()} has nowhere to carry a load.`
    : loadedKg < kg ? `The ${definition.name.toLowerCase()} is full. It carries ${groupThousands(definition.maxLoadKg)} kg.` : '';
  return {vehicle:prepared({...vehicle, loadKg:vehicle.loadKg + loadedKg}), loadedKg, refusedKg:kg - loadedKg, message};
}

/** Take kilograms off. Shed load on a hard knock is the haul step's rule; this only does the sum. */
export function unloadWorkVehicle(vehicle, kg = vehicle.loadKg) {
  if (!finite(kg) || kg < 0) throw new TypeError('A load in kilograms of zero or more is required.');
  const unloadedKg = Math.min(vehicle.loadKg, kg);
  return {vehicle:prepared({...vehicle, loadKg:vehicle.loadKg - unloadedKg}), unloadedKg};
}

/** Fill the tank at a tap or hydrant. The flow is whatever the pipes give; the tank stops it when full. */
export function fillWorkVehicleTank(vehicle, litres) {
  if (!finite(litres) || litres < 0) throw new TypeError('Litres of zero or more are required.');
  const tank = workVehicleDefinition(vehicle.id).tank;
  const filledL = tank ? Math.min(tank.capacityL - vehicle.tankL, litres) : 0;
  return {vehicle:prepared({...vehicle, tankL:vehicle.tankL + filledL}), filledL};
}

/** Pump from the tank for some seconds at the vehicle's own pump rate. */
export function pumpWorkVehicleTank(vehicle, seconds) {
  if (!finite(seconds) || seconds < 0) throw new TypeError('Seconds of zero or more are required.');
  const tank = workVehicleDefinition(vehicle.id).tank;
  const pumpedL = tank ? Math.min(vehicle.tankL, tank.pumpLpm * seconds / 60) : 0;
  return {vehicle:prepared({...vehicle, tankL:vehicle.tankL - pumpedL}), pumpedL};
}

/**
 * The steering a truck can give at this speed: the arena's steering is a car's, so it is held to the vehicle's
 * real turning circle. Traction below 1 only widens the turn, so the circle is never tighter than the truck's.
 */
export function workVehicleSteer(vehicle, steer, speedMph, course = null) {
  const value = clamp(finite(steer) ? steer : 0, -1, 1);
  const speed = Math.abs(finite(speedMph) ? speedMph : 0);
  if (value === 0 || speed === 0) return value;
  const radius = workVehicleTurnRadiusM(workVehicleDefinition(vehicle.id));
  const authority = steeringYawAuthority(speed, vehicle.car.grip, 1, vehicle.car, course);
  const wanted = speed * DRIVE.mphToWorld / radius;
  return authority > wanted ? value * wanted / authority : value;
}

/**
 * One step of the driver's controls, before driving. The boost key has no nitro to fire in a truck: in a vehicle
 * with a bell it rings the bell (sound cue `town.bell`), at once and again every 0.8 s while held.
 * `steer` is what the input holds now. The app writes the input once a frame and a frame may run several steps,
 * so a value equal to the one this function wrote last time is the same press, and the press it came from is used.
 * Returns the vehicle, the steering to write, and whether the bell rang.
 */
export function stepWorkVehicleControls(vehicle, {steer = 0, boost = false} = {}, {speedMph = 0, clockSec = 0, course = null} = {}) {
  const seen = clamp(finite(steer) ? steer : 0, -1, 1);
  const pressed = vehicle.steering && seen === vehicle.steering.written ? vehicle.steering.pressed : seen;
  const written = workVehicleSteer(vehicle, pressed, speedMph, course);
  let next = {...vehicle, steering:{pressed, written}}, rang = false;
  if (vehicle.bell) {
    const held = boost === true, last = vehicle.bell.lastRingSec;
    rang = held && (!vehicle.bell.held || last === null || clockSec - last >= BELL_REPEAT_SECONDS - 1e-9);
    next = {...next, bell:{held, lastRingSec:rang ? clockSec : last, rings:vehicle.bell.rings + Number(rang)}};
  }
  return {vehicle:next, steer:written, rang};
}
