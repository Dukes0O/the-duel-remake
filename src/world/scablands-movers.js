// Raiders, Big Bess and anything else that is moved by a job and not by the sim's car rules obey the same ground and the same things a car does
// (SCABLANDS-LAND round 4, slice 2b): a step that climbs ground too steep to grip is not taken, and a mover is pushed out of every solid it would
// stand in, along the nearest face. Pure and repeatable; nothing here reads the renderer.
import {GROUND} from './scablands-ground-rules.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';
import {pushOutOfSolids} from './scablands-solids.js';

// A person on foot climbs up to 40 degrees (src/onfoot.js `maximumSlopeDegrees`); a truck grips what a car grips.
export const FOOT_GRADE = Math.tan(40 * Math.PI / 180);
export const TRUCK_GRADE = GROUND.gripGrade;

// A mover steps from `from` to `to` ({x, z} each). Returns {x, z, blocked}: where it ends, and why it was held ('steep', 'solid' or false).
export function stepMover(from, to, {radius = .4, grade = TRUCK_GRADE, solids = true, grid} = {}) {
  let x = to.x, z = to.z, blocked = false;
  const dx = to.x - from.x, dz = to.z - from.z, distance = Math.hypot(dx, dz);
  if (distance > 1e-6 && (scablandsSurfaceHeightAt(to.x, to.z) - scablandsSurfaceHeightAt(from.x, from.z)) / distance > grade) { x = from.x; z = from.z; blocked = 'steep'; }
  if (!solids) return {x, z, blocked};
  const pushed = pushOutOfSolids(x, z, radius, grid);
  if (pushed.hit) blocked = blocked || 'solid';
  return {x: pushed.x, z: pushed.z, blocked};
}
