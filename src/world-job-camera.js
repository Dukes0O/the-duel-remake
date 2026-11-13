// EVERBURN-PLAY-FIXES, part B. How the chase camera behaves in a world job. It only reads state and draws; nothing here
// changes a race or a job.
//
// 1. Facing: in the Scablands the oval is only a frame for the car, so a camera that stands "behind" the car along the road
//    can look at the car's face (job 6) or stand beside it (the escorts, jobs 2 and 5). A world job's chase camera stands
//    behind the car along the car's own facing and looks ahead along it.
// 2. Big machines: the furnace and Big Bess are boxes the camera must not sit in. When the camera's place is inside a machine's
//    box plus MACHINE_MARGIN_METRES it rises to MACHINE_CLEARANCE_METRES above the machine's top and looks down at the car, and
//    comes back down smoothly once it is clear.

export const MACHINE_MARGIN_METRES = 1;
export const MACHINE_CLEARANCE_METRES = 2;
// How fast the camera comes back down once clear (the rise is at once): the share of the height left falls by this much a second.
export const MACHINE_LOWER_RATE = 3.5;

// The camera at a world job: `car` is the car's ground point {x, y, z} and `heading` the way it faces. The numbers are the chase
// camera's own (back 8.7 m, up 3.65 m, aimed 26 m ahead and 1.05 m up); the caller gives them for the view in use.
export function facingChaseView(car, heading, {back, height, ahead = 26, aimHeight = 1.05}) {
  const sin = Math.sin(heading), cos = Math.cos(heading);
  return {
    position: {x: car.x - sin * back, y: car.y + height, z: car.z - cos * back},
    target: {x: car.x + sin * ahead, y: car.y + aimHeight, z: car.z + cos * ahead},
  };
}

// A machine's box, in metres in its own frame (+z is the way it faces, +x its left), from its ground point.
// `machine` is {x, y, z, heading, halfX, minZ, maxZ, height}.
function localOffset(machine, point) {
  const dx = point.x - machine.x, dz = point.z - machine.z, sin = Math.sin(machine.heading), cos = Math.cos(machine.heading);
  return {across: dx * cos - dz * sin, along: dx * sin + dz * cos};
}

// Whether `point` is inside the machine's box grown by `margin` metres on every side.
export function insideMachine(machine, point, margin = MACHINE_MARGIN_METRES) {
  const {across, along} = localOffset(machine, point);
  return Math.abs(across) <= machine.halfX + margin && along >= machine.minZ - margin && along <= machine.maxZ + margin &&
    point.y >= machine.y - margin && point.y <= machine.y + machine.height + margin;
}

// How many metres above `point` the camera must stand: 0 when it is clear of every machine, else enough to stand
// MACHINE_CLEARANCE_METRES above the top of the highest machine it is inside.
export function machineLift(point, machines) {
  let lift = 0;
  for (const machine of machines ?? []) {
    if (insideMachine(machine, point)) lift = Math.max(lift, machine.y + machine.height + MACHINE_CLEARANCE_METRES - point.y);
  }
  return lift;
}

// One frame of the camera's height above its usual place: up at once when a machine needs it, down smoothly when it does not.
export function easeMachineLift(current, required, dt) {
  if (required >= current) return required;
  const eased = current + (required - current) * (1 - Math.exp(-MACHINE_LOWER_RATE * Math.max(0, dt)));
  return eased < .01 ? 0 : eased;
}

// How much the camera looks at the car instead of ahead: none on the ground, all of it from 2 m up.
export const machineLookBlend = lift => Math.max(0, Math.min(1, lift / MACHINE_CLEARANCE_METRES));
