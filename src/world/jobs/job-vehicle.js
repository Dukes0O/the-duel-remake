// SHIPS-DECKS: the job-level `vehicle` field (docs/story/ships-in-the-sand.md section 6). A job picks what the player drives:
//   'tow-rig' (or {id, loadKg, tankL})       a town work vehicle, run by TOWN-VEHICLES (src/town/work-vehicles.js) as before;
//   {oneOf:[cars], lendIfNone, lendLineId}   one of the player's own garage cars: the car they have chosen if it is in the list,
//                                            else the first of the list they own; with none of them, `lendIfNone` is lent for
//                                            this run only, and `lendLineId` is said as the job starts.
// A loan is never written anywhere: the profile, its cars, its chosen car and its upgrades are left exactly as they were.
// Pure: no DOM, no Three.js, nothing from src/app.js.
import {isWorkVehicle} from '../../town/work-vehicles.js';

const isWorkSpec = vehicle => typeof vehicle === 'string' ? isWorkVehicle(vehicle) : isWorkVehicle(vehicle?.id);

/**
 * What a job's run drives. `chosenCar` is the garage car the player has picked and `owns(id)` says whether their profile has a
 * car. Returns null when the job names no vehicle (the chosen car is driven, as for every job before), {work} for a work vehicle,
 * {car, lent:false} for the player's own car, {car or work, lent:true, lineId} for a loan, or {car:null, message} when the job
 * asks for cars the player does not have and lends none.
 */
export function jobVehicleChoice(vehicle, {chosenCar = null, owns = () => false} = {}) {
  if (vehicle == null) return null;
  if (isWorkSpec(vehicle)) return {work: vehicle, lent: false};
  const oneOf = Array.isArray(vehicle.oneOf) ? vehicle.oneOf : [];
  if (oneOf.includes(chosenCar) && owns(chosenCar)) return {car: chosenCar, lent: false};
  const owned = oneOf.find(id => owns(id));
  if (owned) return {car: owned, lent: false};
  const lend = vehicle.lendIfNone, lineId = vehicle.lendLineId ?? null;
  if (isWorkSpec(lend)) return {work: lend, lent: true, lineId};
  if (typeof lend === 'string' && lend) return {car: lend, lent: true, lineId};
  return {car: null, lent: false, message: 'This job needs a car you do not have yet.'};
}

/**
 * The job a run starts with, and the garage car it drives. A work vehicle lent in place of garage cars becomes the job's
 * `vehicle`, so TOWN-VEHICLES drives it, and a loan is marked `vehicleLent` (with the field the job asked for, so that running the
 * same definition again chooses afresh) so the mode can say its line. The definition handed in is not changed. `car` is null when
 * the job leaves the choice to the player's chosen car; `refused` is a sentence when the job cannot start.
 */
export function jobForRun(job, context = {}) {
  if (!job) return {job, car: null, refused: null};
  const {vehicleLent, ...plain} = job;
  const asked = vehicleLent ? vehicleLent.asked : job.vehicle;
  const base = vehicleLent ? {...plain, vehicle: asked} : job;
  const choice = jobVehicleChoice(asked, context);
  if (choice?.message) return {job: base, car: null, refused: choice.message};
  if (!choice?.lent) return {job: base, car: choice?.car ?? null, refused: null};
  return {job: {...base, ...(choice.work ? {vehicle: choice.work} : {}),
    vehicleLent: Object.freeze({asked, car: choice.car ?? null, work: choice.work ?? null, lineId: choice.lineId ?? null})},
  car: choice.car ?? null, refused: null};
}
