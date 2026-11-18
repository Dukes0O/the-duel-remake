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
// The standing view while the forge takes the fire (EVERBURN-REMAKE job 1): on the line from the hearth through the car, 7 m beyond the
// car, 4 m to the side away from the crane's tower and 3.6 m up, looking at a point 3 m up, two thirds of the way from the car to the hearth.
export function forgeHoldView(car, plan, groundAt) {
  const dx = car.x - plan.hearth.x, dz = car.z - plan.hearth.z;
  const length = Math.hypot(dx, dz);
  const ux = length ? dx / length : 0, uz = length ? dz / length : 1;
  let sx = -uz, sz = ux;
  if (sx * (plan.tower.x - plan.hearth.x) + sz * (plan.tower.z - plan.hearth.z) > 0) { sx = -sx; sz = -sz; }
  const x = car.x + 7 * ux + 4 * sx, z = car.z + 7 * uz + 4 * sz;
  const tx = car.x + (plan.hearth.x - car.x) * 2 / 3, tz = car.z + (plan.hearth.z - car.z) * 2 / 3;
  return {position: {x, y: groundAt(x, z) + 3.6, z}, target: {x: tx, y: groundAt(tx, tz) + 3, z: tz}};
}

// How far the evening has come on in Light the Town, 0 (day) to 1 (dusk), for the light and the windows; 0 in every other
// job. The job's own clock brings it on over four minutes; each lamp first lit brings it on at least a quarter, so that a
// quick player also sees the light go; and the ending takes it to dusk in two and a half seconds, when the windows light.
export const TOWN_EVENING = Object.freeze({perLamp: .25, endingSeconds: 2.5});
export function townEveningAmount(state) {
  const job = state?.arena?.mode === 'world-job' ? state.arena.worldJob?.job : null, step = job?.steps?.[job.stepIndex];
  if (!step?.brand) return 0;
  const rule = job.stepState ?? {};
  const before = Math.max(0, Math.min(1, Math.max(rule.dusk ?? 0, (rule.brandAsh?.seen?.length ?? 0) * TOWN_EVENING.perLamp)));
  if (!rule.townEnding) return before;
  const share = Math.max(0, Math.min(1, (rule.endingElapsed ?? 0) / TOWN_EVENING.endingSeconds));
  return before + (1 - before) * share * share * (3 - 2 * share);
}

// The standing view while the town wakes (EVERBURN-REMAKE job 2). Claude's hand play of 17 November ended a metre from a lamp
// post, facing the fence, while Auntie spoke and the thief ran unseen. The view stands high and back from the middle of the
// three lamps, the hearth and the gate, on the side from which the one farthest off the middle of the picture is nearest to
// it (tried on 24 bearings), so that all five are in it wherever the lamps stand. From that far a running man is a dot
// (Claude's hand play of the same night), so at the theft the view cuts to a second standpoint: beside the thief's way,
// 20 m along it and 12 m to the side away from the hearth, 2.5 m up, turning with him as he runs past with the bellows
// on his back. `step` gives the hearth, the lamps (`places`) and the thief's path; `thief` is where he is now, or null.
export const TOWN_ENDING_VIEW = Object.freeze({backMetres: 72, upMetres: 20, lookUpMetres: 2, bearings: 24,
  thiefAlongMetres: 20, thiefSideMetres: 12, thiefUpMetres: 2.5, thiefLookUpMetres: 1.2});
// Where the near view of the thief's run stands, on the ground plan.
export function townThiefStand(step) {
  const at = place => place.position ?? place, path = step.theftPath.map(at), hearth = at(step.hearth);
  let left = TOWN_ENDING_VIEW.thiefAlongMetres, a = path[0], b = path[1];
  for (let index = 1; index < path.length; index++) {
    a = path[index - 1]; b = path[index];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= length || index === path.length - 1) break;
    left -= length;
  }
  const length = Math.hypot(b.x - a.x, b.z - a.z) || 1, ux = (b.x - a.x) / length, uz = (b.z - a.z) / length;
  const on = {x: a.x + ux * Math.min(left, length), z: a.z + uz * Math.min(left, length)};
  const sides = [1, -1].map(side => ({x: on.x - uz * side * TOWN_ENDING_VIEW.thiefSideMetres, z: on.z + ux * side * TOWN_ENDING_VIEW.thiefSideMetres}));
  return sides.reduce((best, side) => Math.hypot(side.x - hearth.x, side.z - hearth.z) > Math.hypot(best.x - hearth.x, best.z - hearth.z) ? side : best);
}
// The middle of the places the ending shows: half way between the outermost of them, east to west and north to south.
export function townEndingMiddle(step) {
  const at = place => place.position ?? place;
  const places = [...step.places, step.hearth, step.theftPath.at(-1)].map(at);
  const xs = places.map(p => p.x), zs = places.map(p => p.z);
  return {places, mid: {x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2}};
}
export function townEndingView(step, groundAt, thief = null) {
  if (thief) {
    const stand = townThiefStand(step);
    return {position: {x: stand.x, y: groundAt(stand.x, stand.z) + TOWN_ENDING_VIEW.thiefUpMetres, z: stand.z},
      target: {x: thief.x, y: groundAt(thief.x, thief.z) + TOWN_ENDING_VIEW.thiefLookUpMetres, z: thief.z}};
  }
  const {places, mid} = townEndingMiddle(step), back = TOWN_ENDING_VIEW.backMetres;
  let x = mid.x, z = mid.z + back, least = Infinity;
  for (let index = 0; index < TOWN_ENDING_VIEW.bearings; index++) {
    const bearing = index * Math.PI * 2 / TOWN_ENDING_VIEW.bearings, vx = mid.x + Math.sin(bearing) * back, vz = mid.z + Math.cos(bearing) * back;
    // How far off the middle of the picture the worst-placed of them would be from here (as a cosine: larger is nearer the middle).
    const worst = Math.max(...places.map(p => { const dx = p.x - vx, dz = p.z - vz;
      return Math.acos(Math.max(-1, Math.min(1, (dx * (mid.x - vx) + dz * (mid.z - vz)) / ((Math.hypot(dx, dz) || 1) * back)))); }));
    if (worst < least - 1e-9) { least = worst; x = vx; z = vz; }
  }
  return {position: {x, y: groundAt(x, z) + TOWN_ENDING_VIEW.upMetres, z},
    target: {x: mid.x, y: groundAt(mid.x, mid.z) + TOWN_ENDING_VIEW.lookUpMetres, z: mid.z}};
}
